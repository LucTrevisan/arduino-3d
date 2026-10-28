import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { mat } from '../scene/materials.js';
import { loadModelOrProcedural } from '../scene/modelLoader.js';
import { makeInteractive } from '../scene/interaction.js';
import { pinNumber } from '../sim/pinbus.js';
import { t } from '../i18n/index.js';

const SWEEP = 2.4; // ± radianos (≈ 275° de curso)

/** Potenciômetro: arraste o botão com o mouse/dedo (esquerda/direita) para mudar o valor 0–1023. */
export function createPot(scene, { id = 'pot', pino, position }) {
  const root = loadModelOrProcedural('pot', () => new TransformNode(id, scene));
  if (position) root.position.copyFrom(position);
  const pin = pinNumber(pino);

  const body = MeshBuilder.CreateBox(`${id}-body`, { width: 1.1, height: 0.4, depth: 0.9 }, scene);
  body.parent = root;
  body.position.y = 0.2;
  body.material = mat(scene, '#2f6fd0');
  const knob = MeshBuilder.CreateCylinder(`${id}-knob`, { diameter: 0.8, height: 0.35, tessellation: 28 }, scene);
  knob.parent = root;
  knob.position.y = 0.55;
  knob.material = mat(scene, '#e4e6ea', { specular: 0.4 });
  const mark = MeshBuilder.CreateBox(`${id}-mark`, { width: 0.07, height: 0.04, depth: 0.32 }, scene);
  mark.parent = knob;
  mark.position.set(0, 0.19, 0.2);
  mark.material = mat(scene, '#d6322e');
  const metal = mat(scene, '#c9ced4', { specular: 0.5 });
  for (const x of [-0.3, 0, 0.3]) {
    const leg = MeshBuilder.CreateBox(`${id}-leg`, { width: 0.05, height: 0.3, depth: 0.05 }, scene);
    leg.parent = root;
    leg.position.set(x, 0.05, -0.55 + 0.15);
    leg.material = metal;
  }

  const show = (v) => { knob.rotation.y = -SWEEP + (v / 1023) * 2 * SWEEP; };
  let bus = null;
  let off = null;
  let lastX = 0;
  const setValue = (v) => bus?.write(pin, { analog: Math.max(0, Math.min(1023, Math.round(v))), ext: true });
  const stopInteraction = makeInteractive(scene, knob, {
    onStart: (e) => { lastX = e.clientX; },
    onMove: (e) => {
      setValue(bus.state(pin).analog + (e.clientX - lastX) * 4);
      lastX = e.clientX;
    },
  });

  return {
    root,
    anchors: { gnd: [-0.3, 0, -0.4], sinal: [0, 0, -0.4], vcc: [0.3, 0, -0.4] },
    inputs: [{ kind: 'range', label: t('ui.entradas.pot', { pino: `A${pin - 14}` }), pin, field: 'analog', min: 0, max: 1023, step: 1, set: setValue }],
    attach(b) {
      bus = b;
      b.write(pin, { analog: 512, ext: true });
      show(512);
      off = b.on(pin, (s) => show(s.analog));
    },
    dispose() {
      off?.();
      stopInteraction();
      root.dispose(false, true);
    },
  };
}
