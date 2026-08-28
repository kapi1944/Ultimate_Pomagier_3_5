import { podzielWierszeListyObecnosci, type DaneListyObecnosci } from './modelListyObecnosci'

function NaglowekListy({ dane }: { dane: DaneListyObecnosci }) {
  const logo = dane.organizator === 'IIST' ? '/logo-iist.png' : '/logo-semper.png'
  const zakresDat = dane.daty.length > 1 ? `${dane.daty[0]} do ${dane.daty.at(-1)}` : dane.daty[0] ?? ''
  const miejsceITermin = [dane.miejsce, zakresDat].filter(Boolean).join(', ')

  return <header className="lista-obecnosci-a4__naglowek">
    <img alt={`Logo ${dane.organizator}`} className="lista-obecnosci-a4__logo" src={logo} />
    <h1>Lista obecności</h1>
    <h2>"{dane.tytulSzkolenia || 'Tytuł szkolenia'}"</h2>
    <p>{miejsceITermin || '\u00a0'}</p>
  </header>
}

function TabelaListy({ dane, indeksPierwszegoWiersza, uczestnicy, czyPierwszaStrona }: {
  dane: DaneListyObecnosci
  indeksPierwszegoWiersza: number
  uczestnicy: Array<{ id: string; imieINazwisko: string }>
  czyPierwszaStrona: boolean
}) {
  const daty = dane.daty.length ? dane.daty : ['Data']
  const szerokoscPodpisu = `${44.4 / daty.length}%`

  return <table className="lista-obecnosci-a4__tabela">
    <colgroup>
      <col className="lista-obecnosci-a4__kolumna-lp" />
      <col className="lista-obecnosci-a4__kolumna-uczestnika" />
      {daty.map((data, indeks) => <col key={`${data}-${indeks}`} style={{ width: szerokoscPodpisu }} />)}
    </colgroup>
    {czyPierwszaStrona && <thead>
      <tr><th rowSpan={2} scope="col">Lp.:</th><th rowSpan={2} scope="col">Imię i nazwisko:</th><th colSpan={daty.length} scope="colgroup">Podpis uczestnika:</th></tr>
      <tr>{daty.map((data, indeks) => <th key={`${data}-${indeks}`} scope="col">{data}</th>)}</tr>
    </thead>}
    <tbody>
      {uczestnicy.map((uczestnik, indeks) => <tr key={uczestnik.id}>
        <td>{indeksPierwszegoWiersza + indeks + 1}</td>
        <td>{uczestnik.imieINazwisko || '\u00a0'}</td>
        {daty.map((data, indeksDaty) => <td aria-label={`Podpis: ${data}`} key={`${data}-${indeksDaty}`} />)}
      </tr>)}
    </tbody>
  </table>
}

export default function RendererListyObecnosci({ dane }: { dane: DaneListyObecnosci }) {
  const strony = podzielWierszeListyObecnosci(dane)

  return <div className="lista-obecnosci-a4__dokument">
    {strony.map((uczestnicy, indeksStrony) => <section className="lista-obecnosci-a4" data-strona-dokumentu key={indeksStrony}>
      {indeksStrony === 0 && <NaglowekListy dane={dane} />}
      <TabelaListy dane={dane} indeksPierwszegoWiersza={indeksStrony * 28} uczestnicy={uczestnicy} czyPierwszaStrona={indeksStrony === 0} />
    </section>)}
  </div>
}
