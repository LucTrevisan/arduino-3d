import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createBreadboard } from './breadboard.js';
import { pinPositions } from './board.js';
import { createWire } from './wires.js';
import { createComponent } from '../components/index.js';

/**
 * Monta protoboard, componentes e fios descritos pela lição.
 * `posicao: [x, z]` é relativa ao centro do protoboard (cm).
 * Pontos de ligação: "D13", "A0", "5V", "GND" (placa) ou "id.ancora" (componente).
 */
export function buildLessonScene(scene, bus, lesson) {
  const breadboard = createBreadboard(scene);
  const comps = new Map();
  const wires = [];

  for (const def of lesson.componentes ?? []) {
    const [x, z] = def.posicao ?? [0, 0];
    const pos = breadboard.surface.add(new Vector3(x, 0, z));
    const comp = createComponent(scene, def, pos);
    comp.attach(bus, def.pino);
    comps.set(def.id, comp);
  }

  function resolve(ref) {
    if (ref in pinPositions) return pinPositions[ref].clone();
    const [id, anchor] = ref.split('.');
    const comp = comps.get(id);
    const a = comp?.anchors[anchor];
    if (!a) throw new Error(`Ponto de ligação desconhecido: ${ref}`);
    return comp.root.position.add(new Vector3(...a));
  }

  for (const l of lesson.ligacoes ?? []) {
    wires.push(createWire(scene, resolve(l.de), resolve(l.para), l.cor));
  }

  return {
    dispose() {
      wires.forEach((w) => w.dispose());
      comps.forEach((c) => c.dispose());
      breadboard.dispose();
    },
  };
}
