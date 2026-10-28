import { describe, it, expect, vi } from 'vitest';
import { PinBus, pinNumber } from '../src/sim/pinbus.js';

describe('PinBus', () => {
  it('converte nomes de pinos', () => {
    expect(pinNumber('D13')).toBe(13);
    expect(pinNumber('A0')).toBe(14);
    expect(pinNumber('A5')).toBe(19);
    expect(pinNumber(7)).toBe(7);
  });

  it('notifica ouvintes e guarda o estado', () => {
    const bus = new PinBus();
    const fn = vi.fn();
    const off = bus.on(13, fn);
    bus.write(13, { value: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(bus.read(13).value).toBe(1);
    off();
    bus.write(13, { value: 0 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
