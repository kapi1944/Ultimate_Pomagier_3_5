import type { DaneMagazynowe, LokalizacjaMapy, OdwolanieDoProduktu } from '../modele/zakupy'
import { normalizujLokalizacjeMapy, pobierzSciezkeLokalizacji } from './mapaMagazynu'

export function pusteDaneMagazynowe(): DaneMagazynowe {
  return { produkty: [], wariantyProduktow: [], egzemplarzeProduktow: [], stanyWLokalizacjach: [], ruchyMagazynowe: [], inwentaryzacje: [], pozycjeInwentaryzacji: [] }
}

export function normalizujDaneMagazynowe(wartosc: unknown, lokalizacje: LokalizacjaMapy[]): DaneMagazynowe {
  if (wartosc === undefined) return pusteDaneMagazynowe()
  if (!wartosc || typeof wartosc !== 'object') throw new Error('Nieprawidłowe dane magazynowe.')
  const dane = wartosc as Record<string, unknown>
  const kolekcje = Object.keys(pusteDaneMagazynowe()) as (keyof DaneMagazynowe)[]
  const rekordy = new Map<keyof DaneMagazynowe, Record<string, unknown>[]>()
  for (const klucz of kolekcje) {
    const lista = dane[klucz]
    if (!Array.isArray(lista)) throw new Error(`Nieprawidłowa kolekcja: ${klucz}.`)
    const identyfikatory = new Set<string>()
    rekordy.set(klucz, lista.map((rekord: unknown) => {
      if (!rekord || typeof rekord !== 'object' || !('id' in rekord) || typeof rekord.id !== 'string' || !rekord.id || identyfikatory.has(rekord.id)) throw new Error(`Nieprawidłowe lub powtórzone ID: ${klucz}.`)
      identyfikatory.add(rekord.id)
      return Object.fromEntries(Object.entries(rekord).filter(([, wartoscPola]) => wartoscPola !== undefined))
    }))
  }
  const lista = (klucz: keyof DaneMagazynowe) => rekordy.get(klucz)!
  const tekst = (rekord: Record<string, unknown>, klucz: string) => typeof rekord[klucz] === 'string' && Boolean(rekord[klucz])
  const liczba = (wartosc: unknown) => typeof wartosc === 'number' && Number.isFinite(wartosc) && wartosc >= 0
  const maProdukt = (rekord: Record<string, unknown>) => {
    const produkt = lista('produkty').find((produkt) => produkt.id === rekord.produktId)
    const wariant = lista('wariantyProduktow').find((wariant) => wariant.id === rekord.wariantProduktuId)
    return produkt && (rekord.wariantProduktuId === undefined || wariant?.produktId === produkt.id)
  }
  const maLokalizacje = (id: unknown) => lokalizacje.some((lokalizacja) => lokalizacja.id === id)
  for (const produkt of lista('produkty')) {
    if (!tekst(produkt, 'nazwa') || !tekst(produkt, 'jednostkaMiary') || !['MATERIAL_ZUZYWALNY', 'SPRZET'].includes(String(produkt.rodzaj)) || !['ILOSCIOWY', 'EGZEMPLARZOWY'].includes(String(produkt.sposobEwidencji)) || typeof produkt.czyAktywny !== 'boolean' || ['stanMinimalny', 'stanDocelowy'].some((klucz) => produkt[klucz] !== undefined && !liczba(produkt[klucz]))) throw new Error('Nieprawidłowy produkt.')
  }
  for (const wariant of lista('wariantyProduktow')) {
    if (!maProdukt({ produktId: wariant.produktId }) || !tekst(wariant, 'nazwa') || typeof wariant.czyAktywny !== 'boolean' || !wariant.cechy || typeof wariant.cechy !== 'object' || Array.isArray(wariant.cechy) || !Object.values(wariant.cechy).every((cecha) => typeof cecha === 'string') || ['stanMinimalny', 'stanDocelowy'].some((klucz) => wariant[klucz] !== undefined && !liczba(wariant[klucz]))) throw new Error('Nieprawidłowy wariant lub jego produkt.')
  }
  for (const egzemplarz of lista('egzemplarzeProduktow')) {
    if (!maProdukt(egzemplarz) || !tekst(egzemplarz, 'numerEwidencyjny')) throw new Error('Nieprawidłowy egzemplarz lub jego produkt.')
  }
  const maEgzemplarz = (rekord: Record<string, unknown>) => {
    const egzemplarz = lista('egzemplarzeProduktow').find((obecny) => obecny.id === rekord.egzemplarzProduktuId)
    const produkt = lista('produkty').find((obecny) => obecny.id === rekord.produktId)
    return rekord.egzemplarzProduktuId === undefined ? produkt?.sposobEwidencji === 'ILOSCIOWY' : produkt?.sposobEwidencji === 'EGZEMPLARZOWY' && egzemplarz?.produktId === rekord.produktId && egzemplarz?.wariantProduktuId === rekord.wariantProduktuId
  }
  const kombinacje = new Set<string>()
  const stanyEgzemplarzy = new Map<unknown, number>()
  for (const stan of lista('stanyWLokalizacjach')) {
    if (!maProdukt(stan) || !maEgzemplarz(stan) || !maLokalizacje(stan.lokalizacjaId) || !liczba(stan.ilosc)) throw new Error('Nieprawidłowy stan, produkt, wariant, egzemplarz lub lokalizacja.')
    const kombinacja = JSON.stringify([stan.produktId, stan.wariantProduktuId, stan.egzemplarzProduktuId, stan.lokalizacjaId])
    if (kombinacje.has(kombinacja)) throw new Error('Powtórzony stan tej samej pozycji w lokalizacji.')
    kombinacje.add(kombinacja)
    if (stan.egzemplarzProduktuId !== undefined) {
      const suma = (stanyEgzemplarzy.get(stan.egzemplarzProduktuId) ?? 0) + Number(stan.ilosc)
      if (![0, 1].includes(Number(stan.ilosc)) || suma > 1) throw new Error('Egzemplarz może znajdować się tylko w jednej lokalizacji.')
      stanyEgzemplarzy.set(stan.egzemplarzProduktuId, suma)
    }
  }
  for (const ruch of lista('ruchyMagazynowe')) {
    if (!maProdukt(ruch) || !maEgzemplarz(ruch) || !liczba(ruch.ilosc) || !['PRZYJECIE', 'WYDANIE', 'PRZESUNIECIE', 'KOREKTA'].includes(String(ruch.rodzaj)) || !tekst(ruch, 'wykonano') || !tekst(ruch, 'wykonanePrzezId') || (ruch.lokalizacjaZrodlowaId !== undefined && !maLokalizacje(ruch.lokalizacjaZrodlowaId)) || (ruch.lokalizacjaDocelowaId !== undefined && !maLokalizacje(ruch.lokalizacjaDocelowaId))) throw new Error('Nieprawidłowy ruch magazynowy lub jego powiązania.')
  }
  for (const inwentaryzacja of lista('inwentaryzacje')) {
    if (!maLokalizacje(inwentaryzacja.lokalizacjaId) || !['ROBOCZA', 'W_TRAKCIE', 'ZAMKNIETA'].includes(String(inwentaryzacja.status)) || !tekst(inwentaryzacja, 'rozpoczeto')) throw new Error('Nieprawidłowa inwentaryzacja.')
  }
  for (const pozycja of lista('pozycjeInwentaryzacji')) {
    if (!maProdukt(pozycja) || !maEgzemplarz(pozycja) || !lista('inwentaryzacje').some((obecna) => obecna.id === pozycja.inwentaryzacjaId) || !liczba(pozycja.iloscOczekiwana) || (pozycja.iloscStwierdzona !== undefined && !liczba(pozycja.iloscStwierdzona))) throw new Error('Nieprawidłowa pozycja inwentaryzacji.')
  }
  // Każda kolekcja została sprawdzona przed przekazaniem do modelu domenowego.
  return Object.fromEntries(kolekcje.map((klucz) => [klucz, lista(klucz)])) as DaneMagazynowe
}

export type PrzypisanieMagazynowe = OdwolanieDoProduktu & { egzemplarzProduktuId?: string; lokalizacjaId: string; zrodloId?: string; ilosc: number }

export function przypiszProduktDoLokalizacji(dane: DaneMagazynowe, lokalizacje: LokalizacjaMapy[], operacja: PrzypisanieMagazynowe, uzytkownikId: string): DaneMagazynowe {
  normalizujLokalizacjeMapy(lokalizacje, 2)
  normalizujDaneMagazynowe(dane, lokalizacje)
  if (!uzytkownikId || !Number.isFinite(operacja.ilosc) || operacja.ilosc <= 0) throw new Error('Podaj dodatnią ilość i wykonawcę operacji.')
  const lokalizacja = lokalizacje.find((obecna) => obecna.id === operacja.lokalizacjaId)
  if (!lokalizacja || lokalizacje.some((obecna) => !obecna.czyAktywna && pobierzSciezkeLokalizacji(lokalizacje, lokalizacja.id).includes(obecna.id))) throw new Error('Wybierz aktywną lokalizację z aktywnej gałęzi.')
  const produkt = dane.produkty.find((obecny) => obecny.id === operacja.produktId)
  if (!produkt?.czyAktywny || (operacja.wariantProduktuId && !dane.wariantyProduktow.some((wariant) => wariant.id === operacja.wariantProduktuId && wariant.produktId === produkt.id && wariant.czyAktywny))) throw new Error('Wybierz aktywny produkt i jego wariant.')
  if (operacja.zrodloId === operacja.lokalizacjaId) throw new Error('Lokalizacja źródłowa i docelowa muszą być różne.')
  const pasuje = (stan: DaneMagazynowe['stanyWLokalizacjach'][number]) => stan.produktId === operacja.produktId && stan.wariantProduktuId === operacja.wariantProduktuId && stan.egzemplarzProduktuId === operacja.egzemplarzProduktuId
  const zrodlo = dane.stanyWLokalizacjach.find((stan) => pasuje(stan) && stan.lokalizacjaId === operacja.zrodloId)
  if (operacja.zrodloId && (!zrodlo || zrodlo.ilosc < operacja.ilosc)) throw new Error('Brak wystarczającego zapasu wybranego produktu w źródle.')
  const cel = dane.stanyWLokalizacjach.find((stan) => pasuje(stan) && stan.lokalizacjaId === operacja.lokalizacjaId)
  const odwolanie = { produktId: operacja.produktId, wariantProduktuId: operacja.wariantProduktuId, egzemplarzProduktuId: operacja.egzemplarzProduktuId }
  const stany = dane.stanyWLokalizacjach.map((stan) => stan === zrodlo ? { ...stan, ilosc: stan.ilosc - operacja.ilosc } : stan === cel ? { ...stan, ilosc: stan.ilosc + operacja.ilosc } : stan)
  if (!cel) stany.push({ ...odwolanie, id: crypto.randomUUID(), lokalizacjaId: operacja.lokalizacjaId, ilosc: operacja.ilosc })
  return normalizujDaneMagazynowe({ ...dane, stanyWLokalizacjach: stany, ruchyMagazynowe: [...dane.ruchyMagazynowe, { ...odwolanie, id: crypto.randomUUID(), rodzaj: operacja.zrodloId ? 'PRZESUNIECIE' : 'PRZYJECIE', lokalizacjaZrodlowaId: operacja.zrodloId, lokalizacjaDocelowaId: operacja.lokalizacjaId, ilosc: operacja.ilosc, wykonano: new Date().toISOString(), wykonanePrzezId: uzytkownikId }] }, lokalizacje)
}

