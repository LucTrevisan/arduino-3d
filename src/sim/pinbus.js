// Barramento de pinos: runtime e entradas (botão, pot) escrevem; componentes 3D escutam.
// Pinos numéricos: 0–13 digitais, 14–19 = A0–A5.

export const A0 = 14;

/** Converte "D13", "A0", 13 ou "A0" em número de pino. */
export function pinNumber(p) {
  if (typeof p === 'number') return p;
  const m = /^([DA])(\d+)$/i.exec(String(p).trim());
  if (!m) return NaN;
  return m[1].toUpperCase() === 'A' ? A0 + Number(m[2]) : Number(m[2]);
}

function freshState() {
  // value: nível digital (0/1); pwm: 0–255 ou null; analog: 0–1023 (entrada simulada)
  return { mode: null, value: 0, pwm: null, analog: 0 };
}

export class PinBus {
  constructor() {
    this.pins = new Map();
    this.listeners = new Map();
    this.history = [];
    this.clock = () => performance.now();
  }

  state(pin) {
    pin = pinNumber(pin);
    if (!this.pins.has(pin)) this.pins.set(pin, freshState());
    return this.pins.get(pin);
  }

  /** Mescla `patch` no estado do pino e notifica os ouvintes. */
  write(pin, patch) {
    pin = pinNumber(pin);
    const s = this.state(pin);
    Object.assign(s, patch);
    this.history.push({ t: this.clock(), pin, value: s.value, pwm: s.pwm, analog: s.analog });
    if (this.history.length > 5000) this.history.shift();
    for (const fn of this.listeners.get(pin) ?? []) fn(s, pin);
    for (const fn of this.listeners.get('*') ?? []) fn(s, pin);
  }

  read(pin) {
    return this.state(pin);
  }

  /** Escuta um pino (ou '*' para todos). Retorna função para cancelar. */
  on(pin, fn) {
    const key = pin === '*' ? '*' : pinNumber(pin);
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key).add(fn);
    return () => this.listeners.get(key).delete(fn);
  }

  reset() {
    const pins = [...this.pins.keys()];
    this.pins.clear();
    this.history.length = 0;
    for (const p of pins) for (const fn of this.listeners.get(p) ?? []) fn(this.state(p), p);
  }
}
