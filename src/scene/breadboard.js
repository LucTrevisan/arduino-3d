import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { mat } from './materials.js';

// Dois meios protoboards lado a lado, com um pequeno vão no meio.
export const BREADBOARD = { w: 8.4, h: 0.5, d: 5.0, gap: 0.4, center: new Vector3(0, 0, 6.2) };

const PITCH = 0.254;

/** Textura de furos e trilhos de um meio protoboard. */
function halfTexture(scene, w, d) {
  const W = 1024;
  const H = Math.round((W * d) / w);
  const tex = new DynamicTexture('bb-tex', { width: W, height: H }, scene, true);
  tex.hasAlpha = true;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, W, H);
  const px = W / w;
  const dot = (x, z) => {
    ctx.fillStyle = '#3a3d44';
    ctx.fillRect(W / 2 + x * px - 3, H / 2 - z * px - 3, 6, 6);
  };
  const cols = Math.floor((w - 0.8) / PITCH);
  const x0 = -((cols - 1) * PITCH) / 2;
  for (const [z, c] of [[-2.21, '#2f6fd0'], [-1.95, '#c0392b'], [1.95, '#c0392b'], [2.21, '#2f6fd0']]) {
    ctx.fillStyle = c;
    ctx.fillRect(W / 2 - (w / 2 - 0.25) * px, H / 2 - (z + (z > 0 ? 0.13 : -0.13)) * px - 1, (w - 0.5) * px, 2);
    for (let i = 0; i < cols; i++) if (i % 6 !== 5) dot(x0 + i * PITCH, z);
  }
  for (let r = 0; r < 5; r++) {
    for (let i = 0; i < cols; i++) {
      dot(x0 + i * PITCH, -0.2 - PITCH * (r + 0.5));
      dot(x0 + i * PITCH, 0.2 + PITCH * (r + 0.5));
    }
  }
  tex.update();
  const m = new StandardMaterial('bb-top', scene);
  m.diffuseTexture = tex;
  m.useAlphaFromDiffuseTexture = true;
  m.emissiveColor = new Color3(0.25, 0.25, 0.25);
  m.specularColor = Color3.Black();
  return m;
}

/** Protoboard procedural. `surface` = ponto (centro) da superfície onde se encaixam os componentes. */
export function createBreadboard(scene) {
  const { w, h, d, gap, center } = BREADBOARD;
  const half = (w - gap) / 2;
  const root = new TransformNode('breadboard', scene);
  root.position.copyFrom(center);
  const topMat = halfTexture(scene, half, d);

  for (const side of [-1, 1]) {
    const x = side * (half / 2 + gap / 2);
    const body = MeshBuilder.CreateBox('bb-body', { width: half, height: h, depth: d }, scene);
    body.parent = root;
    body.position.set(x, h / 2, 0);
    body.material = mat(scene, '#ece7da', { specular: 0.05 });
    const top = MeshBuilder.CreatePlane('bb-top', { width: half, height: d }, scene);
    top.parent = root;
    top.rotation.x = Math.PI / 2;
    top.position.set(x, h + 0.004, 0);
    top.material = topMat;
    top.isPickable = false;
  }

  return {
    root,
    surface: new Vector3(center.x, h, center.z),
    dispose: () => root.dispose(false, true),
  };
}
