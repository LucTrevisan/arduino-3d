import { t } from '../i18n/index.js';
import { lessons } from '../lessons/index.js';
import { progress } from './progress.js';

function lessonButton(l, i, currentId, onSelect) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'lesson-item';
  if (l.id === currentId) b.setAttribute('aria-current', 'true');
  const done = progress.isDone(l.id);
  b.setAttribute('aria-label', `${t('ui.licao')} ${i + 1}: ${l.titulo}. ${l.nivel}.${done ? ` ${t('ui.concluida')}.` : ''}`);
  b.innerHTML = '<span class="check" aria-hidden="true"></span><span class="li-title"></span><span class="li-level"></span>';
  b.querySelector('.check').textContent = done ? '✓' : String(i + 1);
  b.querySelector('.li-title').textContent = l.titulo;
  b.querySelector('.li-level').textContent = l.nivel;
  b.addEventListener('click', () => onSelect(l.id));
  return b;
}

function resetButton(onDone) {
  const rb = document.createElement('button');
  rb.type = 'button';
  rb.className = 'lesson-item lesson-reset';
  rb.textContent = t('ui.zerarProgresso');
  rb.addEventListener('click', () => {
    if (!confirm(t('ui.zerarConfirmar'))) return;
    progress.reset();
    onDone();
  });
  return rb;
}

/**
 * Menu de lições com contador de progresso ("2/6").
 * `inline: false` = botão com lista suspensa (celular); `inline: true` = lista fixa, agrupada por nível (barra lateral).
 */
export function createLessonMenu(root, { onSelect, onReset, inline = false }) {
  let currentId = null;
  let btn;
  let list;

  if (inline) {
    root.innerHTML = `<h2 class="side-title">${t('ui.licoes')} <span class="side-count"></span></h2><div class="side-groups"></div>`;
  } else {
    root.innerHTML = `
      <button type="button" class="btn menu-btn" aria-haspopup="true" aria-expanded="false"
        aria-controls="lesson-list" aria-label="${t('ui.menuAria')}"></button>
      <ul id="lesson-list" class="lesson-list" hidden></ul>`;
    btn = root.querySelector('.menu-btn');
    list = root.querySelector('.lesson-list');
  }

  const setOpen = (open) => {
    list.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) (list.querySelector('[aria-current="true"]') ?? list.querySelector('button'))?.focus();
  };

  const afterReset = () => { onReset?.(); render(); };

  function render() {
    const counter = `${progress.count()}/${lessons.length}`;
    if (inline) {
      root.querySelector('.side-count').textContent = counter;
      const groups = root.querySelector('.side-groups');
      const nodes = [];
      let level = null;
      lessons.forEach((l, i) => {
        if (l.nivel !== level) {
          level = l.nivel;
          const h = document.createElement('h3');
          h.className = 'side-level';
          h.textContent = level;
          nodes.push(h);
        }
        nodes.push(lessonButton(l, i, currentId, onSelect));
      });
      nodes.push(resetButton(afterReset));
      groups.replaceChildren(...nodes);
      return;
    }
    btn.textContent = `☰ ${t('ui.licoes')} ${counter}`;
    const items = lessons.map((l, i) => {
      const li = document.createElement('li');
      const b = lessonButton(l, i, currentId, (id) => { setOpen(false); btn.focus(); onSelect(id); });
      li.append(b);
      return li;
    });
    const li = document.createElement('li');
    li.append(resetButton(afterReset));
    list.replaceChildren(...items, li);
  }

  if (!inline) {
    btn.addEventListener('click', () => setOpen(list.hidden));
    document.addEventListener('click', (e) => { if (!root.contains(e.target)) setOpen(false); });
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !list.hidden) { setOpen(false); btn.focus(); } });
  }
  render();

  return {
    setCurrent(id) { currentId = id; render(); },
    refresh: render,
  };
}
