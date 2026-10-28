import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';

/**
 * Arrastar/clicar numa malha sem a câmera girar junto.
 * `scene.metadata` guarda { camera, canvas } (definido em createScene).
 * @returns {() => void} função para remover os ouvintes
 */
export function makeInteractive(scene, mesh, { onStart, onMove, onEnd }) {
  const { camera, canvas } = scene.metadata;
  let active = false;
  const obs = scene.onPointerObservable.add((pi) => {
    if (pi.type === PointerEventTypes.POINTERDOWN) {
      const p = pi.pickInfo;
      if (p?.hit && (p.pickedMesh === mesh || p.pickedMesh?.isDescendantOf(mesh))) {
        active = true;
        camera.detachControl();
        onStart?.(pi.event);
      }
    } else if (pi.type === PointerEventTypes.POINTERMOVE && active) {
      onMove?.(pi.event);
    } else if (pi.type === PointerEventTypes.POINTERUP && active) {
      active = false;
      camera.attachControl(canvas, true);
      onEnd?.(pi.event);
    }
  });
  return () => {
    scene.onPointerObservable.remove(obs);
    if (active) camera.attachControl(canvas, true);
  };
}
