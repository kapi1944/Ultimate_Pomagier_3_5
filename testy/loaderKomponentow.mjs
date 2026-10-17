import ts from 'typescript'
import { readFile, access } from 'node:fs/promises'

export async function resolve(nazwa, kontekst, dalej) {
  try { return await dalej(nazwa, kontekst) } catch (blad) {
    if (!nazwa.startsWith('.')) throw blad
    for (const rozszerzenie of ['.tsx', '.ts', '/index.ts']) {
      const adres = new URL(nazwa + rozszerzenie, kontekst.parentURL)
      try { await access(adres) } catch { continue }
      return { url: adres.href, shortCircuit: true }
    }
    throw blad
  }
}

export async function load(adres, kontekst, dalej) {
  if (adres.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true }
  if (!adres.endsWith('.tsx')) return dalej(adres, kontekst)
  const zrodlo = await readFile(new URL(adres), 'utf8')
  return { format: 'module', source: ts.transpileModule(zrodlo, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText, shortCircuit: true }
}
