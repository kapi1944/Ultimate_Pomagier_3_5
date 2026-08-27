import type { ReactNode } from 'react'
import { formatujZakresDatAnkiety, nazwyOrganizatorowAnkiety, type DaneAnkiety, type SekcjaPytaniaOcenianego } from './modelAnkiety'

const konfiguracjaSekcji: Array<{
  symbol: SekcjaPytaniaOcenianego
  tytul: string
  kluczWidocznosci: 'ocenaOgolna' | 'ocenaTrenerow' | 'ocenaOrganizacji'
}> = [
  { symbol: 'A', tytul: 'OGÓLNA OCENA SZKOLENIA', kluczWidocznosci: 'ocenaOgolna' },
  { symbol: 'B', tytul: 'OCENA TRENERÓW', kluczWidocznosci: 'ocenaTrenerow' },
  { symbol: 'C', tytul: 'OCENA ORGANIZACJI SZKOLENIA', kluczWidocznosci: 'ocenaOrganizacji' },
]

const skalaOcen = [
  ['bardzo dobrze', '(4 pkt)'],
  ['dobrze', '(3 pkt)'],
  ['do udoskonalenia', '(2 pkt)'],
  ['źle', '(1 pkt)'],
]

function NaglowekAnkiety({ dane, numerStrony }: { dane: DaneAnkiety; numerStrony: number }) {
  const logo = dane.organizator === 'IIST' ? '/logo-iist.png' : '/logo-semper.png'

  return <header className="ankieta-a4__naglowek">
    <span className="ankieta-a4__numer-strony">{numerStrony}</span>
    <span className="ankieta-a4__tytul-naglowka">Ankieta ewaluacyjna Uczestnika szkolenia</span>
    <span className="ankieta-a4__logo"><img alt={`Logo ${dane.organizator}`} src={`${logo}?strona=${numerStrony}`} /></span>
  </header>
}

function StopkaAnkiety({ numerStrony }: { numerStrony: number }) {
  return <footer className="ankieta-a4__stopka">
    <strong>Strona: {numerStrony} z 2</strong>
    <span>Ankieta ewaluacyjna Uczestnika szkolenia</span>
  </footer>
}

function WierszDanych({ etykieta, children, wyrozniony = false }: { etykieta: string; children: ReactNode; wyrozniony?: boolean }) {
  return <div className="ankieta-a4__wiersz-danych">
    <span>{etykieta}</span>
    <strong className={wyrozniony ? 'ankieta-a4__wartosc--wyrozniona' : undefined}>{children || '\u00a0'}</strong>
  </div>
}

function TabelaDanychSzkolenia({ dane }: { dane: DaneAnkiety }) {
  const dataIMiejsce = [dane.miejsce, formatujZakresDatAnkiety(dane.dataOd, dane.dataDo)].filter(Boolean).join(', ')

  return <section className="ankieta-a4__dane-szkolenia" aria-label="Dane szkolenia">
    <WierszDanych etykieta="Tytuł szkolenia" wyrozniony>{dane.tytulSzkolenia}</WierszDanych>
    <WierszDanych etykieta="Data i miejsce szkolenia" wyrozniony>{dataIMiejsce}</WierszDanych>
    <WierszDanych etykieta="Organizator szkolenia">{nazwyOrganizatorowAnkiety[dane.organizator]}</WierszDanych>
    <WierszDanych etykieta="Ekspert prowadzący szkolenie">{dane.trener}</WierszDanych>
  </section>
}

function NaglowekSekcjiOcen({ symbol, tytul }: { symbol: SekcjaPytaniaOcenianego; tytul: string }) {
  return <tr className="ankieta-a4__naglowek-sekcji-ocen">
    <th scope="col">{symbol}. {tytul}</th>
    {skalaOcen.map(([ocena, punkty]) => <th key={ocena} scope="col"><span>{ocena}</span><span>{punkty}</span></th>)}
  </tr>
}

function TabelaOcen({ dane }: { dane: DaneAnkiety }) {
  return <section className="ankieta-a4__oceny" aria-label="Pytania i ocena">
    <h2>PYTANIA/OCENA</h2>
    <table>
      <tbody>
        {konfiguracjaSekcji.flatMap((sekcja) => {
          if (!dane.widocznoscSekcji[sekcja.kluczWidocznosci]) return []
          const pytania = dane.pytaniaOceniane.filter((pytanie) => pytanie.sekcja === sekcja.symbol)
          return [
            <NaglowekSekcjiOcen key={`naglowek-${sekcja.symbol}`} symbol={sekcja.symbol} tytul={sekcja.tytul} />,
            ...pytania.map((pytanie, indeks) => <tr key={pytanie.id}>
              <td>{indeks + 1}. {pytanie.tekst}</td>
              {skalaOcen.map(([ocena]) => <td key={ocena}><span aria-hidden="true" className="ankieta-a4__checkbox" /></td>)}
            </tr>),
          ]
        })}
      </tbody>
    </table>
  </section>
}

function PytaniaOtwarte({ dane }: { dane: DaneAnkiety }) {
  if (!dane.widocznoscSekcji.pytaniaOtwarte) return null

  return <section className="ankieta-a4__pytania-otwarte" aria-label="Pytania otwarte">
    {dane.pytaniaOtwarte.map((pytanie) => <div className="ankieta-a4__pytanie-otwarte" key={pytanie.id}>
      <p>{pytanie.tekst}</p>
      <span /><span />
    </div>)}
  </section>
}

function PoleEmail() {
  return <section className="ankieta-a4__sekcja-email">
    <p>Prosimy o wskazanie adresu e-mail, dzięki któremu będziemy mogli powiadomić Pana/Panią o interesujących Pana/Panią szkoleniach i dostępnych rabatach:</p>
    <div><strong>e-mail (czytelnie) ☺</strong></div>
  </section>
}

function OdpowiedziTakNie() {
  return <div className="ankieta-a4__odpowiedzi-tak-nie">
    {['TAK', 'NIE', 'NIE DOTYCZY'].map((odpowiedz) => <span key={odpowiedz}>{odpowiedz}<i aria-hidden="true" /></span>)}
  </div>
}

function UwagiISugestie() {
  return <section className="ankieta-a4__uwagi">
    <p>Uwagi, sugestie*</p>
    <div className="ankieta-a4__linie-uwag"><span /><span /></div>
    <p>* Czy ewentualne uwagi, sugestie zgłosił/a Pan/i Organizatorowi podczas szkolenia?</p>
    <OdpowiedziTakNie />
    <p>* Czy Organizator zareagował i znalazł rozwiązanie dla zgłoszonych uwag, sugestii?</p>
    <OdpowiedziTakNie />
  </section>
}

export default function RendererAnkiety({ dane }: { dane: DaneAnkiety }) {
  const liczbaPytanOcenianych = dane.pytaniaOceniane.filter((pytanie) => {
    if (pytanie.sekcja === 'A') return dane.widocznoscSekcji.ocenaOgolna
    if (pytanie.sekcja === 'B') return dane.widocznoscSekcji.ocenaTrenerow
    return dane.widocznoscSekcji.ocenaOrganizacji
  }).length
  const czyGestyUklad = liczbaPytanOcenianych > 9 || dane.tytulSzkolenia.length + dane.trener.length > 150

  return <div className="ankieta-a4__dokument">
    <section className={`ankieta-a4 ${czyGestyUklad ? 'ankieta-a4--gesta' : ''}`} data-strona-dokumentu>
      <NaglowekAnkiety dane={dane} numerStrony={1} />
      <main className="ankieta-a4__tresc ankieta-a4__tresc--pierwsza">
        <TabelaDanychSzkolenia dane={dane} />
        <TabelaOcen dane={dane} />
      </main>
      <StopkaAnkiety numerStrony={1} />
    </section>
    <section className="ankieta-a4 ankieta-a4--druga" data-strona-dokumentu>
      <NaglowekAnkiety dane={dane} numerStrony={2} />
      <main className="ankieta-a4__tresc ankieta-a4__tresc--druga">
        <PytaniaOtwarte dane={dane} />
        {dane.widocznoscSekcji.poleEmail && <PoleEmail />}
        {dane.widocznoscSekcji.uwagiISugestie && <UwagiISugestie />}
      </main>
      <StopkaAnkiety numerStrony={2} />
    </section>
  </div>
}
