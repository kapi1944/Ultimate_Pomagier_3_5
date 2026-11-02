import { useState } from 'react'
import { czyJestAdministratorem } from '../../../kartoteki/uzytkownicy/uprawnienia'
import { useKontekstUzytkownika } from '../../../aplikacja/logowanie/useKontekstUzytkownika'
import { dataWarszawska, wystapieniaDnia, wlascicielWystapienia, type WystapienieRutyny } from './logika/rutyny'
import { pozycjaGodzinyNaOsi, type ZakresDniaPracy } from './logika/czasDnia'
import { zmienWykonanieRutyny } from './uslugi/rutynyPulpitu'
import type { useRutynyPulpitu } from './useRutynyPulpitu'

export default function RutynyNaOsi({ daneRutyn, data, uzytkownikId, zakresDniaPracy, otworz }: {
  daneRutyn: ReturnType<typeof useRutynyPulpitu>; data: string; uzytkownikId: string; zakresDniaPracy: ZakresDniaPracy; otworz: (id: string) => void
}) {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const [blad, ustawBlad] = useState('')
  const { stan } = daneRutyn
  const wystapienia = wystapieniaDnia(stan.rutyny, stan.wykonania, data).filter((wpis) => {
    const rutyna = stan.rutyny.find((rutyna) => rutyna.id === wpis.rutynaId)
    return rutyna && wlascicielWystapienia(rutyna, wpis) === uzytkownikId
  })
  function kontrolki(wpis: WystapienieRutyny) {
    return <div className={'pulpit-rutyna__kontrolki' + (wpis.wykonane ? ' pulpit-rutyna__kontrolki--wykonane' : '')}>
      <label><input type="checkbox" aria-label={'Rutyna ' + (wpis.godzina ?? '') + ': ' + wpis.tytul} checked={wpis.wykonane} disabled={data > dataWarszawska(new Date()) || (uzytkownikId !== zalogowanyUzytkownik?.id && !czyJestAdministratorem(zalogowanyUzytkownik))} onChange={(zdarzenie) => {
        try { zmienWykonanieRutyny(wpis, zdarzenie.target.checked, zalogowanyUzytkownik); daneRutyn.odswiez(); ustawBlad('') }
        catch (wyjatek) { ustawBlad(wyjatek instanceof Error ? wyjatek.message : 'Nie udało się zmienić rutyny.') }
      }} />{wpis.godzina && <span>{wpis.godzina}</span>}{wpis.tytul}</label>
      <button type="button" aria-label={'Szczegóły rutyny: ' + wpis.tytul} onClick={() => otworz(wpis.rutynaId)}>Szczegóły</button>
    </div>
  }
  return <>
    {(blad || daneRutyn.blad) && <p role="alert">{blad || daneRutyn.blad}</p>}
    <div className="pulpit-rutyny-godzinowe">{wystapienia.filter((wpis) => wpis.godzina).map((wpis) => {
      const pozycja = pozycjaGodzinyNaOsi(wpis.godzina!, zakresDniaPracy)
      return <div key={wpis.rutynaId} className="pulpit-rutyna"><span aria-hidden="true" className="pulpit-rutyna__punkt" style={{ left: pozycja + '%' }} /><div style={{ marginLeft: `clamp(0px, calc(${pozycja}% - 150px), calc(100% - 300px))` }}>{kontrolki(wpis)}</div></div>
    })}</div>
    {wystapienia.some((wpis) => !wpis.godzina) && <div className="pulpit-rutyny-bez-godziny"><strong>Rutyny bez godziny</strong>{wystapienia.filter((wpis) => !wpis.godzina).map((wpis) => <div key={wpis.rutynaId}>{kontrolki(wpis)}</div>)}</div>}
  </>
}
