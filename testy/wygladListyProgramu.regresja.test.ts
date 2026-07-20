import assert from 'node:assert/strict'
import { pobierzGruboscTekstuPozycjiListyProgramu } from '../src/moduly/dokumenty/generatory/programy_szkolen/stylPozycjiListyProgramu.ts'

assert.equal(pobierzGruboscTekstuPozycjiListyProgramu(0, true), 700, 'poziom glowny powinien byc pogrubiony')
assert.equal(pobierzGruboscTekstuPozycjiListyProgramu(1, true), 400, 'podpunkt poziomu 2 powinien pozostac zwykly')
assert.equal(pobierzGruboscTekstuPozycjiListyProgramu(2, true), 400, 'podpunkt poziomu 3 powinien pozostac zwykly')

console.log('OK: pogrubienie obejmuje wylacznie glowny poziom listy programu')