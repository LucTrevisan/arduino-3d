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
import { runCheck } from './lessons/checks.js';
import { progress } from './ui/progress.js';
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

$('skip').textContent = t('ui.pularParaConteudo');
$('scene-help').textContent = t('ui.ajudaCena');

// Abas do celular (Lição / Código / Serial). No desktop a barra fica oculta pelo CSS.
const mobile = window.matchMedia('(max-width: 820px)');
const mtabs = [
  { id: 'lesson', label: t('ui.abaLicao'), controls: 'side' },
  { id: 'code', label: t('ui.abaCodigo'), controls: 'code-panel' },
  { id: 'serial', label: t('ui.abaSerial'), controls: 'serial-panel' },
];
const mtabBar = $('mobile-tabs');
mtabBar.setAttribute('aria-label', t('ui.abasMobileAria'));
function setMobileTab(id) {
  $('app').dataset.mtab = id;
  mtabBar.querySelectorAll('[role=tab]').forEach((b) => {
    const on = b.dataset.tab === id;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
}
mtabs.forEach((m, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tab';
  b.dataset.tab = m.id;
  b.setAttribute('role', 'tab');
  b.setAttribute('aria-controls', m.controls);
  b.textContent = m.label;
  b.addEventListener('click', () => setMobileTab(m.id));
  b.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = mtabs[(i + d + mtabs.length) % mtabs.length].id;
    setMobileTab(next);
    mtabBar.querySelector(`[data-tab=${next}]`).focus();
  });
  mtabBar.append(b);
});
setMobileTab('lesson');

const bus = new PinBus();
createBoard(scene, bus);

const serial = createSerialMonitor($('serial-panel'));
const editor = createEditor($('editor'), { doc: '' });
let toolbar;
const runner = new SketchRunner({
  bus,
  onSerial: (s) => serial.write(s),
  onError: (e) => { serial.error(e); if (mobile.matches) setMobileTab('serial'); },
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
let currentLesson = null;
let solved = false;

/** Roda a verificação do desafio sobre o histórico dos pinos; conclui a lição na primeira vez. */
function evaluateChallenge() {
  if (solved || !currentLesson) return;
  if (!runCheck(currentLesson.desafio.verificacao, bus.history, bus.clock())) return;
  solved = true;
  progress.markDone(currentLesson.id);
  menu.refresh();
  panel.setChallenge(true);
  serial.success(t('ui.desafioConcluido'));
}
setInterval(() => { if (runner.status === 'running') evaluateChallenge(); }, 400);

function openLesson(id) {
  const lesson = getLesson(id);
  currentLesson = lesson;
  solved = progress.isDone(lesson.id);
  runner.stop(true);
  serial.clear();
  toolbar.setStatus('idle');
  lessonScene?.dispose();
  bus.reset();
  lessonScene = buildLessonScene(scene, bus, lesson);
  inputsPanel.render(lessonScene.inputs, bus, lesson.componentes.some((c) => c.tipo === 'buzzer'));
  editor.setValue(lesson.codigoInicial);
  panel.render(lesson);
  panel.setChallenge(solved);
  menu.setCurrent(lesson.id);
  if (mobile.matches) setMobileTab('lesson');
  history.replaceState(null, '', `#${lesson.id}`);
}

const menu = createLessonMenu($('lesson-menu'), {
  onSelect: openLesson,
  onReset: () => { solved = false; panel.setChallenge(false); },
});
openLesson(location.hash.slice(1) || lessons[0].id);

window.__bus = bus;
scene.executeWhenReady(() => $('loading').classList.add('hidden'));
