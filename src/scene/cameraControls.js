import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export const HOME = { alpha: -Math.PI / 2 - 0.45, beta: 0.85, radius: 21, target: new Vector3(0, -0.5, 3.2) };

const lerp = (a, b, k) => a + (b - a) * k;

/** Movimentos suaves de câmera: girar, aproximar, resetar e focar numa peça. */
export function createCameraControls(scene, camera) {
  let anim = null;

  const go = (to, dur = 500) => {
    anim = {
      t: 0, dur,
      from: { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: camera.target.clone() },
      to: { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: camera.target.clone(), ...to },
    };
  };

  scene.onBeforeRenderObservable.add(() => {
    if (!anim) return;
    anim.t = Math.min(1, anim.t + scene.getEngine().getDeltaTime() / anim.dur);
    const k = 1 - Math.pow(1 - anim.t, 3);
    const { from, to } = anim;
    camera.alpha = lerp(from.alpha, to.alpha, k);
    camera.beta = lerp(from.beta, to.beta, k);
    camera.radius = lerp(from.radius, to.radius, k);
    camera.target.copyFrom(Vector3.Lerp(from.target, to.target, k));
    if (anim.t >= 1) anim = null;
  });

  const clampRadius = (r) => Math.min(camera.upperRadiusLimit, Math.max(camera.lowerRadiusLimit, r));
  const api = {
    home() {
      camera.alpha = HOME.alpha;
      camera.beta = HOME.beta;
      camera.radius = HOME.radius;
      camera.target.copyFrom(HOME.target);
    },
    reset: () => go({ ...HOME, target: HOME.target.clone() }, 600),
    rotate: (delta) => go({ alpha: camera.alpha + delta }, 350),
    zoom: (factor) => go({ radius: clampRadius(camera.radius * factor) }, 250),
    focus(point, radius = 9) {
      go({ target: point.clone(), radius: clampRadius(Math.min(camera.radius, radius)) }, 600);
    },
  };
  return api;
}
