const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Filtra peças por categoria ('todos' = todas) e texto (nome, descrição ou id; sem acentos). */
export function filterParts(parts, query = '', cat = 'todos') {
  const q = norm(query).trim();
  return parts.filter((p) => {
    if (cat !== 'todos' && p.cat !== cat) return false;
    if (!q) return true;
    return norm(`${p.nome} ${p.desc} ${p.id}`).includes(q);
  });
}
