#!/usr/bin/env bash
set -euo pipefail

echo "==> Patch: edycja zadania pod osią czasu + poprawka kadru miniatury"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

if [[ ! -d src ]]; then
  echo "[BŁĄD] Nie znaleziono katalogu src. Uruchom skrypt w katalogu repozytorium Ultimate_Pomagier_3_5."
  exit 1
fi

python - <<'PY'
from pathlib import Path
import re
import sys

root = Path.cwd()
src = root / "src"

tsx_files = list(src.rglob("*.tsx"))
css_files = list(src.rglob("*.css"))

# 1. Znajdź plik pulpitu zawierający formularz edycji zadania.
candidates = []
for p in tsx_files:
    text = p.read_text(encoding="utf-8")
    score = sum(
        marker in text
        for marker in (
            "Edytuj zadanie",
            "Miniatura zadania",
            "Przypomnienia",
            "Plan dnia",
            "Do wykonania dzisiaj",
        )
    )
    if "Edytuj zadanie" in text and score >= 2:
        candidates.append((score, p, text))

if not candidates:
    print("[BŁĄD] Nie znalazłem pliku TSX z formularzem „Edytuj zadanie”.")
    print("       Niczego nie zmieniono.")
    sys.exit(2)

candidates.sort(key=lambda x: (-x[0], len(str(x[1]))))
score, target, text = candidates[0]

# 2. Wytnij formularz <form> znajdujący się po nagłówku „Edytuj zadanie”.
edit_pos = text.find("Edytuj zadanie")
form_open = text.find("<form", edit_pos)
if form_open < 0:
    print(f"[BŁĄD] {target}: po „Edytuj zadanie” nie znaleziono znacznika <form>.")
    sys.exit(3)

next_section_markers = [
    pos for marker in ("Wykonane", "Usuń zadanie", "Plan dnia", "Do wykonania dzisiaj")
    if (pos := text.find(marker, edit_pos + len("Edytuj zadanie"))) >= 0
]
nearest_boundary = min(next_section_markers) if next_section_markers else len(text)
if form_open > nearest_boundary:
    print(f"[BŁĄD] {target}: formularz po „Edytuj zadanie” nie jest jednoznaczny.")
    sys.exit(4)

token_re = re.compile(r"<form\b|</form\s*>", re.I)
depth = 0
form_close = None
for m in token_re.finditer(text, form_open):
    token = m.group(0).lower()
    if token.startswith("<form"):
        depth += 1
    else:
        depth -= 1
        if depth == 0:
            form_close = m.end()
            break

if form_close is None:
    print(f"[BŁĄD] {target}: nie udało się znaleźć końca formularza edycji.")
    sys.exit(5)

form_block = text[form_open:form_close]
new_text = text[:form_open] + text[form_close:]

heading_re = re.compile(
    r'^[ \t]*<(?P<tag>h[1-6]|div|p)[^>\n]*>\s*Edytuj zadanie\s*</(?P=tag)>\s*\n?',
    re.M
)
new_text = heading_re.sub("", new_text, count=1)

# 3. Wstaw ten sam formularz pod osią czasu, przed sekcją „Do wykonania dzisiaj”.
anchor = "Do wykonania dzisiaj"
anchor_pos = new_text.find(anchor)
if anchor_pos < 0:
    print(f"[BŁĄD] {target}: nie znaleziono sekcji „{anchor}”.")
    sys.exit(6)

line_start = new_text.rfind("\n", 0, anchor_pos) + 1
line_end = new_text.find("\n", anchor_pos)
if line_end < 0:
    line_end = len(new_text)
line = new_text[line_start:line_end]
indent = re.match(r"[ \t]*", line).group(0)

inline_block = (
    f'{indent}<section className="pulpit-edytor-zadania-inline" aria-label="Edycja zadania">\n'
    f'{indent}  <h2>Edytuj zadanie</h2>\n'
    + "\n".join(indent + "  " + ln if ln.strip() else ln for ln in form_block.splitlines())
    + f'\n{indent}</section>\n\n'
)

new_text = new_text[:line_start] + inline_block + new_text[line_start:]
target.write_text(new_text, encoding="utf-8")
print(f"[OK] Przeniesiono formularz edycji pod oś czasu: {target.relative_to(root)}")

# 4. CSS: szeroki formularz inline + poprawka czarnych pasów.
css_target = None

same_dir_css = list(target.parent.glob("*.css"))
if same_dir_css:
    css_target = same_dir_css[0]

if css_target is None:
    scored_css = []
    for p in css_files:
        t = p.read_text(encoding="utf-8")
        s = sum(k in t.lower() for k in ("miniatur", "kadr", "pulpit", "zadani"))
        if s:
            scored_css.append((s, p))
    if scored_css:
        scored_css.sort(key=lambda x: (-x[0], len(str(x[1]))))
        css_target = scored_css[0][1]

if css_target is None:
    css_target = src / "pulpit-inline-editor.patch.css"
    css_target.write_text("", encoding="utf-8")

css = css_target.read_text(encoding="utf-8")
patch_marker = "/* PATCH: pulpit-edytor-zadania-inline */"

if patch_marker not in css:
    css += r'''

/* PATCH: pulpit-edytor-zadania-inline */
.pulpit-edytor-zadania-inline {
  width: 100%;
  min-width: 0;
  margin: 1rem 0 1.25rem;
}

.pulpit-edytor-zadania-inline > h2 {
  margin: 0 0 0.75rem;
}

.pulpit-edytor-zadania-inline form {
  width: 100%;
  min-width: 0;
}

/*
 * Miniatura zadania:
 * format 1:1 ma wypełniać kadr zamiast mieścić się w nim.
 * Nie nadpisujemy transformacji używanej przez zoom/pozycjonowanie.
 */
[class*="miniatur"] {
  overflow: hidden;
}

[class*="miniatur"] img,
[class*="kadr"] img {
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
}

[class*="crop"] img {
  object-fit: cover;
}
'''
    css_target.write_text(css, encoding="utf-8")
    print(f"[OK] Dodano style formularza inline i kadru miniatury: {css_target.relative_to(root)}")
else:
    print(f"[INFO] Reguły CSS patcha już istnieją: {css_target.relative_to(root)}")

if css_target.name == "pulpit-inline-editor.patch.css":
    rel = css_target.relative_to(target.parent).as_posix()
    if not rel.startswith("."):
        rel = "./" + rel
    import_line = f'import "{rel}";\n'
    current = target.read_text(encoding="utf-8")
    if import_line not in current:
        matches = list(re.finditer(r'^import .*?;\s*$', current, re.M))
        if matches:
            pos = matches[-1].end()
            current = current[:pos] + "\n" + import_line.rstrip("\n") + current[pos:]
        else:
            current = import_line + current
        target.write_text(current, encoding="utf-8")
        print(f"[OK] Dodano import {css_target.name}.")
PY

echo
echo "==> Kontrola diff"
git diff --check

echo
echo "==> Testy"
npm test

echo
echo "==> Build"
npm run build

echo
echo "==> Gotowe. Zmiany pozostają NIEZATWIERDZONE w Git."
echo "    Sprawdź:"
echo "    1) kliknięcie zadania -> formularz edycji pod osią czasu,"
echo "    2) panel boczny -> bez formularza edycji,"
echo "    3) format miniatury 1:1 -> brak czarnych pionowych pasów,"
echo "    4) zoom i pozycjonowanie miniatury nadal działają."
echo
git status -sb
