import { t } from '../i18n/index.js';

const SPEEDS = [0.5, 1, 2];

/** Barra Executar / Parar / Reiniciar + velocidade. */
export function createToolbar(root, { onRun, onStop, onRestart, onSpeed }) {
  root.innerHTML = `
    <button type="button" class="btn btn-primary" data-run aria-label="${t('ui.executarAria')}">▶ ${t('ui.executar')}</button>
    <button type="button" class="btn" data-stop aria-label="${t('ui.pararAria')}">■ ${t('ui.parar')}</button>
    <button type="button" class="btn" data-restart aria-label="${t('ui.reiniciarAria')}">↻ ${t('ui.reiniciar')}</button>
    <label class="speed">${t('ui.velocidade')}
      <select data-speed aria-label="${t('ui.velocidadeAria')}">
        ${SPEEDS.map((s) => `<option value="${s}"${s === 1 ? ' selected' : ''}>${String(s).replace('.', ',')}x</option>`).join('')}
      </select>
    </label>
    <span class="status" data-status role="status"></span>`;
  const $ = (s) => root.querySelector(s);
  $('[data-run]').addEventListener('click', onRun);
  $('[data-stop]').addEventListener('click', onStop);
  $('[data-restart]').addEventListener('click', onRestart);
  $('[data-speed]').addEventListener('change', (e) => onSpeed(Number(e.target.value)));
  return {
    setStatus(status) {
      const running = status === 'running';
      $('[data-run]').disabled = running;
      $('[data-stop]').disabled = !running;
      $('[data-status]').textContent = t(`ui.status.${status}`);
      $('[data-status]').dataset.state = status;
    },
  };
}
