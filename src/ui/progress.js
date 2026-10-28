const KEY = 'arduino3d.progress.v1';

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return new Set(Array.isArray(v) ? v : []);
  } catch {
    return new Set();
  }
}

let done = load();

/** Progresso das lições concluídas, salvo em localStorage (com fallback em memória). */
export const progress = {
  isDone: (id) => done.has(id),
  count: () => done.size,
  reset() {
    done = new Set();
    try { localStorage.removeItem(KEY); } catch { /* sem armazenamento */ }
  },
  markDone(id) {
    done.add(id);
    try { localStorage.setItem(KEY, JSON.stringify([...done])); } catch { /* sem armazenamento */ }
  },
};
