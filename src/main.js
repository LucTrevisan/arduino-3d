import './style.css';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createScene } from './scene/scene.js';
import { createBoard } from './scene/board.js';
import { buildLessonScene } from './scene/lessonScene.js';
import { PinBus } from './sim/pinbus.js';
import { SketchRunner } from './sim/runtime.js';
import { createEditor } from './editor/editor.js';
import { createSerialMonitor } from './ui/serialMonitor.js';
import { createToolbar } from './ui/toolbar.js';
import { createLessonMenu } from './ui/lessonMenu.js';
import { createInputsPanel } from './ui/inputsPanel.js';
import { createLessonPanel } from './ui/lessonPanel.js';
import { lessons, getLesson } from './lessons/index.js';
import { t } from './i18n/index.js';

const $ = (id) => document.getElementById(id);
$('loading').textContent = t('ui.carregando');
$('scene').setAttribute('aria-label', t('ui.cena'));
$('code-title').textContent = t('ui.editor');
$('app-title').textContent = t('ui.titulo');

const { engine, scene, camera } = createScene($('scene'));
new ResizeObserver(() => engine.resize()).observe($('stage'));
camera.target = new Vector3(0, 0, 3.5);
camera.radius = 15;

const bus = new PinBus();
createBoard(scene);

const serial = createSerialMonitor($('serial-panel'));
const editor = createEditor($('editor'), { doc: '' });
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

const panel = createLessonPanel($('side'), { onUseExample: (code) => editor.setValue(code) });
const inputsPanel = createInputsPanel($('inputs'));
let lessonScene = null;

function openLesson(id) {
  const lesson = getLesson(id);
  runner.stop(true);
  serial.clear();
  toolbar.setStatus('idle');
  lessonScene?.dispose();
  bus.reset();
  lessonScene = buildLessonScene(scene, bus, lesson);
  inputsPanel.render(lessonScene.inputs, bus, lesson.componentes.some((c) => c.tipo === 'buzzer'));
  editor.setValue(lesson.codigoInicial);
  panel.render(lesson);
  menu.setCurrent(lesson.id);
  history.replaceState(null, '', `#${lesson.id}`);
}

const menu = createLessonMenu($('lesson-menu'), { onSelect: openLesson });
openLesson(location.hash.slice(1) || lessons[0].id);

window.__bus = bus;
scene.executeWhenReady(() => $('loading').classList.add('hidden'));
