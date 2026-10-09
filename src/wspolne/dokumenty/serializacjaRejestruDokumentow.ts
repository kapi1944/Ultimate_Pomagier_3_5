import { gzipSync, gunzipSync, strFromU8, strToU8 } from 'fflate'

// Wersja opakowania chroni zapis przed odczytem przez starszą aplikację.
export function skompresujRejestr(zapis: string): string {
  const bajty = gzipSync(strToU8(zapis))
  let tekst = ''
  for (let indeks = 0; indeks < bajty.length; indeks += 8192) {
    tekst += String.fromCharCode(...bajty.subarray(indeks, indeks + 8192))
  }
  return JSON.stringify({ wersja: 4, kodowanie: 'gzip-base64', dane: btoa(tekst) })
}

export function odczytajZapisRejestru(zapis: string): unknown {
  const odczyt: unknown = JSON.parse(zapis)
  if (odczyt && typeof odczyt === 'object' && 'wersja' in odczyt && odczyt.wersja === 4) {
    if (!('kodowanie' in odczyt) || odczyt.kodowanie !== 'gzip-base64' || !('dane' in odczyt) || typeof odczyt.dane !== 'string') {
      throw new Error('Nieobsługiwane kodowanie rejestru dokumentów.')
    }
    const bajty = Uint8Array.from(atob(odczyt.dane), (znak) => znak.charCodeAt(0))
    return JSON.parse(strFromU8(gunzipSync(bajty))) as unknown
  }
  return odczyt
}

export function czyBrakMiejscaWMagazynie(blad: unknown): boolean {
  return blad instanceof Error && (blad.name === 'QuotaExceededError' || blad.name === 'NS_ERROR_DOM_QUOTA_REACHED')
}
