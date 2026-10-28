import { t } from '../i18n/index.js';
import { setMuted } from './audio.js';

/**
 * Controles de entrada acessíveis (teclado/toque) sobre a cena: botão, potenciômetro, distância.
 * Espelham o que dá para fazer arrastando/clicando nos componentes 3D.
 */
export function createInputsPanel(root) {
  let offs = [];

  function render(inputs, bus) {
    offs.forEach((f) => f());
    offs = [];
    root.replaceChildren();
    root.hidden = false;

    const title = document.createElement('h2');
    title.textContent = t('ui.controles');
    root.append(title);

    for (const inp of inputs) {
      const row = document.createElement('div');
      row.className = 'input-row';
      if (inp.kind === 'range') {
        const id = `inp-${Math.random().toString(36).slice(2, 8)}`;
        const label = document.createElement('label');
        label.htmlFor = id;
        const out = document.createElement('output');
        label.textContent = `${inp.label}: `;
        const range = document.createElement('input');
        Object.assign(range, { type: 'range', id, min: inp.min, max: inp.max, step: inp.step });
        const sync = () => {
          const v = bus.state(inp.pin)[inp.field] ?? inp.min;
          range.value = v;
          out.textContent = String(Math.round(v));
        };
        range.addEventListener('input', () => inp.set(Number(range.value)));
        offs.push(bus.on(inp.pin, sync));
        sync();
        label.append(out);
        row.append(label, range);
      } else {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn hold';
        b.textContent = `${inp.label} — ${t('ui.segurar')}`;
        b.setAttribute('aria-pressed', 'false');
        const set = (on) => { inp.set(on); b.setAttribute('aria-pressed', String(on)); };
        b.addEventListener('pointerdown', (e) => { b.setPointerCapture(e.pointerId); set(true); });
        b.addEventListener('pointerup', () => set(false));
        b.addEventListener('pointercancel', () => set(false));
        b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); set(true); } });
        b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') set(false); });
        row.append(b);
      }
      root.append(row);
    }
  }

  const sound = document.createElement('label');
  sound.className = 'sound-toggle';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = true;
  cb.addEventListener('change', () => setMuted(!cb.checked));
  sound.append(cb, ` ${t('ui.som')}`);

  return {
    render(inputs, bus, hasSound) {
      render(inputs, bus);
      if (hasSound) root.append(sound);
      root.hidden = inputs.length === 0 && !hasSound;
    },
  };
}
