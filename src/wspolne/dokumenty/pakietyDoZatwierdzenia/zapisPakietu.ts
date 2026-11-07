// Nazwy pól odpowiadają przeglądarkowemu File System Access API.
type UchwytZapisu = { createWritable: () => Promise<{ write: (dane: Blob) => Promise<void>; close: () => Promise<void>; abort: () => Promise<void> }> }
type OknoZWyboremPliku = Window & { showSaveFilePicker?: (opcje: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<UchwytZapisu> }

export async function wybierzMiejsceZapisuPakietu(nazwaPliku: string, blob: Blob, sprawdzAktualnosc: () => void): Promise<string> {
  const okno = window as OknoZWyboremPliku
  if (!okno.showSaveFilePicker) throw new Error('Ta przeglądarka nie obsługuje wyboru lokalizacji. Użyj „Pobierz zbiorczy PDF” i ustaw pytanie o miejsce zapisu w ustawieniach przeglądarki.')
  let uchwyt: UchwytZapisu
  try {
    uchwyt = await okno.showSaveFilePicker({ suggestedName: nazwaPliku, types: [{ description: 'Dokument PDF', accept: { 'application/pdf': ['.pdf'] } }] })
  } catch (blad) {
    if (blad instanceof DOMException && blad.name === 'AbortError') return 'Anulowano wybór miejsca zapisu. Nie zapisano pliku.'
    throw blad
  }
  // Okno wyboru może pozostawać otwarte podczas zmiany źródeł w innej karcie.
  sprawdzAktualnosc()
  const zapis = await uchwyt.createWritable()
  try {
    await zapis.write(blob)
    sprawdzAktualnosc()
    await zapis.close()
  } catch (blad) {
    try { await zapis.abort() }
    catch (bladAnulowania) { throw new Error('Zapis PDF nie powiódł się; nie udało się anulować zapisu tymczasowego.', { cause: new AggregateError([blad, bladAnulowania]) }) }
    throw blad
  }
  return 'Zapisano kompletny PDF w wybranej lokalizacji.'
}
