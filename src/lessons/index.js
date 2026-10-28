// Carrega todas as lições (src/lessons/*.json) em ordem de id.
const modules = import.meta.glob('./*.json', { eager: true, import: 'default' });

export const lessons = Object.values(modules).sort((a, b) => a.id.localeCompare(b.id));

export const getLesson = (id) => lessons.find((l) => l.id === id) ?? lessons[0];
