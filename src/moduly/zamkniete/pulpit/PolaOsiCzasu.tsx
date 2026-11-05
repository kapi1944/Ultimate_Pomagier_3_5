import { walidujOsCzasu, type KonfiguracjaOsiCzasu, type ZakresDniaPracy } from './logika/czasDnia'
import './polaOsiCzasu.css'

export default function PolaOsiCzasu({ wartosc, zmien, praca }: { wartosc: KonfiguracjaOsiCzasu; zmien: (os: KonfiguracjaOsiCzasu) => void; praca: Pick<ZakresDniaPracy, 'poczatek' | 'koniec'> }) {
  const bledy = walidujOsCzasu(wartosc, praca)
  return <div className="pola-osi-czasu">
    <fieldset><legend>Zakres wyświetlania</legend><div className="pola-osi-czasu__wiersz">
      <label>Godzina od<input type="time" value={wartosc.poczatek} onChange={(zdarzenie) => zmien({ ...wartosc, poczatek: zdarzenie.target.value })} /></label>
      <label>Godzina do<input type="time" value={wartosc.koniec} onChange={(zdarzenie) => zmien({ ...wartosc, koniec: zdarzenie.target.value })} /></label>
    </div></fieldset>
    <label>Skala poza pracą: <output>{wartosc.skalaPozaPraca}%</output><input type="range" min="10" max="100" step="5" value={wartosc.skalaPozaPraca} aria-valuetext={wartosc.skalaPozaPraca + '%'} onChange={(zdarzenie) => zmien({ ...wartosc, skalaPozaPraca: Number(zdarzenie.target.value) })} /></label>
    <p>Niższa wartość skraca wizualnie czas poza pracą. Czas pracy zachowuje pełną skalę; terminy pozostają bez zmian.</p>
    <p>Początek pracy: {praca.poczatek}. Koniec pracy: {praca.koniec}. Zakres osi musi obejmować cały przedział pracy.</p>
    {bledy.length > 0 && <div role="alert">{bledy.map((blad) => <p key={blad}>{blad}</p>)}</div>}
  </div>
}
