import { useId, useState } from 'react'
import { OknoDialogowe, OdznakaStatusu, Przycisk } from '../../../wspolne/komponenty/ElementyInterfejsu'
import { czyJestAdministratorem } from '../../../kartoteki/uzytkownicy/uprawnienia'
import { useKontekstUzytkownika } from '../../../aplikacja/logowanie/useKontekstUzytkownika'
import { dataWarszawska, wystapieniaDnia, wlascicielWystapienia, type WystapienieRutyny } from './logika/rutyny'
import { czyGodzinaWOsi, normalizujOsCzasu, pozycjaGodzinyNaOsi, type ZakresDniaPracy } from './logika/czasDnia'
import { zmienWykonanieRutyny } from './uslugi/rutynyPulpitu'
import type { useRutynyPulpitu } from './useRutynyPulpitu'
import type { BlokPracy } from './logika/harmonogramPracy'

export default function RutynyNaOsi({ daneRutyn, data, uzytkownikId, zakresDniaPracy, blokiDnia, szerokoscOsi }: {
  daneRutyn: ReturnType<typeof useRutynyPulpitu>; data: string; uzytkownikId: string; zakresDniaPracy: ZakresDniaPracy; blokiDnia: BlokPracy[]; szerokoscOsi: number
}) {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const [blad, ustawBlad] = useState('')
  const [wybranaRutynaId, ustawWybranaRutyneId] = useState<string | null>(null)
  const identyfikatorList = useId()
  const { stan } = daneRutyn
  const wystapienia = wystapieniaDnia(stan.rutyny, stan.wykonania, data, daneRutyn.kalendarzPracy).filter((wpis) => {
    const rutyna = stan.rutyny.find((rutyna) => rutyna.id === wpis.rutynaId)
    return rutyna && wlascicielWystapienia(rutyna, wpis) === uzytkownikId
  })
  const os = normalizujOsCzasu(zakresDniaPracy.osCzasu, zakresDniaPracy)
  const godzinowe = wystapienia.filter((wpis) => wpis.godzina || blokiDnia.some((blok) => blok.id === wpis.blokPracyId))
  const widoczneGodzinowe = godzinowe.filter((wpis) => {
    const blok = blokiDnia.find((blok) => blok.id === wpis.blokPracyId)
    return blok ? blok.koniec > os.poczatek && blok.poczatek < os.koniec : czyGodzinaWOsi(wpis.godzina!, zakresDniaPracy)
  })
  const pozaOsia = godzinowe.filter((wpis) => !widoczneGodzinowe.includes(wpis))
  const grupy = blokiDnia.flatMap((blok) => {
    const rutyny = widoczneGodzinowe.filter((wpis) => wpis.blokPracyId === blok.id)
    if (!rutyny.length) return []
    const lewo = pozycjaGodzinyNaOsi(blok.poczatek, zakresDniaPracy)
    const szerokosc = pozycjaGodzinyNaOsi(blok.koniec, zakresDniaPracy) - lewo
    const piksele = szerokoscOsi * szerokosc / 100
    return [{ blok, rutyny, lewo, szerokosc, waski: piksele < 96, miesciLicznik: piksele >= 24 }]
  })
  const wpisModalu = wystapienia.find((wpis) => wpis.rutynaId === wybranaRutynaId)
  const rutynaModalu = stan.rutyny.find((rutyna) => rutyna.id === wpisModalu?.rutynaId)
  const blokModalu = blokiDnia.find((blok) => blok.id === wpisModalu?.blokPracyId)
  const adres = rutynaModalu?.link
  const url = adres ? URL.parse(adres) : null
  const poprawnyAdres = url && (url.protocol === 'http:' || url.protocol === 'https:')
  const zewnetrzny = url && (typeof window === 'undefined' || url.origin !== window.location.origin)
  const moznaWykonac = data <= dataWarszawska(new Date()) &&
    (uzytkownikId === zalogowanyUzytkownik?.id || czyJestAdministratorem(zalogowanyUzytkownik))

  function wykonaj(wpis: WystapienieRutyny, wykonane: boolean) {
    try {
      zmienWykonanieRutyny(wpis, wykonane, zalogowanyUzytkownik)
      daneRutyn.odswiez()
      ustawBlad('')
    } catch (wyjatek) {
      ustawBlad(wyjatek instanceof Error ? wyjatek.message : 'Nie udało się zmienić rutyny.')
    }
  }

  function kontrolki(wpis: WystapienieRutyny, kompaktowa = false) {
    const blok = blokiDnia.find((blok) => blok.id === wpis.blokPracyId)
    return <div className={'pulpit-rutyna__kontrolki' + (wpis.wykonane ? ' pulpit-rutyna__kontrolki--wykonane' : '')}>
      <input type="checkbox" aria-label={'Rutyna ' + (wpis.godzina ?? '') + ': ' + wpis.tytul} checked={wpis.wykonane} disabled={!moznaWykonac} onChange={(zdarzenie) => wykonaj(wpis, zdarzenie.target.checked)} />
      <button type="button" title={wpis.tytul} aria-label={'Szczegóły rutyny: ' + wpis.tytul} aria-haspopup="dialog" onClick={(zdarzenie) => {
        zdarzenie.currentTarget.focus({ preventScroll: true })
        ustawBlad('')
        ustawWybranaRutyneId(wpis.rutynaId)
      }}><span>{!kompaktowa && wpis.godzina && <strong>Plan: {wpis.godzina} · </strong>}{!kompaktowa && wpis.blokPracyId && <strong>{blok ? `${blok.nazwa} (${blok.poczatek}–${blok.koniec})` : 'Blok niedostępny w tym dniu — przypisz ponownie'} · </strong>}{wpis.tytul}</span></button>
    </div>
  }
  return <>
    {!wpisModalu && (blad || daneRutyn.blad) && <p role="alert">{blad || daneRutyn.blad}</p>}
    <OknoDialogowe otwarty={Boolean(wpisModalu && rutynaModalu)} zamknij={() => ustawWybranaRutyneId(null)}
      tytul={rutynaModalu?.tytul ?? 'Szczegóły rutyny'} klasa="pulpit-dialog-rutyny" zamknijPoKliknieciuTla>
      {wpisModalu && rutynaModalu && <>
        <p><time dateTime={wpisModalu.okres}>{wpisModalu.okres}</time></p>
        {wpisModalu.blokPracyId && <p>Blok pracy: {blokModalu
          ? <strong className="pulpit-dialog-rutyny__blok" style={{ borderInlineStartColor: blokModalu.kolor }}>{blokModalu.nazwa}</strong>
          : 'Niedostępny w tym dniu'}</p>}
        {wpisModalu.godzina && <p>Godzina: {wpisModalu.godzina}</p>}
        {blokModalu && <p>Godziny bloku: {blokModalu.poczatek}–{blokModalu.koniec}</p>}
        {rutynaModalu.opis && <p>{rutynaModalu.opis}</p>}
        {rutynaModalu.instrukcja && <details><summary>Instrukcja</summary>{rutynaModalu.instrukcja}</details>}
        <p role="status"><OdznakaStatusu status={wpisModalu.wykonane ? 'success' : 'info'}>
          {wpisModalu.wykonane ? 'Wykonano' : 'Do wykonania'}
        </OdznakaStatusu></p>
        <div className="pulpit-dialog-rutyny__akcje">
          {poprawnyAdres
            ? <a className="ui-przycisk" href={adres} target={zewnetrzny ? '_blank' : undefined} rel="noopener noreferrer">↗ Przejdź do zadania</a>
            : <Przycisk disabled>↗ Przejdź do zadania</Przycisk>}
          <Przycisk disabled={!moznaWykonac} onClick={() => wykonaj(wpisModalu, !wpisModalu.wykonane)}>
            {wpisModalu.wykonane ? 'Cofnij wykonanie' : 'Oznacz jako wykonane'}
          </Przycisk>
        </div>
        {!poprawnyAdres && <p>{adres ? 'Zapisany adres jest nieprawidłowy.' : 'Do rutyny nie przypisano linku.'}</p>}
        {blad && <p role="alert">{blad}</p>}
      </>}
    </OknoDialogowe>
    {grupy.length > 0 && <div className="pulpit-rutyny-blokowe">
      {grupy.map(({ blok, rutyny, lewo, szerokosc, waski, miesciLicznik }) => <div key={blok.id} className="pulpit-rutyna__przedzial" style={{ marginLeft: lewo + '%', width: szerokosc + '%' }} aria-label={blok.nazwa + ' (' + blok.poczatek + '–' + blok.koniec + ')'}>
        {waski && !miesciLicznik && <span className="pulpit-rutyna__skrot" aria-hidden="true" />}
        {waski && miesciLicznik && <button type="button" className="pulpit-rutyna__licznik" aria-label={blok.nazwa + ': pokaż rutyny (' + rutyny.length + ')'} aria-controls={identyfikatorList + blok.id} onClick={() => {
          const lista = document.getElementById(identyfikatorList + blok.id)
          if (lista instanceof HTMLDetailsElement) {
            lista.open = true
            lista.querySelector('summary')?.focus()
          }
        }}>{rutyny.length}</button>}
        {!waski && rutyny.map((wpis) => <div key={wpis.rutynaId}>{kontrolki(wpis, true)}</div>)}
      </div>)}
    </div>}
    <div className="pulpit-rutyny-godzinowe">{widoczneGodzinowe.filter((wpis) => wpis.godzina).map((wpis) => {
      const pozycja = pozycjaGodzinyNaOsi(wpis.godzina!, zakresDniaPracy)
      return <div key={wpis.rutynaId} className="pulpit-rutyna">
        <span aria-hidden="true" className="pulpit-rutyna__punkt" style={{ left: pozycja + '%' }} />
        <div style={{ marginLeft: 'clamp(0px, calc(' + pozycja + '% - 120px), calc(100% - 240px))' }}>{kontrolki(wpis)}</div>
      </div>
    })}</div>
    {grupy.filter((grupa) => grupa.waski).map(({ blok, rutyny }) => <details key={blok.id} id={identyfikatorList + blok.id} className="pulpit-poza-osia">
      <summary>{blok.nazwa} · Rutyny ({rutyny.length})</summary>
      {rutyny.map((wpis) => <div key={wpis.rutynaId}>{kontrolki(wpis)}</div>)}
    </details>)}
    {pozaOsia.length > 0 && <details className="pulpit-poza-osia pulpit-rutyny-poza-osia"><summary>Rutyny poza zakresem osi ({pozaOsia.length})</summary>{pozaOsia.map((wpis) => <div key={wpis.rutynaId}><small>{(wpis.godzina ?? blokiDnia.find((blok) => blok.id === wpis.blokPracyId)!.poczatek) < os.poczatek ? 'Przed' : 'Po'} zakresem</small>{kontrolki(wpis)}</div>)}</details>}
    {wystapienia.some((wpis) => !wpis.godzina && !wpis.blokPracyId) && <div className="pulpit-rutyny-bez-godziny"><strong>Rutyny bez godziny</strong>{wystapienia.filter((wpis) => !wpis.godzina && !wpis.blokPracyId).map((wpis) => <div key={wpis.rutynaId}>{kontrolki(wpis)}</div>)}</div>}
    {wystapienia.some((wpis) => wpis.blokPracyId && !blokiDnia.some((blok) => blok.id === wpis.blokPracyId)) && <div className="pulpit-rutyny-bez-godziny"><strong>Rutyny z niedostępnym blokiem — przypisz ponownie</strong>{wystapienia.filter((wpis) => wpis.blokPracyId && !blokiDnia.some((blok) => blok.id === wpis.blokPracyId)).map((wpis) => <div key={wpis.rutynaId}>{kontrolki(wpis)}</div>)}</div>}
  </>
}
