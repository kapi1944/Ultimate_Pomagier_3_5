import type { WidokNawigacji } from '../../../aplikacja/nawigacja/typyNawigacji'
import IkonaMenu from '../../../aplikacja/menu/IkonaMenu'
import { Karta, Komunikat, OdznakaStatusu, Przycisk } from '../../../wspolne/komponenty/ElementyInterfejsu'
import '../../szkoleniaV4.css'

export default function WidokSzkolenZamknietych({ ustawWidok }: { ustawWidok: (widok: WidokNawigacji) => void }) {
  return (
    <section className="widok szkolenia-v4" aria-labelledby="szkolenia-zamkniete-tytul">
      <header className="szkolenia-v4__naglowek">
        <span className="szkolenia-v4__ikona"><IkonaMenu typ="szkolenia" /></span>
        <div>
          <p className="szkolenia-v4__nadtytul">Szkolenia / Organizacja</p>
          <h1 id="szkolenia-zamkniete-tytul">Szkolenia zamknięte</h1>
          <p>Przygotuj dane organizacyjne szkolenia dla klienta. Wracaj do zapisanych szczegółów, kontynuuj pracę nad kopią roboczą i przechodź do powiązanych dokumentów.</p>
        </div>
        <OdznakaStatusu status="success">Szczegóły organizacyjne dostępne</OdznakaStatusu>
      </header>

      <section aria-labelledby="szkolenia-zamkniete-operacje">
        <h2 id="szkolenia-zamkniete-operacje">Dostępne operacje</h2>
        <div className="szkolenia-v4__kafelki">
          <Karta tytul="Szczegóły organizacyjne">
            <span className="szkolenia-v4__ikona"><IkonaMenu typ="szczegoly" /></span>
            <p>Otwórz listę zapisanych szczegółów. Sprawdź dane szkolenia, jego status i dostępne operacje.</p>
            <Przycisk onClick={() => ustawWidok('zamkniete_szczegoly_organizacyjne_lista')}>Otwórz listę szczegółów</Przycisk>
          </Karta>
          <Karta tytul="Nowe szczegóły">
            <span className="szkolenia-v4__ikona"><IkonaMenu typ="nowy" /></span>
            <p>Przejdź do formularza danych klienta, terminów, grup i trenerów. Uzupełnij informacje potrzebne do organizacji szkolenia.</p>
            <Przycisk className="szkolenia-v4__przycisk-glowny" onClick={() => ustawWidok('zamkniete_szczegoly_organizacyjne_nowe')}>Otwórz formularz szczegółów</Przycisk>
          </Karta>
          <Karta tytul="Kopie robocze">
            <span className="szkolenia-v4__ikona"><IkonaMenu typ="kopie" /></span>
            <p>Wróć do rozpoczętych szczegółów organizacyjnych. Wybierz kopię roboczą i kontynuuj jej uzupełnianie.</p>
            <Przycisk onClick={() => ustawWidok('zamkniete_szczegoly_organizacyjne_kopie_robocze')}>Przejdź do kopii roboczych</Przycisk>
          </Karta>
        </div>
      </section>

      <Komunikat>Rozpoczynasz pracę? Otwórz formularz szczegółów. Jeśli masz już rozpoczęty dokument, wybierz kopie robocze. Dokumenty powiązane znajdziesz w szczegółach organizacyjnych.</Komunikat>
    </section>
  )
}
