import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { mat } from '../scene/materials.js';
import { loadModelOrProcedural } from '../scene/modelLoader.js';
import { pinNumber } from '../sim/pinbus.js';

const SPEED = 5.2; // rad/s (≈ 300°/s, como um servo SG90)

/** Micro servo: o braço gira suavemente até o ângulo (0–180°) escrito pelo programa. */
export function createServo(scene, { id = 'servo', pino, position }) {
  const root = loadModelOrProcedural('servo', () => new TransformNode(id, scene));
  if (position) root.position.copyFrom(position);
  const pin = pinNumber(pino);

  const body = MeshBuilder.CreateBox(`${id}-body`, { width: 2.2, height: 1.2, depth: 1.2 }, scene);
  body.parent = root;
  body.position.y = 0.6;
  body.material = mat(scene, '#2a5db0');
  for (const x of [-1.45, 1.45]) {
    const ear = MeshBuilder.CreateBox(`${id}-ear`, { width: 0.45, height: 0.1, depth: 1.2 }, scene);
    ear.parent = root;
    ear.position.set(x, 0.85, 0);
    ear.material = mat(scene, '#2a5db0');
  }
  const shaft = MeshBuilder.CreateCylinder(`${id}-shaft`, { diameter: 0.5, height: 0.35, tessellation: 20 }, scene);
  shaft.parent = root;
  shaft.position.set(0.55, 1.35, 0);
  shaft.material = mat(scene, '#e4e6ea');

  const pivot = new TransformNode(`${id}-pivot`, scene);
  pivot.parent = root;
  pivot.position.set(0.55, 1.55, 0);
  const arm = MeshBuilder.CreateBox(`${id}-arm`, { width: 1.5, height: 0.1, depth: 0.28 }, scene);
  arm.parent = pivot;
  arm.position.x = 0.55;
  arm.material = mat(scene, '#f2f2f2');
  const tip = MeshBuilder.CreateCylinder(`${id}-tip`, { diameter: 0.3, height: 0.1, tessellation: 16 }, scene);
  tip.parent = pivot;
  tip.position.x = 1.3;
  tip.material = mat(scene, '#d6322e');

  // 0° → braço aponta para a direita (+x), 180° → esquerda; gira por cima.
  const toRad = (deg) => (deg * Math.PI) / 180;
  let target = toRad(90);
  let current = target;
  pivot.rotation.y = -current;
  const tick = scene.onBeforeRenderObservable.add(() => {
    const step = (scene.getEngine().getDeltaTime() / 1000) * SPEED;
    const diff = target - current;
    current = Math.abs(diff) <= step ? target : current + Math.sign(diff) * step;
    pivot.rotation.y = -current;
  });

  let off = null;
  return {
    root,
    anchors: { gnd: [-0.3, 0.05, -0.75], vcc: [0, 0.05, -0.75], sinal: [0.3, 0.05, -0.75] },
    attach(bus) {
      off = bus.on(pin, (s) => { if (typeof s.servo === 'number') target = toRad(s.servo); });
      const s = bus.state(pin);
      if (typeof s.servo === 'number') target = current = toRad(s.servo);
    },
    dispose() {
      off?.();
      scene.onBeforeRenderObservable.remove(tick);
      root.dispose(false, true);
    },
  };
}
