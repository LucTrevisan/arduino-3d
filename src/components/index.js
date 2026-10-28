import { createLed } from './led.js';
import { createResistor } from './resistor.js';

// Cada módulo: (scene, def) → { root, anchors, attach(bus), dispose() }
export const registry = {
  led: createLed,
  resistor: createResistor,
};

export function createComponent(scene, def, position) {
  const factory = registry[def.tipo];
  if (!factory) throw new Error(`Componente desconhecido: ${def.tipo}`);
  return factory(scene, { ...def, position });
}
