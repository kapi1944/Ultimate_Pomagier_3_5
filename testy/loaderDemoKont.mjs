import { readFile } from 'node:fs/promises'
export async function load(adres, kontekst, dalej) {
  if (!adres.endsWith('/aplikacja/logowanie/uwierzytelnianie.ts')) return dalej(adres, kontekst)
  const zrodlo = await readFile(new URL(adres), 'utf8')
  return { format: 'module-typescript', source: 'import.meta.env = { DEV: true, MODE: "demonstracyjny", VITE_TRYB_DEMONSTRACYJNY: "true" };\n' + zrodlo, shortCircuit: true }
}
