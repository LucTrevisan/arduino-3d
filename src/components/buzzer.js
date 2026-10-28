import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { mat } from '../scene/materials.js';
import { loadModelOrProcedural } from '../scene/modelLoader.js';
import { createVoice } from '../ui/audio.js';
import { pinNumber } from '../sim/pinbus.js';

/** Buzzer: anéis pulsando + som (tone(freq) ou HIGH em buzzer ativo). */
export function createBuzzer(scene, { id = 'buzzer', pino, position }) {
  const root = loadModelOrProcedural('buzzer', () => new TransformNode(id, scene));
  if (position) root.position.copyFrom(position);
  const pin = pinNumber(pino);

  const body = MeshBuilder.CreateCylinder(`${id}-body`, { diameter: 1.1, height: 0.55, tessellation: 28 }, scene);
  body.parent = root;
  body.position.y = 0.3;
  body.material = mat(scene, '#17191d');
  const hole = MeshBuilder.CreateCylinder(`${id}-hole`, { diameter: 0.18, height: 0.02, tessellation: 12 }, scene);
  hole.parent = root;
  hole.position.y = 0.58;
  hole.material = mat(scene, '#555a63');
  const metal = mat(scene, '#c9ced4', { specular: 0.5 });
  for (const x of [-0.25, 0.25]) {
    const leg = MeshBuilder.CreateBox(`${id}-leg`, { width: 0.04, height: 0.35, depth: 0.04 }, scene);
    leg.parent = root;
    leg.position.set(x, 0.05, 0);
    leg.material = metal;
  }

  const ringMat = new StandardMaterial(`${id}-ring`, scene);
  ringMat.emissiveColor = new Color3(1, 0.75, 0.2);
  ringMat.disableLighting = true;
  ringMat.alpha = 0;
  const rings = [0, 1, 2].map((i) => {
    const r = MeshBuilder.CreateTorus(`${id}-wave${i}`, { diameter: 1.2, thickness: 0.04, tessellation: 32 }, scene);
    r.parent = root;
    r.position.y = 0.7;
    r.material = ringMat;
    r.isPickable = false;
    return r;
  });

  let freq = 0;
  const voice = createVoice();
  const t0 = performance.now();
  const anim = scene.onBeforeRenderObservable.add(() => {
    ringMat.alpha = freq ? 0.9 : 0;
    if (!freq) return;
    const t = (performance.now() - t0) / 600;
    rings.forEach((r, i) => {
      const p = (t + i / 3) % 1;
      const s = 1 + p * 1.2;
      r.scaling.set(s, s, s);
      r.position.y = 0.7 + p * 0.5;
    });
    ringMat.alpha = 0.9 * (1 - ((t) % 1) * 0.6);
  });

  let off = null;
  return {
    root,
    anchors: { positivo: [-0.25, 0.05, 0], negativo: [0.25, 0.05, 0] },
    attach(bus) {
      const apply = (s) => {
        freq = s.tone > 0 ? s.tone : s.value && s.mode === 'OUTPUT' ? 2000 : 0;
        voice.set(freq);
      };
      off = bus.on(pin, apply);
      apply(bus.state(pin));
    },
    dispose() {
      off?.();
      voice.dispose();
      scene.onBeforeRenderObservable.remove(anim);
      root.dispose(false, true);
    },
  };
}
