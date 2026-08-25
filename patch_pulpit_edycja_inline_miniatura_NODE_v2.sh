#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' '==> Patch v2: edycja zadania pod osią czasu + poprawka kadru miniatury'
printf '%s\n' '==> Silnik patcha: Node.js'

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

if [[ ! -d src ]]; then
  echo '[BŁĄD] Nie znaleziono katalogu src. Uruchom skrypt w katalogu repozytorium.'
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo '[BŁĄD] Nie znaleziono polecenia node.'
  exit 1
fi

node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const src = path.join(root, 'src');

function walk(dir, ext, out = []) {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}
function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) { fs.writeFileSync(p, s.replace(/\r\n/g, '\n'), 'utf8'); }
function rel(p) { return path.relative(root, p).replace(/\\/g, '/'); }
function die(msg, code=2) { console.error('[BŁĄD] ' + msg); process.exit(code); }

const tsx = walk(src, '.tsx');
const css = walk(src, '.css');

// Znajdź komponent zadaniowy po tekstach widocznych w UI.
const wanted = ['Edytuj zadanie','Miniatura zadania','Przypomnienia','Plan dnia','Do wykonania dzisiaj'];
const found = tsx.map(file => {
  const text = read(file);
  const score = wanted.reduce((n, x) => n + (text.includes(x) ? 1 : 0), 0);
  return {file, text, score};
}).filter(x => x.text.includes('Edytuj zadanie') && x.score >= 2)
  .sort((a,b) => b.score-a.score || a.file.length-b.file.length);

if (!found.length) die('Nie znalazłem komponentu TSX z edycją zadania. Niczego nie zmieniono.');

const target = found[0].file;
let text = found[0].text;
console.log('[INFO] Komponent: ' + rel(target));

if (!text.includes('pulpit-edytor-zadania-inline')) {
  const editPos = text.indexOf('Edytuj zadanie');
  const formStart = text.indexOf('<form', editPos);
  if (formStart < 0) die(`${rel(target)}: po napisie „Edytuj zadanie” nie znalazłem <form>.`);

  // Dopasuj pełny formularz przez licznik znaczników form.
  const re = /<form\b|<\/form\s*>/gi;
  re.lastIndex = formStart;
  let depth = 0, end = -1, m;
  while ((m = re.exec(text))) {
    if (m[0].toLowerCase().startsWith('<form')) depth++;
    else if (--depth === 0) { end = re.lastIndex; break; }
  }
  if (end < 0) die(`${rel(target)}: nie udało się wyznaczyć końca formularza.`);

  const form = text.slice(formStart, end);
  text = text.slice(0, formStart) + text.slice(end);

  // Usuń prosty osobny nagłówek edycji, jeżeli występuje.
  text = text.replace(/^[ \t]*<(h[1-6]|div|p)[^>\n]*>\s*Edytuj zadanie\s*<\/\1>\s*\r?\n?/m, '');

  // Formularz ma znaleźć się pod osią czasu, bezpośrednio przed listą zadań.
  const anchorText = 'Do wykonania dzisiaj';
  const anchor = text.indexOf(anchorText);
  if (anchor < 0) die(`${rel(target)}: nie znalazłem sekcji „${anchorText}”.`);

  const lineStart = text.lastIndexOf('\n', anchor) + 1;
  const lineEndRaw = text.indexOf('\n', anchor);
  const lineEnd = lineEndRaw < 0 ? text.length : lineEndRaw;
  const indent = (text.slice(lineStart, lineEnd).match(/^[ \t]*/) || [''])[0];
  const formIndented = form.split(/\r?\n/).map(l => l.trim() ? indent + '  ' + l : l).join('\n');

  const block = `${indent}<section className="pulpit-edytor-zadania-inline" aria-label="Edycja zadania">\n` +
                `${indent}  <h2>Edytuj zadanie</h2>\n` +
                `${formIndented}\n` +
                `${indent}</section>\n\n`;

  text = text.slice(0, lineStart) + block + text.slice(lineStart);
  write(target, text);
  console.log('[OK] Formularz edycji przeniesiony pod oś czasu.');
} else {
  console.log('[INFO] Formularz inline już istnieje — pomijam ponowne przenoszenie.');
}

// Dobierz arkusz CSS: najpierw z katalogu komponentu, potem po słowach kluczowych.
let cssTarget = null;
const sameDir = fs.readdirSync(path.dirname(target), {withFileTypes:true})
  .filter(e => e.isFile() && e.name.endsWith('.css'))
  .map(e => path.join(path.dirname(target), e.name));
if (sameDir.length) cssTarget = sameDir[0];

if (!cssTarget) {
  const scored = css.map(file => {
    const t = read(file).toLowerCase();
    const score = ['miniatur','kadr','pulpit','zadani'].reduce((n,k)=>n+(t.includes(k)?1:0),0);
    return {file,score};
  }).filter(x=>x.score).sort((a,b)=>b.score-a.score || a.file.length-b.file.length);
  if (scored.length) cssTarget = scored[0].file;
}

let newCss = false;
if (!cssTarget) {
  cssTarget = path.join(src, 'pulpit-inline-editor-v2.css');
  write(cssTarget, '');
  newCss = true;
}

let sheet = read(cssTarget);
const marker = '/* PATCH-V2: pulpit-inline-editor */';
if (!sheet.includes(marker)) {
  sheet += `\n\n${marker}\n` +
`.pulpit-edytor-zadania-inline {\n` +
`  width: 100%;\n` +
`  min-width: 0;\n` +
`  margin: 1rem 0 1.25rem;\n` +
`}\n\n` +
`.pulpit-edytor-zadania-inline > h2 {\n` +
`  margin: 0 0 .75rem;\n` +
`}\n\n` +
`.pulpit-edytor-zadania-inline form {\n` +
`  width: 100%;\n` +
`  min-width: 0;\n` +
`}\n\n` +
`/* Miniatura 1:1 ma wypełniać kadr zamiast zostawiać czarne pasy. */\n` +
`[class*="miniatur"] { overflow: hidden; }\n` +
`[class*="miniatur"] img,\n` +
`[class*="kadr"] img,\n` +
`[class*="crop"] img {\n` +
`  width: 100%;\n` +
`  height: 100%;\n` +
`  min-width: 100%;\n` +
`  min-height: 100%;\n` +
`  display: block;\n` +
`  object-fit: cover;\n` +
`  object-position: center;\n` +
`}\n`;
  write(cssTarget, sheet);
  console.log('[OK] Dodano CSS: ' + rel(cssTarget));
} else {
  console.log('[INFO] CSS patcha już istnieje.');
}

// Gdy trzeba było stworzyć osobny arkusz, zaimportuj go do komponentu.
if (newCss) {
  let current = read(target);
  let imp = path.relative(path.dirname(target), cssTarget).replace(/\\/g,'/');
  if (!imp.startsWith('.')) imp = './' + imp;
  const line = `import "${imp}";`;
  if (!current.includes(line)) {
    const imports = [...current.matchAll(/^import .*?;\s*$/gm)];
    if (imports.length) {
      const last = imports[imports.length-1];
      const pos = last.index + last[0].length;
      current = current.slice(0,pos) + '\n' + line + current.slice(pos);
    } else current = line + '\n' + current;
    write(target,current);
    console.log('[OK] Dodano import nowego CSS.');
  }
}
NODE

echo
echo '==> git diff --check'
git diff --check

echo
echo '==> npm test'
npm test

echo
echo '==> npm run build'
npm run build

echo
echo '==> Patch zakończony. Zmiany NIE zostały zatwierdzone w Git.'
echo 'Sprawdź ręcznie:'
echo '  1. kliknięcie zadania otwiera edycję pod osią czasu,'
echo '  2. w panelu bocznym nie ma już formularza edycji,'
echo '  3. miniatura 1:1 nie ma pionowych czarnych pasów,'
echo '  4. zoom i przesuwanie kadru nadal działają.'
echo
git status -sb
