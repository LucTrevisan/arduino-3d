import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { t } from '../i18n/index.js';

const CARD_W = 178;
const CARD_H = 34;
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Marcadores numerados sobre as peças 3D e cartões de legenda ligados por linhas.
 * Os marcadores são botões HTML posicionados projetando o ponto 3D na tela a cada quadro.
 */
export function createSceneLabels({ scene, engine, camera, root, onSelect }) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('label-lines');
  root.replaceChildren(svg);

  let items = []; // { part, marker, card, line }
  let selectedId = null;
  let showAll = false;
  const tmp = new Vector3();

  function clear() {
    items.forEach((i) => { i.marker.remove(); i.card.remove(); i.line.remove(); });
    items = [];
  }

  function setParts(parts) {
    clear();
    for (const part of parts.filter((p) => p.marker)) {
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'marker';
      marker.textContent = String(part.n);
      marker.setAttribute('aria-label', t('cena.marcador', { n: part.n, nome: part.nome }));
      marker.addEventListener('click', () => onSelect(part));

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'label-card';
      card.tabIndex = -1;
      card.setAttribute('aria-hidden', 'true');
      card.innerHTML = '<span class="label-n"></span><span class="label-name"></span>';
      card.querySelector('.label-n').textContent = String(part.n).padStart(2, '0');
      card.querySelector('.label-name').textContent = part.nome;
      card.addEventListener('click', () => onSelect(part));

      const line = document.createElementNS(SVG_NS, 'line');
      svg.append(line);
      root.append(marker, card);
      items.push({ part, marker, card, line });
    }
  }

  function update() {
    if (!items.length) return;
    const rw = engine.getRenderWidth();
    const rh = engine.getRenderHeight();
    const W = root.clientWidth;
    const H = root.clientHeight;
    if (!W || !H) return;
    const viewport = camera.viewport.toGlobal(rw, rh);
    const transform = scene.getTransformMatrix();
    for (const it of items) {
      Vector3.ProjectToRef(it.part.point, Matrix.IdentityReadOnly, transform, viewport, tmp);
      it.x = (tmp.x / rw) * W;
      it.y = (tmp.y / rh) * H;
      it.visible = tmp.z > 0 && tmp.z < 1 && it.x > -20 && it.x < W + 20 && it.y > -20 && it.y < H + 20;
      it.marker.style.transform = `translate(${it.x - 13}px, ${it.y - 13}px)`;
      it.marker.hidden = !it.visible;
      it.marker.classList.toggle('selected', it.part.id === selectedId);
    }

    // Cartões: todos (modo legendas) ou só o selecionado; colunas à esquerda/direita.
    const shown = items.filter((it) => it.visible && (showAll || it.part.id === selectedId));
    const bottomLimit = H - 120; // deixa livre a barra inferior da cena
    for (const it of items) { it.card.hidden = true; it.line.setAttribute('visibility', 'hidden'); }
    for (const side of ['left', 'right']) {
      const col = shown.filter((it) => (it.x < W / 2) === (side === 'left')).sort((a, b) => a.y - b.y);
      let prev = 8 - CARD_H - 6;
      for (const it of col) {
        const y = Math.min(Math.max(it.y - CARD_H / 2, prev + CARD_H + 6), bottomLimit - CARD_H);
        prev = y;
        const x = side === 'left' ? 8 : W - CARD_W - 8;
        it.card.hidden = false;
        it.card.style.transform = `translate(${x}px, ${y}px)`;
        it.card.classList.toggle('selected', it.part.id === selectedId);
        const ex = side === 'left' ? x + CARD_W : x;
        it.line.setAttribute('x1', ex);
        it.line.setAttribute('y1', y + CARD_H / 2);
        it.line.setAttribute('x2', it.x);
        it.line.setAttribute('y2', it.y);
        it.line.setAttribute('visibility', 'visible');
      }
    }
  }
  scene.onAfterRenderObservable.add(update);

  return {
    setParts,
    select(id) { selectedId = id; },
    setShowAll(v) { showAll = v; },
    get showAll() { return showAll; },
  };
}
