import { useEffect, useState, type RefObject } from 'react'
import { pobierzPrzejscieDoWydruku, zakonczPrzejscieDoWydruku } from './zlecenieWydrukuGeneratora'
import { pobierzIdWersjiWydruku, sprawdzUprawnienieWydrukow } from './rejestrWydrukow'
import { repozytoriumWspolnychDokumentow } from './rejestrDokumentow'
import { czyMoznaRozpoczacEksport, drukujDokument, pobierzPdfDokumentu } from './eksportPdf'
import { czyNazwaWymagaOpisuUzytkownika, zbudujNazweEksportowanegoDokumentu, type DaneNazwyEksportowanegoDokumentu } from './nazwyDokumentow'
import { wykonajEksportPoPrzygotowaniu } from './przygotowanieEksportu'
import './eksportPdf.css'
import { drukujProgram } from './drukProgramu'
import './drukProgramu.css'

type WlasciwosciAkcjiEksportuPdf = {
  dokumentId?: string | null
  odciskFormularza?: string
  silnikPdf?: 'semantyczny' | 'raster_legacy'
  obszarDokumentu: RefObject<HTMLElement | null>
  nazwaPliku?: string
  daneNazwyEksportu?: DaneNazwyEksportowanegoDokumentu
  czyMoznaEksportowac?: () => boolean
  className?: string
  classNamePrzycisku?: string
  etykietaPrzyciskuPdf?: string
  pokazPrzyciskDruku?: boolean
  orientacja?: 'pionowa' | 'pozioma'
  format?: 'a4' | 'a5' | 'a6'
  etykietaPrzyciskuDruku?: string
  pobierzBladEksportu?: () => string | null
  przygotujEksport?: () => void | Promise<void>
  zakonczEksport?: () => void
  plynnyUklad?: boolean
  przedPobraniemPdf?: () => void
  poZamknieciuDruku?: () => void
}

export default function AkcjeEksportuPdf({ dokumentId, odciskFormularza, silnikPdf = 'raster_legacy', obszarDokumentu, nazwaPliku, daneNazwyEksportu, czyMoznaEksportowac = () => true, className, classNamePrzycisku = 'akcje-eksportu-pdf__przycisk', etykietaPrzyciskuPdf = 'Pobierz PDF', pokazPrzyciskDruku = true, orientacja = 'pionowa', format = 'a4', etykietaPrzyciskuDruku = 'Drukuj', pobierzBladEksportu, przygotujEksport, zakonczEksport, plynnyUklad, przedPobraniemPdf, poZamknieciuDruku }: WlasciwosciAkcjiEksportuPdf) {
  const [przejscie] = useState(() => pobierzPrzejscieDoWydruku(dokumentId))
  const [odciskPrzyOtwarciu] = useState(odciskFormularza)
  const zlecenie = przejscie && przejscie.dokumentId === dokumentId ? przejscie.operacja : null
  useEffect(() => {
    if (!przejscie) return
    zakonczPrzejscieDoWydruku(przejscie)
    const identyfikator = window.requestAnimationFrame(() => obszarDokumentu.current?.scrollIntoView({ block: 'start' }))
    return () => window.cancelAnimationFrame(identyfikator)
  }, [przejscie, obszarDokumentu])
  const [czyGenerowanie, ustawCzyGenerowanie] = useState(false)
  const [blad, ustawBlad] = useState<string | null>(null)
  const [nazwaUzytkownika, ustawNazweUzytkownika] = useState('')
  const [czyPytacONazwe, ustawCzyPytacONazwe] = useState(false)
  const daneZNazwaUzytkownika = daneNazwyEksportu ? { ...daneNazwyEksportu, nazwaUzytkownika } : undefined
  const nazwaDoEksportu = daneZNazwaUzytkownika ? zbudujNazweEksportowanegoDokumentu(daneZNazwaUzytkownika) : nazwaPliku ?? 'Dokument.pdf'

  function sprawdzGotowoscEksportu() {
    if (czyMoznaEksportowac()) return true
    ustawBlad(pobierzBladEksportu?.() ?? 'Dokument nie jest gotowy do eksportu. Uzupełnij wymagane dane.')
    return false
  }

  async function pobierzPdf() {
    if (!czyMoznaRozpoczacEksport(czyGenerowanie) || !sprawdzGotowoscEksportu()) return
    if (daneNazwyEksportu && czyNazwaWymagaOpisuUzytkownika(daneZNazwaUzytkownika!)) {
      ustawCzyPytacONazwe(true)
      return
    }
    if (!obszarDokumentu.current) {
      ustawBlad('Nie znaleziono aktualnego podgladu dokumentu do eksportu.')
      return
    }

    ustawBlad(null)
    ustawCzyGenerowanie(true)
    try {
      await wykonajEksportPoPrzygotowaniu({
        przygotuj: przygotujEksport,
        wykonaj: () => pobierzPdfDokumentu({ silnikPdf, obszarDokumentu: obszarDokumentu.current!, nazwaPliku: nazwaDoEksportu, format, orientacja, plynnyUklad, marginesMm: plynnyUklad ? 9 : undefined }, przedPobraniemPdf),
        zakoncz: zakonczEksport,
      })
    } catch {
      ustawBlad('Nie udało się utworzyć pliku PDF. Sprawdź obrazy w podglądzie i spróbuj ponownie.')
    } finally {
      ustawCzyGenerowanie(false)
    }
  }

  async function drukuj() {
    if (!czyMoznaRozpoczacEksport(czyGenerowanie) || !sprawdzGotowoscEksportu()) return
    ustawBlad(null)
    ustawCzyGenerowanie(true)
    try {
      if (zlecenie) {
        if (odciskFormularza !== odciskPrzyOtwarciu) throw new Error('Formularz zmienił się po zleceniu dodruku. Zapisz dokument i ponów zlecenie w Monitorze paczek.')
        sprawdzUprawnienieWydrukow(zlecenie.uzytkownikId, 'druk')
        const zapisany = repozytoriumWspolnychDokumentow.pobierzPoId(zlecenie.dokumentId)
        if (!zapisany || zapisany.czyUsunietyMiekko || zapisany.czyZarchiwizowany || pobierzIdWersjiWydruku(zapisany) !== zlecenie.wersjaDokumentuId) throw new Error('Wersja dokumentu zmieniła się. Wróć do Monitora paczek i ponów zlecenie.')
      }
      await wykonajEksportPoPrzygotowaniu({ przygotuj: przygotujEksport, wykonaj: () => {
        const obszar = obszarDokumentu.current
        if (!obszar) throw new Error('Nie znaleziono podglądu dokumentu do druku.')
        return obszar.querySelector('.program-strony') ? drukujProgram(obszar) : drukujDokument(obszar, orientacja, format, plynnyUklad)
      }, zakoncz: zakonczEksport })
      poZamknieciuDruku?.()
    } catch (blad) {
      ustawBlad(blad instanceof Error ? blad.message : 'Nie udało się przygotować dokumentu do druku.')
    } finally {
      ustawCzyGenerowanie(false)
    }
  }

  return <div className={`akcje-eksportu-pdf ${className ?? ''}`} data-pomin-w-eksporcie>
    {zlecenie && <p role="status">Dodruk z Monitora paczek: {zlecenie.liczbaEgzemplarzy} egz. Ustaw tę liczbę w oknie drukowania. Dla dokumentu seryjnego wybierz odpowiednie strony. Po odebraniu wydruków wróć do paczki i potwierdź rzeczywistą ilość.</p>}
    <button className={classNamePrzycisku} disabled={czyGenerowanie} onClick={pobierzPdf} type="button">
      {czyGenerowanie ? 'Generowanie PDF...' : etykietaPrzyciskuPdf}
    </button>
    {pokazPrzyciskDruku && <button className={classNamePrzycisku} disabled={czyGenerowanie} onClick={drukuj} type="button">{zlecenie ? `Drukuj brakujące (${zlecenie.liczbaEgzemplarzy})` : etykietaPrzyciskuDruku}</button>}
    {czyPytacONazwe && <div className="akcje-eksportu-pdf__nazwa" role="dialog" aria-label="Nazwa eksportowanego pliku">
      <label>Krótka nazwa pliku<input autoFocus onChange={(zdarzenie) => ustawNazweUzytkownika(zdarzenie.target.value)} placeholder="Np. Rozliczenie projektu" value={nazwaUzytkownika} /></label>
      <small>Proponowana nazwa: {nazwaDoEksportu}</small>
      <div><button className={classNamePrzycisku} onClick={() => { ustawCzyPytacONazwe(false); void pobierzPdf() }} type="button">Pobierz PDF</button><button className={classNamePrzycisku} onClick={() => ustawCzyPytacONazwe(false)} type="button">Anuluj</button></div>
    </div>}
    {blad && <p className="akcje-eksportu-pdf__blad" role="alert">{blad}</p>}
  </div>
}
