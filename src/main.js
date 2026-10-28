import './style.css';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createScene } from './scene/scene.js';
import { createBoard, pinPositions } from './scene/board.js';
import { createWire } from './scene/wires.js';
import { createLed } from './components/led.js';
import { PinBus } from './sim/pinbus.js';
import { SketchRunner } from './sim/runtime.js';

const canvas = document.getElementById('scene');
const { scene } = createScene(canvas);
const bus = new PinBus();

const board = createBoard(scene);

// LED no pino 13, ao lado da placa, ligado por fios (D13 → anodo, GND → catodo).
const led = createLed(scene, { id: 'led1', pino: 13, cor: 'vermelho', position: new Vector3(-0.2, 0.7, 4.3) });
led.attach(bus);
const at = (name) => led.root.position.add(new Vector3(...led.anchors[name]));
createWire(scene, pinPositions.D13, at('anodo'), 'amarelo');
createWire(scene, pinPositions.GND, at('catodo'), 'preto');

// Depuração temporária da Fase 1 (substituída pelo simulador na Fase 2).
window.__bus = bus;
// Simulador: acessível pelo console até a Fase 3 trazer o editor.
const runner = new SketchRunner({
  bus,
  onSerial: (s) => console.log('[serial]', s.trimEnd()),
  onError: (e) => console.error('[erro]', e),
  onClear: () => console.clear(),
});
window.__run = (src) => runner.run(src);
window.__stop = () => runner.stop();
window.__speed = (x) => { runner.speed = x; };
const dbg = document.getElementById('debug-led');
dbg.addEventListener('click', () => {
  const on = !bus.state(13).value;
  bus.write(13, { value: on ? 1 : 0, pwm: null });
  dbg.setAttribute('aria-pressed', String(on));
});
document.getElementById('loading').classList.add('hidden');
scene.executeWhenReady(() => document.getElementById('loading').classList.add('hidden'));
