import assert from 'node:assert/strict'
import { czyTelefonMiedzynarodowyPoprawny, normalizujTelefon, pobierzBladTelefonu } from '../src/wspolne/telefon/telefon.ts'

const polski = normalizujTelefon({ prefiks: '+48', numer: '500000001', krajIso2: 'PL' })
assert.equal(polski.numer, '500 000 001')
assert.equal(polski.numerE164, '+48500000001')
assert.equal(czyTelefonMiedzynarodowyPoprawny(polski), true)
assert.match(pobierzBladTelefonu({ prefiks: '+48', numer: '50000000', krajIso2: 'PL' }), /9 cyfr/)

const brytyjski = normalizujTelefon({ prefiks: '+44', numer: '7700900123', krajIso2: 'GB' })
assert.equal(brytyjski.numerE164, '+447700900123')
assert.equal(czyTelefonMiedzynarodowyPoprawny(brytyjski), true)

const niemiecki = normalizujTelefon({ prefiks: '+49', numer: '15123456789', krajIso2: 'DE' })
assert.equal(czyTelefonMiedzynarodowyPoprawny(niemiecki), true)

const wlasny = normalizujTelefon({ prefiks: '+999', numer: '1234567', krajIso2: 'INNY' })
assert.equal(wlasny.numerE164, '+9991234567')
assert.equal(czyTelefonMiedzynarodowyPoprawny(wlasny), true)

console.log('OK: formatowanie, E.164 i walidacja telefonów międzynarodowych')
