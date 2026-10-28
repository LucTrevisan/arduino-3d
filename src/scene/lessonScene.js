import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createBreadboard } from './breadboard.js';
import { pinPositions } from './board.js';
import { createWire } from './wires.js';
import { createComponent } from '../components/index.js';
import { componentPart, breadboardPart, wirePart } from './parts.js';

/**
 * Monta protoboard, componentes e fios descritos pela lição.
 * `posicao: [x, z]` é relativa ao centro do protoboard (cm).
 * Pontos de ligação: "D13", "A0", "5V", "GND" (placa) ou "id.ancora" (componente).
 * @returns {{inputs: object[], parts: object[], dispose(): void}}
 *   `inputs` = controles acionáveis pelo aluno; `parts` = peças localizáveis (componentes e fios)
 */
export function buildLessonScene(scene, bus, lesson) {
  const breadboard = createBreadboard(scene);
  const comps = new Map();
  const wires = [];
  const inputs = [];
  const parts = [breadboardPart(breadboard.surface.add(new Vector3(0, 0.1, 0)))];

  for (const def of lesson.componentes ?? []) {
    const [x, z] = def.posicao ?? [0, 0];
    const pos = breadboard.surface.add(new Vector3(x, 0, z));
    const comp = createComponent(scene, def, pos);
    comp.attach(bus);
    comps.set(def.id, comp);
    inputs.push(...(comp.inputs ?? []));
    parts.push(componentPart(def, pos.add(new Vector3(0, 0.6, 0))));
  }

  function resolve(ref) {
    if (ref in pinPositions) return pinPositions[ref].clone();
    const [id, anchor] = ref.split('.');
    const comp = comps.get(id);
    const a = comp?.anchors[anchor];
    if (!a) throw new Error(`Ponto de ligação desconhecido: ${ref}`);
    return Vector3.TransformCoordinates(new Vector3(...a), comp.root.computeWorldMatrix(true));
  }

  for (const l of lesson.ligacoes ?? []) {
    const a = resolve(l.de);
    const b = resolve(l.para);
    wires.push(createWire(scene, a, b, l.cor));
    const mid = Vector3.Center(a, b);
    mid.y += 0.5 + Vector3.Distance(a, b) * 0.1;
    parts.push(wirePart(l, mid));
  }

  return {
    inputs,
    parts,
    dispose() {
      wires.forEach((w) => w.dispose());
      comps.forEach((c) => c.dispose());
      breadboard.dispose();
    },
  };
}
