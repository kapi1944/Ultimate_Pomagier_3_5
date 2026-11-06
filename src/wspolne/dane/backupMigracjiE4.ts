import { pobierzZdjeciaPaczekDoBackupu } from '../../moduly/dokumenty/generatory/checklisty_paczek/zdjeciaPaczek'
import type { DaneChecklistyPaczki } from '../../moduly/dokumenty/generatory/checklisty_paczek/modelChecklistyPaczki'
import { kluczRejestruDokumentow, type StanRejestruDokumentow } from '../dokumenty/rejestrDokumentow'
import { odczytajZapisRejestru } from '../dokumenty/serializacjaRejestruDokumentow'
import { pobierzKluczeKategorii, serializujBackup, sprawdzBackup, utworzBackup } from './backupDanych'

type ZdjecieWKopii = { klucz: [string, string, string]; odcisk: string; typ: string; rozmiar: number; sha256: string; dane: string }
type ZawartoscKopii = { kopia: string; pozostaleKlucze: Record<string, string>; zdjecia: ZdjecieWKopii[] }

async function sha256(dane: ArrayBuffer) {
  const algorytmy = globalThis.crypto?.subtle
  if (!algorytmy) throw new Error('Kopia migracyjna wymaga bezpiecznego kontekstu z obsługą SHA-256.')
  return Array.from(new Uint8Array(await algorytmy.digest('SHA-256', dane)), (bajt) => bajt.toString(16).padStart(2, '0')).join('')
}

function skrotTekstu(tekst: string) {
  return sha256(new TextEncoder().encode(tekst).buffer)
}

function odczytajBase64(plik: Blob) {
  return new Promise<string>((rozwiaz, odrzuc) => {
    const czytnik = new FileReader()
    czytnik.onload = () => typeof czytnik.result === 'string'
      ? rozwiaz(czytnik.result.slice(czytnik.result.indexOf(',') + 1))
      : odrzuc(new Error('Nie udało się zakodować zdjęcia.'))
    czytnik.onerror = () => odrzuc(czytnik.error)
    czytnik.readAsDataURL(plik)
  })
}

export async function utworzBackupMigracjiE4() {
  const kopia = utworzBackup()
  const pozostaleKlucze = Object.fromEntries(pobierzKluczeKategorii('WSZYSTKO').flatMap((klucz) => {
    const zapis = localStorage.getItem(klucz)
    return zapis !== null && !Object.hasOwn(kopia.dane, klucz) ? [[klucz, zapis]] : []
  }))
  const zdjecia = []
  for (const { klucz, odcisk, plik } of await pobierzZdjeciaPaczekDoBackupu()) {
    zdjecia.push({ klucz, odcisk, typ: plik.type, rozmiar: plik.size, sha256: await sha256(await plik.arrayBuffer()), dane: await odczytajBase64(plik) })
  }
  const odczytaneKlucze = { ...kopia.dane, ...pozostaleKlucze }
  const aktualneKlucze = pobierzKluczeKategorii('WSZYSTKO').filter((klucz) => localStorage.getItem(klucz) !== null)
  if (aktualneKlucze.length !== Object.keys(odczytaneKlucze).length
    || aktualneKlucze.some((klucz) => odczytaneKlucze[klucz] !== localStorage.getItem(klucz))) {
    throw new Error('Dane zmieniły się podczas odczytu. Zakończ edycję i ponownie utwórz kopię.')
  }
  const zawartosc = JSON.stringify({ kopia: serializujBackup(kopia), pozostaleKlucze, zdjecia } satisfies ZawartoscKopii)
  const manifest = { wersja: 1, algorytm: 'SHA-256', sha256: await skrotTekstu(zawartosc), liczbaZdjec: zdjecia.length }
  return JSON.stringify({ manifest, zawartosc })
}

export async function sprawdzBackupMigracjiE4(tekst: string) {
  const { manifest, zawartosc } = JSON.parse(tekst) as {
    manifest?: { wersja?: number; algorytm?: string; sha256?: string; liczbaZdjec?: number }; zawartosc?: unknown
  }
  if (manifest?.wersja !== 1 || manifest.algorytm !== 'SHA-256' || typeof zawartosc !== 'string'
    || manifest.sha256 !== await skrotTekstu(zawartosc)) {
    throw new Error('Manifest lub suma kontrolna kopii migracyjnej jest nieprawidłowa.')
  }
  const { kopia, pozostaleKlucze, zdjecia } = JSON.parse(zawartosc) as ZawartoscKopii
  if (typeof kopia !== 'string' || !pozostaleKlucze || typeof pozostaleKlucze !== 'object' || Array.isArray(pozostaleKlucze)
    || Object.values(pozostaleKlucze).some((zapis) => typeof zapis !== 'string')
    || !Array.isArray(zdjecia) || manifest.liczbaZdjec !== zdjecia.length) throw new Error('Kopia migracyjna ma nieprawidłową strukturę.')
  const wynik = sprawdzBackup(kopia)
  if (!wynik.poprawny || !wynik.backup) throw new Error(wynik.blad ?? 'Niepoprawny backup danych.')

  const odciskiZdjec = new Map<string, string>()
  for (const zdjecie of zdjecia) {
    if (!Array.isArray(zdjecie?.klucz) || zdjecie.klucz.length !== 3 || !zdjecie.klucz.every((id) => typeof id === 'string' && id)
      || !['image/jpeg', 'image/png', 'image/webp'].includes(zdjecie.typ) || typeof zdjecie.dane !== 'string'
      || typeof zdjecie.odcisk !== 'string' || !Number.isSafeInteger(zdjecie.rozmiar) || zdjecie.rozmiar < 1 || zdjecie.rozmiar > 12 * 1024 * 1024
      || zdjecie.dane.length !== 4 * Math.ceil(zdjecie.rozmiar / 3)) {
      throw new Error('Kopia zawiera nieprawidłowe metadane zdjęcia.')
    }
    const klucz = JSON.stringify(zdjecie.klucz)
    if (odciskiZdjec.has(klucz)) throw new Error('Kopia zawiera zduplikowane zdjęcie paczki.')
    const bajty = Uint8Array.from(atob(zdjecie.dane), (znak) => znak.charCodeAt(0))
    if (bajty.length !== zdjecie.rozmiar || await sha256(bajty.buffer) !== zdjecie.sha256) {
      throw new Error('Suma kontrolna jednego ze zdjęć jest nieprawidłowa.')
    }
    odciskiZdjec.set(klucz, zdjecie.odcisk)
  }

  const zapis = wynik.backup.dane[kluczRejestruDokumentow]
  const odczyt = zapis === undefined ? {} : odczytajZapisRejestru(zapis)
  if (!odczyt || typeof odczyt !== 'object' || Array.isArray(odczyt)) throw new Error('Kopia zawiera nieprawidłowy rejestr dokumentów.')
  const stan = odczyt as Partial<StanRejestruDokumentow>
  if ((stan.dokumenty !== undefined && !Array.isArray(stan.dokumenty)) || (stan.historia !== undefined && !Array.isArray(stan.historia))) {
    throw new Error('Kopia zawiera nieprawidłową listę dokumentów lub historię.')
  }
  const dokumenty = stan.dokumenty ?? []
  if (dokumenty.some((dokument) => !dokument || typeof dokument.id !== 'string' || !dokument.id.trim())) {
    throw new Error('Kopia zawiera dokument bez poprawnego identyfikatora.')
  }
  const dokumentyPoId = new Set(dokumenty.map((dokument) => dokument.id))
  if (dokumentyPoId.size !== dokumenty.length) throw new Error('Kopia zawiera zduplikowane identyfikatory dokumentów.')
  const powiazaneZdjecia = new Set<string>()
  let brakZdjec = 0
  for (const dokument of dokumenty) {
    if (dokument.typ !== 'CHECKLISTA_PACZKI') continue
    const dane = dokument.daneDokumentu as Partial<DaneChecklistyPaczki> | null
    const paczki = dane?.paczki ?? []
    const paczkiPoId = new Set(paczki.map((paczka) => paczka.id))
    if (paczkiPoId.size !== paczki.length) throw new Error('Checklista zawiera zduplikowane identyfikatory paczek.')
    for (const zalacznik of dane?.zalaczniki ?? []) {
      const weryfikacja = zalacznik.weryfikacjaPaczki
      if (zalacznik.typ !== 'ZDJECIE_PACZKI' || !weryfikacja) continue
      const klucz = JSON.stringify([dokument.id, weryfikacja.paczkaId, zalacznik.id])
      if (powiazaneZdjecia.has(klucz)) throw new Error('Checklista zawiera zduplikowane odwołanie do zdjęcia.')
      powiazaneZdjecia.add(klucz)
      if (!paczkiPoId.has(weryfikacja.paczkaId) || odciskiZdjec.get(klucz) !== weryfikacja.odcisk) brakZdjec += 1
    }
  }
  return {
    dokumenty: dokumenty.length, historia: stan.historia?.length ?? 0, zdjecia: zdjecia.length, brakZdjec,
    zdjeciaArchiwalneLubBezPowiazania: [...odciskiZdjec.keys()].filter((klucz) => !powiazaneZdjecia.has(klucz)).length,
  }
}
