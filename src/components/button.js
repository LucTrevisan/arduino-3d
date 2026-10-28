import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { mat } from '../scene/materials.js';
import { loadModelOrProcedural } from '../scene/modelLoader.js';
import { makeInteractive } from '../scene/interaction.js';
import { pinNumber } from '../sim/pinbus.js';
import { t } from '../i18n/index.js';

/**
 * Botão de pressão. `ativoEm`: nível do pino quando pressionado ('LOW' com INPUT_PULLUP, 'HIGH' com pull-down).
 * Segurar o clique = botão pressionado.
 */
export function createButton(scene, { id = 'btn', pino, ativoEm = 'LOW', position }) {
  const root = loadModelOrProcedural('button', () => new TransformNode(id, scene));
  if (position) root.position.copyFrom(position);
  const pin = pinNumber(pino);
  const active = ativoEm === 'HIGH' ? 1 : 0;

  const base = MeshBuilder.CreateBox(`${id}-base`, { width: 0.7, height: 0.3, depth: 0.7 }, scene);
  base.parent = root;
  base.position.y = 0.2;
  base.material = mat(scene, '#22252a');
  const cap = MeshBuilder.CreateCylinder(`${id}-cap`, { diameter: 0.42, height: 0.22, tessellation: 20 }, scene);
  cap.parent = root;
  cap.material = mat(scene, '#d6322e', { specular: 0.3 });
  const metal = mat(scene, '#c9ced4', { specular: 0.5 });
  for (const x of [-0.25, 0.25]) {
    const leg = MeshBuilder.CreateBox(`${id}-leg`, { width: 0.05, height: 0.2, depth: 0.05 }, scene);
    leg.parent = root;
    leg.position.set(x, 0.1, 0);
    leg.material = metal;
  }

  const setPressed = (p) => {
    cap.position.y = p ? 0.4 : 0.5;
  };
  setPressed(false);

  let bus = null;
  let off = null;
  let pressed = false;
  const press = (p) => {
    pressed = p;
    bus?.write(pin, { value: p ? active : 1 - active, ext: true });
  };
  const stopInteraction = makeInteractive(scene, cap, {
    onStart: () => press(true),
    onEnd: () => press(false),
  });

  return {
    root,
    anchors: { a: [-0.25, 0.05, 0], b: [0.25, 0.05, 0] },
    inputs: [{ kind: 'hold', label: t('ui.entradas.botao', { pino: pin }), set: press, isOn: () => pressed }],
    attach(b) {
      bus = b;
      b.write(pin, { value: 1 - active, ext: true });
      off = b.on(pin, (s) => setPressed(s.value === active));
    },
    dispose() {
      off?.();
      stopInteraction();
      root.dispose(false, true);
    },
  };
}
