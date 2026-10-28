import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Meshes/Builders/planeBuilder';
import '@babylonjs/core/Meshes/Builders/tubeBuilder';
import { createCamera } from './camera.js';
import { createCameraControls } from './cameraControls.js';
import { mat } from './materials.js';

export function createScene(canvas) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString('#dfe5ecff'); // igual ao chão: sem borda de mesa visível

  // Luz moderada: hemisférica suave + direcional para dar volume (evita modelos lavados).
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, -0.3), scene);
  hemi.intensity = 0.65;
  hemi.diffuse = new Color3(1, 1, 1);
  hemi.groundColor = new Color3(0.35, 0.38, 0.45);
  hemi.specular = Color3.Black();
  const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, 0.5), scene);
  sun.intensity = 0.55;

  const glow = new GlowLayer('glow', scene, { blurKernelSize: 32 });
  glow.intensity = 0.8;

  // Mesa
  const table = MeshBuilder.CreateBox('table', { width: 400, height: 0.4, depth: 400 }, scene);
  table.position.y = -0.4;
  table.material = mat(scene, '#dfe5ec', { specular: 0 });
  table.isPickable = false;

  const camera = createCamera(scene, canvas);
  scene.metadata = { camera, canvas };
  const cameraControls = createCameraControls(scene, camera);
  cameraControls.home();
  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());

  return { engine, scene, camera, glow, cameraControls };
}
