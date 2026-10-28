import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Curve3 } from '@babylonjs/core/Maths/math.path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
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

/** Fio em arco entre dois pontos (espaço do mundo). */
export function createWire(scene, from, to, cor = 'amarelo', lift = 0.3) {
  const mid = Vector3.Center(from, to);
  mid.y += lift + Vector3.Distance(from, to) * 0.15;
  const path = Curve3.CreateQuadraticBezier(from, mid, to, 24).getPoints();
  const tube = MeshBuilder.CreateTube('wire', { path, radius: 0.045, tessellation: 8, cap: 3 }, scene);
  tube.material = mat(scene, WIRE_COLORS[cor] ?? WIRE_COLORS.amarelo, { specular: 0.3 });
  tube.isPickable = false;
  return tube;
}
