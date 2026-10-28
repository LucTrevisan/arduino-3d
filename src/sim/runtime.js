// Runtime Arduino: executa o código transpilado e conversa com o PinBus.
// Nunca toca na cena 3D — só escreve/lê pinos.

import { transpile } from './transpiler.js';
import { friendlyError } from './errors.js';
import { pinNumber, A0 } from './pinbus.js';
import { StopSignal, createRealTime } from './time.js';
import { t } from '../i18n/index.js';

const INPUT = 0, OUTPUT = 1, INPUT_PULLUP = 2;
const yieldMacro = () => new Promise((r) => setTimeout(r, 0));

let lineOffset = null;
/** Linhas que o JS soma ao corpo de `new Function` (varia pouco entre motores). */
function getLineOffset() {
  if (lineOffset != null) return lineOffset;
  try {
    const s = new Function('return new Error().stack;\n//# sourceURL=arduino-probe')();
    const m = /arduino-probe:(\d+)/.exec(s);
    lineOffset = m ? Number(m[1]) - 1 : 2;
  } catch {
    lineOffset = 2;
  }
  return lineOffset;
}

function errorLine(err, totalLines) {
  const m = /arduino-sketch:(\d+):\d+/.exec(err?.stack ?? '');
  if (!m) return undefined;
  const line = Number(m[1]) - getLineOffset();
  return line >= 1 && line <= totalLines ? line : undefined;
}

function formatPrint(v, fmt) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) {
      const base = [2, 8, 16].includes(fmt) ? fmt : 10;
      return base === 10 ? String(v) : v.toString(base).toUpperCase();
    }
    return v.toFixed(Number.isInteger(fmt) && fmt >= 0 && fmt <= 10 ? fmt : 2);
  }
  return String(v);
}

export class SketchRunner {
  /**
   * @param {object} o
   * @param {import('./pinbus.js').PinBus} o.bus
   * @param {(text: string) => void} [o.onSerial]
   * @param {(message: string) => void} [o.onError]
   * @param {(status: 'idle'|'running'|'stopped'|'error') => void} [o.onStatus]
   */
  constructor({ bus, time = createRealTime(), onSerial = () => {}, onError = () => {}, onStatus = () => {},
    onClear = () => {}, yieldEvery = 2000, random = Math.random } = {}) {
    Object.assign(this, { bus, time, onSerial, onError, onStatus, onClear, yieldEvery, random });
    this.status = 'idle';
    this.ac = null;
    this.outputs = new Set();
    this.done = Promise.resolve();
  }

  get speed() { return this.time.speed; }
  set speed(v) { this.time.speed = v; }

  _setStatus(s) {
    this.status = s;
    this.onStatus(s);
  }

  _buildApi(signal) {
    const { bus, time } = this;
    const out = this.outputs;
    const mark = (p) => out.add(p);
    let ticks = 0;
    const constrain = (x, a, b) => Math.min(Math.max(x, a), b);
    const serial = {
      begin() {}, end() {}, flush() {}, available: () => 0, read: () => -1,
      print: (v, f) => this.onSerial(formatPrint(v, f)),
      println: (v = '', f) => this.onSerial(formatPrint(v, f) + '\n'),
      write: (v) => this.onSerial(typeof v === 'number' ? String.fromCharCode(v) : String(v)),
    };
    const analogPin = (p) => (typeof p === 'number' && p >= 0 && p <= 5 ? A0 + p : pinNumber(p));
    const runner = this;

    class Servo {
      attach(pin) { this.pin = pinNumber(pin); mark(this.pin); bus.write(this.pin, { mode: 'servo' }); return 1; }
      detach() { this.pin = undefined; }
      attached() { return this.pin !== undefined; }
      write(angle) {
        this.angle = constrain(Math.trunc(angle), 0, 180);
        if (this.pin !== undefined) bus.write(this.pin, { servo: this.angle });
      }
      writeMicroseconds(us) { this.write(((us - 544) * 180) / (2400 - 544)); }
      read() { return this.angle ?? 90; }
    }

    return {
      HIGH: 1, LOW: 0, INPUT, OUTPUT, INPUT_PULLUP, LED_BUILTIN: 13,
      A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19,
      DEC: 10, HEX: 16, BIN: 2, OCT: 8, PI: Math.PI,
      pinMode(pin, mode) {
        pin = pinNumber(pin);
        const s = bus.state(pin);
        const patch = { mode: mode === OUTPUT ? 'OUTPUT' : mode === INPUT_PULLUP ? 'INPUT_PULLUP' : 'INPUT' };
        if (mode === INPUT_PULLUP && !s.ext) patch.value = 1;
        if (mode === OUTPUT) mark(pin);
        bus.write(pin, patch);
      },
      digitalWrite(pin, v) { pin = pinNumber(pin); mark(pin); bus.write(pin, { value: v ? 1 : 0, pwm: null }); },
      digitalRead: (pin) => (bus.state(pin).value ? 1 : 0),
      analogWrite(pin, v) {
        pin = pinNumber(pin);
        mark(pin);
        const pwm = constrain(Math.trunc(v), 0, 255);
        bus.write(pin, { pwm, value: pwm > 0 ? 1 : 0 });
      },
      analogRead: (pin) => constrain(Math.trunc(bus.state(analogPin(pin)).analog ?? 0), 0, 1023),
      async delay(ms) { await time.sleep(Number(ms) || 0, signal); },
      async delayMicroseconds(us) { time.advance(us / 1000); },
      millis: () => Math.floor(time.now()),
      micros: () => Math.floor(time.now() * 1000),
      map: (x, a, b, c, d) => Math.trunc(((x - a) * (d - c)) / (b - a)) + c,
      constrain,
      random: (a, b) => {
        const [lo, hi] = b === undefined ? [0, a] : [a, b];
        return Math.floor(runner.random() * (hi - lo)) + lo;
      },
      randomSeed() {},
      abs: Math.abs, min: Math.min, max: Math.max, pow: Math.pow, sqrt: Math.sqrt,
      sin: Math.sin, cos: Math.cos, tan: Math.tan, round: Math.round, floor: Math.floor, ceil: Math.ceil,
      sq: (x) => x * x,
      F: (s) => s,
      tone(pin, freq, dur) {
        pin = pinNumber(pin);
        mark(pin);
        bus.write(pin, { tone: freq });
        if (dur) time.sleep(dur, signal).then(() => bus.write(pin, { tone: 0 }), () => {});
      },
      noTone(pin) { bus.write(pinNumber(pin), { tone: 0 }); },
      pulseIn(pin) {
        const d = bus.state(pin).distance;
        if (typeof d !== 'number' || d <= 0 || d > 400) return 0;
        const us = Math.round(d * 58.2);
        time.advance(us / 1000);
        return us;
      },
      Serial: serial,
      Servo,
      __int: Math.trunc,
      __tick() {
        if (signal.aborted) throw new StopSignal();
        if (++ticks % runner.yieldEvery === 0) {
          return yieldMacro().then(() => { if (signal.aborted) throw new StopSignal(); });
        }
      },
    };
  }

  _fail(message) {
    this.onError(t('erros.prefixo') + message);
    this._setStatus('error');
  }

  /** Compila e executa. Retorna uma promise que resolve quando o programa termina (Parar/erro). */
  run(source) {
    this.stop(true);
    const ac = new AbortController();
    this.ac = ac;
    this._resetPins();
    this.bus.history.length = 0; // histórico recomeça a cada execução (usado pelos desafios)

    const result = transpile(source);
    if (result.error) {
      this._fail(result.error.message);
      return (this.done = Promise.resolve());
    }
    const api = this._buildApi(ac.signal);
    const names = Object.keys(api);
    const total = source.split('\n').length;

    let factory;
    try {
      const body =
        `return (async () => {${result.code}\n;return { setup: typeof setup === 'function' ? setup : null, ` +
        `loop: typeof loop === 'function' ? loop : null };\n})();\n//# sourceURL=arduino-sketch`;
      factory = new Function(...names, body);
    } catch (e) {
      this._fail(friendlyError(e));
      return (this.done = Promise.resolve());
    }

    this.time.reset();
    this.bus.clock = () => this.time.now();
    this._setStatus('running');

    const known = [...names.filter((n) => !n.startsWith('__')), ...result.functions];
    this.done = (async () => {
      try {
        const entry = await factory(...names.map((n) => api[n]));
        if (!entry.setup || !entry.loop) throw Object.assign(new Error(t('erros.semSetupLoop')), { plain: true });
        await entry.setup();
        while (!ac.signal.aborted) {
          await entry.loop();
          await api.__tick();
        }
      } catch (e) {
        if (e instanceof StopSignal || this.ac !== ac) return;
        this.ac.abort();
        this._resetPins();
        if (e.plain) this._fail(e.message);
        else this._fail(friendlyError(e, { line: errorLine(e, total), known }));
      }
    })();
    return this.done;
  }

  /** Para o programa e apaga as saídas que ele ligou. */
  stop(silent = false) {
    if (!this.ac) return;
    const wasRunning = this.status === 'running';
    this.ac.abort();
    this.ac = null;
    this._resetPins();
    if (wasRunning && !silent) this._setStatus('stopped');
  }

  restart(source) {
    this.stop(true);
    this.onClear();
    return this.run(source);
  }

  _resetPins() {
    for (const p of this.outputs) this.bus.write(p, { value: 0, pwm: null, tone: 0 });
    for (const p of [...this.bus.pins.keys()]) this.bus.write(p, { mode: null });
    this.outputs.clear();
  }
}
