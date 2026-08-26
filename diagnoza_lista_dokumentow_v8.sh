#!/usr/bin/env bash
set -euo pipefail

FILE="src/moduly/dokumenty/ListaDokumentow.tsx"

echo "==> Diagnostyka ListaDokumentow"
echo "    Ten skrypt NICZEGO nie modyfikuje."
echo

if [[ ! -f package.json || ! -f "$FILE" ]]; then
  echo "[BŁĄD] Nie znaleziono $FILE."
  echo "Uruchom skrypt w katalogu głównym Ultimate_Pomagier_3_5."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[BŁĄD] Brak Node.js w PATH."
  exit 1
fi

node <<'NODE'
const fs = require("fs");
const ts = require("typescript");

const file = "src/moduly/dokumenty/ListaDokumentow.tsx";
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

function oneLine(node, max = 500) {
  return node.getText(sf).replace(/\s+/g, " ").slice(0, max);
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
  "tytul",
  "opis",
  "filtr",
  "Filtry",
  "wyszuki",
  "Wyniki",
  "lista-dokument",
]) {
  const indexes = [];
  let from = 0;
  while (true) {
    const idx = text.toLocaleLowerCase("pl").indexOf(
      phrase.toLocaleLowerCase("pl"),
      from,
    );
    if (idx < 0) break;
    indexes.push(lineOf(idx));
    from = idx + phrase.length;
  }
  console.log(`${JSON.stringify(phrase)} -> ${indexes.length ? indexes.join(", ") : "BRAK"}`);
}

console.log("\n===== DEKLARACJE TOP-LEVEL =====");
for (const st of sf.statements) {
  if (ts.isFunctionDeclaration(st) && st.name) {
    console.log(
      `function ${st.name.text} @ ${lineOf(st.getStart(sf))}: ${oneLine(st, 800)}`
    );
  }

  if (ts.isVariableStatement(st)) {
    for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name)) {
        console.log(
          `var ${d.name.text} @ ${lineOf(d.getStart(sf))}: ${oneLine(d, 500)}`
        );
      }
    }
  }
}

let component = null;

function findComponent(node) {
  if (component) return;

  if (
    ts.isFunctionDeclaration(node) &&
    node.name &&
    node.name.text === "ListaDokumentow"
  ) {
    component = node;
    return;
  }

  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === "ListaDokumentow" &&
    node.initializer &&
    (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
  ) {
    component = node.initializer;
    return;
  }

  ts.forEachChild(node, findComponent);
}

findComponent(sf);

console.log("\n===== KOMPONENT ListaDokumentow =====");
if (!component) {
  console.log("Nie znaleziono deklaracji ListaDokumentow.");
} else {
  console.log(`Linia startowa: ${lineOf(component.getStart(sf))}`);

  if (component.parameters) {
    console.log("\nPARAMETRY:");
    component.parameters.forEach((p, i) => {
      console.log(`#${i + 1}: ${oneLine(p, 1200)}`);
    });
  }

  let returns = [];

  function collectReturns(node, depth = 0) {
    const nestedFn = node !== component && ts.isFunctionLike(node);
    const nextDepth = depth + (nestedFn ? 1 : 0);

    if (ts.isReturnStatement(node)) {
      returns.push({ node, depth });
    }

    ts.forEachChild(node, (child) => collectReturns(child, nextDepth));
  }

  if (component.body) collectReturns(component.body);

  console.log("\nRETURNY:");
  for (const [i, item] of returns.entries()) {
    console.log(
      `#${i + 1} linia ${lineOf(item.node.getStart(sf))}, zagnieżdżenie=${item.depth}`
    );
    console.log("  " + oneLine(item.node, 2200));
  }

  const mainReturn = returns.find((r) => r.depth === 0 && r.node.expression)?.node;

  if (mainReturn?.expression) {
    let expr = mainReturn.expression;
    while (ts.isParenthesizedExpression(expr)) expr = expr.expression;

    console.log("\n===== GŁÓWNY RETURN =====");
    console.log("Rodzaj:", ts.SyntaxKind[expr.kind]);

    if (ts.isJsxElement(expr) || ts.isJsxFragment(expr)) {
      const children = expr.children.filter(
        (n) =>
          ts.isJsxElement(n) ||
          ts.isJsxSelfClosingElement(n) ||
          ts.isJsxExpression(n),
      );

      console.log("Top-level children JSX:");
      children.forEach((child, i) => {
        if (ts.isJsxElement(child)) {
          const tag = child.openingElement.tagName.getText(sf);
          console.log(
            `#${i + 1} linia ${lineOf(child.getStart(sf))} <${tag}> :: ${oneLine(child, 1400)}`
          );
        } else if (ts.isJsxSelfClosingElement(child)) {
          const tag = child.tagName.getText(sf);
          console.log(
            `#${i + 1} linia ${lineOf(child.getStart(sf))} <${tag} /> :: ${oneLine(child, 1400)}`
          );
        } else {
          console.log(
            `#${i + 1} linia ${lineOf(child.getStart(sf))} JSXExpression :: ${oneLine(child, 1400)}`
          );
        }
      });
    }
  }
}

console.log("\n===== FRAGMENTY WOKÓŁ tytul/opis/filtr =====");
const lines = text.split(/\r?\n/);
const wanted = new Set();

for (let i = 0; i < lines.length; i++) {
  const lower = lines[i].toLocaleLowerCase("pl");
  if (
    lower.includes("tytul") ||
    lower.includes("opis") ||
    lower.includes("filtr") ||
    lower.includes("wyszuki") ||
    lower.includes("wyniki")
  ) {
    for (let j = Math.max(0, i - 4); j <= Math.min(lines.length - 1, i + 6); j++) {
      wanted.add(j);
    }
  }
}

let last = -2;
for (const i of [...wanted].sort((a, b) => a - b)) {
  if (i > last + 1) console.log("   ...");
  console.log(String(i + 1).padStart(4, " ") + " | " + lines[i]);
  last = i;
}

console.log("\n===== KONIEC DIAGNOSTYKI =====");
NODE
