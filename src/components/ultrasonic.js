import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { mat } from '../scene/materials.js';
import { loadModelOrProcedural } from '../scene/modelLoader.js';
import { makeInteractive } from '../scene/interaction.js';
import { pinNumber } from '../sim/pinbus.js';
import { t } from '../i18n/index.js';

const SCALE = 0.04; // cm do mundo por cm "medido" (a cena é comprimida para caber)
const FRONT = 0.9; // distância (cm do mundo) do centro do sensor até a frente
const MIN = 2;
const MAX = 200;
const EYE_Y = 1.1;

/**
 * Sensor HC-SR04 apontando para +x, com um alvo (cartão) que desliza à frente.
 * A distância (cm) é escrita no pino de eco (`state.distance`) e lida por pulseIn().
 */
export function createUltrasonic(scene, { id = 'us', trig, eco, position, distanciaInicial = 60 }) {
  const root = loadModelOrProcedural('ultrasonic', () => new TransformNode(id, scene));
  if (position) root.position.copyFrom(position);
  const echoPin = pinNumber(eco);
  const trigPin = pinNumber(trig);

  // Modelado apontando para +z; o root gira para +x.
  const model = new TransformNode(`${id}-model`, scene);
  model.parent = root;
  model.rotation.y = Math.PI / 2;
  const board = MeshBuilder.CreateBox(`${id}-board`, { width: 2.4, height: 1.1, depth: 0.12 }, scene);
  board.parent = model;
  board.position.set(0, 0.8, 0);
  board.material = mat(scene, '#1d5fa8');
  for (const x of [-0.6, 0.6]) {
    const eye = MeshBuilder.CreateCylinder(`${id}-eye`, { diameter: 0.85, height: 0.45, tessellation: 24 }, scene);
    eye.parent = model;
    eye.rotation.x = Math.PI / 2;
    eye.position.set(x, 0.85, 0.25);
    eye.material = mat(scene, '#b8bec6', { specular: 0.5 });
    const mesh = MeshBuilder.CreateCylinder(`${id}-mesh`, { diameter: 0.6, height: 0.05, tessellation: 24 }, scene);
    mesh.parent = model;
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, 0.85, 0.49);
    mesh.material = mat(scene, '#22252a');
  }
  const metal = mat(scene, '#c9ced4', { specular: 0.5 });
  const pinXs = [-0.381, -0.127, 0.127, 0.381];
  pinXs.forEach((x) => {
    const leg = MeshBuilder.CreateBox(`${id}-leg`, { width: 0.05, height: 0.3, depth: 0.05 }, scene);
    leg.parent = model;
    leg.position.set(x, 0.15, -0.1);
    leg.material = metal;
  });

  // Alvo deslizante
  const target = MeshBuilder.CreateBox(`${id}-target`, { width: 0.18, height: 0.7, depth: 1.8 }, scene);
  target.parent = root;
  target.position.y = EYE_Y - 0.25;
  target.material = mat(scene, '#e8a13a');
  const toX = (cm) => FRONT + cm * SCALE;
  const toCm = (x) => Math.round((x - FRONT) / SCALE);

  let bus = null;
  let off = null;
  const setDistance = (cm) => {
    cm = Math.max(MIN, Math.min(MAX, Math.round(cm)));
    bus?.write(echoPin, { distance: cm, ext: true });
  };
  const stopInteraction = makeInteractive(scene, target, {
    onMove: () => {
      const { camera } = scene.metadata;
      const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), camera);
      if (Math.abs(ray.direction.y) < 1e-4) return;
      const y = root.position.y + target.position.y;
      const hit = ray.origin.add(ray.direction.scale((y - ray.origin.y) / ray.direction.y));
      setDistance(toCm(hit.x - root.position.x));
    },
  });

  return {
    root,
    // Pinos na parte de trás do sensor (lado -x do mundo), ordem vcc, trig, echo, gnd
    anchors: Object.fromEntries(['vcc', 'trig', 'echo', 'gnd'].map((n, i) =>
      [n, [-0.1, 0, -pinXs[i]]])),
    inputs: [{ kind: 'range', label: t('ui.entradas.distancia'), pin: echoPin, field: 'distance', min: MIN, max: MAX, step: 1, set: setDistance }],
    attach(b) {
      bus = b;
      setDistance(distanciaInicial);
      off = b.on(echoPin, (s) => { if (typeof s.distance === 'number') target.position.x = toX(s.distance); });
      target.position.x = toX(distanciaInicial);
    },
    pins: { trig: trigPin, echo: echoPin },
    dispose() {
      off?.();
      stopInteraction();
      root.dispose(false, true);
    },
  };
}
