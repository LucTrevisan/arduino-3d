// Som do buzzer via WebAudio. O navegador só libera áudio depois de um clique (Executar).
let ctx = null;
let muted = false;
const voices = new Set();

function context() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function setMuted(m) {
  muted = m;
  if (m) voices.forEach((v) => v.stop());
}

export const isMuted = () => muted;

/** Uma "voz" = um oscilador que liga/desliga conforme a frequência. */
export function createVoice() {
  let osc = null;
  const voice = {
    set(freq) {
      if (!freq || muted) return voice.stop();
      const c = context();
      if (!c) return;
      if (!osc) {
        osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'square';
        gain.gain.value = 0.04;
        osc.connect(gain).connect(c.destination);
        osc.start();
      }
      osc.frequency.value = freq;
    },
    stop() {
      try { osc?.stop(); osc?.disconnect(); } catch { /* já parado */ }
      osc = null;
    },
  };
  voices.add(voice);
  voice.dispose = () => { voice.stop(); voices.delete(voice); };
  return voice;
}
