import { useMemo, useState } from 'react'
import { poczatkowaGrupa, poczatkoweDaneFormularza, poczatkowiAdresaci, utworzPoczatkowaGrupe } from '../danePoczatkowe'
import { grupyAdresatow, lokalniUzytkownicy, polaWymaganePoImporcie, trenerzyKartotekiStartowi } from '../stale'
import type {
  DaneAdresatow,
  DaneFormularza,
  GrupaSzkoleniowa,
  LokalnyUzytkownik,
  StatusyPolImportu,
  TrenerKartoteki,
  TrenerGrupy,
  WersjaRoboczaGeneratora,
} from '../typy'
import { pobierzDokumentSzczegolow, utworzTekstSzczegolow } from '../uslugi/eksportSzczegolow'
import {
  pobierzAktualnaWersjeRobocza,
  pobierzKopieRobocze,
  wyczyscAktualnaWersjeRobocza,
  zapiszWersjeRobocza,
  zbudujWersjeRobocza,
} from '../uslugi/magazynWersjiRoboczych'
import { parsujMailaSzczegolow } from '../uslugi/parserMailaSzczegolow'

function klonujDanePoczatkowe(): DaneFormularza {
  return JSON.parse(JSON.stringify(poczatkoweDaneFormularza)) as DaneFormularza
}

function klonujGrupePoczatkowa(): GrupaSzkoleniowa {
  return JSON.parse(JSON.stringify(poczatkowaGrupa)) as GrupaSzkoleniowa
}

function policzCenaBrutto(cenaNetto: number, vat: GrupaSzkoleniowa['vat']) {
  const mnoznik = vat === '23%' ? 1.23 : vat === '8%' ? 1.08 : 1
  return Math.round(cenaNetto * mnoznik * 100) / 100
}

function scalDaneFormularza(obecne: DaneFormularza, czesciowe: Partial<DaneFormularza>): DaneFormularza {
  return {
    ...obecne,
    ...czesciowe,
    nabywca: { ...obecne.nabywca, ...czesciowe.nabywca },
    odbiorca: { ...obecne.odbiorca, ...czesciowe.odbiorca },
    faktura: { ...obecne.faktura, ...czesciowe.faktura },
    koordynatorKlienta: { ...obecne.koordynatorKlienta, ...czesciowe.koordynatorKlienta },
    odbiorcaPaczki: { ...obecne.odbiorcaPaczki, ...czesciowe.odbiorcaPaczki },
    dokumentacja: { ...obecne.dokumentacja, ...czesciowe.dokumentacja },
    logotypy: { ...obecne.logotypy, ...czesciowe.logotypy },
    dodatkoweWymogi: { ...obecne.dodatkoweWymogi, ...czesciowe.dodatkoweWymogi },
    uwagi: { ...obecne.uwagi, ...czesciowe.uwagi },
  }
}

function scalGrupe(obecna: GrupaSzkoleniowa, czesciowa: Partial<GrupaSzkoleniowa>): GrupaSzkoleniowa {
  const grupa = {
    ...obecna,
    ...czesciowa,
    dokumentacja: { ...obecna.dokumentacja, ...czesciowa.dokumentacja },
    koordynatorKlienta: { ...obecna.koordynatorKlienta, ...czesciowa.koordynatorKlienta },
    odbiorcaPaczki: { ...obecna.odbiorcaPaczki, ...czesciowa.odbiorcaPaczki },
    trenerzy: czesciowa.trenerzy ?? obecna.trenerzy,
    uczestnicy: czesciowa.uczestnicy ?? obecna.uczestnicy,
  }

  return {
    ...grupa,
    cenaBrutto: policzCenaBrutto(grupa.cenaNetto, grupa.vat),
  }
}

function pobierzStanPoczatkowy() {
  const wersja = pobierzAktualnaWersjeRobocza()

  if (wersja) {
    return {
      dane: wersja.dane,
      grupy: wersja.grupy.length ? wersja.grupy : [klonujGrupePoczatkowa()],
      adresaci: wersja.adresaci,
      statusyPol: wersja.statusyPol,
    }
  }

  return {
    dane: klonujDanePoczatkowe(),
    grupy: [klonujGrupePoczatkowa()],
    adresaci: { ...poczatkowiAdresaci },
    statusyPol: {},
  }
}

function znajdzAdresatowZGrup(wybraneGrupy: string[]) {
  return grupyAdresatow
    .filter((grupa) => wybraneGrupy.includes(grupa.id))
    .flatMap((grupa) => grupa.adresaci)
}

function polaczAdresatow(adresaci: DaneAdresatow, dane: DaneFormularza, grupy: GrupaSzkoleniowa[]) {
  const reczni = adresaci.reczniAdresaci
    .split(/[;,\s]+/)
    .map((adres) => adres.trim())
    .filter(Boolean)
  const zGrup = znajdzAdresatowZGrup(adresaci.wybraneGrupy)
  const zFormularza = [
    dane.faktura.email,
    dane.koordynatorKlienta.email,
    dane.odbiorcaPaczki.email,
    ...grupy.flatMap((grupa) => grupa.trenerzy.map((trener) => trener.email)),
  ].filter(Boolean)

  return Array.from(new Set([...reczni, ...zGrup, ...zFormularza]))
}

function czyTrenerPrzypisany(uzytkownik: LokalnyUzytkownik, grupy: GrupaSzkoleniowa[]) {
  return Boolean(uzytkownik.trenerId && grupy.some((grupa) => grupa.trenerzy.some((trener) => trener.id === uzytkownik.trenerId)))
}

export function useGeneratorSzczegolow() {
  const stanPoczatkowy = useMemo(() => pobierzStanPoczatkowy(), [])
  const [daneFormularza, ustawDaneFormularza] = useState(stanPoczatkowy.dane)
  const [grupy, ustawGrupy] = useState(stanPoczatkowy.grupy)
  const [adresaci, ustawAdresaci] = useState(stanPoczatkowy.adresaci)
  const [statusyPol, ustawStatusyPol] = useState<StatusyPolImportu>(stanPoczatkowy.statusyPol)
  const [trescMaila, ustawTrescMaila] = useState('')
  const [rozpoznaneObszary, ustawRozpoznaneObszary] = useState<string[]>([])
  const [komunikat, ustawKomunikat] = useState('Generator gotowy.')
  const [aktywnyUzytkownikId, ustawAktywnyUzytkownikId] = useState(lokalniUzytkownicy[0].id)
  const [trenerzyKartoteki, ustawTrenerzyKartoteki] = useState<TrenerKartoteki[]>(trenerzyKartotekiStartowi)
  const [kopieRobocze, ustawKopieRobocze] = useState(pobierzKopieRobocze)
  const aktywnyUzytkownik = lokalniUzytkownicy.find((uzytkownik) => uzytkownik.id === aktywnyUzytkownikId) ?? lokalniUzytkownicy[0]
  const wszyscyAdresaci = useMemo(() => polaczAdresatow(adresaci, daneFormularza, grupy), [adresaci, daneFormularza, grupy])
  const podgladSzczegolow = useMemo(() => utworzTekstSzczegolow(daneFormularza, grupy), [daneFormularza, grupy])

  function oznaczPoleRecznie(pole: string) {
    ustawStatusyPol((obecne) => ({ ...obecne, [pole]: 'reczne' }))
  }

  function aktualizujDane(aktualizacja: (dane: DaneFormularza) => DaneFormularza, pole?: string) {
    ustawDaneFormularza((obecne) => aktualizacja(obecne))

    if (pole) {
      oznaczPoleRecznie(pole)
    }
  }

  function aktualizujGrupe(id: string, aktualizacja: (grupa: GrupaSzkoleniowa) => GrupaSzkoleniowa, pole?: string) {
    ustawGrupy((obecne) =>
      obecne.map((grupa) => {
        if (grupa.id !== id) {
          return grupa
        }

        const nastepna = aktualizacja(grupa)
        return {
          ...nastepna,
          cenaBrutto: policzCenaBrutto(nastepna.cenaNetto, nastepna.vat),
        }
      }),
    )

    if (pole) {
      oznaczPoleRecznie(pole)
    }
  }

  function dodajGrupe() {
    ustawGrupy((obecne) => [...obecne, utworzPoczatkowaGrupe(obecne.length + 1)])
  }

  function usunGrupe(id: string) {
    ustawGrupy((obecne) => (obecne.length > 1 ? obecne.filter((grupa) => grupa.id !== id) : obecne))
  }

  function dodajTreneraDoKartoteki(trener: Omit<TrenerKartoteki, 'id'>) {
    const nowyTrener = {
      ...trener,
      id: `trener-${Date.now()}`,
    }
    ustawTrenerzyKartoteki((obecne) => [...obecne, nowyTrener])
    ustawKomunikat('Dodano trenera do lokalnej kartoteki testowej.')
    return nowyTrener
  }

  function dodajTreneraDoGrupy(idGrupy: string, trener: TrenerKartoteki) {
    const trenerGrupy: TrenerGrupy = {
      id: trener.id,
      imieNazwisko: trener.imieNazwisko,
      telefon: trener.telefon,
      email: trener.email,
    }

    aktualizujGrupe(
      idGrupy,
      (grupa) => ({
        ...grupa,
        trenerzy: grupa.trenerzy.some((obecny) => obecny.id === trener.id)
          ? grupa.trenerzy
          : [...grupa.trenerzy, trenerGrupy],
      }),
      'grupy.0.trenerzy',
    )
  }

  function usunTreneraZGrupy(idGrupy: string, idTrenera: string) {
    aktualizujGrupe(idGrupy, (grupa) => ({
      ...grupa,
      trenerzy: grupa.trenerzy.filter((trener) => trener.id !== idTrenera),
    }))
  }

  function zastosujTreneraDoWszystkichGrup(trener: TrenerGrupy) {
    ustawGrupy((obecne) =>
      obecne.map((grupa) => ({
        ...grupa,
        czyTrenerSzkoliKazdaGrupe: true,
        trenerzy: grupa.trenerzy.some((obecny) => obecny.id === trener.id) ? grupa.trenerzy : [...grupa.trenerzy, trener],
      })),
    )
  }

  function zastosujDokumentacjeDoKazdejGrupy() {
    ustawGrupy((obecne) =>
      obecne.map((grupa) => ({
        ...grupa,
        dokumentacja: { ...daneFormularza.dokumentacja },
      })),
    )
    ustawKomunikat('Zastosowano ustawienia dokumentacji do każdej grupy.')
  }

  function obsluzImportMaila() {
    if (!trescMaila.trim()) {
      ustawKomunikat('Wklej treść maila przed importem.')
      return
    }

    const wynik = parsujMailaSzczegolow(trescMaila)
    ustawDaneFormularza((obecne) => scalDaneFormularza(obecne, wynik.daneFormularza))
    ustawGrupy((obecne) => {
      const pierwsza = scalGrupe(obecne[0] ?? klonujGrupePoczatkowa(), wynik.pierwszaGrupa)
      return [pierwsza, ...obecne.slice(1)]
    })
    ustawRozpoznaneObszary(wynik.rozpoznaneObszary)
    ustawStatusyPol(() => {
      const statusy: StatusyPolImportu = {}
      polaWymaganePoImporcie.forEach((pole) => {
        statusy[pole] = 'brak'
      })
      wynik.rozpoznanePola.forEach((pole) => {
        statusy[pole] = 'zaimportowane'
      })
      wynik.polaNiepewne.forEach((pole) => {
        statusy[pole] = 'niepewne'
      })
      return statusy
    })
    ustawKomunikat(`Import zakończony. Rozpoznano obszary: ${wynik.rozpoznaneObszary.length}.`)
  }

  function zapiszWersje() {
    const wersja = zbudujWersjeRobocza(daneFormularza, grupy, adresaci, statusyPol)
    zapiszWersjeRobocza(wersja)
    ustawKopieRobocze(pobierzKopieRobocze())
    ustawKomunikat('Zapisano wersję roboczą lokalnie.')
  }

  function wczytajWersje(wersja: WersjaRoboczaGeneratora) {
    ustawDaneFormularza(wersja.dane)
    ustawGrupy(wersja.grupy.length ? wersja.grupy : [klonujGrupePoczatkowa()])
    ustawAdresaci(wersja.adresaci)
    ustawStatusyPol(wersja.statusyPol)
    ustawKomunikat('Wczytano kopię roboczą.')
  }

  function wyczyscFormularz() {
    ustawDaneFormularza(klonujDanePoczatkowe())
    ustawGrupy([klonujGrupePoczatkowa()])
    ustawAdresaci({ ...poczatkowiAdresaci })
    ustawStatusyPol({})
    ustawRozpoznaneObszary([])
    ustawTrescMaila('')
    wyczyscAktualnaWersjeRobocza()
    ustawKomunikat('Wyczyszczono formularz i aktualny szkic.')
  }

  function importujJson(zawartosc: string) {
    try {
      const wersja = JSON.parse(zawartosc) as WersjaRoboczaGeneratora
      if (!wersja.dane || !wersja.grupy) {
        ustawKomunikat('Plik JSON nie wygląda jak wersja robocza generatora.')
        return
      }

      wczytajWersje(wersja)
    } catch {
      ustawKomunikat('Nie udało się odczytać JSON.')
    }
  }

  function eksportujJson() {
    const wersja = zbudujWersjeRobocza(daneFormularza, grupy, adresaci, statusyPol)
    const blob = new Blob([JSON.stringify(wersja, null, 2)], { type: 'application/json;charset=utf-8' })
    const adres = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = adres
    link.download = 'wersja-robocza-szczegolow.json'
    link.click()
    URL.revokeObjectURL(adres)
  }

  function eksportujDoc() {
    pobierzDokumentSzczegolow(daneFormularza, grupy)
    ustawKomunikat('Pobrano plik DOC ze szczegółami.')
  }

  function drukujPdf() {
    window.print()
  }

  function wprowadzSzkolenie() {
    ustawDaneFormularza((obecne) => ({
      ...obecne,
      status: obecne.status === 'NIEPEŁNE' ? 'OCZEKUJĄCE' : obecne.status,
    }))
    ustawKomunikat('Szkolenie oznaczono lokalnie jako gotowe do wprowadzenia. Backend nie jest jeszcze podłączony.')
  }

  function utworzLinkMailto() {
    const temat = encodeURIComponent(`Szczegóły organizacyjne: ${daneFormularza.tytulSzkolenia || 'szkolenie'}`)
    const tresc = encodeURIComponent(adresaci.trybTresci === 'tylko zmiany' ? podgladSzczegolow : utworzTekstSzczegolow(daneFormularza, grupy))
    const adresy = wszyscyAdresaci.join(',')
    return `mailto:${adresy}?subject=${temat}&body=${tresc}`
  }

  function pokazKomunikatImportuDokumentow() {
    ustawKomunikat('Import Word/PDF czeka na parser dokumentów.')
  }

  function czyWidocznaUwaga(typUwagi: keyof DaneFormularza['uwagi']) {
    if (typUwagi === 'informacjeNiepewne') {
      return aktywnyUzytkownik.czyPracownik
    }

    if (typUwagi === 'opiekuna') {
      return aktywnyUzytkownik.czyOpiekunSzkolenia
    }

    if (typUwagi === 'dlaKlienta') {
      return aktywnyUzytkownik.czyPracownik || aktywnyUzytkownik.rola === 'Koordynator klienta'
    }

    if (typUwagi === 'dlaTrenera') {
      return aktywnyUzytkownik.czyPracownik || czyTrenerPrzypisany(aktywnyUzytkownik, grupy)
    }

    if (typUwagi === 'dlaWysylaczy') {
      return aktywnyUzytkownik.czyOpiekunSzkolenia || aktywnyUzytkownik.odznaki.includes('Wysyłacz')
    }

    return aktywnyUzytkownik.czyPracownik
  }

  return {
    daneFormularza,
    grupy,
    adresaci,
    statusyPol,
    trescMaila,
    rozpoznaneObszary,
    komunikat,
    lokalniUzytkownicy,
    aktywnyUzytkownik,
    aktywnyUzytkownikId,
    trenerzyKartoteki,
    kopieRobocze,
    wszyscyAdresaci,
    podgladSzczegolow,
    ustawTrescMaila,
    ustawAdresaci,
    ustawAktywnyUzytkownikId,
    aktualizujDane,
    aktualizujGrupe,
    dodajGrupe,
    usunGrupe,
    dodajTreneraDoKartoteki,
    dodajTreneraDoGrupy,
    usunTreneraZGrupy,
    zastosujTreneraDoWszystkichGrup,
    zastosujDokumentacjeDoKazdejGrupy,
    obsluzImportMaila,
    zapiszWersje,
    wczytajWersje,
    wyczyscFormularz,
    importujJson,
    eksportujJson,
    eksportujDoc,
    drukujPdf,
    wprowadzSzkolenie,
    utworzLinkMailto,
    pokazKomunikatImportuDokumentow,
    czyWidocznaUwaga,
  }
}
