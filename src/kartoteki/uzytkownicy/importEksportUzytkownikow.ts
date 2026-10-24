import JSZip from 'jszip'
import { mapujUzytkownikaNaFormularz, utworzPustyFormularz } from './daneUzytkownikow'
import { krajeTelefonow, normalizujTelefon } from '../../wspolne/telefon/telefon'
import { metadaneOdznak, metadaneRol, type FormularzUzytkownika, type Uzytkownik } from './typyUzytkownikow'
import { normalizujKlucz, walidujKonto, walidujUnikalnosc } from './walidacjaUzytkownikow'

export const kolumnyKont = {
  id: 'ID', zwrot: 'Zwrot', tytulNaukowy: 'Tytuł naukowy', imie: 'Imię', nazwisko: 'Nazwisko', pseudonim: 'Pseudonim', login: 'Login', email: 'E-mail', emaile: 'Dodatkowe e-maile', telefony: 'Telefon', organizacja: 'Organizacja', rola: 'Rola', odznaki: 'Uprawnienia', status: 'Status', kolorProfilu: 'Kolor profilu', aliasyHistoryczne: 'Aliasy historyczne', przypisanyKlientId: 'Przypisany klient', przypisanyTrenerId: 'Przypisany trener', utworzono: 'Data utworzenia', zaktualizowano: 'Data aktualizacji', ostatnieLogowanie: 'Ostatnie logowanie', wersjaUprawnien: 'Wersja uprawnień', statusUwierzytelniania: 'Konfiguracja uwierzytelniania', pelnaNazwa: 'Imię i nazwisko', wyczysc: 'Wyczyść pola',
} as const
export type PoleImportuKonta = keyof typeof kolumnyKont
export type TabelaImportuKont = { naglowki: string[]; wiersze: string[][] }
export type RoznicaKonta = { pole: keyof FormularzUzytkownika; przed: unknown; po: unknown; zaakceptowana: boolean }
export type WierszImportuKonta = { numer: number; id: string; nazwa: string; nowe: boolean; status: 'NOWE KONTO' | 'AKTUALIZACJA' | 'BEZ ZMIAN' | 'KONFLIKT' | 'BŁĄD'; bledy: string[]; roznice: RoznicaKonta[]; propozycje: string[]; dane: Partial<FormularzUzytkownika> }
const limitWierszy = 5000
function normalizujNaglowek(wartosc: string) { return wartosc.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]/g, '') }
export function rozpoznajKolumnyKont(naglowki: string[]): (PoleImportuKonta | '')[] {
  const aliasy: Record<string, PoleImportuKonta> = { mail: 'email', adresemail: 'email', emailglowny: 'email', numertelefonu: 'telefony', telefony: 'telefony', odznaki: 'odznaki', nazwa: 'pelnaNazwa', name: 'pelnaNazwa', title: 'tytulNaukowy' }
  return naglowki.map((naglowek) => Object.entries(kolumnyKont).find(([klucz, etykieta]) => [klucz, etykieta].some((wartosc) => normalizujNaglowek(wartosc) === normalizujNaglowek(naglowek)))?.[0] as PoleImportuKonta || aliasy[normalizujNaglowek(naglowek)] || '')
}
function sprawdzTabele(tabela: TabelaImportuKont) {
  if (!tabela.naglowki.length || tabela.naglowki.length > 100 || tabela.wiersze.length > limitWierszy || tabela.wiersze.some((wiersz) => wiersz.length > tabela.naglowki.length || wiersz.some((wartosc) => wartosc.length > 10000))) throw new Error('Plik przekracza limity: 5000 wierszy, 100 kolumn, 10 000 znaków w komórce lub ma niezgodną liczbę kolumn.')
  return tabela
}
export function odczytajCsvKont(tekst: string): TabelaImportuKont {
  tekst = tekst.replace(/^\uFEFF/, '')
  const pierwszyWiersz = tekst.split(/\r?\n/)[0]
  const separator = (pierwszyWiersz.match(/;/g)?.length ?? 0) >= (pierwszyWiersz.match(/,/g)?.length ?? 0) ? ';' : ','
  const wiersze: string[][] = []
  let wiersz: string[] = [], komorka = '', wCudzyslowie = false
  for (let indeks = 0; indeks < tekst.length; indeks++) {
    const znak = tekst[indeks]
    if (znak === '"') {
      if (wCudzyslowie && tekst[indeks + 1] === '"') { komorka += '"'; indeks++ }
      else if (!wCudzyslowie && komorka) throw new Error('Nieprawidłowe cudzysłowy w CSV.')
      else wCudzyslowie = !wCudzyslowie
    } else if (!wCudzyslowie && (znak === separator || znak === '\n' || znak === '\r')) {
      wiersz.push(komorka); komorka = ''
      if (znak !== separator) { if (wiersz.some(Boolean)) wiersze.push(wiersz); wiersz = []; if (znak === '\r' && tekst[indeks + 1] === '\n') indeks++ }
    } else komorka += znak
  }
  if (wCudzyslowie) throw new Error('Niezamknięty cudzysłów w CSV.')
  wiersz.push(komorka)
  if (wiersz.some(Boolean)) wiersze.push(wiersz)
  return sprawdzTabele({ naglowki: wiersze.shift() ?? [], wiersze })
}
function elementy(element: Document | Element, nazwa: string) { return Array.from(element.getElementsByTagName(nazwa)) }
function odczytajXml(tekst: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(tekst)) throw new Error('Niedozwolona deklaracja XML.')
  const dokument = new DOMParser().parseFromString(tekst, 'application/xml')
  if (dokument.getElementsByTagName('parsererror').length) throw new Error('Nieprawidłowy XML arkusza.')
  return dokument
}
export async function odczytajXlsxKont(bufor: ArrayBuffer): Promise<TabelaImportuKont> {
  if (bufor.byteLength > 5 * 1024 * 1024) throw new Error('Maksymalny rozmiar pliku to 5 MB.')
  const archiwum = await JSZip.loadAsync(bufor)
  if (Object.keys(archiwum.files).length > 100) throw new Error('Archiwum zawiera zbyt wiele części.')
  let rozmiar = 0
  async function odczytajCzesc(nazwa: string) {
    const tekst = await archiwum.file(nazwa)?.async('string')
    rozmiar += tekst?.length ?? 0
    if (rozmiar > 20 * 1024 * 1024) throw new Error('Rozpakowany arkusz przekracza 20 MB.')
    return tekst
  }
  const skoroszyt = odczytajXml(await odczytajCzesc('xl/workbook.xml') ?? '')
  const relacje = odczytajXml(await odczytajCzesc('xl/_rels/workbook.xml.rels') ?? '')
  const pierwsza = elementy(skoroszyt, 'sheet')[0]
  const relacja = elementy(relacje, 'Relationship').find((element) => element.getAttribute('Id') === pierwsza?.getAttribute('r:id'))
  const cel = relacja?.getAttribute('Target') ?? ''
  if (relacja?.getAttribute('TargetMode') === 'External' || !cel || cel.includes('..')) throw new Error('Nieprawidłowe powiązanie arkusza.')
  const sciezka = cel.startsWith('/') ? cel.slice(1) : `xl/${cel}`
  const tresc = await odczytajCzesc(sciezka)
  if (!tresc) throw new Error('Brak pierwszego arkusza.')
  const teksty = await odczytajCzesc('xl/sharedStrings.xml')
  const slownik = teksty ? elementy(odczytajXml(teksty), 'si').map((element) => elementy(element, 't').map((tekst) => tekst.textContent).join('')) : []
  const arkusz = odczytajXml(tresc)
  if (elementy(arkusz, 'f').length) throw new Error('Arkusz zawiera formuły. Wklej wartości zamiast formuł przed importem.')
  const wiersze = elementy(arkusz, 'row').map((element) => {
    const wiersz: string[] = []
    for (const komorka of elementy(element, 'c')) {
      const adres = komorka.getAttribute('r') ?? ''
      const litery = adres.match(/^[A-Z]+/)?.[0]
      if (!litery) throw new Error('Nieprawidłowy adres komórki.')
      const indeks = [...litery].reduce((suma, litera) => suma * 26 + litera.charCodeAt(0) - 64, 0) - 1
      if (indeks >= 100) throw new Error('Arkusz przekracza 100 kolumn.')
      const typ = komorka.getAttribute('t')
      if (typ === 'e') throw new Error(`Błąd komórki ${adres}.`)
      const wartosc = elementy(komorka, 'v')[0]?.textContent ?? ''
      wiersz[indeks] = typ === 's' ? slownik[Number(wartosc)] ?? '' : typ === 'inlineStr' ? elementy(komorka, 't').map((tekst) => tekst.textContent).join('') : wartosc
    }
    return Array.from({ length: wiersz.length }, (_, indeks) => wiersz[indeks] ?? '')
  }).filter((wiersz) => wiersz.some(Boolean))
  return sprawdzTabele({ naglowki: wiersze.shift() ?? [], wiersze })
}
export async function odczytajPlikKont(plik: File) {
  if (plik.size > 5 * 1024 * 1024) throw new Error('Maksymalny rozmiar pliku to 5 MB.')
  if (/\.csv$/i.test(plik.name)) return odczytajCsvKont(new TextDecoder('utf-8', { fatal: true }).decode(await plik.arrayBuffer()))
  if (/\.xlsx$/i.test(plik.name)) return odczytajXlsxKont(await plik.arrayBuffer())
  throw new Error('Wybierz XLSX lub CSV UTF-8. JSON przywracaj osobną operacją kopii.')
}
function wartoscSlownika(wartosc: string) { return wartosc.trim().toLocaleUpperCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Ł/g, 'L').replace(/\s+/g, '_') }
function lista(wartosc: string) { return wartosc.split(/[;|]/).map((czesc) => czesc.trim()).filter(Boolean) }
function telefonyZTekstu(wartosc: string) {
  return lista(wartosc).map((tekst) => {
    tekst = tekst.replace(/^'(?=[+=@-])/, '')
    if (!/^[+\d\s()-]+$/.test(tekst)) throw new Error('Nieprawidłowy telefon.')
    const cyfry = tekst.replace(/\D/g, '')
    const kraj = tekst.startsWith('+') ? [...krajeTelefonow].sort((pierwszy, drugi) => drugi.prefiks.length - pierwszy.prefiks.length).find((kraj) => `+${cyfry}`.startsWith(kraj.prefiks)) : krajeTelefonow[0]
    if (!kraj) throw new Error('Nieznany prefiks telefonu. Uzupełnij telefon w profilu.')
    return normalizujTelefon({ prefiks: kraj.prefiks, numer: tekst.startsWith('+') ? cyfry.slice(kraj.prefiks.length - 1) : cyfry, krajIso2: kraj.iso2 })
  })
}

export function porownajImportKont(tabela: TabelaImportuKont, mapowanie: (PoleImportuKonta | '')[], obecni: Uzytkownik[], dopasowania: Record<number, string> = {}): WierszImportuKonta[] {
  const uzyte = mapowanie.filter(Boolean)
  if (new Set(uzyte).size !== uzyte.length) throw new Error('Jedno pole przypisano do wielu kolumn.')
  const wynik = tabela.wiersze.map((wiersz, indeks): WierszImportuKonta => {
    const pola = Object.fromEntries(mapowanie.flatMap((pole, kolumna) => pole ? [[pole, (wiersz[kolumna] ?? '').trim().replace(/^'(?=[=+@-])/, '')]] : [])) as Partial<Record<PoleImportuKonta, string>>
    const rekord: WierszImportuKonta = { numer: indeks + 2, id: '', nazwa: pola.pelnaNazwa || `${pola.imie ?? ''} ${pola.nazwisko ?? ''}`.trim() || pola.login || 'Wiersz', nowe: false, status: 'BEZ ZMIAN', bledy: [], roznice: [], propozycje: [], dane: {} }
    try {
      const poId = obecni.find((konto) => konto.id === pola.id)
      const loginy = obecni.filter((konto) => pola.login && normalizujKlucz(konto.login) === normalizujKlucz(pola.login))
      const emaile = obecni.filter((konto) => pola.email && konto.emaile.some((email) => normalizujKlucz(email) === normalizujKlucz(pola.email!)))
      const aliasy = obecni.filter((konto) => [pola.id, pola.login, pola.email].some((pole) => pole && konto.aliasyHistoryczne.some((alias) => normalizujKlucz(alias) === normalizujKlucz(pole))))
      const mocne = [...new Set([...(poId ? [poId.id] : []), ...loginy.map((konto) => konto.id), ...emaile.map((konto) => konto.id), ...aliasy.map((konto) => konto.id)])]
      let konto: Uzytkownik | undefined = poId ?? loginy[0] ?? emaile[0] ?? aliasy[0]
      const konfliktId = Boolean(pola.id && konto && pola.id !== konto.id)
      const podobni = obecni.filter((kandydat) => (pola.nazwisko && normalizujKlucz(kandydat.nazwisko) === normalizujKlucz(pola.nazwisko)) || (pola.imie && normalizujKlucz(kandydat.imie) === normalizujKlucz(pola.imie)) || (pola.pelnaNazwa && normalizujKlucz(`${kandydat.imie} ${kandydat.nazwisko}`) === normalizujKlucz(pola.pelnaNazwa)))
      if (mocne.length > 1 || konfliktId || (!konto && podobni.length)) {
        rekord.propozycje = [...new Set([...mocne, ...podobni.map((kandydat) => kandydat.id)])]
        const wybraneId = dopasowania[rekord.numer]
        if (!wybraneId || (wybraneId !== '__nowe__' && !rekord.propozycje.includes(wybraneId)) || (wybraneId === '__nowe__' && mocne.length)) {
          rekord.status = 'KONFLIKT'; rekord.bledy = ['Potwierdź dopasowanie. ID i tożsamość muszą wskazywać jedno konto; samo imię i nazwisko nie wystarcza.']; return rekord
        }
        konto = wybraneId === '__nowe__' ? undefined : obecni.find((kandydat) => kandydat.id === wybraneId)
      }
      const bazowy = konto ? mapujUzytkownikaNaFormularz(konto) : { ...utworzPustyFormularz(), status: 'UTWORZONY' as const, telefony: [] }
      const dane: Partial<FormularzUzytkownika> = {}
      const zwykle = ['zwrot', 'tytulNaukowy', 'imie', 'nazwisko', 'pseudonim', 'login', 'organizacja', 'rola', 'status', 'kolorProfilu', 'przypisanyKlientId', 'przypisanyTrenerId'] as const
      for (const pole of zwykle) if (pola[pole]) Object.assign(dane, { [pole]: ['rola', 'organizacja', 'status'].includes(pole) ? wartoscSlownika(pola[pole]!) : pola[pole] })
      if (pola.pelnaNazwa && !pola.imie && !pola.nazwisko) {
        const [imie, ...nazwisko] = pola.pelnaNazwa.split(/\s+/)
        dane.imie = imie; dane.nazwisko = nazwisko.join(' ')
        rekord.bledy.push('Podział imienia i nazwiska jest propozycją — sprawdź pola przed akceptacją.')
      }
      if (pola.email || pola.emaile) dane.emaile = [...new Set([...(pola.email ? [pola.email] : bazowy.emaile), ...(pola.emaile ? lista(pola.emaile) : bazowy.emaile.slice(1))])]
      if (pola.telefony) dane.telefony = telefonyZTekstu(pola.telefony)
      if (pola.aliasyHistoryczne) dane.aliasyHistoryczne = [...new Set([...bazowy.aliasyHistoryczne, ...lista(pola.aliasyHistoryczne)])]
      if (pola.odznaki) dane.odznaki = pola.odznaki.split(/[;,|]/).map(wartoscSlownika).filter(Boolean) as FormularzUzytkownika['odznaki']
      if (pola.rola && ['WYSYŁACZ', 'WYSYLACZ'].includes(pola.rola.toUpperCase())) {
        dane.rola = konto?.rola ?? 'PRACOWNIK'; dane.odznaki = [...new Set([...(dane.odznaki ?? bazowy.odznaki), 'WYSYLACZ' as const])]
        rekord.bledy.push('Konflikt semantyczny: WYSYŁACZ jest odznaką. Propozycja zachowuje rolę i dodaje odznakę WYSYLACZ.')
      }
      for (const pole of lista(pola.wyczysc ?? '')) {
        if (!['pseudonim', 'telefony', 'odznaki', 'przypisanyKlientId', 'przypisanyTrenerId', 'tytulNaukowy', 'zwrot'].includes(pole)) throw new Error(`Nie można wyczyścić pola ${pole}. Używaj technicznych nazw pól z legendy.`)
        Object.assign(dane, { [pole]: ['telefony', 'odznaki'].includes(pole) ? [] : '' })
      }
      rekord.id = konto?.id ?? pola.id ?? `uzytkownik-${crypto.randomUUID()}`
      if (!rekord.id) rekord.id = `uzytkownik-${crypto.randomUUID()}`
      rekord.nowe = !konto
      const docelowy = { ...bazowy, ...dane }
      if (!konto) { docelowy.pseudonim ||= docelowy.imie; docelowy.wymagaZmianyHasla = false }
      const { statusUwierzytelniania: pominiety, ...profil } = docelowy
      void pominiety
      rekord.dane = profil
      const kandydat: Uzytkownik = { ...konto, ...docelowy, id: rekord.id, email: docelowy.emaile[0] ?? '', utworzono: konto?.utworzono ?? new Date().toISOString(), zaktualizowano: konto?.zaktualizowano ?? new Date().toISOString(), ostatnieLogowanie: konto?.ostatnieLogowanie ?? null, wersjaUprawnien: konto?.wersjaUprawnien ?? 1 }
      const bledy = walidujKonto(kandydat)
      const kolizje = walidujUnikalnosc([...obecni.filter((obecny) => obecny.id !== konto?.id), kandydat])
      if (bledy.length || kolizje.length) { rekord.status = 'BŁĄD'; rekord.bledy.push(...bledy, ...kolizje); return rekord }
      rekord.roznice = (Object.keys(profil) as (keyof typeof profil)[]).filter((pole) => !konto || JSON.stringify(bazowy[pole]) !== JSON.stringify(profil[pole]) || (pole === 'emaile' && konto.email !== docelowy.emaile[0])).map((pole) => ({ pole, przed: konto ? bazowy[pole] : undefined, po: profil[pole], zaakceptowana: false }))
      rekord.status = !konto ? 'NOWE KONTO' : rekord.roznice.length ? 'AKTUALIZACJA' : 'BEZ ZMIAN'
      rekord.nazwa = `${docelowy.imie} ${docelowy.nazwisko}`
      return rekord
    } catch (blad) { rekord.status = 'BŁĄD'; rekord.bledy.push(blad instanceof Error ? blad.message : 'Nieprawidłowy wiersz.'); return rekord }
  })
  for (const rekord of wynik) if (rekord.id && wynik.filter((inny) => inny.id === rekord.id || (rekord.dane.login && normalizujKlucz(inny.dane.login ?? '') === normalizujKlucz(rekord.dane.login)) || (rekord.dane.emaile?.some((email) => inny.dane.emaile?.some((innyEmail) => normalizujKlucz(email) === normalizujKlucz(innyEmail))))).length > 1) {
    rekord.status = 'BŁĄD'; rekord.bledy.push('Powtórzone konto, login lub e-mail w pliku.')
  }
  return wynik
}

export function daneDoEksportuKont(konto: Uzytkownik): string[] {
  return Object.keys(kolumnyKont).filter((pole) => !['pelnaNazwa', 'wyczysc'].includes(pole)).map((pole) => {
    if (pole === 'emaile') return konto.emaile.slice(1).join(' | ')
    if (pole === 'telefony') return konto.telefony.map((telefon) => normalizujTelefon(telefon).numerE164).join(' | ')
    const wartosc = konto[pole as keyof Uzytkownik]
    return Array.isArray(wartosc) ? wartosc.join(' | ') : String(wartosc ?? '')
  })
}
const naglowkiEksportu = Object.entries(kolumnyKont).filter(([pole]) => !['pelnaNazwa', 'wyczysc'].includes(pole)).map(([, etykieta]) => etykieta)
export function eksportujCsvKont(konta: Uzytkownik[]) {
  const zabezpiecz = (tekst: string) => `"${('=+@-'.includes([...tekst].find((znak) => znak.charCodeAt(0) > 32 && znak.trim()) ?? '\uFFFF') ? `'${tekst}` : tekst).replace(/"/g, '""')}"`
  return '\uFEFF' + [naglowkiEksportu, ...konta.map(daneDoEksportuKont)].map((wiersz) => wiersz.map(zabezpiecz).join(';')).join('\r\n')
}
function xml(wartosc: string) { return [...wartosc].filter((znak) => znak.charCodeAt(0) >= 32 || [9, 10, 13].includes(znak.charCodeAt(0))).join('').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;') }
function literyKolumny(indeks: number): string { return indeks < 26 ? String.fromCharCode(65 + indeks) : literyKolumny(Math.floor(indeks / 26) - 1) + String.fromCharCode(65 + indeks % 26) }
export async function eksportujXlsxKont(konta: Uzytkownik[]) {
  const archiwum = new JSZip()
  const legenda = [['Rodzaj', 'Wartość', 'Opis'], ...Object.entries(metadaneRol).map(([rola, dane]) => ['Rola', rola, dane.etykieta]), ...Object.entries(metadaneOdznak).map(([odznaka, dane]) => ['Odznaka', odznaka, dane.opis]), ...Object.entries(kolumnyKont).map(([pole, nazwa]) => ['Pole', pole, nazwa]), ['Import', 'Wyczyść pola', 'Nazwy techniczne rozdzielaj |. Puste komórki zachowują dane.'], ['Bezpieczeństwo', 'Lokalne dane', 'Brak haseł, tokenów i synchronizacji. Metadane aktywności nie podlegają importowi tabelarycznemu.']]
  function arkusz(wiersze: string[][], daty = false) {
    const ostatnia = literyKolumny(wiersze[0].length - 1)
    return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${wiersze[0].map((_, indeks) => `<col min="${indeks + 1}" max="${indeks + 1}" width="${indeks === 0 ? 36 : 25}" customWidth="1"/>`).join('')}</cols><sheetData>${wiersze.map((wiersz, indeksWiersza) => `<row r="${indeksWiersza + 1}">${wiersz.map((tekst, indeks) => {
      const data = daty && indeksWiersza > 0 && ['Data utworzenia', 'Data aktualizacji', 'Ostatnie logowanie'].includes(wiersze[0][indeks]) && tekst
      return data ? `<c r="${literyKolumny(indeks)}${indeksWiersza + 1}" t="d" s="1"><v>${xml(tekst)}</v></c>` : `<c r="${literyKolumny(indeks)}${indeksWiersza + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(tekst)}</t></is></c>`
    }).join('')}</row>`).join('')}</sheetData><autoFilter ref="A1:${ostatnia}${wiersze.length}"/></worksheet>`
  }
  archiwum.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
  archiwum.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
  archiwum.file('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Użytkownicy" sheetId="1" r:id="rId1"/><sheet name="Legenda" sheetId="2" r:id="rId2"/></sheets></workbook>')
  archiwum.file('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
  archiwum.file('xl/styles.xml', '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm"/></numFmts><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>')
  archiwum.file('xl/worksheets/sheet1.xml', arkusz([naglowkiEksportu, ...konta.map(daneDoEksportuKont)], true))
  archiwum.file('xl/worksheets/sheet2.xml', arkusz(legenda))
  return archiwum.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })
}
