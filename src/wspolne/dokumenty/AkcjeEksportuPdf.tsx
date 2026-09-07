import { useState, type RefObject } from 'react'
import { czyMoznaRozpoczacEksport, drukujDokument, pobierzPdfDokumentu } from './eksportPdf'
import { czyNazwaWymagaOpisuUzytkownika, zbudujNazweEksportowanegoDokumentu, type DaneNazwyEksportowanegoDokumentu } from './nazwyDokumentow'
import { wykonajEksportPoPrzygotowaniu } from './przygotowanieEksportu'
import './eksportPdf.css'

type WlasciwosciAkcjiEksportuPdf = {
  obszarDokumentu: RefObject<HTMLElement | null>
  nazwaPliku?: string
  daneNazwyEksportu?: DaneNazwyEksportowanegoDokumentu
  czyMoznaEksportowac?: () => boolean
  className?: string
  classNamePrzycisku?: string
  etykietaPrzyciskuPdf?: string
  pokazPrzyciskDruku?: boolean
  orientacja?: 'pionowa' | 'pozioma'
  pobierzBladEksportu?: () => string | null
  przygotujEksport?: () => void | Promise<void>
  zakonczEksport?: () => void
}

export default function AkcjeEksportuPdf({ obszarDokumentu, nazwaPliku, daneNazwyEksportu, czyMoznaEksportowac = () => true, className, classNamePrzycisku = 'akcje-eksportu-pdf__przycisk', etykietaPrzyciskuPdf = 'Pobierz PDF', pokazPrzyciskDruku = true, orientacja = 'pionowa', pobierzBladEksportu, przygotujEksport, zakonczEksport }: WlasciwosciAkcjiEksportuPdf) {
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
        wykonaj: () => pobierzPdfDokumentu({ obszarDokumentu: obszarDokumentu.current!, nazwaPliku: nazwaDoEksportu, format: 'a4', orientacja }),
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
    try {
      await wykonajEksportPoPrzygotowaniu({ przygotuj: przygotujEksport, wykonaj: drukujDokument, zakoncz: zakonczEksport })
    } catch {
      ustawBlad('Nie udało się przygotować dokumentu do druku.')
    }
  }

  return <div className={`akcje-eksportu-pdf ${className ?? ''}`} data-pomin-w-eksporcie>
    <button className={classNamePrzycisku} disabled={czyGenerowanie} onClick={pobierzPdf} type="button">
      {czyGenerowanie ? 'Generowanie PDF...' : etykietaPrzyciskuPdf}
    </button>
    {pokazPrzyciskDruku && <button className={classNamePrzycisku} disabled={czyGenerowanie} onClick={drukuj} type="button">Drukuj</button>}
    {czyPytacONazwe && <div className="akcje-eksportu-pdf__nazwa" role="dialog" aria-label="Nazwa eksportowanego pliku">
      <label>Krótka nazwa pliku<input autoFocus onChange={(zdarzenie) => ustawNazweUzytkownika(zdarzenie.target.value)} placeholder="Np. Rozliczenie projektu" value={nazwaUzytkownika} /></label>
      <small>Proponowana nazwa: {nazwaDoEksportu}</small>
      <div><button className={classNamePrzycisku} onClick={() => { ustawCzyPytacONazwe(false); void pobierzPdf() }} type="button">Pobierz PDF</button><button className={classNamePrzycisku} onClick={() => ustawCzyPytacONazwe(false)} type="button">Anuluj</button></div>
    </div>}
    {blad && <p className="akcje-eksportu-pdf__blad" role="alert">{blad}</p>}
  </div>
}
