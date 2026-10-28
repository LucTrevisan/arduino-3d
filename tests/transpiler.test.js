import { describe, it, expect } from 'vitest';
import { transpile, checkSyntax, stripComments } from '../src/sim/transpiler.js';

describe('transpile', () => {
  it('converte #define, tipos, funções e await', () => {
    const { code, functions } = transpile(`#define LED 13
const int tempo = 500;
unsigned long ultimo = 0;
int contador;
void piscar(int n) {
  digitalWrite(LED, HIGH);
  delay(n);
}
void setup() { pinMode(LED, OUTPUT); }
void loop() {
  piscar(tempo);
}`);
    expect(code).toContain('const LED = 13;');
    expect(code).toContain('const tempo = 500;');
    expect(code).toContain('let ultimo = 0;');
    expect(code).toContain('let contador = 0;');
    expect(code).toContain('async function piscar(n) {');
    expect(code).toContain('await delay(n);');
    expect(code).toContain('await piscar(tempo);');
    expect(functions).toEqual(['piscar', 'setup', 'loop']);
  });

  it('preserva o número de linhas', () => {
    const src = '/* a\nb */\n#include <Servo.h>\nvoid setup() {\n}\n// x\nvoid loop() {\n}';
    expect(transpile(src).code.split('\n').length).toBe(src.split('\n').length);
  });

  it('converte arrays, for, casts, sufixos e Servo', () => {
    const { code } = transpile(`int notas[] = {1, 2, 3};
Servo s;
void setup() {
  for (int i = 0; i < 3; i++) {
    long x = 1000UL;
    float f = (float)x / 3.5f;
    int q = (int)f;
  }
}
void loop() {}`);
    expect(code).toContain('let notas = [1, 2, 3];');
    expect(code).toContain('let s = new Servo();');
    expect(code).toContain('for (let i = 0; i < 3; i++) { await __tick();');
    expect(code).toContain('let x = 1000;');
    expect(code).toContain('let f = x / 3.5;');
    expect(code).toContain('let q = __int(f);');
  });

  it('não mexe em strings', () => {
    const { code } = transpile('void setup() { Serial.println("delay(5) 10UL"); }\nvoid loop() {}');
    expect(code).toContain('"delay(5) 10UL"');
  });
});

describe('checkSyntax', () => {
  const check = (s) => checkSyntax(stripComments(s));

  it('aceita código válido', () => {
    expect(check('void setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop()\n{\n  if (1)\n    delay(1);\n  else\n    delay(2);\n}')).toBeNull();
    expect(check('int a[] = {\n  1,\n  2\n};')).toBeNull();
  });

  it('acusa ponto e vírgula esquecido com a linha', () => {
    const e = check('void setup() {\n  pinMode(13, OUTPUT)\n}\nvoid loop() {}');
    expect(e.line).toBe(2);
    expect(e.message).toMatch(/ponto e vírgula/);
  });

  it('acusa chave não fechada, sobrando e aspas', () => {
    expect(check('void setup() {\n').message).toMatch(/nunca foi fechado/);
    expect(check('void setup() {}\n}').message).toMatch(/sobrando/);
    expect(check('void setup() {\n Serial.println("oi);\n}').message).toMatch(/aspas/);
  });
});
