type KluczZdjecia = [dokumentId: string, paczkaId: string, zdjecieId: string]

type ZapisZdjecia = { plik: Blob; odcisk: string }

async function wykonajOperacjeZdjecia<T>(tryb: IDBTransactionMode, operacja: (magazyn: IDBObjectStore) => IDBRequest<T>, czyUtworzyc = true) {
  const baza = await new Promise<IDBDatabase | null>((rozwiaz, odrzuc) => {
    const otwarcie = indexedDB.open('ultimatePomagier.zdjeciaPaczek', 1)
    let czyBrakBazy = false
    otwarcie.onupgradeneeded = () => {
      if (czyUtworzyc) otwarcie.result.createObjectStore('zdjecia')
      else { czyBrakBazy = true; otwarcie.transaction?.abort() }
    }
    otwarcie.onsuccess = () => rozwiaz(otwarcie.result)
    otwarcie.onerror = () => czyBrakBazy ? rozwiaz(null) : odrzuc(otwarcie.error)
  })
  if (!baza) return null
  try {
    return await new Promise<T>((rozwiaz, odrzuc) => {
      const transakcja = baza.transaction('zdjecia', tryb)
      const zadanie = operacja(transakcja.objectStore('zdjecia'))
      transakcja.oncomplete = () => rozwiaz(zadanie.result)
      transakcja.onabort = () => odrzuc(transakcja.error ?? new Error('Przerwano zapis zdjęcia paczki.'))
    })
  } finally { baza.close() }
}

export async function zapiszPlikZdjeciaPaczki(klucz: KluczZdjecia, plik: File, odcisk: string) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(plik.type) || !plik.size || plik.size > 12 * 1024 * 1024) {
    throw new Error('Wybierz zdjęcie JPEG, PNG lub WebP o rozmiarze do 12 MB.')
  }
  const obraz = await createImageBitmap(plik).catch(() => { throw new Error('Nie udało się odczytać zdjęcia.') })
  obraz.close()
  await wykonajOperacjeZdjecia('readwrite', (magazyn) => magazyn.add({ plik, odcisk }, klucz))
}

export function usunPlikZdjeciaPaczki(klucz: KluczZdjecia) {
  return wykonajOperacjeZdjecia('readwrite', (magazyn) => magazyn.delete(klucz))
}

export async function pobierzPlikZdjeciaPaczki(klucz: KluczZdjecia, odcisk: string) {
  const zapis = await wykonajOperacjeZdjecia<ZapisZdjecia | undefined>('readonly', (magazyn) => magazyn.get(klucz))
  return zapis?.odcisk === odcisk && zapis.plik instanceof Blob && zapis.plik.size > 0 ? zapis.plik : null
}

export async function pobierzZdjeciaPaczekDoBackupu() {
  let zadanieKluczy: IDBRequest<IDBValidKey[]> | undefined
  const zapisy = await wykonajOperacjeZdjecia<ZapisZdjecia[]>('readonly', (magazyn) => {
    zadanieKluczy = magazyn.getAllKeys()
    return magazyn.getAll()
  }, false)
  const klucze = zadanieKluczy?.result ?? []
  if (klucze.length !== (zapisy?.length ?? 0)) throw new Error('Nie udało się spójnie odczytać zdjęć paczek.')
  return (zapisy ?? []).map((zapis, indeks) => {
    const klucz = klucze[indeks]
    if (!Array.isArray(klucz) || klucz.length !== 3 || !klucz.every((id) => typeof id === 'string' && id)
      || !(zapis?.plik instanceof Blob) || !zapis.plik.size || typeof zapis.odcisk !== 'string') {
      throw new Error('Magazyn zdjęć zawiera nieprawidłowy rekord.')
    }
    return { klucz: klucz as KluczZdjecia, plik: zapis.plik, odcisk: zapis.odcisk }
  })
}
