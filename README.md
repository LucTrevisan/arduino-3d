# Arduino 3D — SENAI XR Lab

Aplicação web educacional para iniciantes aprenderem Arduino em uma placa Uno 3D interativa.
O aluno escolhe uma lição, lê a explicação, edita o código, clica em **Executar** e vê o resultado
na cena 3D (LED acende, servo gira, sensor mede) e no **monitor serial**.

Tudo roda no navegador, sem instalar nada. O simulador **não emula o microcontrolador**: ele interpreta
um subconjunto da linguagem Arduino (C/C++ simplificado), o que é suficiente para as lições iniciais.

## Lições

| # | Lição | Nível | Conceitos |
|---|-------|-------|-----------|
| 1 | Pisca LED | Básico | `setup`/`loop`, `pinMode`, `digitalWrite`, `delay` |
| 2 | Semáforo | Básico | vários pinos, `const int`, sequências |
| 3 | Botão e LED | Básico | `INPUT_PULLUP`, `digitalRead`, `if`/`else` |
| 4 | Potenciômetro e PWM | Intermediário | `analogRead`, `map`, `analogWrite` |
| 5 | Servo motor | Intermediário | biblioteca `Servo`, laço `for` |
| 6 | Sensor ultrassônico e alarme | Avançado | `pulseIn`, `tone`/`noTone`, condições |

Cada lição tem um **desafio** com verificação automática (pelo estado dos pinos ao longo do tempo).
O progresso fica salvo no navegador (`localStorage`).

## Como usar

- **Executar / Parar / Reiniciar** e **velocidade** (0,5x, 1x, 2x) na barra do editor.
- **Câmera**: arraste para girar, role ou use pinça para aproximar; teclado: `W A S D` movem, `Q E` giram.
  Botões sob a cena: girar, aproximar/afastar, resetar câmera e **Tela cheia** (no modo tela cheia ficam
  disponíveis Executar e Parar).
- **Peças numeradas**: clique num marcador (ou use **Legendas**) para ver o nome da peça; o **Diretório de componentes**
  lista peças, pinos e fios, com busca e filtros, e localiza a peça na cena.
- **Traço de sinal**: mostra os últimos sinais de saída dos pinos enquanto o programa roda.
- **Entradas**: clique e segure o botão 3D, arraste o potenciômetro ou o objeto do sensor — ou use o painel **Controles**
  (funciona com teclado e toque).
- Erros de código aparecem no monitor serial em português, com a linha.

## Desenvolvimento

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev      # servidor local: http://localhost:5173/arduino-3d/
npm test         # testes do simulador, das lições e dos desafios (Vitest)
npm run build    # build de produção em dist/
npm run preview  # serve o build localmente
```

## Estrutura

```
src/
  main.js         ponto de entrada: liga cena, simulador, editor e interface
  scene/          câmera, luz, placa Uno, protoboard, fios, montagem da lição
  components/     um módulo por componente 3D (led, resistor, button, pot, servo, ultrasonic, buzzer)
  sim/            transpilador Arduino→JS, runtime, barramento de pinos (PinBus), relógio, erros
  editor/         CodeMirror 6
  lessons/        lições em JSON (+ checks.js com as verificações dos desafios)
  ui/             menu, abas, monitor serial, controles de entrada, progresso, áudio
  i18n/           catálogo de textos (pt-BR.json)
public/models/    modelos .glb futuros
tests/            Vitest
```

### Como funciona o simulador

1. `sim/transpiler.js` converte o código Arduino em JavaScript, mantendo o número de linhas. Funções do usuário
   viram `async function` e `delay()` vira `await`, então o programa nunca trava a aba.
2. `sim/runtime.js` executa o resultado com a API Arduino (`pinMode`, `digitalWrite`, `analogRead`, `Servo`, `Serial`…).
   **Parar** usa `AbortController`; laços sem `delay` cedem ao navegador a cada N iterações.
3. O runtime só escreve e lê no `PinBus`. Os componentes 3D escutam o barramento, e as entradas
   (botão, potenciômetro, distância) escrevem nele. A cena e o simulador nunca se chamam diretamente.

Limitações conhecidas: sem ponteiros, classes ou bibliotecas além de `Servo`; a divisão inteira só é truncada
em atribuições a variáveis `int`/`long`; laços escritos em uma única linha não cedem ao navegador.

## Como criar uma lição

Crie `src/lessons/07-nome.json` (a ordem vem do `id`):

```json
{
  "id": "07-nome",
  "nivel": "Básico",
  "titulo": "…", "resumo": "…", "objetivos": ["…"],
  "componentes": [{ "tipo": "led", "id": "led1", "pino": 13, "cor": "vermelho", "posicao": [0, 0.6] }],
  "ligacoes": [{ "de": "D13", "para": "led1.anodo", "cor": "amarelo" }],
  "codigoInicial": "void setup() { … }", "exemplo": "…",
  "desafio": { "enunciado": "…", "verificacao": "id_em_checks.js" },
  "pinagem": "…", "especificacoes": "…"
}
```

- `posicao: [x, z]` é em cm a partir do centro do protoboard.
- Pontos de ligação: pinos da placa (`D13`, `A0`, `5V`, `GND`) ou `idDoComponente.âncora`
  (`led1.anodo`, `r1.a`, `pot1.sinal`, `servo1.vcc`, `us1.echo`, `buzzer1.positivo`…).
- Adicione a verificação em `src/lessons/checks.js` e um teste em `tests/checks.test.js`.
- `npm test` valida o formato, compila e executa o código de cada lição.

## Trocar um modelo procedural por `.glb`

Coloque o arquivo em `public/models/` e carregue-o em `src/scene/modelLoader.js`, o ponto único de troca
(use `import.meta.env.BASE_URL` no caminho para funcionar no GitHub Pages).

## Deploy (GitHub Pages)

O workflow `.github/workflows/deploy.yml` roda testes, gera o build e publica em
`https://LucTrevisan.github.io/arduino-3d/` a cada push na branch `main`.

Configuração única no repositório `LucTrevisan/arduino-3d`:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Envie o código:
   ```bash
   git remote add origin https://github.com/LucTrevisan/arduino-3d.git
   git push -u origin main
   ```
3. Acompanhe em **Actions**; ao terminar, o endereço do site aparece no job *deploy*.

O `vite.config.js` usa `base: '/arduino-3d/'`; se o nome do repositório mudar, altere esse valor.

## Conteúdo

Textos, lições e modelos 3D são originais deste projeto. A interface é inspirada em ferramentas de ensino
interativas, sem reaproveitar código ou conteúdo de terceiros.
