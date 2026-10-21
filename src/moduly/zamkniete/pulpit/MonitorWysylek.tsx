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

export default function MonitorWysylek({ wysylki, teraz, otworzSzkolenie, otworzCheckliste, oznaczWyslana, czyMozeWysylac }: {
  wysylki: WysylkaMonitora[]
  teraz: Date
  otworzSzkolenie?: (id: string) => void
  otworzCheckliste?: (wysylka: WysylkaMonitora) => void
  oznaczWyslana: (wysylka: WysylkaMonitora) => void
  czyMozeWysylac: boolean
}) {
  const [filtr, ustawFiltr] = useState<FiltrMonitora>('WSZYSTKIE')
  const identyfikator = useId()
  const widoczne = sortujWysylki(filtrujWysylki(wysylki, filtr, teraz), teraz)
  return <section className="pulpit-sekcja monitor-wysylek" aria-labelledby={identyfikator}>
    <div className="pulpit-sekcja__naglowek"><div>
      <h2 id={identyfikator}>Paczki do wysłania</h2>
      <p>Szkolenia zamknięte · według wybranego użytkownika, także bez przypisanego opiekuna.</p>
      <p>Termin pochodzi z daty wysłania w checkliście. Najbliższe 3 dni: jutro i kolejne dwa dni kalendarzowe.</p>
    </div></div>
    <div className="monitor-wysylek__filtry" role="group" aria-label="Filtruj wysyłki">
      <Przycisk aria-pressed={filtr === 'WSZYSTKIE'} onClick={() => ustawFiltr('WSZYSTKIE')}>Wszystkie ({wysylki.length})</Przycisk>
      {filtry.map(({ wartosc, etykieta }) => <Przycisk key={wartosc} aria-pressed={filtr === wartosc} onClick={() => ustawFiltr(filtr === wartosc ? 'WSZYSTKIE' : wartosc)}>
        {etykieta} ({filtrujWysylki(wysylki, wartosc, teraz).length})
      </Przycisk>)}
    </div>
    <p role="status">Wyświetlono: {widoczne.length} z {wysylki.length}. Każda paczka ma osobny wpis.</p>
    {widoczne.length ? <div className="monitor-wysylek__lista">{widoczne.map((wysylka) => {
      const pilnosc = pobierzPilnoscWysylki(wysylka, teraz)
      return <article className="monitor-wysylek__rekord" data-pilnosc={pilnosc} key={wysylka.id}>
        <div className="monitor-wysylek__naglowek">
          <div><span className="monitor-wysylek__termin">{etykietyPilnosci[pilnosc]}</span><h3>{otworzCheckliste ? <Przycisk type="button" onClick={() => otworzCheckliste(wysylka)}>{wysylka.nazwaSzkolenia}</Przycisk> : wysylka.nazwaSzkolenia}</h3></div>
          <OdznakaStatusu status={wysylka.czyWyslana || wysylka.statusPrzesylki === 'Gotowa do wysyłki' ? 'success' : wysylka.statusPrzesylki === 'Wymaga potwierdzenia' ? 'warning' : wysylka.statusPrzesylki === 'W trakcie kompletowania' ? 'info' : 'draft'}>{wysylka.statusPrzesylki}</OdznakaStatusu>
        </div>
        <dl className="monitor-wysylek__dane">
          <div><dt>Data wysyłki</dt><dd>{formatujDateWysylki(wysylka.planowanaDataWysylki)}</dd></div>
          <div><dt>Termin szkolenia</dt><dd>{wysylka.terminySzkolenia.map(formatujDateWysylki).join(' – ') || 'Brak terminu'}</dd></div>
          <div><dt>Klient</dt><dd>{wysylka.klient}</dd></div>
          <div><dt>Lokalizacja</dt><dd>{wysylka.miasto}</dd></div>
          <div><dt>Grupa / paczka</dt><dd>{wysylka.grupa} · {wysylka.nazwaPaczki}</dd></div>
          <div><dt>Uczestnicy</dt><dd>{wysylka.liczbaUczestnikow}</dd></div>
          <div><dt>Przygotowane pozycje</dt><dd>{wysylka.checklistaId ? `${wysylka.liczbaGotowych} / ${wysylka.liczbaWymaganych}` : 'Brak checklisty'}</dd></div>
          <div><dt>Niepotwierdzone ilości</dt><dd>{wysylka.liczbaNiepotwierdzonych}</dd></div>
        </dl>
        {wysylka.brakujaceElementy.length > 0 && <p role="status">Ostrzeżenia: {wysylka.brakujaceElementy.length}. Rozwiń informacje o paczce.</p>}
        <div className="monitor-wysylek__akcje">
          {otworzSzkolenie && <Przycisk onClick={() => otworzSzkolenie(wysylka.szczegolyId)}>Rejestr szczegółów</Przycisk>}
          {otworzCheckliste && <Przycisk type="button" onClick={() => otworzCheckliste(wysylka)}>{wysylka.checklistaId ? 'Otwórz checklistę' : 'Utwórz checklistę'}</Przycisk>}
          {czyMozeWysylac && wysylka.czyMoznaOznaczycWyslana && !wysylka.czyWyslana && <Przycisk onClick={() => oznaczWyslana(wysylka)}>Oznacz jako wysłaną</Przycisk>}
        </div>
        <details className="monitor-wysylek__dokumenty"><summary>Informacje o paczce{wysylka.brakujaceElementy.length ? ` · ostrzeżenia: ${wysylka.brakujaceElementy.length}` : ''}</summary>
          {wysylka.brakujaceElementy.length > 0 && <ul>{wysylka.brakujaceElementy.map((element, indeks) => <li key={indeks}>{element}</li>)}</ul>}
          <ol>{['Program', 'Lista obecności', 'Ankieta', 'Dyplomy', 'Karta na drzwi', 'Checklista'].map((nazwa) => <li key={nazwa}>{nazwa}</li>)}</ol>
        </details>
      </article>
    })}</div> : <PustyStan>{wysylki.length ? 'Brak wysyłek dla wybranego filtra.' : 'Brak szkoleń wymagających wysyłki materiałów.'}</PustyStan>}
  </section>
}
