import { createLed } from './led.js';
import { createResistor } from './resistor.js';
import { createButton } from './button.js';
import { createPot } from './pot.js';
import { createServo } from './servo.js';
import { createUltrasonic } from './ultrasonic.js';
import { createBuzzer } from './buzzer.js';

// Cada módulo: (scene, def) → { root, anchors, attach(bus), dispose(), inputs? }
export const registry = {
  led: createLed,
  resistor: createResistor,
  button: createButton,
  pot: createPot,
  servo: createServo,
  ultrasonic: createUltrasonic,
  buzzer: createBuzzer,
};

export function createComponent(scene, def, position) {
  const factory = registry[def.tipo];
  if (!factory) throw new Error(`Componente desconhecido: ${def.tipo}`);
  return factory(scene, { ...def, position });
}
