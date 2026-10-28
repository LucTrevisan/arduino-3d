import { describe, it, expect } from 'vitest';
import { filterParts } from '../src/ui/partsFilter.js';

const parts = [
  { id: 'comp:led1', cat: 'experimento', nome: 'LED (led1)', desc: 'Acende quando passa corrente.' },
  { id: 'usbc', cat: 'placa', nome: 'Conector USB-C', desc: 'Liga a placa ao computador.' },
  { id: 'pino:D13', cat: 'pinos', nome: 'Pino D13', desc: 'Entrada ou saída digital.' },
  { id: 'pino:A0', cat: 'pinos', nome: 'Pino A0', desc: 'Entrada analógica.' },
];

describe('filterParts', () => {
  it('sem filtro devolve tudo', () => expect(filterParts(parts)).toHaveLength(4));
  it('filtra por categoria', () => expect(filterParts(parts, '', 'pinos').map((p) => p.id)).toEqual(['pino:D13', 'pino:A0']));
  it('busca por nome, ignorando maiúsculas', () => expect(filterParts(parts, 'd13').map((p) => p.id)).toEqual(['pino:D13']));
  it('ignora acentos', () => expect(filterParts(parts, 'analogica').map((p) => p.id)).toEqual(['pino:A0']));
  it('combina texto e categoria', () => expect(filterParts(parts, 'led', 'placa')).toEqual([]));
});
