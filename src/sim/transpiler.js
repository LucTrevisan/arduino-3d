// Transpilador Arduino (subconjunto de C/C++) → JavaScript.
// Regra de ouro: nunca muda a quantidade de linhas, para os erros apontarem a linha certa.

import { t } from '../i18n/index.js';

const TYPE =
  '(?:(?:unsigned|signed)\\s+)?(?:long\\s+long|long|int|short|float|double|bool|boolean|byte|char|word|String|size_t|uint\\d+_t|int\\d+_t)';
const INT_TYPE = /^(?:(?:unsigned|signed)\s+)?(?:long\s+long|long|int|short|byte|char|word|size_t|uint\d+_t|int\d+_t)$/;
const FUNC_DEF = new RegExp(
  `^(\\s*)(?:static\\s+|inline\\s+)*(?:${TYPE}|void)\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*(\\{.*)?$`,
);
const PROTOTYPE = new RegExp(`^\\s*(?:${TYPE}|void)\\s+\\w+\\s*\\([^)]*\\)\\s*;\\s*$`);
const DECL = new RegExp(
  `^(\\s*)(?:(?:static|volatile)\\s+)*(const\\s+)?(?:(?:static|volatile)\\s+)*(${TYPE})\\s+(.*?)\\s*;\\s*$`,
);
const SERVO_DECL = /^(\s*)Servo\s+(.*?)\s*;\s*$/;
const OPEN = { '(': ')', '[': ']', '{': '}' };

/** Remove comentários mantendo as quebras de linha (e as strings intactas). */
export function stripComments(src) {
  let out = '';
  let i = 0;
  let str = null;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (str) {
      out += c;
      if (c === '\\' && d !== undefined && d !== '\n') { out += d; i += 2; continue; }
      if (c === str || c === '\n') str = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") { str = c; out += c; i++; continue; }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') out += '\n'; i++; }
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Divide uma linha em trechos de código e de string/char. */
function splitSegments(line) {
  const segs = [];
  let cur = '';
  let i = 0;
  segs.unclosed = false;
  while (i < line.length) {
    const c = line[i];
    if (c === '"' || c === "'") {
      if (cur) segs.push({ t: 'code', s: cur });
      cur = '';
      let j = i + 1;
      while (j < line.length && line[j] !== c) j += line[j] === '\\' ? 2 : 1;
      if (j >= line.length) segs.unclosed = true;
      segs.push({ t: 'str', s: line.slice(i, j + 1) });
      i = j + 1;
    } else {
      cur += c;
      i++;
    }
  }
  if (cur) segs.push({ t: 'code', s: cur });
  return segs;
}

const mapCode = (line, fn) => splitSegments(line).map((s) => (s.t === 'code' ? fn(s.s) : s.s)).join('');

function braceDelta(line) {
  let d = 0;
  for (const seg of splitSegments(line)) {
    if (seg.t !== 'code') continue;
    for (const ch of seg.s) d += ch === '{' ? 1 : ch === '}' ? -1 : 0;
  }
  return d;
}

const fail = (key, params, line) => ({ message: t(`erros.${key}`, { ...params, line }), line });

/** Verifica parênteses/chaves/aspas e ';' esquecido. Retorna `{message, line}` ou null. */
export function checkSyntax(clean) {
  const lines = clean.split('\n');
  const stack = [];
  let lastSig = '';
  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    const segs = splitSegments(lines[i]);
    if (segs.unclosed) return fail('aspas', {}, ln);
    const startInInit = stack.some((s) => s.init);
    const startParens = stack.filter((s) => s.ch === '(' || s.ch === '[').length;
    let code = '';
    for (const seg of segs) {
      if (seg.t === 'str') { code += '""'; lastSig = '"'; continue; }
      for (const ch of seg.s) {
        if (ch in OPEN) {
          stack.push({ ch, line: ln, init: ch === '{' && '=,{'.includes(lastSig) && lastSig !== '' });
        } else if (')}]'.includes(ch)) {
          const top = stack.pop();
          if (!top) return fail('sobrando', { ch }, ln);
          if (OPEN[top.ch] !== ch) return fail('naoCombina', { open: top.ch, openLine: top.line, close: ch }, ln);
        }
        if (!/\s/.test(ch)) lastSig = ch;
        code += ch;
      }
    }
    const tl = code.trim();
    if (!tl || startParens > 0 || startInInit || tl[0] === '#') continue;
    if (';{},(:+-*/%&|^=<>?!~.'.includes(tl.at(-1)) || tl.at(-1) === '}') continue;
    if (/^(?:\}\s*)?(?:if|for|while|switch|else|do)\b/.test(tl)) continue;
    let k = i + 1;
    while (k < lines.length && !lines[k].trim()) k++;
    const next = (lines[k] ?? '').trim();
    if (tl.at(-1) === ')' && (FUNC_DEF.test(lines[i]) || next[0] === '{')) continue;
    if (next && '{).+-*/?:&|=,'.includes(next[0])) continue;
    return fail('pontoVirgula', {}, ln);
  }
  if (stack.length) {
    const top = stack[stack.length - 1];
    return fail('naoFechado', { ch: top.ch }, top.line);
  }
  return null;
}

function splitTop(s, sep = ',') {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const seg of splitSegments(s)) {
    if (seg.t === 'str') { cur += seg.s; continue; }
    for (const ch of seg.s) {
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) depth--;
      if (ch === sep && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
    }
  }
  parts.push(cur);
  return parts.map((p) => p.trim());
}

const wrapInt = (init) => (/\/|\d\.\d/.test(init) ? `__int(${init})` : init);

function convertDecl(indent, isConst, type, rest, intNames) {
  const isInt = INT_TYPE.test(type);
  const out = [];
  for (const d of splitTop(rest)) {
    const m = /^(\w+)\s*(\[[^\]]*\])?\s*(?:=\s*([^]*))?$/.exec(d);
    if (!m) return null;
    const [, name, arr, init] = m;
    if (arr) {
      const size = arr.slice(1, -1).trim();
      if (init === undefined) out.push(`${name} = ${size ? `new Array(${size}).fill(0)` : '[]'}`);
      else if (init.trim().startsWith('{')) out.push(`${name} = ${init.replace(/\{/g, '[').replace(/\}/g, ']')}`);
      else out.push(`${name} = ${init}`);
    } else {
      if (isInt) intNames.add(name);
      const dflt = type === 'String' ? "''" : '0';
      out.push(`${name} = ${init === undefined ? dflt : isInt ? wrapInt(init.trim()) : init.trim()}`);
    }
  }
  return `${indent}${isConst ? 'const' : 'let'} ${out.join(', ')};`;
}

function convertParams(list) {
  const p = list.trim();
  if (!p || p === 'void') return '';
  return p
    .split(',')
    .map((x) => {
      const ids = x.replace(/\[[^\]]*\]/g, '').match(/\w+/g) ?? [];
      return ids.at(-1);
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * @param {string} source código Arduino
 * @returns {{code?: string, functions?: string[], error?: {message: string, line: number}}}
 */
export function transpile(source) {
  const clean = stripComments(source);
  const error = checkSyntax(clean);
  if (error) return { error };

  const lines = clean.split('\n');

  // Passada 1: nomes das funções do usuário (nível 0).
  const functions = [];
  let depth = 0;
  for (const line of lines) {
    if (depth === 0) {
      const m = FUNC_DEF.exec(line);
      if (m) functions.push(m[2]);
    }
    depth += braceDelta(line);
  }
  const callRe = functions.length
    ? new RegExp(`(^|[^\\w.$])(${functions.join('|')})\\s*\\(`, 'g')
    : null;

  // Passada 2: conversão linha a linha.
  const intNames = new Set();
  depth = 0;
  const out = lines.map((raw) => {
    const atTop = depth === 0;
    depth += braceDelta(raw);
    let line = raw;

    if (/^\s*#\s*include\b/.test(line)) return '';
    let m = /^(\s*)#\s*define\s+(\w+)(?:\s+(.+?))?\s*$/.exec(line);
    if (m) return `${m[1]}const ${m[2]} = ${m[3] ?? 'true'};`;
    if (/^\s*#/.test(line)) return '';

    if (atTop && PROTOTYPE.test(line)) return '';
    if (atTop && (m = FUNC_DEF.exec(line))) {
      const head = `${m[1]}async function ${m[2]}(${convertParams(m[3])}) `;
      const body = (m[4] ?? '').trim();
      if (body.length <= 1) return (head + body).trimEnd();
      // Corpo na mesma linha: converte cada instrução separadamente.
      const close = body.lastIndexOf('}');
      const inner = body.slice(1, close >= 0 ? close : undefined);
      const stmts = splitTop(inner, ';').filter(Boolean).map((s) => convertStmt(`${s};`.replace(/;;$/, ';')).trim());
      return `${head}{ ${stmts.join(' ')} ${close >= 0 ? '}' : ''}`.trimEnd();
    }
    return convertStmt(line);
  });

  function convertStmt(line) {
    let m;
    if ((m = SERVO_DECL.exec(line))) {
      const names = splitTop(m[2]).map((n) => `${n} = new Servo()`);
      line = `${m[1]}let ${names.join(', ')};`;
    } else if ((m = DECL.exec(line))) {
      line = convertDecl(m[1], !!m[2], m[3], m[4], intNames) ?? line;
    }

    // Atribuições que truncam para inteiro (int x = ...; x = a / b; x /= 2;)
    {
      let a = /^(\s*)(\w+)\s*=(?!=)\s*(.+);\s*$/.exec(line);
      if (a && intNames.has(a[2]) && /\/|\d\.\d/.test(a[3])) line = `${a[1]}${a[2]} = __int(${a[3]});`;
      a = /^(\s*)(\w+)\s*\/=\s*(.+);\s*$/.exec(line);
      if (a && intNames.has(a[2])) line = `${a[1]}${a[2]} = __int(${a[2]} / (${a[3]}));`;
    }

    line = mapCode(line, (c) => {
      c = c
        .replace(/\bfor\s*\(\s*(?:(?:unsigned|signed)\s+)?(?:long\s+long|long|int|short|byte|char|word|size_t|uint\d+_t|int\d+_t)\s+/g, 'for (let ')
        .replace(/\bfor\s*\(\s*(?:float|double)\s+/g, 'for (let ')
        .replace(/\(\s*(?:unsigned\s+)?(?:int|long|short|byte|char)\s*\)\s*(\w+(?:\.\w+)*(?:\([^()]*\))?|\([^()]*\))/g, '__int($1)')
        .replace(/\(\s*(?:float|double)\s*\)\s*/g, '')
        .replace(/\b(\d+)(?:UL|LU|ul|lu|L|l|U|u)\b/g, '$1')
        .replace(/\b(\d+\.\d+)f\b/g, '$1')
        .replace(/(^|[^\w.$])(delay|delayMicroseconds)\s*\(/g, '$1await $2(');
      if (callRe) {
        c = c.replace(callRe, (all, pre, name, off, whole) =>
          /function\s+$/.test(whole.slice(0, off + pre.length)) ? all : `${pre}await ${name}(`);
      }
      return c;
    });

    // Cede ao navegador em laços: while/for/do com chave na mesma linha.
    line = line
      .replace(/^(\s*(?:\}\s*)?(?:while|for)\s*\(.*\)\s*)\{\s*$/, '$1{ await __tick();')
      .replace(/^(\s*(?:\}\s*)?do\s*)\{\s*$/, '$1{ await __tick();');
    return line;
  }

  return { code: out.join('\n'), functions };
}
