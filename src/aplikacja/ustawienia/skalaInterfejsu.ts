import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { normalizujSkaleInterfejsu } from './modelUstawienAplikacji'

export const zdarzenieZmianySkaliInterfejsu = 'ultimatePomagier:zmianaSkaliInterfejsu'
let skalaInterfejsu = 100
let czyZastosowano = false
let kolejkaSkalowania = Promise.resolve()
let bladSkalowania = ''

export function pobierzSkaleInterfejsu() { return skalaInterfejsu }
export function pobierzBladSkalowania() { return bladSkalowania }

export function zastosujSkaleInterfejsu(wartosc: number): Promise<void> {
  const skala = normalizujSkaleInterfejsu(wartosc)
  if (czyZastosowano && skala === skalaInterfejsu && !bladSkalowania) return kolejkaSkalowania
  czyZastosowano = true
  skalaInterfejsu = skala
  const czyDesktop = isTauri()
  document.documentElement.style.setProperty('--ui-skala-interfejsu', String(skala / 100))
  // CSS zoom obejmuje też portale; desktop używa wyłącznie natywnego zoomu WebView.
  document.documentElement.style.setProperty('--ui-skala-przegladarki', czyDesktop ? '1' : String(skala / 100))
  if (czyDesktop) {
    kolejkaSkalowania = kolejkaSkalowania.then(async () => {
      try {
        await getCurrentWebview().setZoom(skala / 100)
        bladSkalowania = ''
      } catch (blad) {
        bladSkalowania = 'Nie udało się zmienić skali okna. Spróbuj ponownie.'
        console.error(bladSkalowania, blad)
      }
      window.dispatchEvent(new Event(zdarzenieZmianySkaliInterfejsu))
    })
  }
  window.dispatchEvent(new Event(zdarzenieZmianySkaliInterfejsu))
  return kolejkaSkalowania
}

export function obliczSkalePoSkrocie(zdarzenie: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'altKey' | 'metaKey' | 'isComposing' | 'defaultPrevented'>, skala: number): number | null {
  if (!zdarzenie.ctrlKey || zdarzenie.altKey || zdarzenie.metaKey || zdarzenie.isComposing || zdarzenie.defaultPrevented) return null
  if (['+', '='].includes(zdarzenie.key) || zdarzenie.code === 'NumpadAdd') return normalizujSkaleInterfejsu(skala + 5)
  if (['-', '_', '−'].includes(zdarzenie.key) || zdarzenie.code === 'NumpadSubtract') return normalizujSkaleInterfejsu(skala - 5)
  if (zdarzenie.key === '0' || zdarzenie.code === 'Numpad0') return 100
  return null
}

export function zarejestrujSkrotySkaliInterfejsu() {
  function obsluzSkrot(zdarzenie: KeyboardEvent) {
    const skala = obliczSkalePoSkrocie(zdarzenie, skalaInterfejsu)
    if (skala === null) return
    zdarzenie.preventDefault()
    void zastosujSkaleInterfejsu(skala)
  }
  window.addEventListener('keydown', obsluzSkrot)
  return () => window.removeEventListener('keydown', obsluzSkrot)
}
