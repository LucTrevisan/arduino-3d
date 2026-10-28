import { t } from '../i18n/index.js';

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Sugere o nome conhecido mais parecido (ex.: digitalwrite → digitalWrite). */
export function suggest(name, known) {
  let best = null;
  let bestD = 3;
  for (const k of known) {
    const d = k.toLowerCase() === name.toLowerCase() ? 0 : distance(name.toLowerCase(), k.toLowerCase());
    if (d < bestD) { best = k; bestD = d; }
  }
  return best;
}

/**
 * Converte um erro de execução do JS numa frase amigável em português.
 * @param {Error} err
 * @param {{line?: number, known?: string[]}} ctx
 */
export function friendlyError(err, { line, known = [] } = {}) {
  const msg = String(err?.message ?? err);
  let text;
  let m;
  if (err instanceof SyntaxError) {
    text = t('erros.sintaxe', { msg });
  } else if ((m = /^(\w+) is not defined$/.exec(msg))) {
    text = t('erros.naoDefinido', { nome: m[1] });
    const s = suggest(m[1], known);
    if (s) text += t('erros.sugestao', { sugestao: s });
  } else if ((m = /^(?:\w+\.)*(\w+) is not a function$/.exec(msg)) || (m = /^(.+) is not a function$/.exec(msg))) {
    text = t('erros.naoFuncao', { nome: m[1] });
  } else if (/Assignment to constant/.test(msg)) {
    text = t('erros.constante');
  } else if (err instanceof RangeError && /call stack/i.test(msg)) {
    text = t('erros.recursao');
  } else if (err instanceof TypeError && /undefined|null/.test(msg)) {
    text = t('erros.inexistente', { msg });
  } else {
    text = t('erros.geral', { msg });
  }
  if (line) text += t('erros.linha', { line });
  return text;
}
