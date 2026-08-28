import type { ReactNode } from 'react'
import { EdytowalnaWarstwaSwobodnychBlokow } from '../../../../wspolne/dokumenty/EdytorSwobodnychBlokow'
import RendererSwobodnychBlokow from '../../../../wspolne/dokumenty/RendererSwobodnychBlokow'
import type { BlokSwobodnyDokumentu, KontekstSwobodnychBlokow } from '../../../../wspolne/dokumenty/modelSwobodnychBlokow'
import { formatujZakresDatAnkiety, nazwyOrganizatorowAnkiety, podzielAnkieteNaStrony, type DaneAnkiety, type PytanieAnkiety, type SekcjaAnkiety } from './modelAnkiety'

const skalaOcen = [['bardzo dobrze', '4'], ['dobrze', '3'], ['do udoskonalenia', '2'], ['źle', '1']]

function StopkaAnkiety({ numerStrony, liczbaStron, nowoczesna }: { numerStrony: number; liczbaStron: number; nowoczesna: boolean }) {
  return <footer className={nowoczesna ? 'ankieta-nowoczesna__stopka' : 'ankieta-a4__stopka'}>
    <strong>Strona: {numerStrony} z {liczbaStron}</strong><span>Ankieta ewaluacyjna Uczestnika szkolenia</span>
  </footer>
}

function WierszDanych({ etykieta, children, wyrozniony = false }: { etykieta: string; children: ReactNode; wyrozniony?: boolean }) {
  return <div className="ankieta-a4__wiersz-danych"><span>{etykieta}</span><strong className={wyrozniony ? 'ankieta-a4__wartosc--wyrozniona' : undefined}>{children || '\u00a0'}</strong></div>
}

function DaneSzkolenia({ dane, nowoczesne = false }: { dane: DaneAnkiety; nowoczesne?: boolean }) {
  const dataIMiejsce = [dane.miejsce, formatujZakresDatAnkiety(dane.dataOd, dane.dataDo)].filter(Boolean).join(', ')
  if (nowoczesne) return <section className="ankieta-nowoczesna__dane" aria-label="Dane szkolenia">
    <div className="ankieta-nowoczesna__tytul-szkolenia"><span>Szkolenie</span><strong>{dane.tytulSzkolenia || '\u00a0'}</strong></div>
    <dl><div><dt>Termin i miejsce</dt><dd>{dataIMiejsce || '\u00a0'}</dd></div><div><dt>Prowadzący</dt><dd>{dane.trener || '\u00a0'}</dd></div><div><dt>Organizator</dt><dd>{nazwyOrganizatorowAnkiety[dane.organizator]}</dd></div></dl>
  </section>
  return <section className="ankieta-a4__dane-szkolenia" aria-label="Dane szkolenia">
    <WierszDanych etykieta="Tytuł szkolenia" wyrozniony>{dane.tytulSzkolenia}</WierszDanych><WierszDanych etykieta="Data i miejsce szkolenia" wyrozniony>{dataIMiejsce}</WierszDanych><WierszDanych etykieta="Organizator szkolenia">{nazwyOrganizatorowAnkiety[dane.organizator]}</WierszDanych><WierszDanych etykieta="Ekspert prowadzący szkolenie">{dane.trener}</WierszDanych>
  </section>
}

function PolaOceny({ nowoczesne = false }: { nowoczesne?: boolean }) {
  return <>{skalaOcen.map(([ocena]) => <td key={ocena}><span aria-hidden="true" className={nowoczesne ? 'ankieta-nowoczesna__checkbox' : 'ankieta-a4__checkbox'} /></td>)}</>
}

function SekcjaOceny({ sekcja, nowoczesna }: { sekcja: SekcjaAnkiety; nowoczesna: boolean }) {
  return <section className={nowoczesna ? 'ankieta-nowoczesna__sekcja ankieta-nowoczesna__sekcja--ocena' : 'ankieta-a4__oceny'}>
    {nowoczesna && <header><h2>{sekcja.nazwa}</h2>{sekcja.opis && <p>{sekcja.opis}</p>}</header>}
    <table><thead><tr><th>{nowoczesna ? 'Kryterium' : sekcja.nazwa.toLocaleUpperCase('pl')}</th>{skalaOcen.map(([ocena, punkty]) => <th key={ocena}><span>{ocena}</span><span>({punkty} pkt)</span></th>)}</tr></thead><tbody>{sekcja.pytania.map((pytanie, indeks) => <tr key={pytanie.id}><td>{indeks + 1}. {pytanie.tekst}</td><PolaOceny nowoczesne={nowoczesna} /></tr>)}</tbody></table>
  </section>
}

function OcenyOryginalne({ sekcje }: { sekcje: SekcjaAnkiety[] }) {
  const oceniane = sekcje.filter((sekcja) => sekcja.pytania.every((pytanie) => pytanie.typ === 'OCENA_4'))
  return <section className="ankieta-a4__oceny" aria-label="Pytania i ocena"><h2>PYTANIA/OCENA</h2><table><tbody>{oceniane.flatMap((sekcja) => [
    <tr className="ankieta-a4__naglowek-sekcji-ocen" key={`naglowek-${sekcja.id}`}><th>{sekcja.nazwa.toLocaleUpperCase('pl')}</th>{skalaOcen.map(([ocena, punkty]) => <th key={ocena}><span>{ocena}</span><span>({punkty} pkt)</span></th>)}</tr>,
    ...sekcja.pytania.map((pytanie, indeks) => <tr key={pytanie.id}><td>{indeks + 1}. {pytanie.tekst}</td><PolaOceny /></tr>),
  ])}</tbody></table></section>
}

function OdpowiedziTakNie({ nowoczesne }: { nowoczesne: boolean }) {
  return <div className={nowoczesne ? 'ankieta-nowoczesna__tak-nie' : 'ankieta-a4__odpowiedzi-tak-nie'}>{['TAK', 'NIE', 'NIE DOTYCZY'].map((odpowiedz) => <span key={odpowiedz}>{odpowiedz}<i aria-hidden="true" /></span>)}</div>
}

function PytanieDoWypelnienia({ pytanie, nowoczesne }: { pytanie: PytanieAnkiety; nowoczesne: boolean }) {
  if (pytanie.typ === 'OCENA_4') return <SekcjaOceny nowoczesna={nowoczesne} sekcja={{ id: `pojedyncze-${pytanie.id}`, nazwa: '', widoczna: true, pytania: [pytanie] }} />
  if (pytanie.typ === 'TAK_NIE_NIE_DOTYCZY') return <div className={nowoczesne ? 'ankieta-nowoczesna__pytanie' : 'ankieta-a4__uwagi'}><p>{pytanie.tekst}</p><OdpowiedziTakNie nowoczesne={nowoczesne} /></div>
  if (pytanie.typ === 'JEDNA_LINIA') return <div className={nowoczesne ? 'ankieta-nowoczesna__jedna-linia' : 'ankieta-a4__sekcja-email'}><strong>{pytanie.tekst}</strong><span /></div>
  const liczbaLinii = pytanie.typ === 'POLE_TEKSTOWE' ? 3 : 2
  return <div className={nowoczesne ? 'ankieta-nowoczesna__pytanie' : 'ankieta-a4__pytanie-otwarte'}><p>{pytanie.tekst}</p><div className={nowoczesne ? 'ankieta-nowoczesna__linie' : undefined}>{Array.from({ length: liczbaLinii }, (_, indeks) => <span key={indeks} />)}</div></div>
}

function SekcjaPytan({ sekcja, nowoczesna }: { sekcja: SekcjaAnkiety; nowoczesna: boolean }) {
  const tylkoOceny = sekcja.pytania.every((pytanie) => pytanie.typ === 'OCENA_4')
  if (tylkoOceny) return <SekcjaOceny nowoczesna={nowoczesna} sekcja={sekcja} />
  return <section className={nowoczesna ? `ankieta-nowoczesna__sekcja ${sekcja.id.startsWith('uwagi') ? 'ankieta-nowoczesna__sekcja--uwagi' : ''}` : 'ankieta-a4__pytania-otwarte'}>
    {nowoczesna && <header><h2>{sekcja.nazwa}</h2>{sekcja.opis && <p>{sekcja.opis}</p>}</header>}
    {!nowoczesna && sekcja.id.startsWith('email') && sekcja.opis && <p className="ankieta-a4__opis-email">{sekcja.opis}</p>}
    {sekcja.pytania.map((pytanie) => <PytanieDoWypelnienia key={pytanie.id} nowoczesne={nowoczesna} pytanie={pytanie} />)}
  </section>
}

type WlasciwosciRendereraAnkiety = {
  dane: DaneAnkiety
  zaznaczonyBlokId?: string | null
  trybEdycjiSzablonu?: boolean
  zasobyObrazow?: Record<string, string | undefined>
  onZaznaczBlok?: (id: string | null) => void
  onZmienBlok?: (blok: BlokSwobodnyDokumentu) => void
}

export default function RendererAnkiety({ dane, zaznaczonyBlokId = null, trybEdycjiSzablonu = false, zasobyObrazow, onZaznaczBlok, onZmienBlok }: WlasciwosciRendereraAnkiety) {
  const strony = podzielAnkieteNaStrony(dane)
  const nowoczesna = dane.wariantSzablonu === 'NOWOCZESNA'
  const logo = dane.organizator === 'IIST' ? '/logo-iist.png' : '/logo-semper.png'
  return <div className="ankieta-a4__dokument" data-liczba-stron={strony.length}>
    {strony.map((strona) => {
      const kontekst: KontekstSwobodnychBlokow = { dane: { ...(dane as unknown as Record<string, unknown>), numerStrony: strona.numer, liczbaStron: strony.length }, zasobyObrazow: { logo_organizatora: logo, ...zasobyObrazow } }
      return <section className={`ankieta-a4 ${nowoczesna ? 'ankieta-a4--nowoczesna' : ''}`} data-strona-dokumentu key={strona.numer}>
        {nowoczesna ? <div aria-hidden="true" className={`ankieta-nowoczesna__naglowek ankieta-nowoczesna__naglowek--${dane.organizator.toLocaleLowerCase('pl')}`} /> : <header className="ankieta-a4__naglowek"><span aria-hidden="true" className="ankieta-a4__numer-strony" /><span aria-hidden="true" className="ankieta-a4__tytul-naglowka" /><span aria-hidden="true" className="ankieta-a4__logo" /></header>}
        <main className={nowoczesna ? 'ankieta-nowoczesna__tresc' : `ankieta-a4__tresc ${strona.numer === 1 ? 'ankieta-a4__tresc--pierwsza' : 'ankieta-a4__tresc--druga'}`}>
          {strona.numer === 1 && <DaneSzkolenia dane={dane} nowoczesne={nowoczesna} />}
          {!nowoczesna && strona.sekcje.some((sekcja) => sekcja.pytania.every((pytanie) => pytanie.typ === 'OCENA_4')) && <OcenyOryginalne sekcje={strona.sekcje} />}
          {strona.sekcje.filter((sekcja) => nowoczesna || !sekcja.pytania.every((pytanie) => pytanie.typ === 'OCENA_4')).map((sekcja) => <SekcjaPytan key={sekcja.id} nowoczesna={nowoczesna} sekcja={sekcja} />)}
        </main>
        <StopkaAnkiety liczbaStron={strony.length} nowoczesna={nowoczesna} numerStrony={strona.numer} />
        <RendererSwobodnychBlokow bloki={dane.blokiSwobodne} numerStrony={strona.numer} kontekst={kontekst} trybRenderowania="roboczy" />
        {onZaznaczBlok && onZmienBlok && <EdytowalnaWarstwaSwobodnychBlokow bloki={dane.blokiSwobodne} numerStrony={strona.numer} zaznaczonyBlokId={zaznaczonyBlokId} trybEdycjiSzablonu={trybEdycjiSzablonu} onZaznacz={onZaznaczBlok} onZmienBlok={onZmienBlok} />}
      </section>
    })}
  </div>
}
