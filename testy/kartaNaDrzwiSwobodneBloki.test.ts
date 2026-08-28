import assert from 'node:assert/strict'
import { deserializujDaneKartyNaDrzwi, serializujDaneKartyNaDrzwi, utworzDomyslneDaneKartyNaDrzwi } from '../src/moduly/dokumenty/generatory/karta_na_drzwi/modelKartyNaDrzwi.ts'
const karta=utworzDomyslneDaneKartyNaDrzwi()
assert.deepEqual(karta.blokiSwobodne.map(blok=>blok.id),['logo','tytul','termin','miejsce','dodatkowy-tekst'])
const poZapisie=deserializujDaneKartyNaDrzwi(serializujDaneKartyNaDrzwi({...karta,blokiSwobodne:karta.blokiSwobodne.map(blok=>blok.id==='tytul'?{...blok,xMm:44,zablokowany:true}:blok)}))
assert.equal(poZapisie.blokiSwobodne.find(blok=>blok.id==='tytul')?.xMm,44)
assert.equal(poZapisie.blokiSwobodne.find(blok=>blok.id==='tytul')?.zablokowany,true)
const pionowa={...poZapisie,orientacja:'pionowa' as const}
assert.equal(pionowa.blokiSwobodne.find(blok=>blok.id==='tytul')?.xMm,44)
console.log('OK: Karta na drzwi zachowuje wspólne bloki i orientację')
