# Arduino 3D — SENAI XR Lab

Aplicação web educacional (PT-BR) para iniciantes aprenderem Arduino numa placa Uno 3D interativa.
O aluno escolhe uma lição, edita o código, clica em Executar e vê o resultado na cena 3D e no monitor serial.
Todo o conteúdo (textos, lições, modelos) é original — não copiar do site de inspiração.

## Stack
- Vite + JavaScript (ES modules), HTML/CSS/JS puro (sem framework de UI)
- Babylon.js (`@babylonjs/core`, `@babylonjs/loaders`) — importar por subcaminhos para tree-shaking
- CodeMirror 6 (`@codemirror/lang-cpp`) para o editor
- Vitest para testes do simulador (`environment: node`)
- Deploy: GitHub Pages via GitHub Actions (`LucTrevisan/arduino-3d`, `base: '/arduino-3d/'`)

## Comandos
- `npm run dev` — servidor de desenvolvimento
- `npm test` — testes Vitest
- `npm run build` — build de produção em `dist/`

## Estrutura
```
src/main.js
src/scene/       câmera, luz, placa, protoboard, fios
src/components/  um módulo por componente (led, button, pot, servo, ultrasonic, buzzer)
src/sim/         transpilador Arduino→JS, runtime, barramento de pinos (PinBus)
src/editor/      CodeMirror
src/lessons/     lições em JSON
src/ui/          menu, abas, monitor serial, progresso
src/i18n/        pt-BR.json
public/models/   .glb futuros
tests/
```

## Interface (resumo)
- Desktop: barra lateral de lições | cena 3D + diretório de peças | Resumo/Pinagem/Exemplo + editor + monitor serial.
- Celular (≤ 820 px): coluna única com abas Lição / Código / Serial / Peças.
- `scene/parts.js` cataloga peças (placa, componentes, pinos, fios); `ui/sceneLabels.js` desenha marcadores numerados,
  `ui/componentDirectory.js` lista/busca e `scene/locator.js` realça a peça escolhida.
- Desafios: `lessons/checks.js` (só lê `bus.history`); novo desafio = nova função + teste em `tests/checks.test.js`.
- Depuração no console: `window.__bus` (PinBus) e `window.__editor`.

## Convenções
- Textos de UI em PT-BR via i18n (`t('chave')`); nada de string fixa na UI.
- Assets sempre via `import.meta.env.BASE_URL`.
- O simulador (`sim/`) nunca toca na cena: só escreve/lê no `PinBus`. Componentes 3D escutam o barramento.
- Componente 3D: `export function createX(scene, opts) → { root, attach(bus), dispose() }`.
- Modelos procedurais por enquanto; troca por `.glb` através de um único ponto (`scene/modelLoader.js`).
- Materiais: `StandardMaterial` com luz hemisférica moderada; evitar visual lavado/branco.
- `localStorage` sempre dentro de try/catch.
- Commits em português, um por fase.
