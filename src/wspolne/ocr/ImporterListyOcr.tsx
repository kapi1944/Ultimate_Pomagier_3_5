import { useEffect, useRef, useState } from 'react'
import { OknoDialogowe, Przycisk } from '../komponenty/ElementyInterfejsu'
import { RegulacjaSzerokosci } from '../komponenty/RegulacjaSzerokosci'
import { repozytoriumWspolnychDokumentow } from '../dokumenty/rejestrDokumentow'
import { useKontekstUzytkownika } from '../../aplikacja/logowanie/useKontekstUzytkownika'
import { czyPoprawnySzkicOcr, csvTabeliOcr, tekstTabeliOcr, xlsxTabeliOcr } from './eksportTabeliOcr'
import { importujDokumentOcr } from './importDokumentuOcr'
import { pobierzUczestnikowOcr, type ObszarOcr, type TabelaOcr, type UczestnikOcr } from './modelTabeliOcr'
import './importerListyOcr.css'

type Wlasciwosci = { kontekst: string; obecneNazwy: string[]; zastosuj: (osoby: UczestnikOcr[]) => void; zamknij: () => void; opisZastosowania?: string }

export default function ImporterListyOcr({ kontekst, obecneNazwy, zastosuj, zamknij, opisZastosowania }: Wlasciwosci) {
  const { zalogowanyUzytkownik } = useKontekstUzytkownika()
  const identyfikatorSzkicu = `ocr-listy:${zalogowanyUzytkownik?.id ?? 'brak'}:${kontekst}`
  const [poczatkowyStanSzkicu] = useState(() => {
    try { return { dostepny: Boolean(repozytoriumWspolnychDokumentow.pobierzAutosave(identyfikatorSzkicu)), blad: '' } }
    catch { return { dostepny: false, blad: 'Nie udało się odczytać kopii roboczej OCR. Oryginalne dane zachowano.' } }
  })
  const [plik, ustawPlik] = useState<File | null>(null)
  const [tabele, ustawTabele] = useState<TabelaOcr[]>([])
  const [podglady, ustawPodglady] = useState<string[]>([])
  const [strona, ustawStrone] = useState(0)
  const [obrot, ustawObrot] = useState(0)
  const [powiekszenie, ustawPowiekszenie] = useState(100)
  const [odreczna, ustawOdreczna] = useState(false)
  const [binarnie, ustawBinarnie] = useState(false)
  const [podpisyOd, ustawPodpisyOd] = useState(70)
  const [podpisyPotwierdzone, ustawPodpisyPotwierdzone] = useState(false)
  const [podgladWybranego, ustawPodgladWybranego] = useState('')
  const adresWybranego = useRef('')
  const [tryb, ustawTryb] = useState<'tekst' | 'tabela'>('tabela')
  const [postep, ustawPostep] = useState(0)
  const [komunikat, ustawKomunikat] = useState(poczatkowyStanSzkicu.blad)
  const [czyTrwa, ustawCzyTrwa] = useState(false)
  const [czyPonownie, ustawCzyPonownie] = useState(false)
  const [czyZatwierdzone, ustawCzyZatwierdzone] = useState(false)
  const [obszar, ustawObszar] = useState<ObszarOcr | null>(null)
  const [szkicDostepny, ustawSzkicDostepny] = useState(poczatkowyStanSzkicu.dostepny)
  const kontroler = useRef<AbortController | null>(null)
  const adresy = useRef<string[]>([])
  const plikWejscia = useRef<HTMLInputElement>(null)
  const [wymiary, ustawWymiary] = useState({ szerokosc: 1, wysokosc: 1 })
  useEffect(() => {
    return () => { kontroler.current?.abort(); adresy.current.forEach((adres) => URL.revokeObjectURL(adres)); if (adresWybranego.current) URL.revokeObjectURL(adresWybranego.current) }
  }, [identyfikatorSzkicu])

  function zmienTabele(aktualizacja: (tabela: TabelaOcr) => TabelaOcr) {
    ustawTabele((obecne) => obecne.map((tabela, indeks) => indeks === strona ? aktualizacja(tabela) : tabela))
    ustawCzyZatwierdzone(false)
  }
  function wybierzPlik(nowy: File) {
    if (adresWybranego.current) URL.revokeObjectURL(adresWybranego.current)
    adresWybranego.current = URL.createObjectURL(nowy); ustawPodgladWybranego(adresWybranego.current)
    ustawPlik(nowy); ustawCzyPonownie(false); ustawPodpisyPotwierdzone(false); ustawKomunikat(`Wybrano ${nowy.name}. Ustaw obrót i obszar podpisów, następnie rozpocznij analizę. Poprzednie wyniki pozostają zachowane.`)
  }
  async function analizuj() {
    if (!plik || czyTrwa || tabele.length > 0 && !czyPonownie) return
    const zadanie = new AbortController(); kontroler.current = zadanie
    ustawCzyTrwa(true); ustawKomunikat('Przygotowywanie dokumentu…'); ustawPostep(0)
    try {
      const wynik = await importujDokumentOcr(plik, { sygnal: zadanie.signal, postep: (opis, procent) => { ustawKomunikat(opis); ustawPostep(procent) }, obrot, odreczna, binarnie, podpisyOd, podpisyPotwierdzone })
      zadanie.signal.throwIfAborted()
      adresy.current.forEach((adres) => URL.revokeObjectURL(adres))
      adresy.current = wynik.map((strona) => URL.createObjectURL(strona.podglad))
      ustawPodglady(adresy.current); ustawTabele(wynik.map((strona) => strona.tabela)); ustawStrone(0); ustawObszar(null); ustawCzyZatwierdzone(false); ustawCzyPonownie(false)
      ustawKomunikat('Odczyt zakończony. Sprawdź nagłówki, wiersze i polskie znaki. Podpisy pozostały grafiką. Dane nie zostały jeszcze przeniesione do formularza.')
    } catch (blad) {
      ustawKomunikat(zadanie.signal.aborted ? 'Anulowano. Poprzednie wyniki i poprawki zachowano.' : blad instanceof Error ? blad.message : 'Nie udało się odczytać pliku. Poprzednie wyniki zachowano.')
    } finally { ustawCzyTrwa(false); kontroler.current = null }
  }
  async function kopiuj(tekst: string) {
    try { await navigator.clipboard.writeText(tekst); ustawKomunikat('Skopiowano wynik do schowka.') }
    catch { ustawKomunikat('Brak dostępu do schowka. Zaznacz tekst w widoku Tekst i użyj Ctrl+C.') }
  }
  async function eksportuj(typ: 'csv' | 'xlsx') {
    try {
      const dane = typ === 'csv' ? csvTabeliOcr(tabele) : await xlsxTabeliOcr(tabele)
      const adres = URL.createObjectURL(new Blob([dane], { type: typ === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const odnosnik = document.createElement('a'); odnosnik.href = adres; odnosnik.download = `lista-ocr.${typ}`; odnosnik.click(); setTimeout(() => URL.revokeObjectURL(adres), 10000)
    } catch { ustawKomunikat('Nie udało się wyeksportować tabeli. Wyniki pozostają w edytorze.') }
  }
  function zapiszSzkic() {
    try { repozytoriumWspolnychDokumentow.zapiszAutosave({ id: identyfikatorSzkicu, generatorId: 'ocr-listy-obecnosci', dokumentId: null, dane: { wersja: 1, tabele } }); ustawSzkicDostepny(true); ustawKomunikat('Zapisano wynik roboczy w istniejącym rejestrze. Skany nie są zapisywane.') }
    catch { ustawKomunikat('Nie udało się zapisać wyniku roboczego. Nie zamykaj okna przed skopiowaniem lub eksportem danych.') }
  }
  function przywrocSzkic() {
    try {
      const dane = repozytoriumWspolnychDokumentow.pobierzAutosave(identyfikatorSzkicu)?.dane
      if (!czyPoprawnySzkicOcr(dane)) throw new Error('Nieobsługiwana lub uszkodzona kopia OCR. Zachowano istniejące dane.')
      ustawTabele(dane.tabele); ustawStrone(0); ustawPodglady([]); ustawCzyZatwierdzone(false); ustawKomunikat('Przywrócono wyniki i weryfikację komórek. Podgląd oryginału wymaga ponownego wybrania pliku; ponowna analiza zastąpi wyniki dopiero po zgodzie.')
    } catch (blad) { ustawKomunikat(blad instanceof Error ? blad.message : 'Nie udało się przywrócić kopii OCR.') }
  }
  const tabela = tabele[strona]
  let osoby: UczestnikOcr[] = []
  let bladImportu = ''
  try { osoby = pobierzUczestnikowOcr(tabele) } catch (blad) { bladImportu = blad instanceof Error ? blad.message : 'Sprawdź dane.' }
  const znane = new Set(obecneNazwy.map((nazwa) => nazwa.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl')))
  const duplikaty = osoby.filter((osoba, indeks) => znane.has(osoba.imieINazwisko.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl')) || osoby.slice(0, indeks).some((poprzednia) => poprzednia.imieINazwisko.toLocaleLowerCase('pl') === osoba.imieINazwisko.toLocaleLowerCase('pl'))).length

  return <OknoDialogowe otwarty zamknij={() => { kontroler.current?.abort(); zamknij() }} tytul="Importuj listę ze skanu (OCR)">
    <div className="importer-ocr" onDragOver={(zdarzenie) => zdarzenie.preventDefault()} onDrop={(zdarzenie) => { zdarzenie.preventDefault(); if (!czyTrwa && zdarzenie.dataTransfer.files[0]) wybierzPlik(zdarzenie.dataTransfer.files[0]) }} onPaste={(zdarzenie) => {
      if (czyTrwa) return
      const obraz = [...zdarzenie.clipboardData.items].find((element) => element.type.startsWith('image/'))?.getAsFile()
      if (obraz) { zdarzenie.preventDefault(); wybierzPlik(new File([obraz], 'schowek.png', { type: obraz.type })) }
    }}>
      <p>Przetwarzanie lokalne, bez zewnętrznych API. Wybierz plik, przeciągnij go tutaj lub wklej obraz przez Ctrl+V. Pismo odręczne i nieczytelne fragmenty wymagają ręcznej weryfikacji. Podpisy nie stanowią dowodu obecności.</p>
      {plik && podgladWybranego && <details><summary>Wybrany oryginał przed analizą: {plik.name}</summary>{/\.pdf$/i.test(plik.name) ? <a href={podgladWybranego} target="_blank" rel="noreferrer">Otwórz oryginalny PDF lokalnie</a> : <img src={podgladWybranego} alt="Wybrany obraz przed OCR" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }} />}</details>}
      <div className="importer-ocr__akcje">
        <input ref={plikWejscia} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" hidden disabled={czyTrwa} onChange={(zdarzenie) => { if (zdarzenie.target.files?.[0]) wybierzPlik(zdarzenie.target.files[0]); zdarzenie.target.value = '' }} />
        <Przycisk disabled={czyTrwa} onClick={() => plikWejscia.current?.click()}>Wybierz dokument lub zdjęcie</Przycisk>
        <label>Obrót przed analizą<select value={obrot} disabled={czyTrwa} onChange={(zdarzenie) => ustawObrot(Number(zdarzenie.target.value))}>{[0, 90, 180, 270].map((wartosc) => <option key={wartosc} value={wartosc}>{wartosc}°</option>)}</select></label>
        <label><input type="checkbox" checked={odreczna} disabled={czyTrwa} onChange={(zdarzenie) => ustawOdreczna(zdarzenie.target.checked)} /> Pismo odręczne — obniż pewność</label>
        <label><input type="checkbox" checked={binarnie} disabled={czyTrwa} onChange={(zdarzenie) => ustawBinarnie(zdarzenie.target.checked)} /> Wzmocnij kontrast (binarne)</label>
        <label>Podpisy od (% szerokości, gdy brak pewnej siatki)<input type="number" min={0} max={100} value={podpisyOd} disabled={czyTrwa} onChange={(zdarzenie) => ustawPodpisyOd(Math.min(100, Math.max(0, Number(zdarzenie.target.value))))} /></label>
      </div>
      <label><input type="checkbox" checked={podpisyPotwierdzone} disabled={czyTrwa} onChange={(zdarzenie) => ustawPodpisyPotwierdzone(zdarzenie.target.checked)} /> Sprawdziłem obszar podpisów na oryginale: przy braku automatycznego rozpoznania podpisy są wyłącznie na prawo od podanej granicy (100% oznacza brak podpisów).</label>
      {tabele.length > 0 && <label><input type="checkbox" checked={czyPonownie} disabled={czyTrwa} onChange={(zdarzenie) => ustawCzyPonownie(zdarzenie.target.checked)} /> Zezwalam na zastąpienie bieżącego wyniku i ręcznych poprawek ponowną analizą lub odtworzeniem kopii.</label>}
      <div className="importer-ocr__akcje"><Przycisk disabled={!plik || czyTrwa || tabele.length > 0 && !czyPonownie} onClick={() => void analizuj()}>Rozpocznij analizę</Przycisk>{czyTrwa && <Przycisk onClick={() => kontroler.current?.abort()}>Anuluj przetwarzanie</Przycisk>}{szkicDostepny && <Przycisk disabled={czyTrwa || tabele.length > 0 && !czyPonownie} onClick={przywrocSzkic}>Przywróć wynik roboczy</Przycisk>}</div>
      {czyTrwa && <progress aria-label="Postęp OCR" max={100} value={postep} />}
      <p role="status">{komunikat}</p>
      {tabela && <>
        <div className="importer-ocr__akcje"><label>Strona<select value={strona} onChange={(zdarzenie) => { ustawStrone(Number(zdarzenie.target.value)); ustawObszar(null) }}>{tabele.map((tabela, indeks) => <option key={tabela.id} value={indeks}>Strona {tabela.strona}</option>)}</select></label><label>Powiększenie podglądu<input type="range" min={50} max={200} step={10} value={powiekszenie} onChange={(zdarzenie) => ustawPowiekszenie(Number(zdarzenie.target.value))} /></label></div>
        <div className="importer-ocr__panele">
          <section className="importer-ocr__oryginal" aria-label="Dokument źródłowy"><h3>Dokument źródłowy</h3><p>{tabela.informacje}</p><div className="importer-ocr__obraz-kontener"><div style={{ width: `${powiekszenie}%`, position: 'relative' }}>
            {podglady[strona] ? <><img src={podglady[strona]} onLoad={(zdarzenie) => ustawWymiary({ szerokosc: zdarzenie.currentTarget.naturalWidth, wysokosc: zdarzenie.currentTarget.naturalHeight })} alt={`Oryginał strony ${tabela.strona}`} />{obszar && <span className="importer-ocr__zaznaczenie" style={{ left: `${obszar.x / wymiary.szerokosc * 100}%`, top: `${obszar.y / wymiary.wysokosc * 100}%`, width: `${obszar.szerokosc / wymiary.szerokosc * 100}%`, height: `${obszar.wysokosc / wymiary.wysokosc * 100}%` }} />}</> : <p>Podgląd dostępny po analizie oryginalnego pliku.</p>}
          </div></div></section>
          <RegulacjaSzerokosci panel=".importer-ocr__oryginal" obszar=".importer-ocr__panele" zmienna="--szerokosc-oryginalu" strona="prawa" minimum={240} maksimum={900} />
          <section className="importer-ocr__wynik" aria-label="Wynik rozpoznawania"><h3>Wynik rozpoznawania</h3>
            <div className="importer-ocr__akcje"><Przycisk aria-pressed={tryb === 'tabela'} onClick={() => ustawTryb('tabela')}>Tabela</Przycisk><Przycisk aria-pressed={tryb === 'tekst'} onClick={() => ustawTryb('tekst')}>Tekst</Przycisk></div>
            <p>Zielony: zweryfikowano lub pewność ≥ 85%. Żółty: wymaga sprawdzenia. Czerwony: brak odczytu. Import wymaga zatwierdzenia danych osób niezależnie od koloru.</p>
            {tryb === 'tekst' ? <label>Edytowalny tekst tabeli<textarea rows={18} value={tekstTabeliOcr([tabela])} onChange={(zdarzenie) => {
              const [naglowki, ...wiersze] = zdarzenie.target.value.split('\n').map((wiersz) => wiersz.split('\t'))
              zmienTabele((obecna) => ({ ...obecna, naglowki, zaznaczone: [], wiersze: wiersze.map((wiersz) => naglowki.map((_, indeks) => ({ tekst: wiersz[indeks] ?? '', pewnosc: 0, zweryfikowana: false, podpis: /podpis/i.test(naglowki[indeks]) }))) }))
            }} /></label> : <div className="importer-ocr__przewijanie"><table><thead><tr><th>Wybór</th>{tabela.naglowki.map((naglowek, indeks) => <th key={indeks}><input aria-label={`Nagłówek kolumny ${indeks + 1}`} value={naglowek} onChange={(zdarzenie) => zmienTabele((obecna) => ({ ...obecna, naglowki: obecna.naglowki.map((nazwa, kolumna) => kolumna === indeks ? zdarzenie.target.value : nazwa) }))} /></th>)}<th>Operacje</th></tr></thead><tbody>{tabela.wiersze.map((wiersz, indeks) => <tr key={indeks}><td><input type="checkbox" aria-label={`Wybierz wiersz ${indeks + 1}`} checked={tabela.zaznaczone.includes(indeks)} onChange={(zdarzenie) => zmienTabele((obecna) => ({ ...obecna, zaznaczone: zdarzenie.target.checked ? [...obecna.zaznaczone, indeks] : obecna.zaznaczone.filter((numer) => numer !== indeks) }))} /></td>{wiersz.map((pole, kolumna) => <td key={kolumna} data-pewnosc={pole.zweryfikowana ? 'wysoka' : !pole.tekst || pole.pewnosc < 40 ? 'brak' : pole.pewnosc < 85 ? 'niska' : 'wysoka'}><input aria-label={`Wiersz ${indeks + 1}, ${tabela.naglowki[kolumna]}`} value={pole.tekst} onFocus={() => ustawObszar(pole.obszar ?? null)} onChange={(zdarzenie) => zmienTabele((obecna) => ({ ...obecna, wiersze: obecna.wiersze.map((wiersz, numer) => numer !== indeks ? wiersz : wiersz.map((komorka, numerKolumny) => numerKolumny === kolumna ? { ...komorka, tekst: zdarzenie.target.value, zweryfikowana: true } : komorka)) }))} /><small>{pole.podpis ? 'Grafika, bez transkrypcji' : pole.zweryfikowana ? 'Zweryfikowano' : `${Math.round(pole.pewnosc)}% — sprawdź`}</small></td>)}<td><Przycisk onClick={() => zmienTabele((obecna) => ({ ...obecna, wiersze: obecna.wiersze.map((wiersz, numer) => numer === indeks ? wiersz.map((pole) => ({ ...pole, zweryfikowana: true })) : wiersz) }))}>Zweryfikuj wiersz {indeks + 1}</Przycisk><Przycisk onClick={() => zmienTabele((obecna) => ({ ...obecna, wiersze: obecna.wiersze.filter((_, numer) => numer !== indeks), zaznaczone: [] }))}>Usuń wiersz {indeks + 1}</Przycisk></td></tr>)}</tbody></table></div>}
            <Przycisk onClick={() => zmienTabele((obecna) => ({ ...obecna, wiersze: [...obecna.wiersze, obecna.naglowki.map(() => ({ tekst: '', pewnosc: 0, zweryfikowana: false }))] }))}>Dodaj wiersz</Przycisk>
            {!tabela.naglowki.length && <Przycisk onClick={() => zmienTabele((obecna) => ({ ...obecna, naglowki: ['Imię', 'Nazwisko', 'Zespół'], wiersze: [] }))}>Utwórz tabelę do ręcznej korekty</Przycisk>}
          </section>
        </div>
        <div className="importer-ocr__akcje"><Przycisk onClick={() => void kopiuj(tekstTabeliOcr(tabele))}>Kopiuj tabelę</Przycisk><Przycisk onClick={() => void kopiuj(tekstTabeliOcr(tabele, true))}>Kopiuj zaznaczone wiersze</Przycisk><Przycisk onClick={() => void kopiuj(osoby.map((osoba) => osoba.imieINazwisko).join('\n'))} disabled={!osoby.length}>Kopiuj listę osób</Przycisk><Przycisk onClick={() => void eksportuj('csv')}>Eksport CSV</Przycisk><Przycisk onClick={() => void eksportuj('xlsx')}>Eksport XLSX</Przycisk><Przycisk onClick={zapiszSzkic}>Zapisz wynik roboczy</Przycisk></div>
        <p>PDF można utworzyć po przeniesieniu osób do generatora List obecności. Eksport DOCX nie jest dostępny w tym imporcie.</p>
        <p>{bladImportu || `Zaznaczono ${osoby.length} osób. Potencjalne duplikaty: ${duplikaty}. Identyczne nazwy zostaną pominięte; sprawdź, czy nie są to różne osoby.`}</p>
        {opisZastosowania && <p>{opisZastosowania}</p>}
        <label><input type="checkbox" checked={czyZatwierdzone} onChange={(zdarzenie) => ustawCzyZatwierdzone(zdarzenie.target.checked)} /> Zweryfikowałem przyporządkowanie osób do wierszy, pisownię i potencjalne duplikaty. Zatwierdzam dodanie do bieżącej listy.</label>
        <Przycisk disabled={czyTrwa || !czyZatwierdzone || Boolean(bladImportu)} onClick={() => { if (czyZatwierdzone && !bladImportu) { zastosuj(osoby); zamknij() } }}>Zastosuj uczestników</Przycisk>
      </>}
      <Przycisk onClick={() => { kontroler.current?.abort(); zamknij() }}>Zamknij importer</Przycisk>
    </div>
  </OknoDialogowe>
}
