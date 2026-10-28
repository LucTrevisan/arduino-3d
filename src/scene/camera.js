import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

/** Câmera ArcRotate: mouse/toque (orbitar, zoom), WASD move o alvo, Q/E gira. */
export function createCamera(scene, canvas) {
  const cam = new ArcRotateCamera('cam', -Math.PI / 2, 1.0, 12, new Vector3(0, 0, 0.5), scene);
  cam.lowerRadiusLimit = 3;
  cam.upperRadiusLimit = 30;
  cam.lowerBetaLimit = 0.1;
  cam.upperBetaLimit = Math.PI / 2 - 0.05;
  cam.wheelDeltaPercentage = 0.01;
  cam.pinchDeltaPercentage = 0.01;
  cam.panningSensibility = 600;
  cam.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
  cam.attachControl(canvas, true);

  const keys = new Set();
  const onDown = (e) => {
    if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.target?.closest?.('.cm-editor')) return;
    keys.add(e.key.toLowerCase());
  };
  const onUp = (e) => keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', () => keys.clear());

  scene.onBeforeRenderObservable.add(() => {
    if (!keys.size) return;
    const dt = scene.getEngine().getDeltaTime() / 1000;
    const speed = cam.radius * 0.6 * dt;
    const fwd = new Vector3(Math.cos(cam.alpha), 0, Math.sin(cam.alpha)).scale(-1);
    const right = new Vector3(-fwd.z, 0, fwd.x).scale(-1);
    if (keys.has('w')) cam.target.addInPlace(fwd.scale(speed));
    if (keys.has('s')) cam.target.addInPlace(fwd.scale(-speed));
    if (keys.has('d')) cam.target.addInPlace(right.scale(speed));
    if (keys.has('a')) cam.target.addInPlace(right.scale(-speed));
    if (keys.has('q')) cam.alpha -= 1.5 * dt;
    if (keys.has('e')) cam.alpha += 1.5 * dt;
  });

  return cam;
}
