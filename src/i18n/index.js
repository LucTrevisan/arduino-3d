import ptBR from './pt-BR.json';

const catalogs = { 'pt-BR': ptBR };
let current = 'pt-BR';

export function setLocale(locale) {
  if (catalogs[locale]) current = locale;
}

/** Busca "a.b.c" no catálogo e troca {param}. Se faltar, devolve a própria chave. */
export function t(key, params = {}) {
  let v = key.split('.').reduce((o, k) => (o == null ? o : o[k]), catalogs[current]);
  if (typeof v !== 'string') return key;
  return v.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`));
}
