import { useId, useState } from 'react'
import { OdznakaStatusu, Przycisk, PustyStan } from '../../../wspolne/komponenty/ElementyInterfejsu'
import { czyPoprawnaDataWysylki, filtrujWysylki, pobierzPilnoscWysylki, sortujWysylki, type FiltrMonitora, type PilnoscWysylki, type WysylkaMonitora } from './logika/monitorWysylek'
import './monitorWysylek.css'

const etykietyPilnosci: Record<PilnoscWysylki, string> = {
  ZALEGLE: 'Zaległa', DZISIAJ: 'Dzisiaj', JUTRO: 'Jutro', ZA_2_3_DNI: 'Za 2–3 dni', POZOSTALE: 'Pozostała', WYSŁANE: 'Wysłana',
}
const filtry: { wartosc: FiltrMonitora; etykieta: string }[] = [
  { wartosc: 'ZALEGLE', etykieta: 'Zaległe' },
  { wartosc: 'DZISIAJ', etykieta: 'Dzisiaj' },
  { wartosc: 'NAJBLIZSZE_3_DNI', etykieta: 'Najbliższe 3 dni' },
  { wartosc: 'WYSŁANE', etykieta: 'Wysłane' },
]

function formatujDateWysylki(data: string) {
  return czyPoprawnaDataWysylki(data) ? new Intl.DateTimeFormat('pl-PL').format(new Date(data + 'T00:00:00')) : data ? 'Nieprawidłowa data' : 'Brak daty'
}

export default function MonitorWysylek({ wysylki, teraz, otworzSzkolenie, otworzCheckliste, oznaczWyslana }: {
  wysylki: WysylkaMonitora[]
  teraz: Date
  otworzSzkolenie?: (id: string) => void
  otworzCheckliste?: (id: string) => void
  oznaczWyslana: (wysylka: WysylkaMonitora) => void
}) {
  const [filtr, ustawFiltr] = useState<FiltrMonitora>('WSZYSTKIE')
  const identyfikator = useId()
  const widoczne = sortujWysylki(filtrujWysylki(wysylki, filtr, teraz), teraz)
  return <section className="pulpit-sekcja monitor-wysylek" aria-labelledby={identyfikator}>
    <div className="pulpit-sekcja__naglowek"><div>
      <h2 id={identyfikator}>Monitor wysyłek paczek</h2>
      <p>Szkolenia zamknięte · według wybranego użytkownika, także bez przypisanego opiekuna.</p>
      <p>Termin pochodzi z daty wysłania w checkliście. Najbliższe 3 dni: jutro i kolejne dwa dni kalendarzowe.</p>
    </div></div>
    <div className="monitor-wysylek__filtry" role="group" aria-label="Filtruj wysyłki">
      <Przycisk aria-pressed={filtr === 'WSZYSTKIE'} onClick={() => ustawFiltr('WSZYSTKIE')}>Wszystkie ({wysylki.length})</Przycisk>
      {filtry.map(({ wartosc, etykieta }) => <Przycisk key={wartosc} aria-pressed={filtr === wartosc} onClick={() => ustawFiltr(filtr === wartosc ? 'WSZYSTKIE' : wartosc)}>
        {etykieta} ({filtrujWysylki(wysylki, wartosc, teraz).length})
      </Przycisk>)}
    </div>
    <p role="status">Wyświetlono: {widoczne.length} z {wysylki.length}. Liczniki obejmują rekordy grup i checklist.</p>
    {widoczne.length ? <div className="monitor-wysylek__lista">{widoczne.map((wysylka) => {
      const pilnosc = pobierzPilnoscWysylki(wysylka, teraz)
      return <article className="monitor-wysylek__rekord" data-pilnosc={pilnosc} key={wysylka.id}>
        <div className="monitor-wysylek__naglowek">
          <div><span className="monitor-wysylek__termin">{etykietyPilnosci[pilnosc]}</span><h3>{wysylka.nazwaSzkolenia}</h3></div>
          <OdznakaStatusu status={wysylka.czyWyslana ? 'success' : pilnosc === 'ZALEGLE' ? 'error' : 'info'}>{wysylka.statusPrzesylki}</OdznakaStatusu>
        </div>
        <dl className="monitor-wysylek__dane">
          <div><dt>Data wysyłki</dt><dd>{formatujDateWysylki(wysylka.planowanaDataWysylki)}</dd></div>
          <div><dt>Termin szkolenia</dt><dd>{wysylka.terminySzkolenia.map(formatujDateWysylki).join(' – ') || 'Brak terminu'}</dd></div>
          <div><dt>Klient</dt><dd>{wysylka.klient}</dd></div>
          <div><dt>Lokalizacja</dt><dd>{wysylka.miasto}</dd></div>
          <div><dt>Grupa</dt><dd>{wysylka.grupa}</dd></div>
        </dl>
        {!wysylka.czyWyslana && wysylka.brakujaceElementy.length > 0 && <p>Brakuje: {wysylka.brakujaceElementy.join(', ')}.</p>}
        <div className="monitor-wysylek__akcje">
          {otworzSzkolenie && <Przycisk onClick={() => otworzSzkolenie(wysylka.szczegolyId)}>Rejestr szczegółów</Przycisk>}
          {wysylka.checklistaId && otworzCheckliste && <Przycisk onClick={() => otworzCheckliste(wysylka.checklistaId!)}>Otwórz checklistę</Przycisk>}
          {wysylka.checklistaId && !wysylka.czyWyslana && <Przycisk onClick={() => oznaczWyslana(wysylka)}>Oznacz jako wysłaną</Przycisk>}
        </div>
        <details className="monitor-wysylek__dokumenty"><summary>Dokumenty — kolejność przygotowania w etapie 1.1.2</summary>
          <ol>{['Program', 'Lista obecności', 'Ankieta', 'Dyplomy', 'Karta na drzwi', 'Checklista'].map((nazwa) => <li key={nazwa}>{nazwa}</li>)}</ol>
        </details>
      </article>
    })}</div> : <PustyStan>{wysylki.length ? 'Brak wysyłek dla wybranego filtra.' : 'Brak szkoleń wymagających wysyłki materiałów.'}</PustyStan>}
  </section>
}
