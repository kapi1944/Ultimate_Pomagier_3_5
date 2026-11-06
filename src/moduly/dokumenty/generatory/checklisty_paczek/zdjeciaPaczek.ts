type KluczZdjecia = [dokumentId: string, paczkaId: string, zdjecieId: string]

async function wykonajOperacjeZdjecia<T>(tryb: IDBTransactionMode, operacja: (magazyn: IDBObjectStore) => IDBRequest<T>) {
  const baza = await new Promise<IDBDatabase>((rozwiaz, odrzuc) => {
    const otwarcie = indexedDB.open('ultimatePomagier.zdjeciaPaczek', 1)
    otwarcie.onupgradeneeded = () => { otwarcie.result.createObjectStore('zdjecia') }
    otwarcie.onsuccess = () => rozwiaz(otwarcie.result)
    otwarcie.onerror = () => odrzuc(otwarcie.error)
  })
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
  const zapis = await wykonajOperacjeZdjecia<{ plik: Blob; odcisk: string } | undefined>('readonly', (magazyn) => magazyn.get(klucz))
  return zapis?.odcisk === odcisk && zapis.plik instanceof Blob && zapis.plik.size > 0 ? zapis.plik : null
}
