import { useState, type ReactNode } from 'react'
import type { Dokument } from '../../wspolne/dokumenty/modelDokumentu'

type DaneDyplomu = {
  tloSzablonu?: unknown
  tytulSzkolenia?: unknown
  wybraneDaty?: unknown
  trener?: unknown
  uczestnicy?: unknown
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

function pobierzPierwszegoUczestnika(wartosc: unknown) {
  if (!Array.isArray(wartosc)) return 'Imię i nazwisko'
  const uczestnik = wartosc.find((pozycja): pozycja is { imieNazwisko?: unknown } => Boolean(pozycja) && typeof pozycja === 'object')
  return pobierzTekst(uczestnik?.imieNazwisko) === '—' ? 'Imię i nazwisko' : pobierzTekst(uczestnik?.imieNazwisko)
}

export default function KartaDokumentuDyplomu({ dokument, etykietaTypu, etykietaStatusu, formatujDate, akcje }: WlasciwosciKartyDokumentuDyplomu) {
  const [czyMiniaturaUszkodzona, ustawCzyMiniaturaUszkodzona] = useState(false)
  const dane = pobierzDaneDyplomu(dokument.daneDokumentu)
  const tloSzablonu = typeof dane.tloSzablonu === 'string' && dane.tloSzablonu ? dane.tloSzablonu : null
  const uczestnik = pobierzPierwszegoUczestnika(dane.uczestnicy)
  const tytulSzkolenia = pobierzTekst(dane.tytulSzkolenia) === '—' ? dokument.tytul : pobierzTekst(dane.tytulSzkolenia)

  return (
    <article className="lista-dokumentow__karta lista-dokumentow__karta--dyplom">
      <div aria-label={`Miniatura pierwszej strony: ${dokument.tytul}`} className="lista-dokumentow__miniatura-dyplomu">
        {tloSzablonu && !czyMiniaturaUszkodzona && <img alt="" onError={() => ustawCzyMiniaturaUszkodzona(true)} src={tloSzablonu} />}
        <div className="lista-dokumentow__podglad-pierwszej-strony-dyplomu">
          <span className="lista-dokumentow__podglad-rejestr">Nr z rejestru</span>
          <div className="lista-dokumentow__podglad-naglowek-dyplomu"><strong>{etykietaTypu}</strong><span>UKOŃCZENIA SZKOLENIA</span></div>
          <div className="lista-dokumentow__podglad-tresc-dyplomu"><span>Niniejszym zaświadcza się, że</span><strong>{uczestnik}</strong><em>{tytulSzkolenia}</em></div>
          <span className="lista-dokumentow__podglad-stopka-dyplomu">SEMPER</span>
        </div>
      </div>
      <div className="lista-dokumentow__tresc-dyplomu">
        <div className="lista-dokumentow__karta-naglowek">
          <div><p className="lista-dokumentow__typ">{etykietaTypu}</p><h2>{dokument.tytul}</h2></div>
          <strong>{etykietaStatusu}</strong>
        </div>
        <dl className="lista-dokumentow__metadane lista-dokumentow__metadane--dyplom">
          <div><dt>Wersja</dt><dd>v{String(dokument.wersja).padStart(2, '0')}</dd></div>
          <div><dt>Termin szkolenia</dt><dd>{pobierzTermin(dane.wybraneDaty)}</dd></div>
          <div><dt>Tytuł szkolenia</dt><dd>{tytulSzkolenia}</dd></div>
          <div><dt>Trener</dt><dd>{pobierzTekst(dane.trener)}</dd></div>
          <div><dt>Właściciel</dt><dd>{dokument.wlascicielId ?? '—'}</dd></div>
          <div><dt>Zmodyfikowano</dt><dd>{formatujDate(dokument.zmodyfikowano)}</dd></div>
        </dl>
        <div className="lista-dokumentow__akcje">{akcje}</div>
      </div>
    </article>
  )
}
