import { t } from '../i18n/index.js';

const WINDOW_MS = 6000; // janela de tempo simulado mostrada
const LANES = 3;

const label = (pin) => (pin >= 14 ? `A${pin - 14}` : `D${pin}`);

/** Faixa com o "traço" dos últimos sinais de saída (digital, PWM, servo, tom) enquanto o programa roda. */
export function createSignalTrace(canvas, bus, isRunning) {
  /** @type {Map<number, {t:number, v:number}[]>} */
  const lanes = new Map();
  let lastActivity = 0;

  const level = (s) => {
    if (typeof s.servo === 'number') return s.servo / 180;
    if (s.tone > 0) return 1;
    if (s.pwm != null) return s.pwm / 255;
    return s.value ? 1 : 0;
  };

  bus.on('*', (s, pin) => {
    const isOutput = s.mode === 'OUTPUT' || s.mode === 'servo' || s.pwm != null || s.tone > 0;
    if (!isOutput || !isRunning()) return;
    const arr = lanes.get(pin) ?? [];
    arr.push({ t: bus.clock(), v: level(s) });
    if (arr.length > 800) arr.splice(0, arr.length - 800);
    lanes.set(pin, arr);
    lastActivity = performance.now();
  });

  const ctx = canvas.getContext('2d');
  const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = '11px ui-monospace, Consolas, monospace';
    ctx.textBaseline = 'middle';

    const active = [...lanes.entries()].sort((a, b) => b[1].at(-1).t - a[1].at(-1).t).slice(0, LANES).sort((a, b) => a[0] - b[0]);
    if (!active.length) {
      ctx.fillStyle = css('--muted', '#4a5666');
      ctx.fillText(t('cena.aguardando'), 4, h / 2);
      return;
    }
    const now = bus.clock();
    const laneH = h / LANES;
    const x0 = 34;
    active.forEach(([pin, arr], i) => {
      const top = i * laneH + 3;
      const bottom = (i + 1) * laneH - 3;
      ctx.fillStyle = css('--muted', '#4a5666');
      ctx.fillText(label(pin), 2, (top + bottom) / 2);
      ctx.strokeStyle = css('--senai-blue', '#004b93');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const X = (tm) => x0 + ((tm - (now - WINDOW_MS)) / WINDOW_MS) * (w - x0 - 2);
      const Y = (v) => bottom - v * (bottom - top);
      let started = false;
      let prev = arr[0].v;
      for (const p of arr) {
        const x = Math.max(x0, X(p.t));
        if (!started) { ctx.moveTo(x0, Y(prev)); started = true; }
        ctx.lineTo(x, Y(prev));
        ctx.lineTo(x, Y(p.v));
        prev = p.v;
      }
      ctx.lineTo(w - 2, Y(prev));
      ctx.stroke();
    });
  }

  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (isRunning() || performance.now() - lastActivity < 1500) draw();
  };
  loop();

  return {
    clear() { lanes.clear(); draw(); },
    dispose() { cancelAnimationFrame(raf); },
  };
}
