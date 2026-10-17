import ts from 'typescript'
import { readFileSync, readdirSync } from 'node:fs'

export function odczytaj(plik) { return readFileSync(plik, 'utf8') }

export function plikiInterfejsu(katalog = 'src') {
  return readdirSync(katalog, { withFileTypes: true }).flatMap((wpis) => {
    const plik = `${katalog}/${wpis.name}`
    return wpis.isDirectory() ? plikiInterfejsu(plik) : plik.endsWith('.tsx') ? [plik] : []
  }).sort()
}

export function aktywneWidoki() {
  const plik = 'src/aplikacja/nawigacja/typyNawigacji.ts'
  const program = ts.createProgram([plik], { moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext, noEmit: true })
  const sprawdzacz = program.getTypeChecker()
  const deklaracja = program.getSourceFile(plik).statements.find((wpis) => ts.isTypeAliasDeclaration(wpis) && wpis.name.text === 'WidokNawigacji')
  const typ = sprawdzacz.getTypeAtLocation(deklaracja)
  if (!typ.isUnion() || typ.types.some((skladnik) => !skladnik.isStringLiteral())) throw new Error('WidokNawigacji musi rozwiązywać się do jawnych ID.')
  return typ.types.map((skladnik) => skladnik.value).sort()
}

export function powierzchniePliku(plik) {
  const zrodlo = ts.createSourceFile(plik, odczytaj(plik), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const powierzchnie = new Set()
  function odwiedz(wezel) {
    if (ts.isJsxOpeningElement(wezel) || ts.isJsxSelfClosingElement(wezel)) {
      const znacznik = wezel.tagName.getText(zrodlo)
      const atrybuty = wezel.attributes.properties.map((atrybut) => atrybut.getText(zrodlo)).join(' ')
      if (['form', 'aside', 'dialog', 'details', 'PanelWysuwany', 'OknoDialogowe', 'Zakladki'].includes(znacznik) || /modal|dialog|zakladk|tabpanel|tablist|panel-|panel__|drawer/i.test(atrybuty)) {
        powierzchnie.add(`${znacznik} ${atrybuty}`.replace(/\s+/g, ' ').trim())
      }
    }
    if (ts.isCallExpression(wezel) && /(?:window\.)?(?:confirm|prompt|alert)$/.test(wezel.expression.getText(zrodlo))) powierzchnie.add(wezel.getText(zrodlo).replace(/\s+/g, ' '))
    ts.forEachChild(wezel, odwiedz)
  }
  odwiedz(zrodlo)
  return [...powierzchnie].sort()
}
