import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Curve3 } from '@babylonjs/core/Maths/math.path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { mat } from './materials.js';

export const WIRE_COLORS = {
  vermelho: '#d6322e',
  preto: '#22252a',
  amarelo: '#e8b923',
  verde: '#2e9e4f',
  azul: '#2f6fd0',
  laranja: '#e8741f',
  branco: '#e4e6ea',
  roxo: '#7b4bb8',
  marrom: '#7a4a21',
};

/**
 * Fio jumper em arco entre dois pontos (espaço do mundo), com pontas metálicas encaixadas
 * 0,3 cm abaixo dos pontos. Retorna um nó; `dispose()` remove tudo.
 */
export function createWire(scene, from, to, cor = 'amarelo', lift = 0.3) {
  const root = new TransformNode('wire', scene);
  const a = from.add(new Vector3(0, 0.3, 0));
  const b = to.add(new Vector3(0, 0.3, 0));
  const mid = Vector3.Center(a, b);
  mid.y += lift + Vector3.Distance(a, b) * 0.15;
  const path = Curve3.CreateQuadraticBezier(a, mid, b, 24).getPoints();
  const tube = MeshBuilder.CreateTube('wire-tube', { path, radius: 0.06, tessellation: 10, cap: 3 }, scene);
  tube.parent = root;
  tube.material = mat(scene, WIRE_COLORS[cor] ?? WIRE_COLORS.amarelo, { specular: 0.3 });
  tube.isPickable = false;
  for (const end of [from, to]) {
    const pin = MeshBuilder.CreateBox('wire-pin', { width: 0.05, height: 0.45, depth: 0.05 }, scene);
    pin.parent = root;
    pin.position.set(end.x, end.y + 0.075, end.z);
    pin.material = mat(scene, '#c9ced4', { specular: 0.6 });
    pin.isPickable = false;
  }
  return root;
}
