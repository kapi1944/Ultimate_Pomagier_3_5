import { useState } from 'react'
import type { Dokument } from '../../../../wspolne/dokumenty/modelDokumentu'
import {
  czyDokumentJestGrupowy,
  etykietyDokumentowZeSzczegolow,
  pobierzStanDokumentuZeSzczegolow,
  rodzajeDokumentowDodatkowych,
  rodzajePakietuPodstawowego,
  utworzDokumentZeSzczegolow,
  utworzPakietDokumentow,
  type RodzajDokumentuZeSzczegolow,
  type WynikUtworzeniaDokumentu,
} from '../../../../wspolne/integracje/szczegolyDoDokumentow'
import type { WersjaRoboczaGeneratora } from '../typy'

const wszystkieRodzaje: RodzajDokumentuZeSzczegolow[] = ['program', 'lista', 'ankieta', 'dyplomy', 'karty', 'checklista']

type WlasciwosciPaneluPrzygotowaniaDokumentow = {
  wersja: WersjaRoboczaGeneratora | null
  otworzDokument: (dokument: Dokument<unknown, unknown>) => void
  poUtworzeniu: () => void
}

function etykietaStanu(stan: ReturnType<typeof pobierzStanDokumentuZeSzczegolow>['stan']) {
  if (stan === 'wymaga_aktualizacji') return 'Wymaga aktualizacji'
  if (stan === 'istnieje') return 'Istnieje'
  return 'Brak'
}

function etykietaWyniku(wynik: WynikUtworzeniaDokumentu) {
  if (wynik.status === 'utworzono') return `✓ ${wynik.etykieta} — utworzono`
  if (wynik.status === 'istnieje') return `↗ ${wynik.etykieta} — już istniała`
  if (wynik.status === 'pomieto') return `⚠ ${wynik.etykieta} — pominięto: ${wynik.komunikat}`
  return `⚠ ${wynik.etykieta} — błąd: ${wynik.komunikat}`
}

export default function PanelPrzygotowaniaDokumentow({ wersja, otworzDokument, poUtworzeniu }: WlasciwosciPaneluPrzygotowaniaDokumentow) {
  const [wyniki, ustawWyniki] = useState<WynikUtworzeniaDokumentu[]>([])
  const [czyPokazacDodatkowe, ustawCzyPokazacDodatkowe] = useState(false)
  const [czyPotwierdzicWszystkie, ustawCzyPotwierdzicWszystkie] = useState(false)
  const [wybraneDodatkowe, ustawWybraneDodatkowe] = useState<RodzajDokumentuZeSzczegolow[]>([])

  function pobierzGrupyDlaRodzaju(rodzaj: RodzajDokumentuZeSzczegolow) {
    return czyDokumentJestGrupowy(rodzaj) ? wersja?.grupy ?? [] : [null]
  }

  function pobierzNazweGrupy(grupaId: string | null) {
    return grupaId ? wersja?.grupy.find((grupa) => grupa.id === grupaId)?.nazwa ?? null : null
  }

  function wykonajPakiet(rodzaje: RodzajDokumentuZeSzczegolow[]) {
    if (!wersja) return
    const noweWyniki = utworzPakietDokumentow(wersja, rodzaje, wersja.autorId)
    ustawWyniki(noweWyniki)
    poUtworzeniu()
  }

  function utworzPojedynczy(rodzaj: RodzajDokumentuZeSzczegolow, grupaId: string | null) {
    if (!wersja) return
    try {
      ustawWyniki([utworzDokumentZeSzczegolow(wersja, rodzaj, grupaId, wersja.autorId)])
    } catch (blad) {
      ustawWyniki([{
        rodzaj,
        etykieta: etykietyDokumentowZeSzczegolow[rodzaj],
        grupaId,
        status: 'blad',
        dokument: null,
        komunikat: blad instanceof Error ? blad.message : 'Nieznany błąd tworzenia dokumentu',
      }])
    }
    poUtworzeniu()
  }

  function przelaczDokumentDodatkowy(rodzaj: RodzajDokumentuZeSzczegolow) {
    ustawWybraneDodatkowe((obecne) => obecne.includes(rodzaj) ? obecne.filter((pozycja) => pozycja !== rodzaj) : [...obecne, rodzaj])
  }

  const rodzajeWszystkich = [...new Set([...rodzajePakietuPodstawowego, ...wybraneDodatkowe])]
  const liczbaUtworzonych = wyniki.filter((wynik) => wynik.status === 'utworzono').length

  return (
    <section className="szczegoly-sekcja-dokumentow" aria-labelledby="przygotuj-dokumenty-tytul">
      <h2 id="przygotuj-dokumenty-tytul">Przygotuj dokumenty</h2>
      {!wersja && <p className="szczegoly-komunikat">Najpierw zapisz Szczegóły organizacyjne.</p>}

      <div className="szczegoly-dokumenty-blok">
        <h3>Pojedyncze dokumenty</h3>
        <div className="szczegoly-dokumenty-siatka">
          {wszystkieRodzaje.flatMap((rodzaj) => {
            const grupy = pobierzGrupyDlaRodzaju(rodzaj)
            if (!grupy.length) {
              return [(
                <article className="szczegoly-dokument-karta" key={`${rodzaj}-brak-grupy`}>
                  <strong>{etykietyDokumentowZeSzczegolow[rodzaj]}</strong>
                  <span>Status: Brak</span>
                  <span>Brak grupy</span>
                </article>
              )]
            }

            return grupy.map((grupa) => {
              const grupaId = grupa?.id ?? null
              const stan = wersja ? pobierzStanDokumentuZeSzczegolow(wersja, rodzaj, grupaId) : { stan: 'brak' as const, dokument: null }
              return (
                <article className="szczegoly-dokument-karta" key={`${rodzaj}-${grupaId ?? 'zbiorczy'}`}>
                  <strong>{etykietyDokumentowZeSzczegolow[rodzaj]}</strong>
                  {grupa && <span>Grupa: {grupa.nazwa}</span>}
                  <span>Status: {etykietaStanu(stan.stan)}</span>
                  {stan.dokument
                    ? <button type="button" onClick={() => otworzDokument(stan.dokument!)}>Otwórz</button>
                    : <button disabled={!wersja || Boolean(czyDokumentJestGrupowy(rodzaj) && !grupaId)} type="button" onClick={() => utworzPojedynczy(rodzaj, grupaId)}>Utwórz</button>}
                </article>
              )
            })
          })}
        </div>
      </div>

      <div className="szczegoly-dokumenty-blok">
        <h3>Pakiety dokumentów</h3>
        <div className="szczegoly-dokumenty-akcje">
          <button disabled={!wersja} type="button" onClick={() => wykonajPakiet(rodzajePakietuPodstawowego)}>Utwórz pakiet podstawowy</button>
          <button disabled={!wersja} type="button" onClick={() => ustawCzyPokazacDodatkowe(true)}>Utwórz dokumenty dodatkowe</button>
          <button disabled={!wersja} type="button" onClick={() => ustawCzyPotwierdzicWszystkie(true)}>Utwórz wszystkie dokumenty</button>
        </div>

        {czyPokazacDodatkowe && (
          <div className="szczegoly-dokumenty-wybor">
            {rodzajeDokumentowDodatkowych.map((rodzaj) => (
              <label key={rodzaj}>
                <input checked={wybraneDodatkowe.includes(rodzaj)} type="checkbox" onChange={() => przelaczDokumentDodatkowy(rodzaj)} />
                {etykietyDokumentowZeSzczegolow[rodzaj]}
              </label>
            ))}
            <button disabled={!wybraneDodatkowe.length} type="button" onClick={() => wykonajPakiet(wybraneDodatkowe)}>Utwórz zaznaczone</button>
          </div>
        )}

        {czyPotwierdzicWszystkie && (
          <div className="szczegoly-dokumenty-potwierdzenie">
            <strong>Zostaną utworzone brakujące dokumenty:</strong>
            <ul>
              {rodzajeWszystkich.map((rodzaj) => <li key={rodzaj}>{etykietyDokumentowZeSzczegolow[rodzaj]}</li>)}
            </ul>
            <div className="szczegoly-dokumenty-akcje">
              <button type="button" onClick={() => { wykonajPakiet(rodzajeWszystkich); ustawCzyPotwierdzicWszystkie(false) }}>Utwórz</button>
              <button type="button" onClick={() => ustawCzyPotwierdzicWszystkie(false)}>Anuluj</button>
            </div>
          </div>
        )}
      </div>

      {wyniki.length > 0 && (
        <div className="szczegoly-dokumenty-wyniki" aria-live="polite">
          <h3>Utworzono {liczbaUtworzonych} {liczbaUtworzonych === 1 ? 'dokument' : 'dokumenty'}</h3>
          {wyniki.map((wynik, indeks) => (
            <div className="szczegoly-dokumenty-wynik" key={`${wynik.rodzaj}-${wynik.grupaId ?? 'zbiorczy'}-${indeks}`}>
              <span>{etykietaWyniku(wynik)}{pobierzNazweGrupy(wynik.grupaId) ? ` — ${pobierzNazweGrupy(wynik.grupaId)}` : ''}</span>
              {wynik.dokument && <button type="button" onClick={() => otworzDokument(wynik.dokument!)}>Otwórz</button>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
