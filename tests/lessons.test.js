import { describe, it, expect } from 'vitest';
import { lessons } from '../src/lessons/index.js';
import { transpile } from '../src/sim/transpiler.js';

const BOARD_PINS = /^(D(?:\d|1[0-3])|A[0-5]|5V|3V3|GND|VIN)$/;
const TIPOS = ['led', 'resistor', 'button', 'pot', 'servo', 'ultrasonic', 'buzzer'];

describe.each(lessons)('lição $id', (l) => {
  it('tem os campos obrigatórios', () => {
    for (const k of ['id', 'nivel', 'titulo', 'resumo', 'objetivos', 'componentes', 'ligacoes', 'codigoInicial', 'desafio', 'pinagem', 'especificacoes'])
      expect(l[k], k).toBeTruthy();
    expect(l.desafio.enunciado).toBeTruthy();
    expect(l.desafio.verificacao).toBeTruthy();
  });

  it('ligações apontam para pinos e componentes existentes', () => {
    const ids = new Set(l.componentes.map((c) => c.id));
    for (const c of l.componentes) expect(TIPOS).toContain(c.tipo);
    for (const { de, para } of l.ligacoes)
      for (const ref of [de, para]) {
        if (BOARD_PINS.test(ref)) continue;
        expect(ids.has(ref.split('.')[0]), ref).toBe(true);
      }
  });

  it('código inicial e exemplo compilam', () => {
    for (const code of [l.codigoInicial, l.exemplo].filter(Boolean)) {
      const r = transpile(code);
      expect(r.error?.message).toBeUndefined();
      expect(r.functions).toEqual(expect.arrayContaining(['setup', 'loop']));
    }
  });
});

it('ids de lições são únicos', () => {
  expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
});
