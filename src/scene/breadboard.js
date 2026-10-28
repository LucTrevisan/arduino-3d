import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { mat } from './materials.js';

export const BREADBOARD = { w: 8.4, h: 0.5, d: 5.0, center: new Vector3(0, 0, 6.2) };

/** Protoboard procedural. `surface` = ponto (centro) da superfície onde se encaixam os componentes. */
export function createBreadboard(scene) {
  const { w, h, d, center } = BREADBOARD;
  const root = new TransformNode('breadboard', scene);
  root.position.copyFrom(center);

  const body = MeshBuilder.CreateBox('bb-body', { width: w, height: h, depth: d }, scene);
  body.parent = root;
  body.position.y = h / 2;
  body.material = mat(scene, '#ece7da', { specular: 0.05 });

  // Furos e trilhos desenhados numa textura sobre o topo.
  const W = 1024;
  const H = Math.round((W * d) / w);
  const tex = new DynamicTexture('bb-tex', { width: W, height: H }, scene, true);
  tex.hasAlpha = true;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, W, H);
  const px = W / w; // pixels por cm
  const dot = (x, z, color = '#3a3d44') => {
    ctx.fillStyle = color;
    ctx.fillRect(W / 2 + x * px - 3, H / 2 - z * px - 3, 6, 6);
  };
  const pitch = 0.254;
  const cols = Math.floor((w - 1) / pitch);
  const x0 = -((cols - 1) * pitch) / 2;
  // trilhos (2 linhas em cima: +/-, 2 embaixo)
  for (const [z, c] of [[-2.21, '#2f6fd0'], [-1.95, '#c0392b'], [1.95, '#c0392b'], [2.21, '#2f6fd0']]) {
    ctx.fillStyle = c;
    ctx.fillRect(W / 2 - (w / 2 - 0.35) * px, H / 2 - (z + (z > 0 ? 0.13 : -0.13)) * px - 1, (w - 0.7) * px, 2);
    for (let i = 0; i < cols; i++) if (i % 6 !== 5) dot(x0 + i * pitch, z);
  }
  // área central: 5 + 5 linhas separadas pelo canal
  for (let r = 0; r < 5; r++) {
    for (let i = 0; i < cols; i++) {
      dot(x0 + i * pitch, -0.2 - 0.254 * (r + 0.5));
      dot(x0 + i * pitch, 0.2 + 0.254 * (r + 0.5));
    }
  }
  tex.update();
  const topMat = new StandardMaterial('bb-top', scene);
  topMat.diffuseTexture = tex;
  topMat.useAlphaFromDiffuseTexture = true;
  topMat.emissiveColor = new Color3(0.25, 0.25, 0.25);
  topMat.specularColor = Color3.Black();
  const top = MeshBuilder.CreatePlane('bb-top', { width: w, height: d }, scene);
  top.parent = root;
  top.rotation.x = Math.PI / 2;
  top.position.y = h + 0.004;
  top.material = topMat;
  top.isPickable = false;

  return {
    root,
    surface: new Vector3(center.x, h, center.z),
    dispose: () => root.dispose(false, true),
  };
}
