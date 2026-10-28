import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import '@babylonjs/core/Meshes/Builders/torusBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';

/** Anel pulsante que marca a peça/pino localizado no diretório. */
export function createLocator(scene) {
  const ring = MeshBuilder.CreateTorus('locator', { diameter: 1, thickness: 0.07, tessellation: 40 }, scene);
  const m = new StandardMaterial('locator-m', scene);
  m.emissiveColor = new Color3(1, 0.7, 0.1);
  m.disableLighting = true;
  ring.material = m;
  ring.isPickable = false;
  ring.setEnabled(false);

  let until = 0;
  let base = 1;
  scene.onBeforeRenderObservable.add(() => {
    if (!ring.isEnabled()) return;
    const now = performance.now();
    if (now > until) { ring.setEnabled(false); return; }
    const s = base * (1 + 0.12 * Math.sin(now / 160));
    ring.scaling.set(s, s, s);
  });

  return {
    show(point, radius = 0.6, ms = 4000) {
      ring.position.copyFrom(point);
      ring.position.y = Math.max(ring.position.y, 0.2) + 0.1;
      base = Math.max(0.5, radius * 2);
      until = performance.now() + ms;
      ring.setEnabled(true);
    },
    hide() { ring.setEnabled(false); },
  };
}
