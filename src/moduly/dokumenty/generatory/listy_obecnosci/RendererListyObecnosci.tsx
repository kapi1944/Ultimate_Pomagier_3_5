import { EdytowalnaWarstwaSwobodnychBlokow } from '../../../../wspolne/dokumenty/EdytorSwobodnychBlokow'
import RendererSwobodnychBlokow from '../../../../wspolne/dokumenty/RendererSwobodnychBlokow'
import { etykietyKolumnListyObecnosci, podzielListeObecnosciNaStrony, type DaneListyObecnosci, type KolumnaListyObecnosci, type UczestnikListyObecnosci } from './modelListyObecnosci'

function NaglowekListy() { return <header className="lista-obecnosci-a4__naglowek" aria-label="Nagłówek listy obecności" /> }

function pobierzSzerokoscKolumny(kolumna: KolumnaListyObecnosci, liczbaKolumnPodpisu: number, kolumny: KolumnaListyObecnosci[]) {
  if (kolumna === 'LP') return '5.4%'
  if (kolumna === 'PODPIS') return `${44.4 / liczbaKolumnPodpisu}%`
  const pozostale = 100 - (kolumny.includes('LP') ? 5.4 : 0) - (kolumny.includes('PODPIS') ? 44.4 : 0)
  const liczbaTekstowych = kolumny.filter((pozycja) => pozycja === 'IMIE_I_NAZWISKO' || pozycja === 'FIRMA').length
  return `${pozostale / Math.max(liczbaTekstowych, 1)}%`
}

function TabelaListy({ dane, dataPodpisu, indeksPierwszegoWiersza, uczestnicy }: { dane: DaneListyObecnosci; dataPodpisu: string | null; indeksPierwszegoWiersza: number; uczestnicy: UczestnikListyObecnosci[] }) {
  const kolumny = (['LP', 'IMIE_I_NAZWISKO', 'FIRMA', 'PODPIS'] as KolumnaListyObecnosci[]).filter((kolumna) => dane.kolumny.includes(kolumna))
  const datyPodpisu = dataPodpisu ? [dataPodpisu] : dane.daty.length ? dane.daty : ['Data']
  const czyPodpis = kolumny.includes('PODPIS')
  return <table className="lista-obecnosci-a4__tabela"><colgroup>{kolumny.flatMap((kolumna) => kolumna === 'PODPIS' ? datyPodpisu.map((data, indeks) => <col key={`${data}-${indeks}`} style={{ width: pobierzSzerokoscKolumny(kolumna, datyPodpisu.length, kolumny) }} />) : <col className={kolumna === 'LP' ? 'lista-obecnosci-a4__kolumna-lp' : kolumna === 'IMIE_I_NAZWISKO' ? 'lista-obecnosci-a4__kolumna-uczestnika' : undefined} key={kolumna} style={{ width: pobierzSzerokoscKolumny(kolumna, datyPodpisu.length, kolumny) }} />)}</colgroup><thead>{czyPodpis ? <><tr>{kolumny.filter((kolumna) => kolumna !== 'PODPIS').map((kolumna) => <th key={kolumna} rowSpan={2} scope="col">{etykietyKolumnListyObecnosci[kolumna]}:</th>)}<th colSpan={datyPodpisu.length} scope="colgroup">Podpis uczestnika:</th></tr><tr>{datyPodpisu.map((data, indeks) => <th key={`${data}-${indeks}`} scope="col">{data}</th>)}</tr></> : <tr>{kolumny.map((kolumna) => <th key={kolumna} scope="col">{etykietyKolumnListyObecnosci[kolumna]}:</th>)}</tr>}</thead><tbody>{uczestnicy.map((uczestnik, indeks) => <tr key={uczestnik.id}>{kolumny.flatMap((kolumna) => {
    if (kolumna === 'LP') return [<td key={kolumna}>{indeksPierwszegoWiersza + indeks + 1}</td>]
    if (kolumna === 'IMIE_I_NAZWISKO') return [<td key={kolumna}>{uczestnik.imieINazwisko || '\u00a0'}</td>]
    if (kolumna === 'FIRMA') return [<td key={kolumna}>{uczestnik.firma || '\u00a0'}</td>]
    return datyPodpisu.map((data, indeksDaty) => <td aria-label={`Podpis: ${data}`} key={`${data}-${indeksDaty}`} />)
  })}</tr>)}</tbody></table>
}

function PodpisyOdpowiedzialnych({ dane }: { dane: DaneListyObecnosci }) {
  if (!dane.czyPokazacPodpisTrenera && !dane.czyPokazacPodpisOrganizatora) return null
  return <footer className="lista-obecnosci-a4__podpisy">{dane.czyPokazacPodpisTrenera && <span>{dane.trener && <strong>{dane.trener}<br /></strong>}Podpis trenera</span>}{dane.czyPokazacPodpisOrganizatora && <span>Podpis organizatora</span>}</footer>
}

export default function RendererListyObecnosci({ dane, zasobyObrazow, zaznaczonyBlokId = null, trybEdycjiSzablonu = false, onZaznaczBlok, onZmienBlok }: { dane: DaneListyObecnosci; zasobyObrazow?: Record<string, string | undefined>; zaznaczonyBlokId?: string | null; trybEdycjiSzablonu?: boolean; onZaznaczBlok?: (id: string | null) => void; onZmienBlok?: (blok: DaneListyObecnosci['blokiSwobodne'][number]) => void }) {
  const strony = podzielListeObecnosciNaStrony(dane)
  const zakresDat = dane.daty.length > 1 ? `${dane.daty[0]} do ${dane.daty.at(-1)}` : dane.daty[0] ?? ''
  const kontekst = { dane: { ...dane, miejsceITermin: [dane.miejsce, zakresDat].filter(Boolean).join(', ') }, zasobyObrazow: { logo_organizatora: dane.organizator === 'IIST' ? '/logo-iist.png' : '/logo-semper.png', ...zasobyObrazow } }
  return <div className="lista-obecnosci-a4__dokument">{strony.map((strona, indeksStrony) => <section className="lista-obecnosci-a4" data-strona-dokumentu key={`${strona.dataPodpisu ?? 'wszystkie'}-${indeksStrony}`}>
    {indeksStrony === 0 && <NaglowekListy />}<RendererSwobodnychBlokow bloki={dane.blokiSwobodne} numerStrony={indeksStrony + 1} kontekst={kontekst} trybRenderowania="roboczy" />{onZaznaczBlok && onZmienBlok && <EdytowalnaWarstwaSwobodnychBlokow bloki={dane.blokiSwobodne} numerStrony={indeksStrony + 1} zaznaczonyBlokId={zaznaczonyBlokId} trybEdycjiSzablonu={trybEdycjiSzablonu} onZaznacz={onZaznaczBlok} onZmienBlok={onZmienBlok} />}
    {indeksStrony > 0 && <header className="lista-obecnosci-a4__naglowek-kontynuacji"><strong>Lista obecności — {dane.tytulSzkolenia}</strong>{strona.dataPodpisu && <span>{strona.dataPodpisu}</span>}</header>}
    <TabelaListy dane={{ ...dane, daty: strona.datyPodpisow }} dataPodpisu={strona.dataPodpisu} indeksPierwszegoWiersza={strona.indeksPierwszegoWiersza} uczestnicy={strona.uczestnicy} /><PodpisyOdpowiedzialnych dane={dane} />
  </section>)}</div>
}
