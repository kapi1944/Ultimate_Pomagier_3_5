import { readFile } from 'node:fs/promises'
export async function load(adres, kontekst, dalej) {
  if (!adres.endsWith('/aplikacja/logowanie/uwierzytelnianie.ts')) return dalej(adres, kontekst)
  const zrodlo = await readFile(new URL(adres), 'utf8')
  return { format: 'module-typescript', source: 'import.meta.env = { POMAGIER_SERWER_DEMONSTRACYJNY: true, DEV: true, PROD: false, MODE: "demonstracyjny", VITE_TRYB_DEMONSTRACYJNY: "true" };\n' + zrodlo, shortCircuit: true }
}
