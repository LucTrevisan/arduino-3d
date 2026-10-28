import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { mat } from './materials.js';
import { loadModelOrProcedural } from './modelLoader.js';

// Unidade = 1 cm. Arduino Uno ≈ 6,86 × 5,34 cm. Conectores à esquerda (-x). Header digital em +z.
// Visual inspirado em clones Uno com USB-C: PCB azul, ATmega328P SMD, headers fêmeas.
export const BOARD = { w: 6.86, d: 5.34, h: 0.16 };
const PITCH = 0.254;
const TOP_Z = 2.3;
const BOT_Z = -2.3;
const TOP = BOARD.h;
const HDR_H = 0.22;

/** Posição (mundo) de cada pino rotulado. Preenchido por createBoard. */
export const pinPositions = {};

const digitalLeft = ['SCL', 'SDA', 'AREF', 'GND', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8'];
const digitalRight = ['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'];
const power = ['NC', 'IOREF', 'RESET', '3V3', '5V', 'GND', 'GND', 'VIN'];
const analog = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
const PWM = new Set(['D3', 'D5', 'D6', 'D9', 'D10', 'D11']);
const SHORT = { RESET: 'RST', '3V3': '3.3V', IOREF: 'IOREF' };

const HEADERS = [
  { names: digitalLeft, x0: -2.2, z: TOP_Z, labelDz: -0.36 },
  { names: digitalRight, x0: -2.2 + 10 * PITCH + 0.4, z: TOP_Z, labelDz: -0.36 },
  { names: power, x0: -0.55, z: BOT_Z, labelDz: 0.36 },
  { names: analog, x0: 1.6, z: BOT_Z, labelDz: 0.36 },
];

/** Serigrafia (branca), trilhas e furos numa textura única sobre a PCB. */
function buildSilkscreen(scene, parent) {
  const W = 2048;
  const H = Math.round((W * BOARD.d) / BOARD.w);
  const px = W / BOARD.w;
  const X = (x) => W / 2 + x * px;
  const Y = (z) => H / 2 - z * px;
  const tex = new DynamicTexture('silk', { width: W, height: H }, scene, true);
  tex.hasAlpha = true;
  const c = tex.getContext();
  c.clearRect(0, 0, W, H);

  // Trilhas (azul mais claro), determinísticas
  c.strokeStyle = 'rgba(70,120,210,0.55)';
  c.lineWidth = 5;
  c.lineJoin = 'round';
  const trace = (...pts) => {
    c.beginPath();
    pts.forEach(([x, z], i) => (i ? c.lineTo(X(x), Y(z)) : c.moveTo(X(x), Y(z))));
    c.stroke();
  };
  for (let i = 0; i < 18; i++) {
    const x = -2.1 + i * 0.255;
    trace([x, 2.05], [x, 1.55], [x + 0.35, 1.2]);
  }
  for (let i = 0; i < 8; i++) {
    const z = -1.1 + i * 0.28;
    trace([-1.0, z], [-0.2, z], [0.0, z - 0.3]);
    trace([0.9, z], [1.5, z], [2.0, z + 0.25]);
  }
  for (let i = 0; i < 10; i++) {
    const x = -1.4 + i * 0.26;
    trace([x, -1.9], [x, -1.4], [x + 0.2, -1.0]);
  }

  // Furos de fixação
  for (const [x, z] of [[-2.03, -2.41], [-1.91, 2.41], [3.17, -1.91], [3.17, 0.89]]) {
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(X(x), Y(z), 0.2 * px, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0a0c10';
    c.beginPath(); c.arc(X(x), Y(z), 0.12 * px, 0, Math.PI * 2); c.fill();
  }

  // Contornos brancos dos headers
  c.strokeStyle = '#ffffff';
  c.lineWidth = 4;
  for (const h of HEADERS) {
    const w = h.names.length * PITCH + 0.12;
    c.strokeRect(X(h.x0 - PITCH / 2 - 0.06), Y(h.z + PITCH / 2 + 0.08), w * px, (PITCH + 0.16) * px);
  }

  // Textos
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (const h of HEADERS) {
    h.names.forEach((name, i) => {
      const t = (PWM.has(name) ? '~' : '') + (SHORT[name] ?? name.replace(/^D/, ''));
      c.font = `bold ${t.length > 3 ? 26 : 36}px system-ui, sans-serif`;
      c.fillText(t, X(h.x0 + i * PITCH), Y(h.z + h.labelDz));
    });
  }
  c.font = 'bold 44px system-ui, sans-serif';
  c.fillText('DIGITAL (PWM~)', X(0.3), Y(1.65));
  c.fillText('ANALOG IN', X(2.35), Y(-1.65));
  c.fillText('POWER', X(0.5), Y(-1.65));
  c.font = 'bold 230px system-ui, sans-serif';
  c.fillText('UNO', X(2.25), Y(0.55));
  c.font = 'bold 40px system-ui, sans-serif';
  c.fillText('SENAI XR LAB', X(2.25), Y(-0.25));
  c.font = 'bold 30px system-ui, sans-serif';
  c.fillText('ICSP', X(2.85), Y(-0.62));
  c.fillText('RESET', X(-2.95), Y(1.55));
  c.fillText('ON', X(-0.5), Y(-1.35));
  c.fillText('L', X(-1.1), Y(1.55));

  tex.update();
  const m = new StandardMaterial('silk-m', scene);
  m.diffuseTexture = tex;
  m.useAlphaFromDiffuseTexture = true;
  m.emissiveColor = new Color3(0.55, 0.55, 0.55);
  m.specularColor = Color3.Black();
  const p = MeshBuilder.CreatePlane('silk', { width: BOARD.w, height: BOARD.d }, scene);
  p.parent = parent;
  p.rotation.x = Math.PI / 2;
  p.position.y = TOP + 0.003;
  p.material = m;
  p.isPickable = false;
}

/** Textura do topo de um header fêmea (quadradinhos escuros = encaixes). */
function socketMaterial(scene, n) {
  const w = 64 * n;
  const tex = new DynamicTexture('sock', { width: w, height: 64 }, scene, true);
  const c = tex.getContext();
  c.fillStyle = '#2a2d33';
  c.fillRect(0, 0, w, 64);
  c.fillStyle = '#050607';
  for (let i = 0; i < n; i++) c.fillRect(i * 64 + 18, 18, 28, 28);
  tex.update();
  const m = new StandardMaterial('sock-m', scene);
  m.diffuseTexture = tex;
  m.emissiveColor = new Color3(0.25, 0.25, 0.25);
  m.specularColor = Color3.Black();
  return m;
}

function header(scene, root, { names, x0, z }) {
  const body = MeshBuilder.CreateBox('hdr', { width: names.length * PITCH, height: HDR_H, depth: PITCH }, scene);
  body.parent = root;
  body.position.set(x0 + ((names.length - 1) * PITCH) / 2, TOP + HDR_H / 2, z);
  body.material = mat(scene, '#1b1d22');
  body.isPickable = false;
  const top = MeshBuilder.CreatePlane('hdr-top', { width: names.length * PITCH, height: PITCH }, scene);
  top.parent = root;
  top.rotation.x = Math.PI / 2;
  top.position.set(body.position.x, TOP + HDR_H + 0.002, z);
  top.material = socketMaterial(scene, names.length);
  top.isPickable = false;
  names.forEach((name, i) => {
    if (!(name in pinPositions)) pinPositions[name] = new Vector3(x0 + i * PITCH, TOP + HDR_H + 0.25, z);
  });
}

export function createBoard(scene, bus) {
  return loadModelOrProcedural('arduino-uno', () => {
    for (const k of Object.keys(pinPositions)) delete pinPositions[k];
    const root = new TransformNode('arduino-uno', scene);

    const box = (w, h, d, x, y, z, color, o = {}) => {
      const m = MeshBuilder.CreateBox('part', { width: w, height: h, depth: d }, scene);
      m.parent = root;
      m.position.set(x, y, z);
      m.material = mat(scene, color, o);
      m.isPickable = false;
      return m;
    };
    const cyl = (dia, h, x, y, z, color, o = {}, rot = null) => {
      const m = MeshBuilder.CreateCylinder('part', { diameter: dia, height: h, tessellation: 24 }, scene);
      m.parent = root;
      m.position.set(x, y, z);
      if (rot) m.rotation.set(...rot);
      m.material = mat(scene, color, o);
      m.isPickable = false;
      return m;
    };
    const METAL = { specular: 0.6 };

    // PCB azul escura (máscara de solda levemente brilhante)
    box(BOARD.w, BOARD.h, BOARD.d, 0, BOARD.h / 2, 0, '#0f3a8c', { specular: 0.25 });
    buildSilkscreen(scene, root);

    // Conector de energia (jack P4), sobressai da borda
    box(1.7, 1.1, 1.2, -3.0, TOP + 0.55, -1.6, '#15171b');
    cyl(0.7, 0.02, -3.86, TOP + 0.62, -1.6, '#030303', {}, [0, 0, Math.PI / 2]);
    cyl(0.14, 0.3, -3.78, TOP + 0.62, -1.6, '#c9ced4', METAL, [0, 0, Math.PI / 2]);

    // USB-C (formato de pílula)
    box(1.0, 0.36, 0.55, -3.1, TOP + 0.18, 1.5, '#c4cad2', METAL);
    cyl(0.36, 1.0, -3.1, TOP + 0.18, 1.225, '#c4cad2', METAL, [0, 0, Math.PI / 2]);
    cyl(0.36, 1.0, -3.1, TOP + 0.18, 1.775, '#c4cad2', METAL, [0, 0, Math.PI / 2]);
    box(0.03, 0.12, 0.55, -3.61, TOP + 0.18, 1.5, '#08090b');

    // Botão reset (canto), tampa vermelha
    box(0.6, 0.22, 0.6, -2.9, TOP + 0.11, 2.15, '#17191d');
    cyl(0.36, 0.16, -2.9, TOP + 0.3, 2.15, '#d6322e', { specular: 0.3 });

    // Capacitores eletrolíticos 47 µF / 35 V
    for (const z of [-0.95, -1.7]) {
      cyl(0.58, 0.68, -1.45, TOP + 0.34, z, '#15171b');
      cyl(0.5, 0.02, -1.45, TOP + 0.69, z, '#aeb4bd', METAL);
      box(0.1, 0.5, 0.06, -1.45 + 0.28, TOP + 0.36, z, '#d8dde3');
    }

    // Regulador de tensão (SOT-223) e polyfuse
    box(0.5, 0.12, 0.4, -2.1, TOP + 0.06, -0.3, '#1b1d22');
    box(0.38, 0.03, 0.2, -2.1, TOP + 0.13, -0.58, '#aeb4bd', METAL);
    box(0.6, 0.14, 0.3, -2.1, TOP + 0.07, 0.35, '#d9c28f');

    // Conversor USB-serial (SOIC-16) com pinos
    box(0.55, 0.12, 0.95, -1.75, TOP + 0.06, 0.9, '#121316');
    for (const dx of [-0.31, 0.31]) box(0.07, 0.03, 0.88, -1.75 + dx, TOP + 0.02, 0.9, '#aeb4bd', METAL);
    cyl(0.07, 0.01, -1.88, TOP + 0.13, 1.25, '#6b707a');

    // Cristal 12 MHz (lata de metal)
    box(0.5, 0.2, 0.26, -0.95, TOP + 0.1, 0.95, '#b9bfc7', METAL);
    box(0.34, 0.01, 0.12, -0.95, TOP + 0.205, 0.95, '#2a2d33');

    // ATmega328P-AU (TQFP-32) com pinos nos quatro lados
    const cx = 0.35, cz = -0.35;
    box(0.9, 0.1, 0.9, cx, TOP + 0.05, cz, '#101114');
    for (let i = 0; i < 8; i++) {
      const o = -0.33 + i * 0.094;
      box(0.12, 0.02, 0.05, cx - 0.5, TOP + 0.015, cz + o, '#aeb4bd', METAL);
      box(0.12, 0.02, 0.05, cx + 0.5, TOP + 0.015, cz + o, '#aeb4bd', METAL);
      box(0.05, 0.02, 0.12, cx + o, TOP + 0.015, cz - 0.5, '#aeb4bd', METAL);
      box(0.05, 0.02, 0.12, cx + o, TOP + 0.015, cz + 0.5, '#aeb4bd', METAL);
    }
    cyl(0.1, 0.01, cx - 0.32, TOP + 0.105, cz + 0.32, '#4a4f58');

    // Cristal 16 MHz
    box(0.58, 0.2, 0.28, 1.3, TOP + 0.1, -0.35, '#b9bfc7', METAL);
    box(0.4, 0.01, 0.13, 1.3, TOP + 0.205, -0.35, '#2a2d33');

    // Conector ICSP 2×3 (pinos macho)
    box(0.52, 0.2, 0.78, 2.85, TOP + 0.1, 0.0, '#17191d');
    for (const dx of [-0.127, 0.127]) for (const dz of [-0.254, 0, 0.254]) {
      box(0.06, 0.3, 0.06, 2.85 + dx, TOP + 0.33, dz, '#d9b44a', METAL);
    }

    // Componentes SMD pequenos (resistores/capacitores)
    const smd = [[-0.3, 0.55], [-0.1, 0.55], [0.1, 0.62], [0.9, 0.55], [1.1, 0.7], [1.3, 0.3], [-0.2, -1.2],
      [0.0, -1.3], [0.2, -1.2], [0.8, -1.2], [1.0, -1.35], [-0.95, -0.2], [-0.95, -0.45], [1.95, -0.85]];
    smd.forEach(([x, z], i) => box(0.16, 0.06, 0.09, x, TOP + 0.03, z, i % 3 === 0 ? '#2a2420' : '#c8b583'));

    // LEDs SMD: ON (verde, sempre aceso), L (âmbar, pino 13), TX/RX (apagados)
    const smdLed = (x, z, hex, glow) => {
      const m = box(0.18, 0.07, 0.1, x, TOP + 0.035, z, hex, { emissive: glow });
      return m;
    };
    smdLed(-0.65, -1.35, '#27d65a', 1);
    const lLed = smdLed(-1.1, 1.8, '#ffb020', 0);
    smdLed(-0.85, 1.8, '#ffb020', 0);
    smdLed(-0.6, 1.8, '#ffb020', 0);
    const setL = (on) => {
      const m = lLed.material.clone('l-led');
      m.emissiveColor = Color3.FromHexString('#ffb020').scale(on ? 1.2 : 0);
      lLed.material = m;
    };
    setL(false);
    bus?.on(13, (s) => setL(!!s.value));

    // Headers fêmeas nos quatro lados
    HEADERS.forEach((h) => header(scene, root, h));

    root.getChildMeshes().forEach((m) => m.freezeWorldMatrix());
    return root;
  });
}
