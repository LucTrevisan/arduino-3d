// Relógio do simulador. `speed` multiplica a passagem do tempo (1x, 2x, 0,5x).

export class StopSignal extends Error {
  constructor() {
    super('stop');
    this.name = 'StopSignal';
  }
}

/** Relógio real: delay espera ms/speed milissegundos de verdade. */
export function createRealTime() {
  let speed = 1;
  let sim = 0;
  let last = performance.now();
  const t = {
    get speed() { return speed; },
    set speed(v) { t.now(); speed = v > 0 ? v : 1; },
    now() {
      const r = performance.now();
      sim += (r - last) * speed;
      last = r;
      return sim;
    },
    advance(ms) { sim += ms; },
    reset() { sim = 0; last = performance.now(); },
    sleep(ms, signal) {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(new StopSignal());
        const onAbort = () => { clearTimeout(id); reject(new StopSignal()); };
        const id = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort);
          resolve();
        }, Math.max(0, ms) / speed);
        signal?.addEventListener('abort', onAbort, { once: true });
      });
    },
  };
  return t;
}

/** Relógio virtual para testes: o tempo "pula" sem esperar de verdade. */
export function createVirtualTime() {
  let sim = 0;
  return {
    speed: 1,
    now: () => sim,
    advance(ms) { sim += ms; },
    reset() { sim = 0; },
    sleep(ms, signal) {
      if (signal?.aborted) return Promise.reject(new StopSignal());
      sim += Math.max(0, ms);
      return new Promise((resolve, reject) =>
        setTimeout(() => (signal?.aborted ? reject(new StopSignal()) : resolve()), 0));
    },
  };
}
