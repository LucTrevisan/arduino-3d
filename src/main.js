import './style.css';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createScene } from './scene/scene.js';
import { createBoard, pinPositions } from './scene/board.js';
import { createWire } from './scene/wires.js';
import { createLed } from './components/led.js';
import { PinBus } from './sim/pinbus.js';
import { SketchRunner } from './sim/runtime.js';
import { createEditor } from './editor/editor.js';
import { createSerialMonitor } from './ui/serialMonitor.js';
import { createToolbar } from './ui/toolbar.js';
import { t } from './i18n/index.js';

const $ = (id) => document.getElementById(id);
$('loading').textContent = t('ui.carregando');
$('scene').setAttribute('aria-label', t('ui.cena'));
$('code-title').textContent = t('ui.editor');

const DEFAULT_CODE = `// Pisca LED: acende e apaga o LED do pino 13
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`;

const canvas = $('scene');
const { engine, scene } = createScene(canvas);
new ResizeObserver(() => engine.resize()).observe($('stage'));
const bus = new PinBus();

createBoard(scene);

// LED no pino 13, ao lado da placa, ligado por fios (D13 → anodo, GND → catodo).
const led = createLed(scene, { id: 'led1', pino: 13, cor: 'vermelho', position: new Vector3(-0.2, 0.7, 4.3) });
led.attach(bus);
const at = (name) => led.root.position.add(new Vector3(...led.anchors[name]));
createWire(scene, pinPositions.D13, at('anodo'), 'amarelo');
createWire(scene, pinPositions.GND, at('catodo'), 'preto');

// Editor, monitor serial e simulador
const serial = createSerialMonitor($('serial-panel'));
const editor = createEditor($('editor'), { doc: DEFAULT_CODE });
let toolbar;
const runner = new SketchRunner({
  bus,
  onSerial: (s) => serial.write(s),
  onError: (e) => serial.error(e),
  onClear: () => serial.clear(),
  onStatus: (s) => toolbar.setStatus(s),
});
toolbar = createToolbar($('toolbar'), {
  onRun: () => runner.run(editor.getValue()),
  onStop: () => runner.stop(),
  onRestart: () => runner.restart(editor.getValue()),
  onSpeed: (x) => { runner.speed = x; },
});
toolbar.setStatus('idle');

window.__bus = bus;
scene.executeWhenReady(() => $('loading').classList.add('hidden'));
