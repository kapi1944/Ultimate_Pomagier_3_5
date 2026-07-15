import { useMemo, useRef, useState } from 'react'
import {
  przygotujPlanGenerowania,
  przygotujZrodloZWersjiRoboczej,
  walidujKontekstListyObecnosci,
  zbudujKontekstZeSzczegolow,
} from '../../../../wspolne/integracje/szczegolyDoDokumentow'
import type { WynikWalidacjiKontekstu } from '../../../../wspolne/integracje/szczegolyDoDokumentow'
import { pobierzIstniejacaKopieListyObecnosci, utworzListeObecnosciZeSzczegolow } from '../../../dokumenty/generatory/listy_obecnosci/rejestrListObecnosci'
import type { WersjaRoboczaGeneratora } from '../typy'

type WynikGrupy = {
  grupaId: string
  komunikat: string
  dokumentId: string | null
  rodzaj: 'utworzono' | 'pomieto' | 'istnieje'
}

type WlasciwosciPaneluTworzeniaListObecnosci = {
  wersja: WersjaRoboczaGeneratora | null
  otworzDokument: (id: string) => void
  poUtworzeniu: () => void
}

export default function PanelTworzeniaListObecnosci({ wersja, otworzDokument, poUtworzeniu }: WlasciwosciPaneluTworzeniaListObecnosci) {
  const [wybraneGrupyId, ustawWybraneGrupyId] = useState<string[]>([])
  const [grupyZatwierdzonychDuplikatow, ustawGrupyZatwierdzonychDuplikatow] = useState<string[]>([])
  const [wyniki, ustawWyniki] = useState<WynikGrupy[]>([])
  const [czyTworzenieTrwa, ustawCzyTworzenieTrwa] = useState(false)
  const blokadaTworzenia = useRef(false)
  const kontekst = useMemo(() => (wersja ? zbudujKontekstZeSzczegolow(przygotujZrodloZWersjiRoboczej(wersja)) : null), [wersja])
  const plan = useMemo(
    () =>
      kontekst
        ? przygotujPlanGenerowania({
            kontekst,
            typDokumentu: 'LISTA_OBECNOSCI',
            strategia: 'JEDEN_NA_GRUPE',
            wybraneGrupyId,
          })
        : null,
    [kontekst, wybraneGrupyId],
  )
  const walidacje = useMemo(
    () =>
      kontekst
        ? new Map(wybraneGrupyId.map((grupaId) => [grupaId, walidujKontekstListyObecnosci(kontekst, grupaId)]))
        : new Map<string, WynikWalidacjiKontekstu>(),
    [kontekst, wybraneGrupyId],
  )

  function czyGrupaWybrana(grupaId: string) {
    return wybraneGrupyId.includes(grupaId)
  }

  function przelaczGrupe(grupaId: string) {
    ustawWybraneGrupyId((obecne) => (obecne.includes(grupaId) ? obecne.filter((id) => id !== grupaId) : [...obecne, grupaId]))
    ustawGrupyZatwierdzonychDuplikatow((obecne) => obecne.filter((id) => id !== grupaId))
    ustawWyniki([])
  }

  function przelaczZgodeNaDuplikat(grupaId: string) {
    ustawGrupyZatwierdzonychDuplikatow((obecne) => (obecne.includes(grupaId) ? obecne.filter((id) => id !== grupaId) : [...obecne, grupaId]))
  }

  function utworzDokumenty() {
    if (!kontekst || blokadaTworzenia.current || !wybraneGrupyId.length) {
      return
    }

    blokadaTworzenia.current = true
    ustawCzyTworzenieTrwa(true)
    const noweWyniki: WynikGrupy[] = []
    const utworzoneId: string[] = []

    wybraneGrupyId.forEach((grupaId) => {
      const grupa = kontekst.grupy.find((kandydat) => kandydat.id === grupaId)
      const walidacja = walidacje.get(grupaId)

      if (!grupa || !walidacja || walidacja.bledy.length) {
        noweWyniki.push({
          grupaId,
          komunikat: walidacja?.bledy.map((blad) => blad.komunikat).join(' ') || 'Nie odnaleziono wybranej grupy.',
          dokumentId: null,
          rodzaj: 'pomieto',
        })
        return
      }

      const wynik = utworzListeObecnosciZeSzczegolow(kontekst, grupaId, grupyZatwierdzonychDuplikatow.includes(grupaId))

      if (wynik.status === 'utworzono') {
        utworzoneId.push(wynik.dokument.id)
        noweWyniki.push({ grupaId, komunikat: `Utworzono: ${wynik.dokument.tytul}`, dokumentId: wynik.dokument.id, rodzaj: 'utworzono' })
        return
      }

      if (wynik.status === 'istnieje') {
        noweWyniki.push({ grupaId, komunikat: `Istnieje kopia robocza: ${wynik.dokument.tytul}`, dokumentId: wynik.dokument.id, rodzaj: 'istnieje' })
        return
      }

      noweWyniki.push({ grupaId, komunikat: 'Nie odnaleziono wybranej grupy.', dokumentId: null, rodzaj: 'pomieto' })
    })

    ustawWyniki(noweWyniki)
    ustawCzyTworzenieTrwa(false)
    blokadaTworzenia.current = false
    poUtworzeniu()

    if (utworzoneId.length === 1) {
      otworzDokument(utworzoneId[0])
    }
  }

  if (!wersja || !kontekst) {
    return (
      <section className="szczegoly-sekcja-dokumentow">
        <h2>Utwórz dokument</h2>
        <p>Najpierw zapisz wersję roboczą Szczegółów organizacyjnych, aby dokument otrzymał stabilne powiązanie ze źródłem.</p>
      </section>
    )
  }

  return (
    <section className="szczegoly-sekcja-dokumentow">
      <h2>Utwórz dokument</h2>
      <p>Aktywny typ: <strong>Lista obecności</strong>. Każda grupa utworzy osobny dokument roboczy.</p>
      <div className="szczegoly-sekcja-dokumentow__grupy">
        {kontekst.grupy.map((grupa) => {
          const walidacja = walidacje.get(grupa.id)
          const istniejaca = pobierzIstniejacaKopieListyObecnosci(kontekst.zrodlo.szczegolyOrganizacyjneId, grupa.id)
          const wybrana = czyGrupaWybrana(grupa.id)

          return (
            <article key={grupa.id} className="szczegoly-sekcja-dokumentow__grupa">
              <label>
                <input checked={wybrana} type="checkbox" onChange={() => przelaczGrupe(grupa.id)} />
                <strong>{grupa.nazwa}</strong> — {grupa.daty.join(', ') || 'brak terminu'}
              </label>
              {wybrana && walidacja && (
                <div>
                  {walidacja.bledy.map((blad) => <p key={blad.kod} className="szczegoly-pole__blad">{blad.komunikat}</p>)}
                  {walidacja.ostrzezenia.map((ostrzezenie) => <p key={ostrzezenie.kod} className="szczegoly-pole__pomoc">Ostrzeżenie: {ostrzezenie.komunikat}</p>)}
                </div>
              )}
              {wybrana && istniejaca && (
                <div className="szczegoly-sekcja-dokumentow__istniejacy">
                  <span>Istnieje: {istniejaca.tytul} ({new Date(istniejaca.zaktualizowano).toLocaleString('pl-PL')})</span>
                  <button type="button" onClick={() => otworzDokument(istniejaca.id)}>Otwórz istniejącą</button>
                  <label>
                    <input checked={grupyZatwierdzonychDuplikatow.includes(grupa.id)} type="checkbox" onChange={() => przelaczZgodeNaDuplikat(grupa.id)} />
                    Utwórz nową mimo to
                  </label>
                </div>
              )}
            </article>
          )
        })}
      </div>
      {plan?.bledy.map((blad) => <p key={blad.kod} className="szczegoly-pole__blad">{blad.komunikat}</p>)}
      <button disabled={!wybraneGrupyId.length || czyTworzenieTrwa} type="button" onClick={utworzDokumenty}>
        {czyTworzenieTrwa ? 'Tworzenie dokumentów…' : 'Utwórz dokumenty'}
      </button>
      {wyniki.length > 0 && (
        <div className="szczegoly-sekcja-dokumentow__wynik" aria-live="polite">
          <h3>Wynik tworzenia</h3>
          {wyniki.map((wynik) => (
            <p key={`${wynik.grupaId}-${wynik.rodzaj}`}>
              {wynik.komunikat}{' '}
              {wynik.dokumentId && wynik.rodzaj !== 'utworzono' && <button type="button" onClick={() => otworzDokument(wynik.dokumentId!)}>Otwórz</button>}
              {wynik.dokumentId && wynik.rodzaj === 'utworzono' && wyniki.filter((pozycja) => pozycja.rodzaj === 'utworzono').length > 1 && <button type="button" onClick={() => otworzDokument(wynik.dokumentId!)}>Otwórz</button>}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}
