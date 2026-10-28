import { t } from '../i18n/index.js';
import { createTabs } from './tabs.js';

function el(tag, props = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  n.append(...children.filter((c) => c != null));
  return n;
}

const paragraphs = (text) => String(text ?? '').split('\n').filter(Boolean).map((p) => el('p', {}, p));

/** Painel lateral com as abas Resumo / Pinagem / Exemplo. */
export function createLessonPanel(root, { onUseExample }) {
  const { panels } = createTabs(root, [
    { id: 'resumo', label: t('ui.abas.resumo') },
    { id: 'pinagem', label: t('ui.abas.pinagem') },
    { id: 'exemplo', label: t('ui.abas.exemplo') },
  ]);
  let challengeBox;

  return {
    render(lesson) {
      panels.resumo.replaceChildren(
        el('span', { class: 'badge' }, lesson.nivel),
        el('h2', {}, lesson.titulo),
        el('p', {}, lesson.resumo),
        el('h3', {}, t('ui.objetivos')),
        el('ul', {}, ...lesson.objetivos.map((o) => el('li', {}, o))),
        (challengeBox = el('div', { class: 'challenge' },
          el('h3', {}, t('ui.desafio')),
          el('p', {}, lesson.desafio.enunciado),
          el('p', { class: 'challenge-status', role: 'status' }))),
      );

      panels.pinagem.replaceChildren(
        el('h3', {}, t('ui.pinagem')),
        ...paragraphs(lesson.pinagem),
        el('h3', {}, t('ui.ligacoes')),
        el('table', { class: 'wiring' },
          el('thead', {}, el('tr', {}, el('th', {}, t('ui.de')), el('th', {}, t('ui.para')), el('th', {}, t('ui.cor')))),
          el('tbody', {}, ...lesson.ligacoes.map((l) =>
            el('tr', {}, el('td', {}, l.de), el('td', {}, l.para), el('td', {}, l.cor))))),
        el('h3', {}, t('ui.especificacoes')),
        ...paragraphs(lesson.especificacoes),
      );

      panels.exemplo.replaceChildren(
        el('p', {}, t('ui.exemploIntro')),
        el('pre', { class: 'code-sample', tabindex: '0' }, lesson.exemplo ?? lesson.codigoInicial),
        el('button', { type: 'button', class: 'btn', 'aria-label': t('ui.usarExemploAria'), onclick: () => onUseExample(lesson.exemplo ?? lesson.codigoInicial) }, t('ui.usarExemplo')),
      );
    },
    setChallenge(done) {
      const s = challengeBox?.querySelector('.challenge-status');
      if (s) s.textContent = done ? t('ui.desafioConcluido') : '';
      challengeBox?.classList.toggle('done', !!done);
    },
  };
}
