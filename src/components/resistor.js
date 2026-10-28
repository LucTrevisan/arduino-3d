import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { mat } from '../scene/materials.js';
import { loadModelOrProcedural } from '../scene/modelLoader.js';

const BANDS = { // 330 Ω: laranja, laranja, marrom
  '330': ['#e8741f', '#e8741f', '#6b3d1a'],
  '220': ['#d6322e', '#d6322e', '#6b3d1a'],
  '1k': ['#6b3d1a', '#17191d', '#d6322e'],
  '10k': ['#6b3d1a', '#17191d', '#17191d'],
};

/** Resistor (só visual). Pontas: a (x=-0,5) e b (x=+0,5). `position` = superfície do protoboard. */
export function createResistor(scene, { id = 'r', valor = '330', position }) {
  const root = loadModelOrProcedural('resistor', () => new TransformNode(id, scene));
  if (position) root.position.copyFrom(position);
  const H = 0.38;

  const body = MeshBuilder.CreateCylinder(`${id}-body`, { diameter: 0.22, height: 0.6, tessellation: 16 }, scene);
  body.parent = root;
  body.rotation.z = Math.PI / 2;
  body.position.y = H;
  body.material = mat(scene, '#d9c28f');
  (BANDS[valor] ?? BANDS['330']).forEach((hex, i) => {
    const band = MeshBuilder.CreateCylinder(`${id}-band${i}`, { diameter: 0.235, height: 0.05, tessellation: 16 }, scene);
    band.parent = root;
    band.rotation.z = Math.PI / 2;
    band.position.set(-0.17 + i * 0.12, H, 0);
    band.material = mat(scene, hex);
  });
  const metal = mat(scene, '#c9ced4', { specular: 0.5 });
  for (const x of [-0.5, 0.5]) {
    const leg = MeshBuilder.CreateBox(`${id}-leg`, { width: 0.04, height: H, depth: 0.04 }, scene);
    leg.parent = root;
    leg.position.set(x, H / 2, 0);
    leg.material = metal;
    const lead = MeshBuilder.CreateBox(`${id}-lead`, { width: 0.2, height: 0.04, depth: 0.04 }, scene);
    lead.parent = root;
    lead.position.set(x * 0.8, H, 0);
    lead.material = metal;
  }

  return {
    root,
    anchors: { a: [-0.5, 0.05, 0], b: [0.5, 0.05, 0] },
    attach() {},
    dispose: () => root.dispose(false, true),
  };
}
