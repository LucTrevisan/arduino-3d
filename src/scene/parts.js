// Catálogo de "peças" localizáveis: placa, componentes do experimento, pinos e fios.
// Cada peça: { id, cat, nome, desc, point: Vector3 (mundo), r (raio do realce), marker?, n? }
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { t } from '../i18n/index.js';

/** Peças da placa Uno. `pos` em coordenadas do mundo (a placa fica na origem). */
const BOARD = [
  { id: 'usbc', pos: [-3.1, 0.55, 1.5], r: 0.8, marker: true },
  { id: 'jack', pos: [-3.0, 1.2, -1.6], r: 1.0, marker: true },
  { id: 'chip', pos: [0.35, 0.3, -0.35], r: 0.7, marker: true },
  { id: 'digital', pos: [0.15, 0.5, 2.3], r: 1.4, marker: true },
  { id: 'power', pos: [0.34, 0.5, -2.3], r: 1.0, marker: true },
  { id: 'analog', pos: [2.2, 0.5, -2.3], r: 0.9, marker: true },
  { id: 'reset', pos: [-2.9, 0.5, 2.15], r: 0.5 },
  { id: 'ledL', pos: [-1.1, 0.2, 1.8], r: 0.4 },
  { id: 'crystal', pos: [1.3, 0.35, -0.35], r: 0.5 },
  { id: 'icsp', pos: [2.85, 0.5, 0], r: 0.6 },
  { id: 'caps', pos: [-1.45, 0.9, -1.3], r: 0.7 },
  { id: 'usbserial', pos: [-1.75, 0.3, 0.9], r: 0.7 },
];

function pinDesc(name) {
  if (/^D\d+$/.test(name)) return ['D3', 'D5', 'D6', 'D9', 'D10', 'D11'].includes(name) ? t('pecas.pino.pwm') : t('pecas.pino.digital');
  if (/^A\d$/.test(name)) return t('pecas.pino.analog');
  return t(`pecas.pino.${name}`) === `pecas.pino.${name}` ? t('pecas.pino.outro') : t(`pecas.pino.${name}`);
}

/**
 * @param {object} o
 * @param {Record<string, Vector3>} o.pinPositions pinos da placa
 * @param {Array} o.experiment peças dos componentes/fios montados pela lição (já com `point`)
 * @returns peças ordenadas (experimento, placa, pinos) com `n` nos marcadores
 */
export function buildParts({ pinPositions, experiment }) {
  const board = BOARD.map((b) => ({
    id: b.id, cat: 'placa', nome: t(`pecas.${b.id}.nome`), desc: t(`pecas.${b.id}.desc`),
    point: new Vector3(...b.pos), r: b.r, marker: !!b.marker,
  }));
  const pins = Object.entries(pinPositions).map(([name, v]) => ({
    id: `pino:${name}`, cat: 'pinos', nome: t('pecas.pino.nome', { nome: name }), desc: pinDesc(name),
    point: v.clone(), r: 0.35,
  }));
  const wires = experiment.filter((p) => p.cat === 'fios');
  const rest = experiment.filter((p) => p.cat !== 'fios');
  const all = [...rest, ...board, ...pins, ...wires];
  let n = 0;
  for (const p of all) if (p.marker) p.n = ++n;
  return all;
}

/** Peça de componente montado: nome do tipo + id da lição. */
export function componentPart(def, point) {
  const tipo = t(`pecas.tipo.${def.tipo}.nome`);
  return { id: `comp:${def.id}`, cat: 'experimento', nome: `${tipo} (${def.id})`, desc: t(`pecas.tipo.${def.tipo}.desc`), point, r: 0.7, marker: true };
}

export function breadboardPart(point) {
  return { id: 'breadboard', cat: 'experimento', nome: t('pecas.breadboard.nome'), desc: t('pecas.breadboard.desc'), point, r: 2.2 };
}

export function wirePart(lig, point) {
  return {
    id: `fio:${lig.de}>${lig.para}`, cat: 'fios',
    nome: t('pecas.fio.nome', { de: lig.de, para: lig.para }), desc: t('pecas.fio.desc', { cor: lig.cor }),
    point, r: 0.5,
  };
}
