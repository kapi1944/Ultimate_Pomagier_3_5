import PodgladUzytkownika from './PodgladUzytkownika'
import PanelResetowaniaHasel, { StatusResetowaniaHasla } from './PanelResetowaniaHasel'
import { czyTrybDemonstracyjny } from '../../aplikacja/logowanie/uwierzytelnianie'
import { useState } from 'react'
import { useKontekstUzytkownika } from '../../aplikacja/logowanie/useKontekstUzytkownika'
import { daneStartoweUzytkownikow } from './daneUzytkownikow'
import { eksportujKopieKont, kluczKopiiUzytkownikow, odczytajBazeUzytkownikow, pobierzHistorieKont, przygotujOdtworzenieKont, pobierzUzytkownikow, przywrocKopieKont, zatwierdzZmianyKont, type ZmianaKonta } from './magazynUzytkownikow'
import { daneDoEksportuKont, eksportujCsvKont, eksportujXlsxKont, kolumnyKont, odczytajPlikKont, porownajImportKont, rozpoznajKolumnyKont, type PoleImportuKonta, type TabelaImportuKont, type WierszImportuKonta } from './importEksportUzytkownikow'
import { metadaneOdznak, odznakiUzytkownikow, organizacjeUzytkownikow, roleUzytkownikow, statusyUzytkownikow, type Uzytkownik } from './typyUzytkownikow'
import AvatarUzytkownika from './komponenty/AvatarUzytkownika'
import OdznakaRoli from './komponenty/OdznakaRoli'

function pobierzPlik(nazwa: string, dane: BlobPart, typ: string) {
  const adres = URL.createObjectURL(new Blob([dane], { type: typ }))
  const odnosnik = document.createElement('a'); odnosnik.href = adres; odnosnik.download = nazwa; odnosnik.click()
  setTimeout(() => URL.revokeObjectURL(adres), 1000)
}
function pokazWartosc(wartosc: unknown) { return wartosc === undefined ? '—' : typeof wartosc === 'string' ? wartosc || '(puste)' : JSON.stringify(wartosc) }
const polaEksportu = (Object.keys(kolumnyKont) as PoleImportuKonta[]).filter((pole) => !['pelnaNazwa', 'wyczysc'].includes(pole))

export default function PanelOperacjiKont({ otworzProfil, poZapisie }: { otworzProfil: (id: string) => void; poZapisie: () => void }) {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const konta = pobierzUzytkownikow()
  const [szukaj, ustawSzukaj] = useState('')
  const [filtrRoli, ustawFiltrRoli] = useState('')
  const [filtrStatusu, ustawFiltrStatusu] = useState('')
  const [filtrOrganizacji, ustawFiltrOrganizacji] = useState('')
  const [sortowanie, ustawSortowanie] = useState<keyof Uzytkownik>('nazwisko')
  const [kierunek, ustawKierunek] = useState(1)
  const [strona, ustawStrone] = useState(0)
  const [zaznaczone, ustawZaznaczone] = useState<string[]>([])
  const [zakresEksportu, ustawZakresEksportu] = useState('filtrowane')
  const [tabela, ustawTabele] = useState<TabelaImportuKont | null>(null)
  const [mapowanie, ustawMapowanie] = useState<(PoleImportuKonta | '')[]>([])
  const [podglad, ustawPodglad] = useState<WierszImportuKonta[] | null>(null)
  const [stanPodgladu, ustawStanPodgladu] = useState('')
  const [dopasowania, ustawDopasowania] = useState<Record<number, string>>({})
  const [komunikat, ustawKomunikat] = useState('')
  const [blad, ustawBlad] = useState('')
  const [czyWczytywanie, ustawCzyWczytywanie] = useState(false)
  const [kopia, ustawKopie] = useState<{ zapis: string; konta: Uzytkownik[]; stan: string } | null>(null)
  const [czyAkceptacjaKopii, ustawCzyAkceptacjaKopii] = useState(false)
  const [rolaZbiorcza, ustawRoleZbiorcza] = useState('')
  const [organizacjaZbiorcza, ustawOrganizacjeZbiorcza] = useState('')
  const [statusZbiorczy, ustawStatusZbiorczy] = useState('')
  const [kolorZbiorczy, ustawKolorZbiorczy] = useState('')
  const [odznakaZbiorcza, ustawOdznakeZbiorcza] = useState('')
  const [czyUsunOdznake, ustawCzyUsunOdznake] = useState(false)
  const filtrowane = konta.filter((konto) => (!filtrRoli || konto.rola === filtrRoli) && (!filtrStatusu || konto.status === filtrStatusu) && (!filtrOrganizacji || konto.organizacja === filtrOrganizacji) && JSON.stringify(konto).toLocaleLowerCase('pl').includes(szukaj.toLocaleLowerCase('pl'))).sort((pierwszy, drugi) => kierunek * String(pierwszy[sortowanie] ?? '').localeCompare(String(drugi[sortowanie] ?? ''), 'pl', { numeric: true }))
  const liczbaStron = Math.max(1, Math.ceil(filtrowane.length / 25))
  const aktualnaStrona = Math.min(strona, liczbaStron - 1)
  const widoczne = filtrowane.slice(aktualnaStrona * 25, (aktualnaStrona + 1) * 25)
  const eksportowane = zakresEksportu === 'wszystkie' ? konta : zakresEksportu === 'zaznaczone' ? konta.filter((konto) => zaznaczone.includes(konto.id)) : filtrowane
  function zglosBlad(blad: unknown) { ustawBlad(blad instanceof Error ? blad.message : String(blad)); ustawKomunikat('') }
  function przygotujTabele(nowa: TabelaImportuKont) { ustawTabele(nowa); ustawMapowanie(rozpoznajKolumnyKont(nowa.naglowki)); ustawPodglad(null); ustawDopasowania({}); ustawBlad(''); ustawKopie(null) }
  async function wczytaj(plik?: File) {
    if (!plik) return
    ustawCzyWczytywanie(true)
    try { przygotujTabele(await odczytajPlikKont(plik)) } catch (blad) { zglosBlad(blad) } finally { ustawCzyWczytywanie(false) }
  }
  function porownaj(wybrane = dopasowania) {
    if (!tabela) return
    try { const aktualne = pobierzUzytkownikow(); ustawPodglad(porownajImportKont(tabela, mapowanie, aktualne, wybrane)); ustawStanPodgladu(JSON.stringify(aktualne)); ustawBlad('') } catch (blad) { zglosBlad(blad) }
  }
  function wybierzZmiany(akceptacja: boolean, numer?: number) {
    ustawPodglad((obecny) => obecny?.map((wiersz) => numer === undefined || wiersz.numer === numer ? { ...wiersz, roznice: wiersz.roznice.map((roznica) => ({ ...roznica, zaakceptowana: akceptacja })) } : wiersz) ?? null)
  }
  function zapisz() {
    const zmiany: ZmianaKonta[] = (podglad ?? []).filter((wiersz) => ['NOWE KONTO', 'AKTUALIZACJA'].includes(wiersz.status) && wiersz.roznice.some((roznica) => roznica.zaakceptowana)).map((wiersz) => ({ id: wiersz.id, nowe: wiersz.nowe, dane: Object.fromEntries(wiersz.roznice.filter((roznica) => roznica.zaakceptowana).map((roznica) => [roznica.pole, roznica.po])) }))
    if (!zmiany.length) { zglosBlad('Wybierz zmiany do zatwierdzenia.'); return }
    const wynik = zatwierdzZmianyKont(zalogowanyUzytkownik, zmiany, stanPodgladu, 'IMPORT_LUB_EDYCJA_ZBIORCZA')
    if (wynik.blad) { zglosBlad(wynik.blad); return }
    ustawKomunikat(`Zapisano ${wynik.liczba} kont. Odrzucone lub błędne wiersze pominięto zgodnie z wyborem. Kopia sprzed operacji jest dostępna w odzyskiwaniu.`)
    ustawBlad(''); ustawPodglad(null); ustawTabele(null); ustawZaznaczone([]); poZapisie()
  }
  function przygotujEdycjeZbiorcza() {
    if (!zaznaczone.length) { zglosBlad('Zaznacz konta.'); return }
    const wybrane = konta.filter((konto) => zaznaczone.includes(konto.id))
    const tabelaZmian = { naglowki: [...polaEksportu], wiersze: wybrane.map((konto) => {
      const dane = daneDoEksportuKont(konto)
      for (const [pole, wartosc] of [['rola', rolaZbiorcza], ['organizacja', organizacjaZbiorcza], ['status', statusZbiorczy], ['kolorProfilu', kolorZbiorczy]]) if (wartosc) dane[polaEksportu.indexOf(pole as PoleImportuKonta)] = wartosc
      if (odznakaZbiorcza) dane[polaEksportu.indexOf('odznaki')] = (czyUsunOdznake ? konto.odznaki.filter((odznaka) => odznaka !== odznakaZbiorcza) : [...new Set([...konto.odznaki, odznakaZbiorcza])]).join(' | ')
      return dane
    }) }
    // Pusta lista odznak wymaga jawnego polecenia czyszczenia.
    if (odznakaZbiorcza && czyUsunOdznake) { tabelaZmian.naglowki.push('wyczysc'); tabelaZmian.wiersze.forEach((wiersz) => wiersz.push(wiersz[polaEksportu.indexOf('odznaki')] ? '' : 'odznaki')) }
    przygotujTabele(tabelaZmian)
    const aktualne = pobierzUzytkownikow()
    ustawPodglad(porownajImportKont(tabelaZmian, rozpoznajKolumnyKont(tabelaZmian.naglowki), aktualne)); ustawStanPodgladu(JSON.stringify(aktualne))
  }
  function wczytajKopie(zapis: string) {
    try { const baza = odczytajBazeUzytkownikow(zapis); const odtworzenie = przygotujOdtworzenieKont(baza, odczytajBazeUzytkownikow(eksportujKopieKont())); if (odtworzenie.blad) throw new Error(odtworzenie.blad); ustawKopie({ zapis, konta: odtworzenie.uzytkownicy, stan: JSON.stringify(pobierzUzytkownikow()) }); ustawCzyAkceptacjaKopii(false); ustawBlad('') } catch (blad) { zglosBlad(blad) }
  }
  const liczbaAkceptacji = podglad?.reduce((suma, wiersz) => suma + wiersz.roznice.filter((roznica) => roznica.zaakceptowana).length, 0) ?? 0
  return <section className="uzytkownicy__lista" aria-label="Zbiorcze zarządzanie użytkownikami">
    <PodgladUzytkownika />
    <h2>Istniejące konta</h2>
    <p>{czyTrybDemonstracyjny ? 'Dane demonstracyjne. Reset rzeczywistych haseł jest niedostępny w DEMO.' : 'Konta z lokalnej, zaufanej bazy. Brak automatycznej synchronizacji między komputerami.'}</p>
    {komunikat && <p role="status">{komunikat}</p>}{blad && <p role="alert" className="uzytkownicy__blad">{blad}</p>}
    <div className="uzytkownicy__narzedzia">
      <label>Szukaj<input type="search" value={szukaj} onChange={(zdarzenie) => { ustawSzukaj(zdarzenie.target.value); ustawStrone(0) }} /></label>
      <label>Filtr roli<select aria-label="Filtr roli" value={filtrRoli} onChange={(zdarzenie) => { ustawFiltrRoli(zdarzenie.target.value); ustawStrone(0) }}><option value="">Wszystkie role</option>{roleUzytkownikow.map((rola) => <option key={rola}>{rola}</option>)}</select></label>
      <label>Filtr statusu<select aria-label="Filtr statusu" value={filtrStatusu} onChange={(zdarzenie) => { ustawFiltrStatusu(zdarzenie.target.value); ustawStrone(0) }}><option value="">Wszystkie statusy</option>{statusyUzytkownikow.map((status) => <option key={status}>{status}</option>)}</select></label>
      <label>Filtr organizacji<select aria-label="Filtr organizacji" value={filtrOrganizacji} onChange={(zdarzenie) => { ustawFiltrOrganizacji(zdarzenie.target.value); ustawStrone(0) }}><option value="">Wszystkie organizacje</option>{organizacjeUzytkownikow.map((organizacja) => <option key={organizacja}>{organizacja}</option>)}</select></label>
    </div>
    <p>Wyniki: {filtrowane.length} · Zaznaczone: {zaznaczone.length} (także poza filtrem)</p>
    <PanelResetowaniaHasel konta={konta.filter((konto) => zaznaczone.includes(konto.id))} zbiorczy poZmianie={poZapisie} />
    <div className="uzytkownicy__tabela" role="region" aria-label="Tabela kont" tabIndex={0}><table><thead><tr><th><input type="checkbox" aria-label="Zaznacz stronę" checked={widoczne.length > 0 && widoczne.every((konto) => zaznaczone.includes(konto.id))} onChange={(zdarzenie) => ustawZaznaczone(zdarzenie.target.checked ? [...new Set([...zaznaczone, ...widoczne.map((konto) => konto.id)])] : zaznaczone.filter((id) => !widoczne.some((konto) => konto.id === id)))} /></th>{[['nazwisko', 'Użytkownik'], ['pseudonim', 'Pseudonim'], ['login', 'Login'], ['email', 'E-mail'], ['organizacja', 'Organizacja'], ['rola', 'Rola'], ['status', 'Status'], ['odznaki', 'Odznaki'], ['ostatnieLogowanie', 'Ostatnie logowanie']].map(([pole, nazwa]) => <th key={pole} aria-sort={sortowanie === pole ? kierunek === 1 ? 'ascending' : 'descending' : 'none'}><button type="button" onClick={() => { ustawSortowanie(pole as keyof Uzytkownik); ustawKierunek(sortowanie === pole ? -kierunek : 1) }}>{nazwa}{sortowanie === pole && <span aria-hidden="true">{kierunek === 1 ? ' ↑' : ' ↓'}</span>}</button></th>)}<th>Działania</th></tr></thead><tbody>{widoczne.map((konto) => <tr key={konto.id}><td><input type="checkbox" aria-label={`Zaznacz ${konto.imie} ${konto.nazwisko}`} checked={zaznaczone.includes(konto.id)} onChange={(zdarzenie) => ustawZaznaczone(zdarzenie.target.checked ? [...zaznaczone, konto.id] : zaznaczone.filter((id) => id !== konto.id))} /></td><td><AvatarUzytkownika uzytkownik={konto} />{konto.imie} {konto.nazwisko}</td><td>{konto.pseudonim}</td><td>{konto.login}</td><td>{konto.email}</td><td>{konto.organizacja}</td><td><OdznakaRoli rola={konto.rola} kompaktowa /></td><td>{konto.status}<br /><StatusResetowaniaHasla konto={konto} /></td><td>{konto.odznaki.map((odznaka) => metadaneOdznak[odznaka].etykieta).join(', ')}</td><td>{konto.ostatnieLogowanie ? new Date(konto.ostatnieLogowanie).toLocaleString('pl') : 'Brak'}</td><td><button type="button" onClick={() => otworzProfil(konto.id)}>Otwórz profil</button></td></tr>)}</tbody></table></div>
    {!filtrowane.length && <p>Brak pasujących kont.</p>}
    <nav aria-label="Strony użytkowników"><button type="button" disabled={aktualnaStrona === 0} onClick={() => ustawStrone(aktualnaStrona - 1)}>Poprzednia</button> Strona {aktualnaStrona + 1} z {liczbaStron} <button type="button" disabled={aktualnaStrona + 1 >= liczbaStron} onClick={() => ustawStrone(aktualnaStrona + 1)}>Następna</button></nav>
    <fieldset><legend>Edycja zaznaczonych kont — {zaznaczone.length}</legend>
      <label>Rola zbiorcza<select aria-label="Rola zbiorcza" value={rolaZbiorcza} onChange={(zdarzenie) => ustawRoleZbiorcza(zdarzenie.target.value)}><option value="">Bez zmian</option>{roleUzytkownikow.filter((rola) => rola !== 'ARCHITEKT').map((rola) => <option key={rola}>{rola}</option>)}</select></label>
      <label>Organizacja zbiorcza<select aria-label="Organizacja zbiorcza" value={organizacjaZbiorcza} onChange={(zdarzenie) => ustawOrganizacjeZbiorcza(zdarzenie.target.value)}><option value="">Bez zmian</option>{organizacjeUzytkownikow.map((organizacja) => <option key={organizacja}>{organizacja}</option>)}</select></label>
      <label>Status zbiorczy<select aria-label="Status zbiorczy" value={statusZbiorczy} onChange={(zdarzenie) => ustawStatusZbiorczy(zdarzenie.target.value)}><option value="">Bez zmian</option>{statusyUzytkownikow.map((status) => <option key={status}>{status}</option>)}</select></label>
      <label>Kolor zbiorczy<input placeholder="#RRGGBB lub puste" value={kolorZbiorczy} onChange={(zdarzenie) => ustawKolorZbiorczy(zdarzenie.target.value)} /></label>
      <label>Odznaka zbiorcza<select aria-label="Odznaka zbiorcza" value={odznakaZbiorcza} onChange={(zdarzenie) => ustawOdznakeZbiorcza(zdarzenie.target.value)}><option value="">Bez zmian</option>{odznakiUzytkownikow.map((odznaka) => <option key={odznaka}>{odznaka}</option>)}</select></label>
      <label><input type="checkbox" checked={czyUsunOdznake} onChange={(zdarzenie) => ustawCzyUsunOdznake(zdarzenie.target.checked)} />Usuń wskazaną odznakę</label><button type="button" onClick={przygotujEdycjeZbiorcza}>Podgląd zmian zbiorczych</button>
    </fieldset>
    <fieldset><legend>Eksport</legend><label>Zakres<select aria-label="Zakres" value={zakresEksportu} onChange={(zdarzenie) => ustawZakresEksportu(zdarzenie.target.value)}><option value="filtrowane">Filtrowany zestaw ({filtrowane.length})</option><option value="zaznaczone">Zaznaczone ({zaznaczone.length})</option><option value="wszystkie">Wszystkie konta ({konta.length})</option></select></label><button type="button" disabled={!eksportowane.length} onClick={() => pobierzPlik('uzytkownicy.csv', eksportujCsvKont(eksportowane), 'text/csv;charset=utf-8')}>Eksport CSV</button><button type="button" disabled={!eksportowane.length} onClick={async () => { try { pobierzPlik('uzytkownicy.xlsx', await eksportujXlsxKont(eksportowane), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') } catch (blad) { zglosBlad(blad) } }}>Eksport XLSX</button><button type="button" onClick={() => pobierzPlik('kopia-uzytkownikow.json', eksportujKopieKont(), 'application/json')}>Pełna kopia JSON z historią</button></fieldset>
    <section className="uzytkownicy__import" aria-label="Importuj użytkowników" onDragOver={(zdarzenie) => zdarzenie.preventDefault()} onDrop={(zdarzenie) => { zdarzenie.preventDefault(); void wczytaj(zdarzenie.dataTransfer.files[0]) }}>
      <h2>Importuj użytkowników</h2><h3>Krok 1 — Wczytaj plik</h3><p>Przeciągnij XLSX lub CSV UTF-8 tutaj. JSON przywracaj poniżej.</p><label>Plik użytkowników<input disabled={czyWczytywanie} type="file" accept=".xlsx,.csv" onChange={(zdarzenie) => { void wczytaj(zdarzenie.target.files?.[0]); zdarzenie.target.value = '' }} /></label>{czyWczytywanie && <p role="status">Odczytywanie pliku…</p>}
      <button type="button" onClick={() => {
        const startowe = daneStartoweUzytkownikow.map((konto) => konto.id === 'administrator-kacper-madej' && konta.find((obecny) => obecny.id === konto.id)?.login === 'kacper.madej' ? { ...konto, login: 'k.madej' } : konto)
        przygotujTabele({ naglowki: polaEksportu, wiersze: startowe.map(daneDoEksportuKont) })
      }}>Porównaj dane startowe i propozycję loginu Kacpra</button>
      <p>Puste komórki zachowują dane. Świadome usuwanie: kolumna „Wyczyść pola”, np. telefony | pseudonim. Daty, wersja uprawnień i uwierzytelnianie są tylko informacyjne. Formuły XLSX są odrzucane.</p>
      {tabela && <><h3>Krok 2 — Rozpoznaj kolumny</h3><div className="uzytkownicy__narzedzia">{tabela.naglowki.map((naglowek, indeks) => <label key={indeks}>{naglowek || `Kolumna ${indeks + 1}`}<select value={mapowanie[indeks]} onChange={(zdarzenie) => { ustawMapowanie(mapowanie.map((pole, kolumna) => kolumna === indeks ? zdarzenie.target.value as PoleImportuKonta : pole)); ustawPodglad(null) }}><option value="">Pomiń — nierozpoznana lub zbędna</option>{Object.entries(kolumnyKont).map(([pole, nazwa]) => <option key={pole} value={pole}>{nazwa}</option>)}</select></label>)}</div>
      <details><summary>Korekta danych w tabeli przed porównaniem ({tabela.wiersze.length} wierszy)</summary><p>Popraw błędy w komórkach, potem porównaj ponownie.</p><div className="uzytkownicy__tabela" tabIndex={0}><table><thead><tr>{tabela.naglowki.map((naglowek, indeks) => <th key={indeks}>{naglowek}</th>)}</tr></thead><tbody>{tabela.wiersze.slice(0, 100).map((wiersz, indeks) => <tr key={indeks}>{tabela.naglowki.map((naglowek, kolumna) => <td key={kolumna}><input aria-label={`${naglowek}, wiersz ${indeks + 2}`} value={wiersz[kolumna] ?? ''} onChange={(zdarzenie) => { ustawTabele({ ...tabela, wiersze: tabela.wiersze.map((obecny, numer) => numer === indeks ? tabela.naglowki.map((_, pole) => pole === kolumna ? zdarzenie.target.value : obecny[pole] ?? '') : obecny) }); ustawPodglad(null) }} /></td>)}</tr>)}</tbody></table></div>{tabela.wiersze.length > 100 && <p>Korekta w aplikacji obejmuje pierwsze 100 wierszy. Pozostałe popraw w pliku źródłowym.</p>}</details>
      <h3>Krok 3 — Porównaj dane</h3><button type="button" onClick={() => porownaj()}>Porównaj dane</button><button type="button" onClick={() => { ustawTabele(null); ustawPodglad(null); ustawKomunikat('Anulowano import. Nie zmieniono kont.'); ustawBlad('') }}>Anuluj import</button></>}
      {podglad && <><h3>Krok 4 — Podgląd różnic</h3><p>Każda zmiana wymaga zaznaczenia. Akceptacja grupy dotyczy całego konta. Nowe konta wymagają wszystkich pól obowiązkowych.</p><div className="uzytkownicy__akcje"><button type="button" onClick={() => wybierzZmiany(true)}>Akceptuj wszystkie poprawne zmiany</button><button type="button" onClick={() => wybierzZmiany(false)}>Odrzuć wszystkie zmiany</button><button type="button" onClick={() => pobierzPlik('raport-importu.csv', '\uFEFF"Wiersz";"Status";"Komunikat"\r\n' + podglad.map((wiersz) => [wiersz.numer, wiersz.status, wiersz.bledy.join(' ')].map((wartosc) => `"${String(wartosc).replace(/"/g, '""')}"`).join(';')).join('\r\n'), 'text/csv;charset=utf-8')}>Raport porównania</button></div>
        {podglad.map((wiersz) => <section key={wiersz.numer} className="uzytkownicy__karta"><h4>Wiersz {wiersz.numer}: {wiersz.nazwa} — {wiersz.status}</h4>{wiersz.bledy.map((blad, indeks) => <p key={indeks}>{blad}</p>)}{wiersz.status === 'KONFLIKT' && <label>Potwierdź tożsamość<select value={dopasowania[wiersz.numer] ?? ''} onChange={(zdarzenie) => { const nowe = { ...dopasowania, [wiersz.numer]: zdarzenie.target.value }; ustawDopasowania(nowe); porownaj(nowe) }}><option value="">Wybierz świadomie</option>{wiersz.propozycje.map((id) => { const konto = konta.find((konto) => konto.id === id)!; return <option key={id} value={id}>{konto.imie} {konto.nazwisko} · {konto.login} · {konto.email}</option> })}<option value="__nowe__">Utwórz osobne konto (tylko gdy brak kolizji)</option></select></label>}
          {wiersz.roznice.length > 0 && <><button type="button" onClick={() => wybierzZmiany(true, wiersz.numer)}>Akceptuj konto</button><button type="button" onClick={() => wybierzZmiany(false, wiersz.numer)}>Odrzuć konto</button><div className="uzytkownicy__tabela" tabIndex={0}><table><thead><tr><th>Pole</th><th>Obecna wartość</th><th>Nowa wartość</th><th>Decyzja</th></tr></thead><tbody>{wiersz.roznice.map((roznica) => <tr key={roznica.pole}><th>{kolumnyKont[roznica.pole as PoleImportuKonta] ?? roznica.pole}</th><td>{pokazWartosc(roznica.przed)}</td><td>{pokazWartosc(roznica.po)}</td><td><label><input type="checkbox" checked={roznica.zaakceptowana} onChange={(zdarzenie) => ustawPodglad(podglad.map((obecny) => obecny.numer === wiersz.numer ? { ...obecny, roznice: obecny.roznice.map((zmiana) => zmiana.pole === roznica.pole ? { ...zmiana, zaakceptowana: zdarzenie.target.checked } : zmiana) } : obecny))} />{roznica.zaakceptowana ? 'Zaakceptowana' : 'Do zatwierdzenia'}</label></td></tr>)}</tbody></table></div></>}
        </section>)}<h3>Krok 5 — Zapis</h3><p>Zaakceptowane pola: {liczbaAkceptacji}. Zapis jest atomowy; błąd walidacji wycofuje całą operację.</p><button type="button" disabled={!liczbaAkceptacji} onClick={zapisz}>Zapisz zaakceptowane zmiany</button></>}
    </section>
    <details><summary>Kopie zapasowe i odzyskiwanie</summary><p>Przywracanie wymaga Architekta. Kopia musi zawierać wszystkie wcześniejsze ID. Konta utworzone po kopii pozostają z tym samym ID jako nieaktywne. Historia jest scalana; wersje uprawnień unieważniają wcześniejsze sesje.</p><label>Kopia JSON<input type="file" accept=".json" onChange={async (zdarzenie) => { const plik = zdarzenie.target.files?.[0]; if (!plik) return; try { if (plik.size > 5 * 1024 * 1024) throw new Error('Kopia przekracza 5 MB.'); wczytajKopie(await plik.text()) } catch (blad) { zglosBlad(blad) } zdarzenie.target.value = '' }} /></label><button type="button" onClick={() => { const zapis = localStorage.getItem(kluczKopiiUzytkownikow); if (zapis) wczytajKopie(zapis); else zglosBlad('Brak lokalnej kopii sprzed operacji.') }}>Podgląd stanu sprzed ostatniej operacji</button>{kopia && <><p>Do przywrócenia: {kopia.konta.length} kont.</p><div className="uzytkownicy__tabela" tabIndex={0}><table><thead><tr><th>Konto</th><th>Pole</th><th>Obecnie</th><th>Z kopii</th></tr></thead><tbody>{kopia.konta.flatMap((konto) => { const obecny = konta.find((obecny) => obecny.id === konto.id); return (Object.keys(konto) as (keyof Uzytkownik)[]).filter((pole) => JSON.stringify(obecny?.[pole]) !== JSON.stringify(konto[pole])).map((pole) => <tr key={`${konto.id}-${pole}`}><td>{konto.imie} {konto.nazwisko}</td><th>{pole}</th><td>{pokazWartosc(obecny?.[pole])}</td><td>{pokazWartosc(konto[pole])}</td></tr>) })}</tbody></table></div><label><input type="checkbox" checked={czyAkceptacjaKopii} onChange={(zdarzenie) => ustawCzyAkceptacjaKopii(zdarzenie.target.checked)} />Akceptuję przywrócenie pokazanych danych i unieważnienie sesji</label><button type="button" disabled={!czyAkceptacjaKopii} onClick={() => { const wynik = przywrocKopieKont(zalogowanyUzytkownik, kopia.zapis, kopia.stan); if (wynik.blad) zglosBlad(wynik.blad); else { ustawKomunikat(`Przywrócono ${wynik.liczba} kont.`); ustawKopie(null); poZapisie() } }}>Przywróć kopię</button><button type="button" onClick={() => ustawKopie(null)}>Anuluj przywracanie</button></>}</details>
    <details><summary>Historia zmian kont</summary><div className="uzytkownicy__tabela" tabIndex={0}><table><thead><tr><th>Czas</th><th>Wykonujący</th><th>Konto</th><th>Operacja</th><th>Pola</th><th>Wynik</th></tr></thead><tbody>{pobierzHistorieKont().slice().reverse().map((wpis, indeks) => <tr key={indeks}><td>{wpis.czas}</td><td>{wpis.wykonujacyId}</td><td>{wpis.uzytkownikId}</td><td>{wpis.operacja}</td><td>{wpis.pola.join(', ')}</td><td>{wpis.wynik}</td></tr>)}</tbody></table></div></details>
  </section>
}
