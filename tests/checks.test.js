import { describe, it, expect } from 'vitest';
import { PinBus } from '../src/sim/pinbus.js';
import { SketchRunner } from '../src/sim/runtime.js';
import { createVirtualTime, createRealTime } from '../src/sim/time.js';
import { runCheck } from '../src/lessons/checks.js';
import { getLesson } from '../src/lessons/index.js';

const lesson = (id) => getLesson(id);

/** Executa `code`, roda `scenario` (que pode mexer nas entradas) e devolve se o desafio passou. */
async function attempt(verificacao, code, { inputs = () => {}, scenario, real = false } = {}) {
  const bus = new PinBus();
  // real: sketches sem delay no loop não fazem o relógio virtual andar; aqui o tempo é de verdade.
  const time = real ? createRealTime() : createVirtualTime();
  const errors = [];
  const runner = new SketchRunner({ bus, time, onError: (e) => errors.push(e) });
  inputs(bus);
  runner.run(code);
  const waitSim = async (ms) => {
    const target = time.now() + ms;
    while (time.now() < target && runner.status === 'running') await new Promise((r) => setTimeout(r, 0));
  };
  await scenario({ bus, waitSim, time });
  const now = time.now();
  runner.stop();
  await runner.done;
  expect(errors).toEqual([]);
  return runCheck(verificacao, bus.history, now);
}

const idle = ({ waitSim }) => waitSim(4000);

describe('desafios', () => {
  it('01: pisca a cada 200 ms', async () => {
    const l = lesson('01-blink');
    expect(await attempt('pino13_alterna', l.codigoInicial, { scenario: idle })).toBe(false);
    expect(await attempt('pino13_alterna', l.codigoInicial.replaceAll('1000', '200'), { scenario: idle })).toBe(true);
  });

  it('02: semáforo verde → amarelo (2 s) → vermelho', async () => {
    const l = lesson('02-semaforo');
    const run = (code) => attempt('semaforo_sequencia', code, { scenario: ({ waitSim }) => waitSim(25000) });
    expect(await run(l.codigoInicial)).toBe(false);
    const sol = l.codigoInicial
      .replace(/digitalWrite\(vermelho, HIGH\);[\s\S]*digitalWrite\(amarelo, LOW\);/, `digitalWrite(verde, HIGH);
  delay(3000);
  digitalWrite(verde, LOW);
  digitalWrite(amarelo, HIGH);
  delay(2000);
  digitalWrite(amarelo, LOW);
  digitalWrite(vermelho, HIGH);
  delay(3000);
  digitalWrite(vermelho, LOW);`);
    expect(await run(sol)).toBe(true);
  });

  it('03: botão como interruptor', async () => {
    const l = lesson('03-botao-led');
    const scenario = async ({ bus, waitSim }) => {
      await waitSim(300);
      for (let i = 0; i < 2; i++) {
        bus.write(2, { value: 0, ext: true });
        await waitSim(100);
        bus.write(2, { value: 1, ext: true });
        await waitSim(600);
      }
    };
    const inputs = (bus) => bus.write(2, { value: 1, ext: true });
    expect(await attempt('botao_liga_desliga', l.codigoInicial, { scenario, inputs, real: true })).toBe(false);
    expect(await attempt('botao_liga_desliga', l.exemplo, { scenario, inputs, real: true })).toBe(true);
  });

  it('04: potenciômetro varia o PWM de 0 a 255', async () => {
    const l = lesson('04-potenciometro-pwm');
    const inputs = (bus) => bus.write(14, { analog: 512, ext: true });
    const sweep = async ({ bus, waitSim }) => {
      for (let v = 0; v <= 1023; v += 100) {
        bus.write(14, { analog: Math.min(v, 1023), ext: true });
        await waitSim(150);
      }
      bus.write(14, { analog: 1023, ext: true });
      await waitSim(150);
      bus.write(14, { analog: 0, ext: true });
      await waitSim(150);
    };
    expect(await attempt('pwm_varia', l.codigoInicial, { inputs, scenario: idle })).toBe(false);
    expect(await attempt('pwm_varia', l.codigoInicial, { inputs, scenario: sweep })).toBe(true);
  });

  it('05: servo lento (≥ 2 s de 0° a 180°)', async () => {
    const l = lesson('05-servo');
    const run = (code) => attempt('servo_0_180', code, { scenario: ({ waitSim }) => waitSim(8000) });
    expect(await run(l.codigoInicial)).toBe(false);
    expect(await run(l.exemplo)).toBe(false);
    expect(await run(l.codigoInicial.replaceAll('delay(15)', 'delay(30)'))).toBe(true);
  });

  it('06: alarme só abaixo de 15 cm', async () => {
    const l = lesson('06-ultrassonico-buzzer');
    const inputs = (bus) => bus.write(6, { distance: 60, ext: true });
    const scenario = async ({ bus, waitSim }) => {
      for (const d of [60, 10, 17, 40]) {
        bus.write(6, { distance: d, ext: true });
        await waitSim(500);
      }
    };
    expect(await attempt('buzzer_alerta_distancia', l.codigoInicial, { inputs, scenario })).toBe(false);
    expect(await attempt('buzzer_alerta_distancia', l.codigoInicial.replace('distancia < 20', 'distancia < 15'), { inputs, scenario })).toBe(true);
  });
});
