const strony = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const strona = strony.find((pozycja) => pozycja.type === 'page')
const polaczenie = new WebSocket(strona.webSocketDebuggerUrl)
await new Promise((ok, blad) => { polaczenie.onopen = ok; polaczenie.onerror = blad })
let id = 0
function cdp(method, params = {}) { const numer = ++id; return new Promise((ok) => { const odbierz = (e) => { const m = JSON.parse(e.data); if (m.id !== numer) return; polaczenie.removeEventListener('message', odbierz); ok(m.result) }; polaczenie.addEventListener('message', odbierz); polaczenie.send(JSON.stringify({ id: numer, method, params })) }) }
async function ocen(expression) { return (await cdp('Runtime.evaluate', { expression, returnByValue: true })).result.value }
async function punkt(selektor) { return ocen(`(() => {const e=document.querySelector(${JSON.stringify(selektor)});if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`) }
async function kliknij(selektor) { const p = await punkt(selektor); if (!p) throw new Error(selektor); await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 }); await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 }); await new Promise((ok) => setTimeout(ok, 150)) }
async function kliknijEtykiete(tekst) { const p = await ocen(`(() => {const e=[...document.querySelectorAll('label')].find(x=>x.textContent.includes(${JSON.stringify(tekst)}))?.querySelector('input');if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`); if (!p) throw new Error(tekst); await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 }); await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 }); await new Promise((ok) => setTimeout(ok, 150)) }
await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await cdp('Page.reload', { ignoreCache: true })
await new Promise((ok) => setTimeout(ok, 500))
await ocen(`scrollTo(0,0)`)
if (!await ocen(`document.querySelector('button[aria-controls="panel-danych-ankiety"]')?.getAttribute('aria-expanded')==='true'`)) await kliknij('button[aria-controls="panel-danych-ankiety"]')
if (!await ocen(`document.querySelector('#panel-danych-ankiety .generator-panel-ustawien__akcje button:nth-child(2)')?.getAttribute('aria-pressed')==='true'`)) await kliknij('#panel-danych-ankiety .generator-panel-ustawien__akcje button:nth-child(2)')
await kliknij('.edytor-blokow__przelacznik input')
for (let proba = 0; proba < 3 && (await punkt('[data-blok-edytowalny="szablon-logo-1"]')).y > 900; proba += 1) { await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 800, y: 600, deltaX: 0, deltaY: 700 }); await new Promise((ok) => setTimeout(ok, 120)) }
console.log(await ocen(`(() => {const e=document.querySelector('[data-blok-edytowalny="szablon-logo-1"]');const r=e?.getBoundingClientRect();return JSON.stringify({r:r&&{x:r.x,y:r.y,w:r.width,h:r.height},top:r&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,180)})})()`))
await kliknij('[data-blok-edytowalny="szablon-logo-1"]')
console.log(await ocen(`JSON.stringify({panel:document.getElementById('panel-danych-ankiety')?.innerText,otwarty:document.getElementById('panel-danych-ankiety')?.className,zaznaczony:document.querySelector('.edytor-blokow__ramka--zaznaczona')?.dataset.blokEdytowalny,tryb:document.querySelector('.edytor-blokow__przelacznik input')?.checked})`))
if (await ocen(`[...document.querySelectorAll('label')].find(x=>x.textContent.includes('Zablokuj pozycję'))?.querySelector('input').checked`)) await kliknijEtykiete('Zablokuj pozycję')
const przed = await ocen(`document.querySelector('[data-blok-edytowalny="szablon-logo-1"]').getBoundingClientRect().x`)
const p = await punkt('[data-blok-edytowalny="szablon-logo-1"]')
await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', buttons: 1, clickCount: 1 })
await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x + 15, y: p.y + 5, button: 'left', buttons: 1 })
await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x + 35, y: p.y + 10, button: 'left', buttons: 1 })
await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x + 35, y: p.y + 10, button: 'left', clickCount: 1 })
await new Promise((ok) => setTimeout(ok, 250))
console.log(JSON.stringify({ przed: Math.round(przed), po: Math.round(await ocen(`document.querySelector('[data-blok-edytowalny="szablon-logo-1"]').getBoundingClientRect().x`)), preset: await ocen(`document.querySelector('select[id$="-preset"]').value`), xMm: await ocen(`[...document.querySelectorAll('.edytor-blokow__siatka-liczb label')].find(e=>e.textContent.includes('X (mm)'))?.querySelector('input').value`), zaznaczony: await ocen(`document.querySelector('.edytor-blokow__ramka--zaznaczona')?.dataset.blokEdytowalny`) }))
polaczenie.close()
