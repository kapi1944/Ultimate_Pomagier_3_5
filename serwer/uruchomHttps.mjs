import { readFileSync } from 'node:fs'
import { createServer } from 'node:https'
import { utworzBrameHttps } from './bramaHttps.mjs'

const { POMAGIER_ORIGIN_HTTPS: adres, POMAGIER_TLS_CERT: certyfikat, POMAGIER_TLS_KEY: klucz,
  POMAGIER_NASLUCH: nasluch = '127.0.0.1' } = process.env
if (!adres || !certyfikat || !klucz) throw new Error('Ustaw POMAGIER_ORIGIN_HTTPS, POMAGIER_TLS_CERT i POMAGIER_TLS_KEY.')

const obsluz = utworzBrameHttps(adres)
const port = Number(new URL(adres).port || 443)
createServer({ cert: readFileSync(certyfikat), key: readFileSync(klucz), minVersion: 'TLSv1.2' }, obsluz)
  .listen(port, nasluch, () => console.log(`Brama HTTPS Pomagiera nasłuchuje na ${nasluch}:${port}.`))
