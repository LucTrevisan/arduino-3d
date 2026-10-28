// Verificação automática dos desafios, só pelo estado dos pinos ao longo do tempo (bus.history).
// Cada verificação recebe (history, now) — tempos em milissegundos simulados — e devolve true/false.

const ev = (h, pin) => h.filter((e) => e.pin === pin);
const level = (e) => (e.pwm != null ? (e.pwm > 0 ? 1 : 0) : e.value ? 1 : 0);
const inRange = (v, a, b) => v >= a && v <= b;

/** Mudanças de nível de um pino de saída (começa em 0). */
function transitions(h, pin) {
  const out = [];
  let prev = 0;
  for (const e of ev(h, pin)) {
    const l = level(e);
    if (l !== prev) out.push({ t: e.t, l, pin });
    prev = l;
  }
  return out;
}

function levelAt(h, pin, t) {
  let l = 0;
  for (const e of ev(h, pin)) {
    if (e.t > t) break;
    l = level(e);
  }
  return l;
}

/** Pisca LED mais rápido: 5+ piscadas com meio período de ~200 ms. */
function pino13_alterna(h) {
  const tr = transitions(h, 13);
  if (tr.length < 10) return false;
  const last = tr.slice(-10);
  return last.slice(1).every((x, i) => inRange(x.t - last[i].t, 150, 260));
}

/** Semáforo real: verde → amarelo (2 s) → vermelho, duas vezes. Pinos: 8 vermelho, 9 amarelo, 10 verde. */
function semaforo_sequencia(h) {
  const all = [8, 9, 10].flatMap((p) => transitions(h, p)).sort((a, b) => a.t - b.t);
  const rises = all.filter((x) => x.l === 1);
  const pattern = [10, 9, 8, 10, 9, 8];
  for (let i = 0; i + pattern.length <= rises.length; i++) {
    const win = rises.slice(i, i + pattern.length);
    if (!win.every((x, k) => x.pin === pattern[k])) continue;
    const yellowsOk = win.filter((x) => x.pin === 9).every((y) => {
      const fall = all.find((x) => x.pin === 9 && x.l === 0 && x.t > y.t);
      return fall && inRange(fall.t - y.t, 1800, 2200);
    });
    if (yellowsOk) return true;
  }
  return false;
}

/** Botão como interruptor: 2 apertos; LED (pino 8) fica ligado após o 1º e desligado após o 2º. */
function botao_liga_desliga(h, now) {
  const presses = [];
  let start = null;
  let prev = 1;
  for (const e of ev(h, 2)) {
    const v = e.value ? 1 : 0;
    if (prev === 1 && v === 0) start = e.t;
    if (prev === 0 && v === 1 && start !== null) { presses.push({ s: start, e: e.t }); start = null; }
    prev = v;
  }
  if (presses.length < 2) return false;
  const [p1, p2] = presses;
  if (now < p2.e + 80) return false;
  return levelAt(h, 8, p1.e + 80) === 1 && levelAt(h, 8, p2.e + 80) === 0;
}

/** Brilho variando de apagado a máximo com vários níveis (PWM no pino 9). */
function pwm_varia(h) {
  const vals = ev(h, 9).filter((e) => e.pwm != null).map((e) => e.pwm);
  return vals.length > 0 && Math.min(...vals) <= 5 && Math.max(...vals) >= 250 && new Set(vals).size >= 6;
}

/** Servo lento: ida de 0° a 180° leva ≥ 2 s e depois volta a 0°. */
function servo_0_180(h) {
  const s = ev(h, 9).filter((e) => typeof e.servo === 'number');
  const low = s.findIndex((e) => e.servo <= 2);
  if (low < 0) return false;
  const high = s.findIndex((e, i) => i > low && e.servo >= 178);
  if (high < 0 || s[high].t - s[low].t < 2000) return false;
  // precisa ser uma varredura (muitos ângulos intermediários), não só pulos 0 → 90 → 180
  if (new Set(s.slice(low, high + 1).map((e) => e.servo)).size < 20) return false;
  return s.some((e, i) => i > high && e.servo <= 2);
}

/** Alarme só abaixo de 15 cm: toca a <15, silencia entre 15 e 20 e nunca toca a ≥15. */
function buzzer_alerta_distancia(h) {
  const dists = ev(h, 6).filter((e) => typeof e.distance === 'number');
  const distAt = (t) => {
    let d = null;
    for (const e of dists) { if (e.t > t) break; d = e.distance; }
    return d;
  };
  const samples = ev(h, 8)
    .filter((e) => typeof e.tone === 'number')
    .map((e) => ({ tone: e.tone, d: distAt(e.t) }))
    .filter((s) => s.d !== null);
  const near = samples.some((s) => s.d < 15 && s.tone > 0);
  const silentMid = samples.some((s) => inRange(s.d, 15, 20) && s.tone === 0);
  const violation = samples.some((s) => s.d >= 15 && s.tone > 0);
  return near && silentMid && !violation;
}

export const checks = {
  pino13_alterna,
  semaforo_sequencia,
  botao_liga_desliga,
  pwm_varia,
  servo_0_180,
  buzzer_alerta_distancia,
};

/** @returns {boolean} */
export function runCheck(id, history, now = Infinity) {
  const fn = checks[id];
  return fn ? !!fn(history, now) : false;
}
