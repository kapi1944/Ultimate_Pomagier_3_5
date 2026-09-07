import { EdytowalnaWarstwaSwobodnychBlokow } from '../../../../wspolne/dokumenty/EdytorSwobodnychBlokow'
import RendererSwobodnychBlokow from '../../../../wspolne/dokumenty/RendererSwobodnychBlokow'
import { podzielWierszeListyObecnosci, type DaneListyObecnosci } from './modelListyObecnosci'

function NaglowekListy() { return <header className="lista-obecnosci-a4__naglowek" aria-label="Nagłówek listy obecności" /> }

function TabelaListy({ dane, indeksPierwszegoWiersza, uczestnicy }: {
  dane: DaneListyObecnosci
  indeksPierwszegoWiersza: number
  uczestnicy: Array<{ id: string; imieINazwisko: string }>
}) {
  const daty = dane.daty.length ? dane.daty : ['Data']
  const szerokoscPodpisu = `${44.4 / daty.length}%`

  return <table className="lista-obecnosci-a4__tabela">
    <colgroup>
      <col className="lista-obecnosci-a4__kolumna-lp" />
      <col className="lista-obecnosci-a4__kolumna-uczestnika" />
      {daty.map((data, indeks) => <col key={`${data}-${indeks}`} style={{ width: szerokoscPodpisu }} />)}
    </colgroup>
    <thead>
      <tr><th rowSpan={2} scope="col">Lp.:</th><th rowSpan={2} scope="col">Imię i nazwisko:</th><th colSpan={daty.length} scope="colgroup">Podpis uczestnika:</th></tr>
      <tr>{daty.map((data, indeks) => <th key={`${data}-${indeks}`} scope="col">{data}</th>)}</tr>
    </thead>
    <tbody>
      {uczestnicy.map((uczestnik, indeks) => <tr key={uczestnik.id}>
        <td>{indeksPierwszegoWiersza + indeks + 1}</td>
        <td>{uczestnik.imieINazwisko || '\u00a0'}</td>
        {daty.map((data, indeksDaty) => <td aria-label={`Podpis: ${data}`} key={`${data}-${indeksDaty}`} />)}
      </tr>)}
    </tbody>
  </table>
}

export default function RendererListyObecnosci({ dane, zasobyObrazow, zaznaczonyBlokId = null, trybEdycjiSzablonu = false, onZaznaczBlok, onZmienBlok }: { dane: DaneListyObecnosci; zasobyObrazow?: Record<string, string | undefined>; zaznaczonyBlokId?: string | null; trybEdycjiSzablonu?: boolean; onZaznaczBlok?: (id: string | null) => void; onZmienBlok?: (blok: DaneListyObecnosci['blokiSwobodne'][number]) => void }) {
  const strony = podzielWierszeListyObecnosci(dane)
  const zakresDat = dane.daty.length > 1 ? `${dane.daty[0]} do ${dane.daty.at(-1)}` : dane.daty[0] ?? ''
  const kontekst = { dane: { ...dane, miejsceITermin: [dane.miejsce, zakresDat].filter(Boolean).join(', ') }, zasobyObrazow: { logo_organizatora: dane.organizator === 'IIST' ? '/logo-iist.png' : '/logo-semper.png', ...zasobyObrazow } }

  return <div className="lista-obecnosci-a4__dokument">
    {strony.map((uczestnicy, indeksStrony) => <section className="lista-obecnosci-a4" data-strona-dokumentu key={indeksStrony}>
      {indeksStrony === 0 && <><NaglowekListy /><RendererSwobodnychBlokow bloki={dane.blokiSwobodne} numerStrony={1} kontekst={kontekst} trybRenderowania="roboczy" />{onZaznaczBlok && onZmienBlok && <EdytowalnaWarstwaSwobodnychBlokow bloki={dane.blokiSwobodne} numerStrony={1} zaznaczonyBlokId={zaznaczonyBlokId} trybEdycjiSzablonu={trybEdycjiSzablonu} onZaznacz={onZaznaczBlok} onZmienBlok={onZmienBlok} />}</>}
      <TabelaListy dane={dane} indeksPierwszegoWiersza={indeksStrony * 28} uczestnicy={uczestnicy} />
    </section>)}
  </div>
}
