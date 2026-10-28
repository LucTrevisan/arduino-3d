import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { mat } from './materials.js';
import { loadModelOrProcedural } from './modelLoader.js';

// Unidade = 1 cm. Arduino Uno ≈ 6,86 × 5,34 cm. USB à esquerda (-x). Cabeçalho digital em +z.
export const BOARD = { w: 6.86, d: 5.34, h: 0.16 };
const PITCH = 0.254;
const TOP_Z = 2.3;
const BOT_Z = -2.3;
const TOP = BOARD.h;

/** Posição (local da placa) de cada pino rotulado. Preenchido por buildBoard. */
export const pinPositions = {};

const digitalLeft = ['SCL', 'SDA', 'AREF', 'GND', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8'];
const digitalRight = ['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'];
const power = ['NC', 'IOREF', 'RESET', '3V3', '5V', 'GND', 'GND', 'VIN'];
const analog = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];

function label(scene, parent, text, x, z, color = '#ffffff') {
  const size = { width: 128, height: 64 };
  const tex = new DynamicTexture(`lbl-${text}`, size, scene, true);
  tex.hasAlpha = true;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, size.width, size.height);
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 64, 34);
  tex.update();
  const m = new StandardMaterial(`lblm-${text}`, scene);
  m.diffuseTexture = tex;
  m.useAlphaFromDiffuseTexture = true;
  m.emissiveColor = Color3.White();
  m.disableLighting = true;
  m.diffuseTexture.hasAlpha = true;
  const p = MeshBuilder.CreatePlane(`lbl-${text}`, { width: 0.5, height: 0.25 }, scene);
  p.material = m;
  p.parent = parent;
  p.rotation.x = Math.PI / 2;
  p.position.set(x, TOP + 0.012, z);
  p.isPickable = false;
}

function header(scene, root, names, x0, z, labelDz) {
  const body = MeshBuilder.CreateBox('hdr', { width: names.length * PITCH, height: 0.22, depth: PITCH }, scene);
  body.parent = root;
  body.position.set(x0 + ((names.length - 1) * PITCH) / 2, TOP + 0.11, z);
  body.material = mat(scene, '#15181d');
  names.forEach((name, i) => {
    const x = x0 + i * PITCH;
    const pin = MeshBuilder.CreateBox(`pin-${name}`, { width: 0.06, height: 0.3, depth: 0.06 }, scene);
    pin.parent = root;
    pin.position.set(x, TOP + 0.3, z);
    pin.material = mat(scene, '#d9b44a', { specular: 0.5 });
    if (!(name in pinPositions)) pinPositions[name] = new Vector3(x, TOP + 0.45, z);
    // Rótulo ligeiramente rotacionado em linhas alternadas para caber
    label(scene, root, name.replace(/^D/, ''), x, z + labelDz + (i % 2 ? 0.1 : -0.1));
  });
}

export function createBoard(scene) {
  return loadModelOrProcedural('arduino-uno', () => {
    for (const k of Object.keys(pinPositions)) delete pinPositions[k];
    const root = new TransformNode('arduino-uno', scene);

    const pcb = MeshBuilder.CreateBox('pcb', { width: BOARD.w, height: BOARD.h, depth: BOARD.d }, scene);
    pcb.parent = root;
    pcb.position.y = BOARD.h / 2;
    pcb.material = mat(scene, '#0b7a8a');

    // USB-B
    const usb = MeshBuilder.CreateBox('usb', { width: 1.6, height: 1.1, depth: 1.25 }, scene);
    usb.parent = root;
    usb.position.set(-BOARD.w / 2 + 0.55, TOP + 0.55, 1.1);
    usb.material = mat(scene, '#b8bec6', { specular: 0.5 });

    // Conector de alimentação
    const jack = MeshBuilder.CreateBox('jack', { width: 1.5, height: 1.1, depth: 0.9 }, scene);
    jack.parent = root;
    jack.position.set(-BOARD.w / 2 + 0.6, TOP + 0.55, -1.7);
    jack.material = mat(scene, '#17191d');

    // ATmega328P (DIP)
    const chip = MeshBuilder.CreateBox('chip', { width: 3.5, height: 0.35, depth: 0.95 }, scene);
    chip.parent = root;
    chip.position.set(1.0, TOP + 0.18, -0.2);
    chip.material = mat(scene, '#1c1f24');

    // Botão reset
    const rst = MeshBuilder.CreateCylinder('reset', { diameter: 0.6, height: 0.25 }, scene);
    rst.parent = root;
    rst.position.set(-2.2, TOP + 0.13, 1.4);
    rst.material = mat(scene, '#c0392b');

    // Cristal
    const xtal = MeshBuilder.CreateBox('xtal', { width: 0.7, height: 0.25, depth: 0.35 }, scene);
    xtal.parent = root;
    xtal.position.set(-0.6, TOP + 0.13, -0.2);
    xtal.material = mat(scene, '#b8bec6', { specular: 0.5 });

    // Cabeçalhos
    header(scene, root, digitalLeft, -2.2, TOP_Z, -0.35);
    header(scene, root, digitalRight, -2.2 + 10 * PITCH + 0.4, TOP_Z, -0.35);
    header(scene, root, power, -0.55, BOT_Z, 0.35);
    header(scene, root, analog, 1.6, BOT_Z, 0.35);

    // Título
    label(scene, root, 'UNO', 2.3, 0.9, '#ffffff');

    return root;
  });
}
