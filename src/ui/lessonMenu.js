import { t } from '../i18n/index.js';
import { lessons } from '../lessons/index.js';
import { progress } from './progress.js';

/** Menu de lições com contador de progresso ("2/6"). */
export function createLessonMenu(root, { onSelect }) {
  root.innerHTML = `
    <button type="button" class="btn menu-btn" aria-haspopup="true" aria-expanded="false"
      aria-controls="lesson-list" aria-label="${t('ui.menuAria')}"></button>
    <ul id="lesson-list" class="lesson-list" hidden></ul>`;
  const btn = root.querySelector('.menu-btn');
  const list = root.querySelector('.lesson-list');
  let currentId = null;

  const setOpen = (open) => {
    list.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) list.querySelector('[aria-current="true"]')?.focus() ?? list.querySelector('button')?.focus();
  };

  function render() {
    btn.textContent = `☰ ${t('ui.licoes')} ${progress.count()}/${lessons.length}`;
    list.replaceChildren(...lessons.map((l, i) => {
      const li = document.createElement('li');
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
      b.addEventListener('click', () => { setOpen(false); btn.focus(); onSelect(l.id); });
      li.append(b);
      return li;
    }));
  }

  btn.addEventListener('click', () => setOpen(list.hidden));
  document.addEventListener('click', (e) => { if (!root.contains(e.target)) setOpen(false); });
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !list.hidden) { setOpen(false); btn.focus(); } });
  render();

  return {
    setCurrent(id) { currentId = id; render(); },
    refresh: render,
  };
}
