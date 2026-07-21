import { useState, type ReactNode } from 'react'
import type { Dokument } from '../../wspolne/dokumenty/modelDokumentu'

type DaneDyplomu = {
  tloSzablonu?: unknown
  tytulSzkolenia?: unknown
  wybraneDaty?: unknown
  trener?: unknown
}

type WlasciwosciKartyDokumentuDyplomu = {
  dokument: Dokument<unknown, unknown>
  etykietaTypu: string
  etykietaStatusu: string
  formatujDate: (data: string) => string
  akcje: ReactNode
}

function pobierzDaneDyplomu(daneDokumentu: unknown): DaneDyplomu {
  return daneDokumentu && typeof daneDokumentu === 'object' ? daneDokumentu as DaneDyplomu : {}
}

function pobierzTekst(wartosc: unknown) {
  return typeof wartosc === 'string' && wartosc.trim() ? wartosc : '—'
}

function pobierzTermin(wartosc: unknown) {
  const daty = Array.isArray(wartosc) ? wartosc.filter((data): data is string => typeof data === 'string' && Boolean(data)) : []
  return daty.length ? daty.join(', ') : '—'
}

export default function KartaDokumentuDyplomu({ dokument, etykietaTypu, etykietaStatusu, formatujDate, akcje }: WlasciwosciKartyDokumentuDyplomu) {
  const [czyMiniaturaUszkodzona, ustawCzyMiniaturaUszkodzona] = useState(false)
  const dane = pobierzDaneDyplomu(dokument.daneDokumentu)
  const miniatura = typeof dane.tloSzablonu === 'string' && dane.tloSzablonu ? dane.tloSzablonu : null

  return (
    <article className="lista-dokumentow__karta lista-dokumentow__karta--dyplom">
      <div className="lista-dokumentow__miniatura-dyplomu">
        {miniatura && !czyMiniaturaUszkodzona
          ? <img alt={`Miniatura: ${dokument.tytul}`} onError={() => ustawCzyMiniaturaUszkodzona(true)} src={miniatura} />
          : <div aria-label="Brak podglądu dokumentu" className="lista-dokumentow__placeholder-dyplomu">Dokument</div>}
      </div>
      <div className="lista-dokumentow__tresc-dyplomu">
        <div className="lista-dokumentow__karta-naglowek">
          <div><p className="lista-dokumentow__typ">{etykietaTypu}</p><h2>{dokument.tytul}</h2></div>
          <strong>{etykietaStatusu}</strong>
        </div>
        <dl className="lista-dokumentow__metadane lista-dokumentow__metadane--dyplom">
          <div><dt>Wersja</dt><dd>v{String(dokument.wersja).padStart(2, '0')}</dd></div>
          <div><dt>Termin szkolenia</dt><dd>{pobierzTermin(dane.wybraneDaty)}</dd></div>
          <div><dt>Tytuł szkolenia</dt><dd>{pobierzTekst(dane.tytulSzkolenia) === '—' ? dokument.tytul : pobierzTekst(dane.tytulSzkolenia)}</dd></div>
          <div><dt>Trener</dt><dd>{pobierzTekst(dane.trener)}</dd></div>
          <div><dt>Właściciel</dt><dd>{dokument.wlascicielId ?? '—'}</dd></div>
          <div><dt>Zmodyfikowano</dt><dd>{formatujDate(dokument.zmodyfikowano)}</dd></div>
        </dl>
        <div className="lista-dokumentow__akcje">{akcje}</div>
      </div>
    </article>
  )
}
