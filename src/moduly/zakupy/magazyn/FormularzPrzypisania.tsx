import { useState, type SubmitEvent } from 'react'
import type { DaneMagazynowe, LokalizacjaMapy } from '../modele/zakupy'
import type { PrzypisanieMagazynowe } from '../logika/przypisaniaMagazynowe'
import SelektorLokalizacji from './SelektorLokalizacji'

export default function FormularzPrzypisania({ dane, lokalizacje, lokalizacjaId, wybierz, utworzLokalizacje, przypisz, dodajProdukt }: {
  dane: DaneMagazynowe; lokalizacje: LokalizacjaMapy[]; lokalizacjaId: string; wybierz: (id: string) => void; utworzLokalizacje: () => void; przypisz: (operacja: PrzypisanieMagazynowe) => boolean; dodajProdukt: (nazwa: string, jednostka: string) => string | null
}) {
  const [produktId, ustawProdukt] = useState('')
  const [wariantId, ustawWariant] = useState('')
  const [egzemplarzId, ustawEgzemplarz] = useState('')
  const [zrodloId, ustawZrodlo] = useState('')
  const [czyPrzesuniecie, ustawPrzesuniecie] = useState(false)
  const [ilosc, ustawIlosc] = useState(1)
  const [nazwa, ustawNazwe] = useState('')
  const [jednostka, ustawJednostke] = useState('szt.')
  const produkt = dane.produkty.find((obecny) => obecny.id === produktId)
  function zatwierdz(zdarzenie: SubmitEvent<HTMLFormElement>) {
    zdarzenie.preventDefault()
    if (czyPrzesuniecie && !zrodloId) return
    if (przypisz({ produktId, wariantProduktuId: wariantId || undefined, egzemplarzProduktuId: egzemplarzId || undefined, lokalizacjaId, zrodloId: czyPrzesuniecie ? zrodloId : undefined, ilosc })) ustawIlosc(1)
  }
  return <section className="mapa-magazynu__formularz" aria-label="Przypisywanie produktów">
    <h3>Przypisz produkt</h3>
    <details><summary>Dodaj produkt ilościowy do katalogu</summary>
      <form onSubmit={(zdarzenie) => { zdarzenie.preventDefault(); const id = dodajProdukt(nazwa, jednostka); if (id) { ustawProdukt(id); ustawWariant(''); ustawEgzemplarz(''); ustawNazwe('') } }}>
        <label>Nazwa produktu<input required value={nazwa} onChange={(zdarzenie) => ustawNazwe(zdarzenie.target.value)} /></label>
        <label>Jednostka miary<input required value={jednostka} onChange={(zdarzenie) => ustawJednostke(zdarzenie.target.value)} /></label>
        <button type="submit">Dodaj produkt do zmian</button>
      </form>
    </details>
    <form onSubmit={zatwierdz}>
      <label>Produkt do przypisania<select required value={produktId} onChange={(zdarzenie) => { ustawProdukt(zdarzenie.target.value); ustawWariant(''); ustawEgzemplarz(''); ustawZrodlo('') }}>
        <option value="">Wybierz produkt</option>{dane.produkty.filter((obecny) => obecny.czyAktywny).map((obecny) => <option key={obecny.id} value={obecny.id}>{obecny.nazwa}</option>)}
      </select></label>
      <label>Wariant produktu<select value={wariantId} onChange={(zdarzenie) => { ustawWariant(zdarzenie.target.value); ustawEgzemplarz(''); ustawZrodlo('') }}><option value="">Bez wariantu</option>{dane.wariantyProduktow.filter((wariant) => wariant.produktId === produktId && wariant.czyAktywny).map((wariant) => <option key={wariant.id} value={wariant.id}>{wariant.nazwa}</option>)}</select></label>
      {produkt?.sposobEwidencji === 'EGZEMPLARZOWY' && <label>Egzemplarz<select required value={egzemplarzId} onChange={(zdarzenie) => ustawEgzemplarz(zdarzenie.target.value)}><option value="">Wybierz egzemplarz</option>{dane.egzemplarzeProduktow.filter((egzemplarz) => egzemplarz.produktId === produktId && egzemplarz.wariantProduktuId === (wariantId || undefined)).map((egzemplarz) => <option key={egzemplarz.id} value={egzemplarz.id}>{egzemplarz.numerEwidencyjny}</option>)}</select></label>}
      <SelektorLokalizacji etykieta="Lokalizacja docelowa" lokalizacje={lokalizacje} wartosc={lokalizacjaId} wybierz={wybierz} utworz={utworzLokalizacje} wymagany />
      <label><input type="checkbox" role="switch" checked={czyPrzesuniecie} onChange={(zdarzenie) => { ustawPrzesuniecie(zdarzenie.target.checked); ustawZrodlo('') }} /> Przesuń istniejący zapas (wyłączone: przyjęcie nowego zapasu)</label>
      {czyPrzesuniecie && <SelektorLokalizacji etykieta="Lokalizacja źródłowa" lokalizacje={lokalizacje.filter((lokalizacja) => dane.stanyWLokalizacjach.some((stan) => stan.lokalizacjaId === lokalizacja.id && stan.produktId === produktId && stan.wariantProduktuId === (wariantId || undefined) && stan.egzemplarzProduktuId === (egzemplarzId || undefined) && stan.ilosc > 0))} wartosc={zrodloId} wybierz={ustawZrodlo} wymagany />}
      <label>Ilość ({produkt?.jednostkaMiary ?? 'jednostki'})<input required type="number" min="0.000001" step="any" value={ilosc} onChange={(zdarzenie) => ustawIlosc(zdarzenie.target.valueAsNumber)} /></label>
      <p>Przyjęcie zwiększa zapas. Przesunięcie zachowuje łączną ilość. Operacja zostanie utrwalona z historią po zapisaniu konfiguracji.</p>
      <button type="submit">Dodaj przypisanie do zmian</button>
    </form>
  </section>
}
