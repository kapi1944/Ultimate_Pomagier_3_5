import assert from 'node:assert/strict'
import { once } from 'node:events'
import { request, createServer } from 'node:http'
import test from 'node:test'
import { utworzBrameHttps } from '../serwer/bramaHttps.mjs'

const origin = 'https://pomagier.test'
const token = 'ab'.repeat(32)

test('brama przekazuje uwierzytelnienie istniejącym kontom i chroni ciasteczko sesji', async () => {
  const wywolania = []
  const brama = utworzBrameHttps(origin, async (adres, opcje) => {
    wywolania.push({ adres, opcje })
    if (adres.endsWith('/index.html')) return new Response('<main>Pomagier</main>', { headers: { 'Content-Type': 'text/html', 'Content-Security-Policy': "default-src 'self'" } })
    if (!adres.endsWith('/api/konta')) return new Response(null, { status: 404 })
    const operacja = JSON.parse(opcje.body).operacja
    const ciasteczko = operacja === 'wyloguj' ? '' : token
    return new Response(JSON.stringify({ dane: true }), { headers: { 'Set-Cookie': `pomagier_sesja=${ciasteczko}; Path=/api/konta; HttpOnly` } })
  })
  const serwer = createServer(brama).listen(0, '127.0.0.1')
  await once(serwer, 'listening')
  const port = serwer.address().port
  function wyslij({ trasa = '/api/konta', metoda = 'POST', operacja = 'logowanie', naglowki = {}, tresc } = {}) {
    return new Promise((rozwiaz, odrzuc) => {
      const zadanie = request({
        hostname: '127.0.0.1', port, path: trasa, method: metoda,
        headers: { Host: 'pomagier.test', Origin: origin, 'Content-Type': 'application/json', 'X-Pomagier-Konta': '1', ...naglowki },
      }, async (odpowiedz) => {
        const fragmenty = []
        for await (const fragment of odpowiedz) fragmenty.push(fragment)
        rozwiaz({ status: odpowiedz.statusCode, naglowki: odpowiedz.headers, tresc: Buffer.concat(fragmenty).toString() })
      })
      zadanie.on('error', odrzuc)
      zadanie.end(metoda === 'POST' ? tresc ?? JSON.stringify({ operacja, dane: {} }) : undefined)
    })
  }
  try {
    assert.equal((await wyslij({ naglowki: { Host: 'inna.test' } })).status, 403)
    assert.equal((await wyslij({ naglowki: { Origin: 'https://inna.test' } })).status, 403)
    assert.equal((await wyslij({ naglowki: { 'X-Pomagier-Konta': '0' } })).status, 403)
    assert.equal((await wyslij({ operacja: 'pierwsza-konfiguracja' })).status, 403)
    assert.equal((await wyslij({ tresc: 'x'.repeat(32769) })).status, 413)
    assert.equal((await wyslij({ naglowki: { Cookie: '__Host-pomagier_sesja=nieprawidlowa' } })).status, 400)
    assert.equal(wywolania.length, 0)

    const logowanie = await wyslij()
    assert.equal(logowanie.status, 200)
    assert.deepEqual(logowanie.naglowki['set-cookie'], [`__Host-pomagier_sesja=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`])
    assert.ok(!logowanie.tresc.includes(token))
    assert.equal(wywolania[0].adres, 'http://127.0.0.1:47831/api/konta')
    assert.equal(wywolania[0].opcje.headers.Origin, 'http://127.0.0.1:47831')

    const wylogowanie = await wyslij({ operacja: 'wyloguj', naglowki: { Cookie: `inne=wartosc; __Host-pomagier_sesja=${token}` } })
    assert.equal(wywolania[1].opcje.headers.Cookie, `pomagier_sesja=${token}`)
    assert.deepEqual(wylogowanie.naglowki['set-cookie'], ['__Host-pomagier_sesja=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'])

    const nawigacja = await wyslij({ metoda: 'GET', trasa: '/dokumenty/checklisty-paczek/dokument-1?cel=s', naglowki: { Accept: 'text/html' } })
    assert.equal(nawigacja.status, 200)
    assert.equal(nawigacja.tresc, '<main>Pomagier</main>')
    assert.equal(nawigacja.naglowki['content-security-policy'], "default-src 'self'")
    assert.equal(wywolania[2].adres, 'http://127.0.0.1:47831/dokumenty/checklisty-paczek/dokument-1')
    assert.equal((await wyslij({ metoda: 'GET', trasa: '/api/dane', naglowki: { Accept: 'text/html' } })).status, 404)
  } finally {
    await new Promise((rozwiaz) => serwer.close(rozwiaz))
  }
})

test('konfiguracja bramy wymaga kanonicznego originu HTTPS', () => {
  assert.throws(() => utworzBrameHttps('http://pomagier.test'), /HTTPS/)
  assert.throws(() => utworzBrameHttps('https://pomagier.test/logowanie'), /HTTPS/)
  assert.throws(() => utworzBrameHttps('https://pomagier.test/'), /HTTPS/)
})
