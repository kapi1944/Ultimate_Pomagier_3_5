import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const adresKont = 'http://127.0.0.1:47831'
const nazwaSesji = '__Host-pomagier_sesja'
const limitZadania = 32768

export function utworzBrameHttps(adresPubliczny, wykonajZapytanie = fetch) {
  const adres = new URL(adresPubliczny)
  if (adres.protocol !== 'https:' || adresPubliczny !== adres.origin) {
    throw new Error('Podaj dokładny origin HTTPS aplikacji, bez ścieżki i ukośnika końcowego.')
  }

  return async function obsluz(zadanie, odpowiedz) {
    odpowiedz.setHeader('Cache-Control', 'no-store')
    odpowiedz.setHeader('X-Content-Type-Options', 'nosniff')
    odpowiedz.setHeader('Referrer-Policy', 'no-referrer')
    function zakoncz(status) {
      odpowiedz.writeHead(status).end()
    }

    try {
      if (zadanie.headers.host !== adres.host) return zakoncz(403)
      if (!zadanie.url?.startsWith('/') || zadanie.url.startsWith('//') || zadanie.url.includes('\\')) return zakoncz(400)
      const trasa = new URL(zadanie.url, adres)
      if (trasa.origin !== adres.origin) return zakoncz(400)

      if (trasa.pathname === '/api/konta') {
        if (zadanie.method !== 'POST' || zadanie.headers.origin !== adres.origin || trasa.search
          || zadanie.headers['content-type'] !== 'application/json' || zadanie.headers['x-pomagier-konta'] !== '1') {
          return zakoncz(403)
        }
        const fragmenty = []
        let rozmiar = 0
        for await (const fragment of zadanie.iterator({ destroyOnReturn: false })) {
          rozmiar += fragment.length
          if (rozmiar > limitZadania) return zakoncz(413)
          fragmenty.push(fragment)
        }
        let tresc
        try { tresc = JSON.parse(Buffer.concat(fragmenty).toString('utf8')) }
        catch { return zakoncz(400) }
        if (typeof tresc?.operacja !== 'string') return zakoncz(400)
        if (tresc.operacja === 'pierwsza-konfiguracja') return zakoncz(403)

        const sesja = zadanie.headers.cookie?.split(';')
          .map((czesc) => czesc.trim())
          .filter((czesc) => czesc.startsWith(nazwaSesji + '='))
        if (sesja?.length > 1) return zakoncz(400)
        const token = sesja?.[0]?.slice(nazwaSesji.length + 1)
        if (token && !/^[0-9a-f]{64}$/.test(token)) return zakoncz(400)
        const wynik = await wykonajZapytanie(adresKont + '/api/konta', {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
          headers: { 'Content-Type': 'application/json', Origin: adresKont, 'X-Pomagier-Konta': '1',
            ...(token ? { Cookie: 'pomagier_sesja=' + token } : {}) },
          body: JSON.stringify(tresc),
        })
        const ciasteczko = wynik.headers.get('set-cookie')
        if (ciasteczko) {
          const wartosc = /^pomagier_sesja=([0-9a-f]{64}|);/u.exec(ciasteczko)?.[1]
          if (wartosc === undefined) return zakoncz(502)
          odpowiedz.setHeader('Set-Cookie', `${nazwaSesji}=${wartosc}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${wartosc ? 28800 : 0}`)
        }
        odpowiedz.setHeader('Content-Type', 'application/json; charset=utf-8')
        odpowiedz.writeHead(wynik.status).end(await wynik.text())
        return
      }

      if (zadanie.method !== 'GET' || trasa.pathname.startsWith('/api/') || trasa.pathname === '/api') return zakoncz(404)
      const opcje = { redirect: 'error', signal: AbortSignal.timeout(30000) }
      let wynik = await wykonajZapytanie(adresKont + trasa.pathname, opcje)
      if (wynik.status === 404 && zadanie.headers.accept?.includes('text/html')) {
        await wynik.body?.cancel()
        wynik = await wykonajZapytanie(adresKont + '/index.html', opcje)
      }
      for (const nazwa of ['content-type', 'content-security-policy']) {
        const wartosc = wynik.headers.get(nazwa)
        if (wartosc) odpowiedz.setHeader(nazwa, wartosc)
      }
      odpowiedz.writeHead(wynik.status)
      if (wynik.body) await pipeline(Readable.fromWeb(wynik.body), odpowiedz)
      else odpowiedz.end()
    } catch {
      if (odpowiedz.headersSent) odpowiedz.destroy()
      else zakoncz(502)
    }
  }
}
