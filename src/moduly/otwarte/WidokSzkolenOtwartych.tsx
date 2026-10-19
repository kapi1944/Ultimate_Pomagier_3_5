import IkonaMenu from '../../aplikacja/menu/IkonaMenu'
import { Karta, Komunikat, OdznakaStatusu, PustyStan } from '../../wspolne/komponenty/ElementyInterfejsu'
import '../szkoleniaV4.css'

export default function WidokSzkolenOtwartych() {
  return (
    <section className="widok szkolenia-v4 szkolenia-v4--otwarte" aria-labelledby="szkolenia-otwarte-tytul">
      <header className="szkolenia-v4__naglowek">
        <span className="szkolenia-v4__ikona"><IkonaMenu typ="programy" /></span>
        <div>
          <p className="szkolenia-v4__nadtytul">Szkolenia / Oferta otwarta</p>
          <h1 id="szkolenia-otwarte-tytul">Szkolenia otwarte</h1>
          <p>Miejsce dla procesów związanych ze szkoleniami dostępnymi dla uczestników z różnych firm.</p>
        </div>
        <OdznakaStatusu status="info">Widok informacyjny</OdznakaStatusu>
      </header>

      <section aria-labelledby="szkolenia-otwarte-dostepnosc">
        <h2 id="szkolenia-otwarte-dostepnosc">Dostępność modułu</h2>
        <div className="szkolenia-v4__kafelki">
          <Karta tytul="Obsługa szkoleń otwartych">
            <span className="szkolenia-v4__ikona"><IkonaMenu typ="szkolenia" /></span>
            <PustyStan>Lista szkoleń otwartych i obsługa zapisów uczestników nie są jeszcze dostępne w aplikacji.</PustyStan>
            <p>Ten ekran opisuje obszar modułu. Nie zawiera harmonogramu ani danych o szkoleniach.</p>
          </Karta>
          <Karta tytul="Praca w pozostałych modułach">
            <span className="szkolenia-v4__ikona"><IkonaMenu typ="dokumenty" /></span>
            <p>Istniejące generatory dokumentów są dostępne w sekcji Dokumenty w menu aplikacji.</p>
            <Komunikat>Ten widok nie prowadzi rejestru szkoleń otwartych. Dostępność generatorów nie oznacza obsługi zapisów ani organizacji tych szkoleń.</Komunikat>
          </Karta>
        </div>
      </section>
    </section>
  )
}
