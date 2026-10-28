import { t } from '../i18n/index.js';
import { filterParts } from './partsFilter.js';

const CATS = ['todos', 'experimento', 'placa', 'pinos', 'fios'];

/** Diretório pesquisável de peças e pinos; clicar numa linha localiza a peça na cena. */
export function createComponentDirectory(root, { onSelect }) {
  root.innerHTML = `
    <div class="panel-head dir-head">
      <h2 id="dir-title">${t('diretorio.titulo')} <span class="dir-hint">· ${t('diretorio.dica')}</span></h2>
      <span class="dir-count" aria-live="polite"></span>
    </div>
    <div class="dir-tools">
      <input type="search" class="dir-search" placeholder="${t('diretorio.buscar')}" aria-label="${t('diretorio.buscarAria')}" />
      <div class="chips" role="group" aria-label="${t('diretorio.titulo')}"></div>
    </div>
    <ul class="dir-list" aria-labelledby="dir-title"></ul>`;
  const search = root.querySelector('.dir-search');
  const chipBox = root.querySelector('.chips');
  const list = root.querySelector('.dir-list');
  const count = root.querySelector('.dir-count');

  let parts = [];
  let cat = 'todos';
  let selectedId = null;

  const chips = CATS.map((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = t(`diretorio.cat.${c}`);
    b.addEventListener('click', () => { cat = c; render(); });
    chipBox.append(b);
    return [c, b];
  });

  function render() {
    chips.forEach(([c, b]) => b.setAttribute('aria-pressed', String(c === cat)));
    const shown = filterParts(parts, search.value, cat);
    count.textContent = `${shown.length} / ${parts.length}`;
    if (!shown.length) {
      const li = document.createElement('li');
      li.className = 'dir-empty';
      li.textContent = t('diretorio.vazio');
      list.replaceChildren(li);
      return;
    }
    list.replaceChildren(...shown.map((p) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dir-item';
      if (p.id === selectedId) b.setAttribute('aria-current', 'true');
      b.title = p.desc;
      const n = document.createElement('span');
      n.className = 'dir-n';
      n.textContent = p.n ? String(p.n).padStart(2, '0') : '·';
      const name = document.createElement('span');
      name.className = 'dir-name';
      name.textContent = p.nome;
      const c = document.createElement('span');
      c.className = 'dir-cat';
      c.textContent = t(`diretorio.cat.${p.cat}`);
      b.append(n, name, c);
      b.addEventListener('click', () => onSelect(p));
      li.append(b);
      return li;
    }));
  }
  search.addEventListener('input', render);

  return {
    setParts(p) { parts = p; selectedId = null; search.value = ''; cat = 'todos'; render(); },
    select(id) {
      selectedId = id;
      render();
      list.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
    },
  };
}
