import { describe, it, expect } from 'vitest';
import { PinBus } from '../src/sim/pinbus.js';
import { SketchRunner } from '../src/sim/runtime.js';
import { createVirtualTime } from '../src/sim/time.js';

function setup() {
  const bus = new PinBus();
  const time = createVirtualTime();
  const serial = [];
  const errors = [];
  const runner = new SketchRunner({
    bus, time,
    onSerial: (s) => serial.push(s),
    onError: (e) => errors.push(e),
  });
  return { bus, time, serial, errors, runner };
}

/** Deixa o programa rodar até o relógio virtual chegar em `ms`. */
async function runFor({ runner, time }, src, ms) {
  runner.run(src);
  while (time.now() < ms && runner.status === 'running') await new Promise((r) => setTimeout(r, 0));
  runner.stop();
  await runner.done;
}

const BLINK = `
const int led = 13;
void setup() { pinMode(led, OUTPUT); }
void loop() {
  digitalWrite(led, HIGH);
  delay(1000);
  digitalWrite(led, LOW);
  delay(1000);
}`;

describe('SketchRunner', () => {
  it('digitalWrite escreve no barramento', async () => {
    const env = setup();
    env.runner.run('void setup(){ pinMode(13, OUTPUT); digitalWrite(13, HIGH); }\nvoid loop(){ delay(10); }');
    await new Promise((r) => setTimeout(r, 20));
    expect(env.bus.read(13).value).toBe(1);
    env.runner.stop();
    expect(env.bus.read(13).value).toBe(0); // Parar apaga as saídas
  });

  it('Pisca LED alterna o pino 13 ao longo do tempo', async () => {
    const env = setup();
    await runFor(env, BLINK, 5000);
    const h = env.bus.history.filter((e) => e.pin === 13 && e.value !== undefined);
    const values = h.map((e) => e.value);
    expect(values.slice(0, 5)).toEqual([0, 1, 0, 1, 0].slice(0, 5).map((_, i) => (i === 0 ? 0 : i % 2)));
    expect(h.find((e) => e.value === 1).t).toBe(0);
  });

  it('analogWrite define PWM e Serial formata números', async () => {
    const env = setup();
    await runFor(env, `void setup(){ Serial.begin(9600); analogWrite(9, 300); Serial.println(7/2.0); Serial.println(5); Serial.println(255, HEX); Serial.print("a"); Serial.println(true); }
void loop(){ delay(1000); }`, 10);
    expect(env.bus.history.find((e) => e.pin === 9).pwm).toBe(255);
    expect(env.serial.join('')).toBe('3.50\n5\nFF\na1\n');
  });

  it('digitalRead/analogRead leem entradas externas; pullup começa em HIGH', async () => {
    const env = setup();
    env.bus.write('A0', { analog: 512, ext: true });
    await runFor(env, `void setup(){ pinMode(2, INPUT_PULLUP); Serial.println(digitalRead(2)); Serial.println(analogRead(A0)); Serial.println(map(analogRead(A0), 0, 1023, 0, 180)); }
void loop(){ delay(1000); }`, 10);
    expect(env.serial.join('')).toBe('1\n512\n90\n');
  });

  it('inteiros truncam na divisão', async () => {
    const env = setup();
    await runFor(env, `void setup(){ int a = 7 / 2; Serial.println(a); float b = 7 / 2.0; Serial.println(b); }
void loop(){ delay(1000); }`, 10);
    expect(env.serial.join('')).toBe('3\n3.50\n');
  });

  it('Servo e pulseIn funcionam via barramento', async () => {
    const env = setup();
    env.bus.write(10, { distance: 20, ext: true });
    await runFor(env, `Servo s;
void setup(){ s.attach(9); s.write(135); Serial.println(pulseIn(10, HIGH)); }
void loop(){ delay(1000); }`, 10);
    expect(env.bus.read(9).servo).toBe(135);
    expect(env.serial.join('')).toBe('1164\n');
  });

  it('funções do usuário assíncronas com delay', async () => {
    const env = setup();
    await runFor(env, `void piscar(int n) { for (int i = 0; i < n; i++) { digitalWrite(13, HIGH); delay(100); digitalWrite(13, LOW); delay(100); } }
void setup(){ piscar(3); Serial.println("fim"); }
void loop(){ delay(1000); }`, 700);
    expect(env.serial.join('')).toContain('fim');
    expect(env.bus.history.filter((e) => e.pin === 13 && e.value === 1)).toHaveLength(3);
  });

  it('millis acompanha o relógio simulado', async () => {
    const env = setup();
    await runFor(env, 'void setup(){ delay(250); Serial.println(millis()); }\nvoid loop(){ delay(1000); }', 300);
    expect(env.serial.join('')).toBe('250\n');
  });

  it('loop sem delay não trava: Parar funciona', async () => {
    const env = setup();
    env.runner.run('int x = 0;\nvoid setup(){}\nvoid loop(){ x++; }');
    await new Promise((r) => setTimeout(r, 30));
    env.runner.stop();
    await env.runner.done;
    expect(env.runner.status).toBe('stopped');
  });

  it('while(true) sem delay também cede ao navegador', async () => {
    const env = setup();
    env.runner.run('void setup(){\n  while (true) {\n  }\n}\nvoid loop(){}');
    await new Promise((r) => setTimeout(r, 30));
    env.runner.stop();
    await env.runner.done;
    expect(env.runner.status).toBe('stopped');
  });

  it('Reiniciar recomeça do zero', async () => {
    const env = setup();
    env.runner.run(BLINK);
    await new Promise((r) => setTimeout(r, 10));
    env.runner.restart(BLINK);
    await new Promise((r) => setTimeout(r, 10));
    expect(env.runner.status).toBe('running');
    env.runner.stop();
  });
});

describe('erros amigáveis', () => {
  it('sintaxe: indica a linha', () => {
    const env = setup();
    env.runner.run('void setup() {\n  pinMode(13, OUTPUT)\n}\nvoid loop() {}');
    expect(env.runner.status).toBe('error');
    expect(env.errors[0]).toMatch(/linha 2/);
  });

  it('função inexistente: sugere o nome certo e informa a linha', async () => {
    const env = setup();
    env.runner.run('void setup() {\n  pinMode(13, OUTPUT);\n  digitalwrite(13, HIGH);\n}\nvoid loop() {}');
    await env.runner.done;
    expect(env.runner.status).toBe('error');
    expect(env.errors[0]).toMatch(/digitalwrite/);
    expect(env.errors[0]).toMatch(/digitalWrite/);
    expect(env.errors[0]).toMatch(/linha 3/);
  });

  it('exige setup e loop', async () => {
    const env = setup();
    env.runner.run('void setup() {}');
    await env.runner.done;
    expect(env.errors[0]).toMatch(/setup\(\) e void loop\(\)/);
  });

  it('erro depois de parar não suja o estado', async () => {
    const env = setup();
    env.runner.run(BLINK);
    env.runner.stop();
    await env.runner.done;
    expect(env.errors).toHaveLength(0);
    expect(env.runner.status).toBe('stopped');
  });
});
