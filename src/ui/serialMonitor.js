import { t } from '../i18n/index.js';

const MAX_CHARS = 20000;

/** Monitor serial: texto do programa e mensagens de erro. */
export function createSerialMonitor(root) {
  root.innerHTML = `
    <div class="panel-head">
      <h2 id="serial-title">${t('ui.monitorSerial')}</h2>
      <button type="button" class="btn btn-ghost" data-clear aria-label="${t('ui.limparMonitor')}">${t('ui.limpar')}</button>
    </div>
    <pre class="serial-out" role="log" aria-labelledby="serial-title" tabindex="0"></pre>`;
  const out = root.querySelector('.serial-out');
  const trim = () => {
    if (out.textContent.length > MAX_CHARS) out.textContent = out.textContent.slice(-MAX_CHARS / 2);
  };
  let pending = '';
  let raf = 0;
  const flush = () => {
    raf = 0;
    out.append(document.createTextNode(pending));
    pending = '';
    trim();
    out.scrollTop = out.scrollHeight;
  };

  const api = {
    write(text) {
      pending += text;
      if (!raf) raf = requestAnimationFrame(flush);
    },
    error(message) {
      if (pending) flush();
      const span = document.createElement('span');
      span.className = 'serial-error';
      span.textContent = `${message}\n`;
      out.append(span);
      out.scrollTop = out.scrollHeight;
    },
    clear() {
      pending = '';
      out.textContent = '';
    },
  };
  root.querySelector('[data-clear]').addEventListener('click', api.clear);
  return api;
}
