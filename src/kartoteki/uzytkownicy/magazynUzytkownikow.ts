import { czyTrybDemonstracyjny } from '../../aplikacja/logowanie/uwierzytelnianie'
import { czyTrwaPodgladUzytkownika } from './stanPodgladuUzytkownika'
import { pobierzSesje } from '../../aplikacja/logowanie/sesjaUzytkownika'
import { daneStartoweUzytkownikow, utworzIdUzytkownika } from './daneUzytkownikow'
import type { FormularzUzytkownika, RolaUzytkownika, Uzytkownik } from './typyUzytkownikow'
import { normalizujKlucz, sprawdzStruktureUzytkownika, walidujKonto, walidujUnikalnosc } from './walidacjaUzytkownikow'
import { czyMozeZarzadzacUzytkownikami } from './uprawnienia'

export const kluczMagazynuUzytkownikow = 'ultimatePomagier.uzytkownicy.v1'
export const kluczKopiiUzytkownikow = 'ultimatePomagier.uzytkownicy.kopiaPrzedZmiana.v2'
export const kluczKopiiMigracjiUzytkownikow = 'ultimatePomagier.uzytkownicy.kopiaPrzedMigracja.v2'
export type WpisHistoriiKonta = { czas: string; wykonujacyId: string; uzytkownikId: string; operacja: string; pola: string[]; wynik: 'SUKCES' | 'ODRZUCONO' }
export type BazaUzytkownikow = { wersja: 2; uzytkownicy: Uzytkownik[]; historia: WpisHistoriiKonta[] }

function skopiujUzytkownika(uzytkownik: Uzytkownik): Uzytkownik {
  return { ...uzytkownik, emaile: [...uzytkownik.emaile], telefony: uzytkownik.telefony.map((telefon) => ({ ...telefon })), odznaki: [...uzytkownik.odznaki], aliasyHistoryczne: [...uzytkownik.aliasyHistoryczne] }
}

export function odczytajBazeUzytkownikow(zapis: string): BazaUzytkownikow {
  const dane: unknown = JSON.parse(zapis)
  const obiekt = dane && typeof dane === 'object' ? dane as Record<string, unknown> : {}
  const konta = Array.isArray(dane) ? dane : obiekt.wersja === 2 ? obiekt.uzytkownicy : undefined
  if (!Array.isArray(konta) || !konta.every(sprawdzStruktureUzytkownika)) throw new Error('Kartoteka jest uszkodzona lub ma nieobsługiwaną wersję. Zachowano oryginał; przywróć poprawną kopię JSON.')
  if (walidujUnikalnosc(konta).length) throw new Error('Kartoteka zawiera kolizje tożsamości. Zachowano oryginał; wymagana korekta kopii danych.')
  const historia = Array.isArray(dane) ? [] : obiekt.historia
  if (!Array.isArray(historia) || !historia.every((wpis: unknown) => {
    if (!wpis || typeof wpis !== 'object') return false
    const rekord = wpis as Record<string, unknown>
    return ['czas', 'wykonujacyId', 'uzytkownikId', 'operacja'].every((pole) => typeof rekord[pole] === 'string') && Array.isArray(rekord.pola) && rekord.pola.every((pole: unknown) => typeof pole === 'string') && ['SUKCES', 'ODRZUCONO'].some((wynik) => wynik === rekord.wynik)
  })) throw new Error('Nieprawidłowa historia kont.')
  return { wersja: 2, uzytkownicy: konta.map(skopiujUzytkownika), historia }
}

// Jawna migracja historycznej hierarchii; inicjalizacja nie uruchamia jej ponownie.
export function wykonajMigracjeRoliArchitekta(uzytkownicy: Uzytkownik[]) {
  let czyZmieniono = false
  const wynik = uzytkownicy.map((konto) => {
    const rola: RolaUzytkownika = konto.id === 'administrator-kacper-madej' ? 'ARCHITEKT' : konto.rola === 'ARCHITEKT' ? 'ADMINISTRATOR' : konto.rola
    czyZmieniono ||= rola !== konto.rola
    return rola === konto.rola ? skopiujUzytkownika(konto) : { ...skopiujUzytkownika(konto), rola, wersjaUprawnien: konto.wersjaUprawnien + 1 }
  })
  return { uzytkownicy: wynik, czyZmieniono }
}

export function wykonajMigracjeBazyUzytkownikow(uzytkownicy: Uzytkownik[]) {
  // Wersja 2 uzupełnia tylko brak metadanej. Dane startowe są propozycją importu.
  const wynik = uzytkownicy.map((konto) => ({ ...skopiujUzytkownika(konto), statusUwierzytelniania: konto.statusUwierzytelniania ?? 'NIESKONFIGUROWANE' as const }))
  return { uzytkownicy: wynik, czyZmieniono: uzytkownicy.some((konto) => !konto.statusUwierzytelniania) }
}

function pobierzBaze(): BazaUzytkownikow {
  if (typeof localStorage === 'undefined') return { wersja: 2, uzytkownicy: daneStartoweUzytkownikow.map(skopiujUzytkownika), historia: [] }
  const zapis = localStorage.getItem(kluczMagazynuUzytkownikow)
  if (zapis === null) {
    const baza: BazaUzytkownikow = { wersja: 2, uzytkownicy: wykonajMigracjeBazyUzytkownikow(daneStartoweUzytkownikow).uzytkownicy, historia: [] }
    localStorage.setItem(kluczMagazynuUzytkownikow, JSON.stringify(baza))
    return baza
  }
  const baza = odczytajBazeUzytkownikow(zapis)
  if (Array.isArray(JSON.parse(zapis))) {
    const migracja = wykonajMigracjeBazyUzytkownikow(baza.uzytkownicy)
    const wynik: BazaUzytkownikow = { ...baza, uzytkownicy: migracja.uzytkownicy, historia: migracja.uzytkownicy.map((konto) => ({ czas: new Date().toISOString(), wykonujacyId: 'migracja-v2', uzytkownikId: konto.id, operacja: 'MIGRACJA_V2', pola: baza.uzytkownicy.find((poprzedni) => poprzedni.id === konto.id)?.statusUwierzytelniania ? [] : ['statusUwierzytelniania'], wynik: 'SUKCES' })) }
    if (localStorage.getItem(kluczKopiiMigracjiUzytkownikow) === null) localStorage.setItem(kluczKopiiMigracjiUzytkownikow, zapis)
    localStorage.setItem(kluczMagazynuUzytkownikow, JSON.stringify(wynik))
    return wynik
  }
  return baza
}

export function zainicjalizujMagazynUzytkownikow() { return pobierzBaze().uzytkownicy.map(skopiujUzytkownika) }
export function pobierzUzytkownikow() { return zainicjalizujMagazynUzytkownikow() }
export function pobierzHistorieKont() { return pobierzBaze().historia }
export function pobierzUzytkownika(wartosc: string | null | undefined) {
  if (!wartosc?.trim()) return undefined
  const znalezieni = pobierzUzytkownikow().filter((konto) => [konto.id, konto.login, konto.pseudonim, ...konto.emaile, ...konto.aliasyHistoryczne].some((pole) => normalizujKlucz(pole) === normalizujKlucz(wartosc)))
  return znalezieni.length === 1 ? znalezieni[0] : undefined
}
export function pobierzAktywnychUzytkownikowWedlugRoli(rola?: RolaUzytkownika) { return pobierzUzytkownikow().filter((konto) => konto.status === 'AKTYWNY' && (!rola || konto.rola === rola)) }

function zapiszBaze(baza: BazaUzytkownikow) {
  const poprzedni = localStorage.getItem(kluczMagazynuUzytkownikow)
  if (poprzedni !== null) localStorage.setItem(kluczKopiiUzytkownikow, poprzedni)
  localStorage.setItem(kluczMagazynuUzytkownikow, JSON.stringify(baza))
}

// Niskopoziomowy zapis używany również przez obsługę sesji; nie nadaje uprawnień.
export function zapiszUzytkownikow(uzytkownicy: Uzytkownik[]) {
  if (!czyTrybDemonstracyjny || czyTrwaPodgladUzytkownika()) return false
  try { zapiszBaze({ ...pobierzBaze(), uzytkownicy: uzytkownicy.map(skopiujUzytkownika) }); return true } catch { return false }
}
export function czyLoginJestDostepny(login: string, pomijanyUzytkownikId?: string) { return Boolean(login.trim()) && !pobierzUzytkownikow().some((konto) => konto.id !== pomijanyUzytkownikId && [konto.login, ...konto.aliasyHistoryczne, ...konto.emaile].some((wartosc) => normalizujKlucz(wartosc) === normalizujKlucz(login))) }
export function czyEmailJestDostepny(email: string, pomijanyUzytkownikId?: string) { return czyLoginJestDostepny(email, pomijanyUzytkownikId) }

export type ZmianaKonta = { id: string; dane: Partial<FormularzUzytkownika>; nowe?: boolean }
export type WynikZapisuKont = { blad?: string; liczba?: number; uzytkownik?: Uzytkownik }

export function zatwierdzZmianyKont(wykonujacy: Uzytkownik | null, zmiany: ZmianaKonta[], oczekiwanyStan: string, operacja = 'EDYCJA_ZBIORCZA', wlasnyProfil = false): WynikZapisuKont {
  try {
    if (czyTrwaPodgladUzytkownika()) return { blad: 'Operacje modyfikujące konta są zablokowane w podglądzie.' }
    const baza = pobierzBaze()
    const aktualny = baza.uzytkownicy.find((konto) => konto.id === wykonujacy?.id)
    if (pobierzSesje()?.uzytkownikId !== wykonujacy?.id) return { blad: 'Brak sesji wykonującego.' }
    if (!aktualny || aktualny.status !== 'AKTYWNY' || aktualny.wersjaUprawnien !== wykonujacy?.wersjaUprawnien || aktualny.rola !== wykonujacy.rola) return { blad: 'Brak aktywnego wykonującego lub zmienione uprawnienia.' }
    if (!wlasnyProfil && !czyMozeZarzadzacUzytkownikami(aktualny)) return { blad: 'Brak uprawnień do zarządzania kontami.' }
    if (JSON.stringify(baza.uzytkownicy) !== oczekiwanyStan) return { blad: 'Dane zmieniły się od podglądu. Porównaj ponownie przed zapisem.' }
    if (new Set(zmiany.map((zmiana) => zmiana.id)).size !== zmiany.length) return { blad: 'Kilka zmian dotyczy tego samego konta.' }
    const wynik = baza.uzytkownicy.map(skopiujUzytkownika)
    const wpisy: WpisHistoriiKonta[] = []
    for (const zmiana of zmiany) {
      const indeks = wynik.findIndex((konto) => konto.id === zmiana.id)
      const poprzedni = wynik[indeks]
      if ((zmiana.nowe && poprzedni) || (!zmiana.nowe && !poprzedni)) return { blad: 'Konflikt identyfikatora konta.' }
      if (wlasnyProfil && (zmiana.id !== aktualny.id || zmiana.nowe)) return { blad: 'Możesz edytować wyłącznie własny profil.' }
      if (aktualny.rola !== 'ARCHITEKT' && poprzedni?.rola === 'ARCHITEKT') return { blad: 'Administrator nie może edytować Architekta.' }
      const dozwolone = wlasnyProfil ? ['zwrot', 'tytulNaukowy', 'imie', 'nazwisko', 'pseudonim', 'emaile', 'telefony'] : ['zwrot', 'tytulNaukowy', 'imie', 'nazwisko', 'pseudonim', 'emaile', 'telefony', 'login', 'rola', 'organizacja', 'odznaki', 'status', 'kolorProfilu', 'aliasyHistoryczne', 'przypisanyKlientId', 'przypisanyTrenerId', 'wymagaZmianyHasla']
      if (Object.keys(zmiana.dane).some((pole) => !dozwolone.includes(pole))) return { blad: 'Próba zmiany chronionych metadanych konta.' }
      const teraz = new Date().toISOString()
      const kandydat: Uzytkownik = { ...poprzedni, ...zmiana.dane, id: zmiana.id, email: zmiana.dane.emaile?.[0] ?? poprzedni?.email ?? '', utworzono: poprzedni?.utworzono ?? teraz, zaktualizowano: teraz, ostatnieLogowanie: poprzedni?.ostatnieLogowanie ?? null, wersjaUprawnien: poprzedni?.wersjaUprawnien ?? 1, statusUwierzytelniania: poprzedni?.statusUwierzytelniania ?? 'NIESKONFIGUROWANE' } as Uzytkownik
      if (poprzedni) {
        kandydat.aliasyHistoryczne = [...new Set([...poprzedni.aliasyHistoryczne, ...kandydat.aliasyHistoryczne, ...(poprzedni.login !== kandydat.login ? [poprzedni.login] : []), ...poprzedni.emaile.filter((email) => !kandydat.emaile.includes(email))])]
        const polaUprawnien = ['rola', 'organizacja', 'odznaki', 'status', 'przypisanyKlientId', 'przypisanyTrenerId'] as const
        if (polaUprawnien.some((pole) => JSON.stringify(poprzedni[pole]) !== JSON.stringify(kandydat[pole]))) kandydat.wersjaUprawnien++
      }
      if (!poprzedni && kandydat.rola === 'ARCHITEKT') return { blad: 'Nie można tworzyć kolejnego Architekta.' }
      if (aktualny.id === kandydat.id && aktualny.rola === 'ADMINISTRATOR' && (kandydat.rola !== 'ADMINISTRATOR' || kandydat.status !== 'AKTYWNY' || !['SEMPER', 'IIST'].includes(kandydat.organizacja))) return { blad: 'Administrator nie może osłabić własnego konta.' }
      const bledy = walidujKonto(kandydat)
      if (bledy.length) return { blad: `${kandydat.login || zmiana.id}: ${bledy.join(' ')}` }
      const pola = Object.keys(zmiana.dane).filter((pole) => JSON.stringify(poprzedni?.[pole as keyof Uzytkownik]) !== JSON.stringify(kandydat[pole as keyof Uzytkownik]))
      if (!pola.length) continue
      if (poprzedni) wynik[indeks] = skopiujUzytkownika(kandydat)
      else wynik.push(skopiujUzytkownika(kandydat))
      wpisy.push({ czas: teraz, wykonujacyId: aktualny.id, uzytkownikId: kandydat.id, operacja: poprzedni ? operacja : operacja + '_UTWORZENIE', pola, wynik: 'SUKCES' })
    }
    const bledy = walidujUnikalnosc(wynik)
    for (const konto of wynik) {
      const poprzedni = baza.uzytkownicy.find((obecny) => obecny.id === konto.id)
      const noweKlucze = [konto.login, ...konto.emaile].filter((klucz) => !poprzedni || ![poprzedni.login, ...poprzedni.emaile].includes(klucz))
      if (noweKlucze.some((klucz) => wynik.some((inny) => inny.id !== konto.id && inny.aliasyHistoryczne.some((alias) => normalizujKlucz(alias) === normalizujKlucz(klucz))))) bledy.push('Nowa tożsamość koliduje z historycznym aliasem innego konta.')
    }
    if (bledy.length) return { blad: bledy.join(' ') }
    if (wpisy.length) zapiszBaze({ ...baza, uzytkownicy: wynik, historia: [...baza.historia, ...wpisy] })
    return { liczba: wpisy.length, uzytkownik: wynik.find((konto) => konto.id === zmiany[0]?.id) }
  } catch (blad) { return { blad: blad instanceof Error ? blad.message : 'Nie udało się zapisać kont. Zachowano poprzedni stan.' } }
}

type DaneWlasnegoProfilu = Pick<FormularzUzytkownika, 'zwrot' | 'tytulNaukowy' | 'imie' | 'nazwisko' | 'pseudonim' | 'emaile' | 'telefony'>
export function zaktualizujWlasnyProfil(wykonujacy: Uzytkownik, id: string, dane: DaneWlasnegoProfilu) {
  const bezpieczne = Object.fromEntries(['zwrot', 'tytulNaukowy', 'imie', 'nazwisko', 'pseudonim', 'emaile', 'telefony'].map((pole) => [pole, dane[pole as keyof DaneWlasnegoProfilu]]))
  return zatwierdzZmianyKont(wykonujacy, [{ id, dane: bezpieczne }], JSON.stringify(pobierzUzytkownikow()), 'EDYCJA_PROFILU', true)
}
export function zaktualizujUzytkownikaPrzezAdministratora(wykonujacy: Uzytkownik, id: string, dane: Partial<FormularzUzytkownika>) { return zatwierdzZmianyKont(wykonujacy, [{ id, dane }], JSON.stringify(pobierzUzytkownikow())) }
export function zaktualizujUzytkownikaPrzezArchitekta(wykonujacy: Uzytkownik, id: string, dane: Partial<FormularzUzytkownika>) {
  if (wykonujacy.rola !== 'ARCHITEKT') return { blad: 'Brak uprawnień Architekta.' }
  return zaktualizujUzytkownikaPrzezAdministratora(wykonujacy, id, dane)
}
export function utworzUzytkownikaPrzezAdministratora(wykonujacy: Uzytkownik, dane: FormularzUzytkownika) {
  const { statusUwierzytelniania: pominietyStatus, ...profil } = dane
  void pominietyStatus
  return zatwierdzZmianyKont(wykonujacy, [{ id: `${utworzIdUzytkownika(dane)}-${crypto.randomUUID()}`, dane: profil, nowe: true }], JSON.stringify(pobierzUzytkownikow()), 'UTWORZENIE')
}

export function eksportujKopieKont() {
  const baza = pobierzBaze()
  const pola = ['id', 'zwrot', 'tytulNaukowy', 'imie', 'nazwisko', 'pseudonim', 'email', 'emaile', 'telefony', 'login', 'rola', 'organizacja', 'odznaki', 'status', 'kolorProfilu', 'aliasyHistoryczne', 'przypisanyKlientId', 'przypisanyTrenerId', 'wymagaZmianyHasla', 'statusUwierzytelniania', 'wersjaUprawnien', 'ostatnieLogowanie', 'utworzono', 'zaktualizowano'] as const
  return JSON.stringify({ ...baza, historia: baza.historia.map(({ czas, wykonujacyId, uzytkownikId, operacja, pola, wynik }) => ({ czas, wykonujacyId, uzytkownikId, operacja, pola, wynik })), uzytkownicy: baza.uzytkownicy.map((konto) => Object.fromEntries(pola.map((pole) => [pole, pole === 'telefony' ? konto.telefony.map(({ prefiks, numer, krajIso2, numerE164 }) => ({ prefiks, numer, krajIso2, numerE164 })) : konto[pole]]))) }, null, 2)
}
export function przywrocKopieKont(wykonujacy: Uzytkownik | null, zapis: string, oczekiwanyStan: string): WynikZapisuKont {
  if (czyTrwaPodgladUzytkownika()) return { blad: 'Przywracanie kopii jest zablokowane w podglądzie.' }
  try {
    const baza = pobierzBaze()
    const aktualny = baza.uzytkownicy.find((konto) => konto.id === wykonujacy?.id)
    if (pobierzSesje()?.uzytkownikId !== wykonujacy?.id) return { blad: 'Brak sesji wykonującego.' }
    if (!aktualny || aktualny.rola !== 'ARCHITEKT' || aktualny.status !== 'AKTYWNY' || aktualny.wersjaUprawnien !== wykonujacy?.wersjaUprawnien) return { blad: 'Odtwarzanie kopii wymaga aktywnego Architekta.' }
    if (JSON.stringify(baza.uzytkownicy) !== oczekiwanyStan) return { blad: 'Kartoteka zmieniła się. Wczytaj podgląd ponownie.' }
    const kopia = odczytajBazeUzytkownikow(zapis)
    const odtworzenie = przygotujOdtworzenieKont(kopia, baza)
    if (odtworzenie.blad) return { blad: odtworzenie.blad }
    kopia.uzytkownicy = odtworzenie.uzytkownicy
    const bledy = [...kopia.uzytkownicy.flatMap(walidujKonto), ...walidujUnikalnosc(kopia.uzytkownicy)]
    if (bledy.length) return { blad: bledy.join(' ') }
    const historia = [...baza.historia]
    for (const wpis of kopia.historia) if (!historia.some((obecny) => JSON.stringify(obecny) === JSON.stringify(wpis))) historia.push(wpis)
    for (const konto of kopia.uzytkownicy) {
      const poprzedni = baza.uzytkownicy.find((obecny) => obecny.id === konto.id)
      const pola = (Object.keys(konto) as (keyof Uzytkownik)[]).filter((pole) => JSON.stringify(poprzedni?.[pole]) !== JSON.stringify(konto[pole]))
      historia.push({ czas: new Date().toISOString(), wykonujacyId: aktualny.id, uzytkownikId: konto.id, operacja: 'PRZYWROCENIE_KOPII', pola: [...new Set([...pola, 'wersjaUprawnien'])], wynik: 'SUKCES' })
    }
    zapiszBaze({ ...kopia, historia, uzytkownicy: kopia.uzytkownicy.map((konto) => ({ ...konto, wersjaUprawnien: Math.max(konto.wersjaUprawnien, baza.uzytkownicy.find((obecny) => obecny.id === konto.id)?.wersjaUprawnien ?? 0) + 1 })) })
    return { liczba: kopia.uzytkownicy.length }
  } catch (blad) { return { blad: blad instanceof Error ? blad.message : 'Nie udało się przywrócić kopii.' } }
}

export function zarejestrujPodgladKonta(uzytkownikId: string, operacja: 'POCZATEK_PODGLADU' | 'KONIEC_PODGLADU'): WynikZapisuKont {
  try {
    const baza = pobierzBaze(), sesja = pobierzSesje()
    const wykonujacy = baza.uzytkownicy.find((konto) => konto.id === sesja?.uzytkownikId)
    if (!wykonujacy || wykonujacy.rola !== 'ARCHITEKT' || wykonujacy.status !== 'AKTYWNY' || !baza.uzytkownicy.some((konto) => konto.id === uzytkownikId)) return { blad: 'Podgląd wymaga aktywnej sesji Architekta.' }
    // Wpis audytu nie zmienia kopii danych sprzed ostatniej operacji.
    localStorage.setItem(kluczMagazynuUzytkownikow, JSON.stringify({ ...baza, historia: [...baza.historia, { czas: new Date().toISOString(), wykonujacyId: wykonujacy.id, uzytkownikId, operacja, pola: [], wynik: 'SUKCES' }] }))
    return { liczba: 1 }
  } catch { return { blad: 'Nie udało się zapisać audytu podglądu.' } }
}

export function odzyskajUszkodzonaKartoteke(zapis: string, oczekiwanyOryginal: string | null): WynikZapisuKont {
  if (czyTrwaPodgladUzytkownika()) return { blad: 'Odzyskiwanie jest zablokowane w podglądzie.' }
  if (!czyTrybDemonstracyjny) return { blad: 'Odzyskiwanie bez usługi tożsamości wymaga jawnego trybu demonstracyjnego.' }
  try {
    const oryginal = localStorage.getItem(kluczMagazynuUzytkownikow)
    let czyUszkodzony = false
    if (oryginal !== null) { try { odczytajBazeUzytkownikow(oryginal) } catch { czyUszkodzony = true } }
    if (!czyUszkodzony) return { blad: 'Poprawną kartotekę przywracaj z aktywnej sesji Architekta.' }
    if (oryginal !== oczekiwanyOryginal) return { blad: 'Dane zmieniły się. Wczytaj podgląd ponownie.' }
    const kopia = odczytajBazeUzytkownikow(zapis)
    const bledy = kopia.uzytkownicy.flatMap(walidujKonto)
    if (bledy.length) return { blad: bledy.join(' ') }
    let rozpoznaneId: string[] = []
    try {
      const dane: unknown = JSON.parse(oryginal ?? 'null')
      const konta = Array.isArray(dane) ? dane : dane && typeof dane === 'object' ? (dane as Record<string, unknown>).uzytkownicy : null
      if (Array.isArray(konta)) rozpoznaneId = konta.flatMap((konto: unknown) => konto && typeof konto === 'object' && typeof (konto as Record<string, unknown>).id === 'string' ? [(konto as { id: string }).id] : [])
    } catch { /* Nieczytelny oryginał pozostaje w kopii do ręcznego odzyskania. */ }
    if (rozpoznaneId.some((id) => !kopia.uzytkownicy.some((konto) => konto.id === id))) return { blad: 'Kopia nie zawiera wszystkich rozpoznanych ID. Najpierw scal brakujące konta.' }
    const historia: WpisHistoriiKonta[] = [...kopia.historia, { czas: new Date().toISOString(), wykonujacyId: 'odzyskiwanie-demonstracyjne', uzytkownikId: '*', operacja: 'ODZYSKANIE_USZKODZONEJ_KARTOTEKI', pola: ['kartoteka'], wynik: 'SUKCES' }]
    if (oryginal !== null) localStorage.setItem('ultimatePomagier.uzytkownicy.uszkodzona.' + crypto.randomUUID(), oryginal)
    localStorage.setItem(kluczMagazynuUzytkownikow, JSON.stringify({ ...kopia, historia }))
    localStorage.removeItem('ultimatePomagier.sesjaUzytkownika.v1')
    return { liczba: kopia.uzytkownicy.length }
  } catch (blad) { return { blad: blad instanceof Error ? blad.message : 'Odzyskiwanie nie powiodło się.' } }
}

export function zarejestrujLogowanieDemonstracyjne(uzytkownikId: string) {
  try {
    const baza = pobierzBaze(), czas = new Date().toISOString()
    const konto = baza.uzytkownicy.find((konto) => konto.id === uzytkownikId)
    if (!czyTrybDemonstracyjny || czyTrwaPodgladUzytkownika() || konto?.status !== 'AKTYWNY') return false
    localStorage.setItem(kluczMagazynuUzytkownikow, JSON.stringify({ ...baza, uzytkownicy: baza.uzytkownicy.map((konto) => konto.id === uzytkownikId ? { ...konto, ostatnieLogowanie: czas } : konto), historia: [...baza.historia, { czas, wykonujacyId: uzytkownikId, uzytkownikId, operacja: 'LOGOWANIE_DEMONSTRACYJNE', pola: ['ostatnieLogowanie'], wynik: 'SUKCES' }] }))
    return true
  } catch { return false }
}

export function przygotujOdtworzenieKont(kopia: BazaUzytkownikow, obecna: BazaUzytkownikow): { uzytkownicy: Uzytkownik[]; blad?: string } {
  const brakujace = obecna.uzytkownicy.filter((konto) => !kopia.uzytkownicy.some((przywracany) => przywracany.id === konto.id))
  for (const konto of brakujace) {
    const utworzeniePoKopii = obecna.historia.some((wpis) => wpis.uzytkownikId === konto.id && wpis.operacja.endsWith('_UTWORZENIE') && !kopia.historia.some((stary) => JSON.stringify(stary) === JSON.stringify(wpis)))
    if (!utworzeniePoKopii || konto.rola === 'ARCHITEKT') return { uzytkownicy: [], blad: 'Kopia nie zawiera wszystkich wcześniejszych ID. Najpierw scal brakujące konta, aby zachować powiązania.' }
  }
  return { uzytkownicy: [...kopia.uzytkownicy.map(skopiujUzytkownika), ...brakujace.map((konto) => ({ ...skopiujUzytkownika(konto), status: 'NIEAKTYWNY' as const }))] }
}
