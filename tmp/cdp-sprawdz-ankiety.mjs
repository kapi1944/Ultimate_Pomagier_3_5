import { writeFile } from 'node:fs/promises'
const strony = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const strona = strony.find((pozycja) => pozycja.type === 'page')
const polaczenie = new WebSocket(strona.webSocketDebuggerUrl)
await new Promise((ok, blad) => { polaczenie.onopen = ok; polaczenie.onerror = blad })
let licznik = 0
function wykonaj(method, params = {}) {
  const id = ++licznik
  return new Promise((ok) => {
    const obsluz = (zdarzenie) => { const wiadomosc = JSON.parse(zdarzenie.data); if (wiadomosc.id !== id) return; polaczenie.removeEventListener('message', obsluz); ok(wiadomosc.result) }
    polaczenie.addEventListener('message', obsluz)
    polaczenie.send(JSON.stringify({ id, method, params }))
  })
}
async function ocen(expression) { return (await wykonaj('Runtime.evaluate', { expression, returnByValue: true })).result.value }
async function kliknij(selektor, tekst) {
  const punkt = await ocen(`(() => { const e=${tekst ? `[...document.querySelectorAll(${JSON.stringify(selektor)})].find(x=>x.textContent.trim()===${JSON.stringify(tekst)})` : `document.querySelector(${JSON.stringify(selektor)})`}; if(!e)return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`)
  if (!punkt) throw new Error(`Nie znaleziono: ${tekst ?? selektor}`)
  await wykonaj('Input.dispatchMouseEvent', { type: 'mousePressed', x: punkt.x, y: punkt.y, button: 'left', clickCount: 1 })
  await wykonaj('Input.dispatchMouseEvent', { type: 'mouseReleased', x: punkt.x, y: punkt.y, button: 'left', clickCount: 1 })
}
async function klawisz(key) { await wykonaj('Input.dispatchKeyEvent', { type: 'keyDown', key }); await wykonaj('Input.dispatchKeyEvent', { type: 'keyUp', key }) }
await wykonaj('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await wykonaj('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 300, y: 300, deltaX: 0, deltaY: -10000 })
await new Promise((ok) => setTimeout(ok, 200))
if (await ocen(`document.body.innerText.includes('Zaloguj')`)) { await kliknij('button', 'Zaloguj'); await new Promise((ok) => setTimeout(ok, 300)) }
await kliknij('select[id$="-preset"]')
await klawisz('Home')
for (let indeks = 0; indeks < Number(process.argv[2] ?? 3); indeks += 1) await klawisz('ArrowDown')
await klawisz('Enter')
await new Promise((ok) => setTimeout(ok, 400))
console.log(await ocen(`JSON.stringify({preset:document.querySelector('select[id$="-preset"]')?.value,aktywny:document.querySelector('.generator-ankiet__aktywny-preset')?.textContent,strony:document.querySelectorAll('[data-strona-dokumentu]').length,szerokosc:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,kartki:[...document.querySelectorAll('[data-strona-dokumentu]')].map(e=>({w:Math.round(e.getBoundingClientRect().width),h:Math.round(e.getBoundingClientRect().height),scrollW:e.scrollWidth,scrollH:e.scrollHeight})),naglowki:document.querySelectorAll('.ankieta-nowoczesna__naglowek').length,checkboxy:document.querySelectorAll('.ankieta-nowoczesna__checkbox').length,stopka:[...document.querySelectorAll('.ankieta-nowoczesna__stopka')].at(-1)?.textContent,bloki:document.querySelectorAll('[data-blok-swobodny]').length,bledy:[...document.querySelectorAll('[role="alert"]')].map(e=>e.textContent)})`))
const obraz = await wykonaj('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
await writeFile(process.argv[3] ?? 'tmp/ankiety-nowoczesna.png', Buffer.from(obraz.data, 'base64'))
await wykonaj('Emulation.setDeviceMetricsOverride', { width: 720, height: 900, deviceScaleFactor: 1, mobile: false })
await new Promise((ok) => setTimeout(ok, 200))
console.log(await ocen(`JSON.stringify({kontener:720,szerokosc:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth})`))
polaczenie.close()
