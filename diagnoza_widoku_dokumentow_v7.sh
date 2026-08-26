#!/usr/bin/env bash
set -euo pipefail

VIEW="src/moduly/dokumenty/WidokWszystkichDokumentow.tsx"

echo "==> Diagnostyka rzeczywistej struktury WidokWszystkichDokumentow"
echo "    Ten skrypt NICZEGO nie modyfikuje."
echo

if [[ ! -f package.json || ! -f "$VIEW" ]]; then
  echo "[BŁĄD] Uruchom skrypt w katalogu głównym Ultimate_Pomagier_3_5."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[BŁĄD] Brak Node.js w PATH."
  exit 1
fi

node <<'NODE'
const fs = require("fs");
const ts = require("typescript");

const file = "src/moduly/dokumenty/WidokWszystkichDokumentow.tsx";
const text = fs.readFileSync(file, "utf8");
const sf = ts.createSourceFile(
  file,
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function lineOf(pos) {
  return sf.getLineAndCharacterOfPosition(pos).line + 1;
}

function oneLine(node, max = 240) {
  return node
    .getText(sf)
    .replace(/\s+/g, " ")
    .slice(0, max);
}

console.log("===== PARSER =====");
if (sf.parseDiagnostics.length) {
  for (const d of sf.parseDiagnostics) {
    const pos = d.start ?? 0;
    const lc = sf.getLineAndCharacterOfPosition(pos);
    console.log(
      `BŁĄD ${lc.line + 1}:${lc.character + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`
    );
  }
} else {
  console.log("TSX poprawny składniowo.");
}

console.log("\n===== TRAFIENIA TEKSTOWE =====");
for (const phrase of [
  "Wszystkie dokumenty",
  "Wspólny rejestr dokumentów",
  "czyKosz",
  "WidokWszystkichDokumentow",
]) {
  let from = 0;
  let found = false;
  while (true) {
    const idx = text.indexOf(phrase, from);
    if (idx < 0) break;
    found = true;
    console.log(`${JSON.stringify(phrase)} -> linia ${lineOf(idx)}`);
    from = idx + phrase.length;
  }
  if (!found) console.log(`${JSON.stringify(phrase)} -> BRAK`);
}

let componentDecl = null;
let componentFn = null;

function visitFind(node) {
  if (
    ts.isFunctionDeclaration(node) &&
    node.name?.text === "WidokWszystkichDokumentow"
  ) {
    componentDecl = node;
    componentFn = node;
    return;
  }

  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === "WidokWszystkichDokumentow"
  ) {
    componentDecl = node;
    if (
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      componentFn = node.initializer;
    }
    return;
  }

  if (!componentDecl) ts.forEachChild(node, visitFind);
}

visitFind(sf);

console.log("\n===== DEKLARACJA KOMPONENTU =====");
if (!componentDecl) {
  console.log("Nie znaleziono deklaracji o nazwie WidokWszystkichDokumentow.");
} else {
  console.log("Rodzaj:", ts.SyntaxKind[componentDecl.kind]);
  console.log("Linia:", lineOf(componentDecl.getStart(sf)));
  console.log("Fragment:", oneLine(componentDecl, 500));
}

if (componentFn) {
  console.log("\n===== PARAMETRY =====");
  componentFn.parameters.forEach((p, i) => {
    console.log(`#${i + 1} linia ${lineOf(p.getStart(sf))}: ${oneLine(p, 700)}`);
  });

  console.log("\n===== TOP-LEVEL BODY =====");
  if (ts.isBlock(componentFn.body)) {
    componentFn.body.statements.forEach((s, i) => {
      console.log(
        `#${i + 1} linia ${lineOf(s.getStart(sf))} ${ts.SyntaxKind[s.kind]} :: ${oneLine(s, 500)}`
      );
    });
  } else {
    console.log(
      `expression body linia ${lineOf(componentFn.body.getStart(sf))}: ${oneLine(componentFn.body, 1000)}`
    );
  }

  console.log("\n===== RETURNY W KOMPONENCIE =====");
  let returns = [];

  function walkReturns(node, functionDepth = 0) {
    const entersFunction = ts.isFunctionLike(node) && node !== componentFn;
    const nextDepth = functionDepth + (entersFunction ? 1 : 0);

    if (ts.isReturnStatement(node)) {
      returns.push({
        node,
        depth: functionDepth,
      });
    }

    ts.forEachChild(node, child => walkReturns(child, nextDepth));
  }

  walkReturns(componentFn.body);

  if (!returns.length) {
    console.log("Brak return statement.");
  } else {
    for (const [i, item] of returns.entries()) {
      const r = item.node;
      console.log(
        `#${i + 1} linia ${lineOf(r.getStart(sf))} zagnieżdżenie_funkcji=${item.depth}`
      );
      console.log("  ", oneLine(r, 1200));

      if (r.expression) {
        console.log("   expression kind:", ts.SyntaxKind[r.expression.kind]);

        if (ts.isCallExpression(r.expression)) {
          console.log("   call:", oneLine(r.expression.expression, 300));
        }
        if (ts.isIdentifier(r.expression)) {
          console.log("   identifier:", r.expression.text);
        }
      }
    }
  }
}

console.log("\n===== FUNKCJE / ZMIENNE Z JSX W TYM PLIKU =====");
const jsxOwners = [];

function containsJsx(node) {
  let found = false;
  function v(n) {
    if (found) return;
    if (
      ts.isJsxElement(n) ||
      ts.isJsxSelfClosingElement(n) ||
      ts.isJsxFragment(n)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(n, v);
  }
  v(node);
  return found;
}

for (const st of sf.statements) {
  if (ts.isFunctionDeclaration(st) && st.name && containsJsx(st)) {
    jsxOwners.push({
      name: st.name.text,
      line: lineOf(st.getStart(sf)),
      kind: "function",
      text: oneLine(st, 800),
    });
  }

  if (ts.isVariableStatement(st)) {
    for (const d of st.declarationList.declarations) {
      if (
        ts.isIdentifier(d.name) &&
        d.initializer &&
        containsJsx(d.initializer)
      ) {
        jsxOwners.push({
          name: d.name.text,
          line: lineOf(d.getStart(sf)),
          kind: "variable",
          text: oneLine(d, 800),
        });
      }
    }
  }
}

if (!jsxOwners.length) {
  console.log("Brak top-level funkcji/zmiennych zawierających JSX.");
} else {
  for (const item of jsxOwners) {
    console.log(`${item.kind} ${item.name} @ linia ${item.line}`);
    console.log("  ", item.text);
  }
}

console.log("\n===== FRAGMENT ŹRÓDŁA 1-220 =====");
const lines = text.split(/\r?\n/);
for (let i = 0; i < Math.min(lines.length, 220); i++) {
  console.log(String(i + 1).padStart(4, " ") + " | " + lines[i]);
}

console.log("\n===== KONIEC DIAGNOSTYKI =====");
NODE
