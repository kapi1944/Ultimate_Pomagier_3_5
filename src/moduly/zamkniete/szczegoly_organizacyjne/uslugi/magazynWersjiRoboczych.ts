import type {
  DaneAdresatow,
  DaneFormularza,
  GrupaSzkoleniowa,
  KopiaRoboczaSzkolenia,
  StatusyPolImportu,
  WersjaRoboczaGeneratora,
} from '../typy'

const kluczAktualnejWersji = 'ultimatePomagier.szczegolyOrganizacyjne.aktualnaWersja'
const kluczKopiiRoboczych = 'ultimatePomagier.szczegolyOrganizacyjne.kopieRobocze'

function bezpiecznieParsuj<Typ>(wartosc: string | null, fallback: Typ): Typ {
  if (!wartosc) {
    return fallback
  }

  try {
    return JSON.parse(wartosc) as Typ
  } catch {
    return fallback
  }
}

export function pobierzAktualnaWersjeRobocza() {
  return bezpiecznieParsuj<WersjaRoboczaGeneratora | null>(localStorage.getItem(kluczAktualnejWersji), null)
}

export function pobierzKopieRobocze() {
  return bezpiecznieParsuj<KopiaRoboczaSzkolenia[]>(localStorage.getItem(kluczKopiiRoboczych), [])
}

export function utworzNazweKopiiRoboczej(dane: DaneFormularza, grupy: GrupaSzkoleniowa[]) {
  const data = new Date().toLocaleString('pl-PL')
  const tytul = dane.tytulSzkolenia.trim() || 'bez tytułu'
  const klient = dane.nabywca.nazwa.trim() || 'bez klienta'
  const trener = grupy[0]?.trenerzy[0]?.imieNazwisko || 'bez trenera'

  return `${data} | ${tytul} | ${trener} | ${klient}`
}

export function zbudujWersjeRobocza(
  dane: DaneFormularza,
  grupy: GrupaSzkoleniowa[],
  adresaci: DaneAdresatow,
  statusyPol: StatusyPolImportu,
): WersjaRoboczaGeneratora {
  return {
    id: `wersja-${Date.now()}`,
    nazwa: utworzNazweKopiiRoboczej(dane, grupy),
    dataZapisu: new Date().toISOString(),
    dane,
    grupy,
    adresaci,
    statusyPol,
  }
}

export function zapiszWersjeRobocza(wersja: WersjaRoboczaGeneratora) {
  localStorage.setItem(kluczAktualnejWersji, JSON.stringify(wersja))

  const kopie = pobierzKopieRobocze()
  const noweKopie = [wersja, ...kopie].slice(0, 20)
  localStorage.setItem(kluczKopiiRoboczych, JSON.stringify(noweKopie))
}

export function wyczyscAktualnaWersjeRobocza() {
  localStorage.removeItem(kluczAktualnejWersji)
}
