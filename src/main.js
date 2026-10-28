import './style.css';
import { createScene } from './scene/scene.js';
import { createBoard, pinPositions } from './scene/board.js';
import { buildLessonScene } from './scene/lessonScene.js';
import { buildParts } from './scene/parts.js';
import { createLocator } from './scene/locator.js';
import { PinBus } from './sim/pinbus.js';
import { SketchRunner } from './sim/runtime.js';
import { createEditor } from './editor/editor.js';
import { createSerialMonitor } from './ui/serialMonitor.js';
import { createToolbar } from './ui/toolbar.js';
import { createLessonMenu } from './ui/lessonMenu.js';
import { createLessonPanel } from './ui/lessonPanel.js';
import { createInputsPanel } from './ui/inputsPanel.js';
import { createComponentDirectory } from './ui/componentDirectory.js';
import { createSceneLabels } from './ui/sceneLabels.js';
import { createSignalTrace } from './ui/signalTrace.js';
import { lessons, getLesson } from './lessons/index.js';
import { runCheck } from './lessons/checks.js';
import { progress } from './ui/progress.js';
import { t } from './i18n/index.js';

const $ = (id) => document.getElementById(id);
$('loading').textContent = t('ui.carregando');
$('scene').setAttribute('aria-label', t('ui.cena'));
$('code-title').textContent = t('ui.editor');
$('app-title').textContent = t('ui.titulo');
$('skip').textContent = t('ui.pularParaConteudo');
$('scene-help').textContent = t('ui.ajudaCena');
document.querySelector('.trace-title').textContent = t('cena.tracoSinal');

const { engine, scene, camera, cameraControls } = createScene($('scene'));
new ResizeObserver(() => engine.resize()).observe($('stage'));
const locator = createLocator(scene);

// ---------- Abas do celular (Lição / Código / Serial / Peças); no desktop a barra fica oculta ----------
const mobile = window.matchMedia('(max-width: 820px)');
const mtabs = [
  { id: 'lesson', label: t('ui.abaLicao'), controls: 'side' },
  { id: 'code', label: t('ui.abaCodigo'), controls: 'code-panel' },
  { id: 'serial', label: t('ui.abaSerial'), controls: 'serial-panel' },
  { id: 'parts', label: t('ui.abaPecas'), controls: 'directory' },
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

// ---------- Simulador, editor e monitor ----------
const bus = new PinBus();
createBoard(scene, bus);

const serial = createSerialMonitor($('serial-panel'));
const editor = createEditor($('editor'), { doc: '' });
let toolbar;
let trace;
const stageStatus = $('stage-status');
const fsRun = $('fs-run');
const fsStop = $('fs-stop');
fsRun.textContent = `▶ ${t('ui.executar')}`;
fsRun.setAttribute('aria-label', t('ui.executarAria'));
fsStop.textContent = `■ ${t('ui.parar')}`;
fsStop.setAttribute('aria-label', t('ui.pararAria'));
function showStatus(s) {
  stageStatus.textContent = s === 'idle' ? t('cena.pronto') : t(`ui.status.${s}`);
  stageStatus.dataset.state = s;
  fsRun.disabled = s === 'running';
  fsStop.disabled = s !== 'running';
}
showStatus('idle');
const runProgram = () => { trace.clear(); runner.run(editor.getValue()); };
const stopProgram = () => runner.stop();
fsRun.addEventListener('click', runProgram);
fsStop.addEventListener('click', stopProgram);

const runner = new SketchRunner({
  bus,
  onSerial: (s) => serial.write(s),
  onError: (e) => { serial.error(e); if (mobile.matches) setMobileTab('serial'); },
  onClear: () => serial.clear(),
  onStatus: (s) => { toolbar.setStatus(s); showStatus(s); },
});
toolbar = createToolbar($('toolbar'), {
  onRun: runProgram,
  onStop: stopProgram,
  onRestart: () => { trace.clear(); runner.restart(editor.getValue()); },
  onSpeed: (x) => { runner.speed = x; },
});
toolbar.setStatus('idle');
trace = createSignalTrace($('trace'), bus, () => runner.status === 'running');

// ---------- Peças: rótulos numerados, diretório e localizador ----------
function selectPart(part) {
  cameraControls.focus(part.point, Math.max(6, part.r * 5));
  locator.show(part.point, part.r);
  labels.select(part.id);
  directory.select(part.id);
}
const labels = createSceneLabels({ scene, engine, camera, root: $('labels'), onSelect: selectPart });
const directory = createComponentDirectory($('directory'), { onSelect: selectPart });

// Botões da câmera
const camButtons = [
  { text: '↶', label: t('cena.girarEsq'), run: () => cameraControls.rotate(-0.4) },
  { text: '↷', label: t('cena.girarDir'), run: () => cameraControls.rotate(0.4) },
  { text: '−', label: t('cena.afastar'), run: () => cameraControls.zoom(1.25) },
  { text: '+', label: t('cena.aproximar'), run: () => cameraControls.zoom(0.8) },
  { text: t('cena.resetar'), label: t('cena.resetar'), run: () => { locator.hide(); cameraControls.reset(); } },
];
for (const b of camButtons) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'cam-btn';
  el.textContent = b.text;
  el.setAttribute('aria-label', b.label);
  el.addEventListener('click', b.run);
  $('cam-buttons').append(el);
}
const legendBtn = document.createElement('button');
legendBtn.type = 'button';
legendBtn.className = 'cam-btn';
legendBtn.textContent = t('cena.legendas');
legendBtn.setAttribute('aria-label', t('cena.legendasAria'));
legendBtn.setAttribute('aria-pressed', 'false');
legendBtn.addEventListener('click', () => {
  labels.setShowAll(!labels.showAll);
  legendBtn.setAttribute('aria-pressed', String(labels.showAll));
});
$('cam-buttons').prepend(legendBtn);

// Tela cheia: usa a Fullscreen API; onde não existe (iPhone), cai para um modo que ocupa a janela toda.
const stageEl = $('stage');
const fsBtn = document.createElement('button');
fsBtn.type = 'button';
fsBtn.className = 'cam-btn';
const nativeFs = !!stageEl.requestFullscreen;
const isFull = () => (nativeFs ? document.fullscreenElement === stageEl : stageEl.classList.contains('stage-full'));
function syncFullscreen() {
  const on = isFull();
  fsBtn.textContent = on ? t('cena.sairTelaCheia') : t('cena.telaCheia');
  fsBtn.setAttribute('aria-label', on ? t('cena.sairTelaCheiaAria') : t('cena.telaCheiaAria'));
  fsBtn.setAttribute('aria-pressed', String(on));
  engine.resize();
}
function toggleFullscreen() {
  if (nativeFs) {
    if (isFull()) document.exitFullscreen();
    else stageEl.requestFullscreen().catch(() => { stageEl.classList.add('stage-full'); syncFullscreen(); });
  } else {
    stageEl.classList.toggle('stage-full');
    syncFullscreen();
  }
}
fsBtn.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', syncFullscreen);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stageEl.classList.contains('stage-full')) { stageEl.classList.remove('stage-full'); syncFullscreen(); }
});
syncFullscreen();
$('cam-buttons').append(fsBtn);

// ---------- Lições ----------
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
  menus.forEach((m) => m.refresh());
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
  showStatus('idle');
  trace.clear();
  locator.hide();
  lessonScene?.dispose();
  bus.reset();
  lessonScene = buildLessonScene(scene, bus, lesson);
  inputsPanel.render(lessonScene.inputs, bus, lesson.componentes.some((c) => c.tipo === 'buzzer'));
  const parts = buildParts({ pinPositions, experiment: lessonScene.parts });
  labels.setParts(parts);
  labels.select(null);
  directory.setParts(parts);
  cameraControls.reset();
  editor.setValue(lesson.codigoInicial);
  panel.render(lesson);
  panel.setChallenge(solved);
  menus.forEach((m) => m.setCurrent(lesson.id));
  if (mobile.matches) setMobileTab('lesson');
  history.replaceState(null, '', `#${lesson.id}`);
}

const menuOptions = {
  onSelect: openLesson,
  onReset: () => { solved = false; panel.setChallenge(false); menus.forEach((m) => m.refresh()); },
};
const menus = [
  createLessonMenu($('sidebar'), { ...menuOptions, inline: true }),
  createLessonMenu($('lesson-menu'), menuOptions),
];
openLesson(location.hash.slice(1) || lessons[0].id);

window.__bus = bus;
scene.executeWhenReady(() => $('loading').classList.add('hidden'));
