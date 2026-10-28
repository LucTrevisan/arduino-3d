/** Abas acessíveis (role=tablist) com navegação por setas. */
export function createTabs(root, tabs) {
  root.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'tablist';
  list.setAttribute('role', 'tablist');
  const panels = {};
  const buttons = {};

  const select = (id, focus = false) => {
    for (const k of Object.keys(buttons)) {
      const on = k === id;
      buttons[k].setAttribute('aria-selected', String(on));
      buttons[k].tabIndex = on ? 0 : -1;
      panels[k].hidden = !on;
    }
    if (focus) buttons[id].focus();
  };

  tabs.forEach(({ id, label }, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab';
    b.id = `tab-${id}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', `panel-${id}`);
    b.textContent = label;
    b.addEventListener('click', () => select(id));
    b.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length].id, true); }
    });
    list.append(b);
    buttons[id] = b;
    const p = document.createElement('div');
    p.className = 'tabpanel';
    p.id = `panel-${id}`;
    p.setAttribute('role', 'tabpanel');
    p.setAttribute('aria-labelledby', b.id);
    p.tabIndex = 0;
    panels[id] = p;
  });
  root.append(list, ...Object.values(panels));
  select(tabs[0].id);
  return { panels, select };
}
