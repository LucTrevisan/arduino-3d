import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { mat } from '../scene/materials.js';
import { loadModelOrProcedural } from '../scene/modelLoader.js';

const COLORS = {
  vermelho: '#ff2a1f',
  verde: '#22d44a',
  amarelo: '#ffc61a',
  azul: '#2a6bff',
  branco: '#fff2d6',
};

/**
 * LED 5 mm. Pernas: anodo (+, mais longa) em x=-0.127, catodo em x=+0.127.
 * @returns {{root, anchors, attach(bus), setLevel(n), dispose()}}
 */
export function createLed(scene, { id = 'led', pino, cor = 'vermelho', position }) {
  const hex = COLORS[cor] ?? COLORS.vermelho;
  const base = Color3.FromHexString(hex);
  const root = loadModelOrProcedural('led', () => new TransformNode(id, scene));
  if (position) root.position.copyFrom(position);

  const lensMat = new StandardMaterial(`${id}-lens`, scene);
  lensMat.diffuseColor = base.scale(0.55);
  lensMat.specularColor = new Color3(0.4, 0.4, 0.4);
  lensMat.alpha = 0.92;

  const body = MeshBuilder.CreateCylinder(`${id}-body`, { diameter: 0.5, height: 0.55, tessellation: 24 }, scene);
  body.parent = root;
  body.position.y = 0.3;
  body.material = lensMat;
  const dome = MeshBuilder.CreateSphere(`${id}-dome`, { diameter: 0.5, segments: 16, slice: 0.5 }, scene);
  dome.parent = root;
  dome.position.y = 0.575;
  dome.material = lensMat;
  const rim = MeshBuilder.CreateCylinder(`${id}-rim`, { diameter: 0.58, height: 0.05, tessellation: 24 }, scene);
  rim.parent = root;
  rim.position.y = 0.05;
  rim.material = lensMat;

  const metal = mat(scene, '#c9ced4', { specular: 0.5 });
  for (const [name, x, h] of [['anodo', -0.127, 0.9], ['catodo', 0.127, 0.7]]) {
    const leg = MeshBuilder.CreateBox(`${id}-${name}`, { width: 0.04, height: h, depth: 0.04 }, scene);
    leg.parent = root;
    leg.position.set(x, -h / 2 + 0.03, 0);
    leg.material = metal;
  }

  const anchors = { anodo: [-0.127, -0.85, 0], catodo: [0.127, -0.65, 0] };

  function setLevel(n) {
    const v = Math.max(0, Math.min(1, n));
    lensMat.emissiveColor = base.scale(v * 1.1);
    lensMat.diffuseColor = base.scale(0.55 + 0.45 * v);
  }
  setLevel(0);

  let off = null;
  function attach(bus, p = pino) {
    off?.();
    const apply = (s) => setLevel(s.pwm != null ? s.pwm / 255 : s.value ? 1 : 0);
    off = bus.on(p, apply);
    apply(bus.state(p));
  }

  return { root, anchors, attach, setLevel, dispose: () => { off?.(); root.dispose(false, true); } };
}
