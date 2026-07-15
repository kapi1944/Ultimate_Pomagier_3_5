import type {
  KontekstDokumentuSzkolenia,
  ProblemWalidacjiKontekstu,
  WynikWalidacjiKontekstu,
} from './typyKontekstuDokumentu'

function utworzProblem(
  kod: string,
  komunikat: string,
  poziom: ProblemWalidacjiKontekstu['poziom'],
  sciezka: string | null = null,
  grupaId: string | null = null,
): ProblemWalidacjiKontekstu {
  return { kod, komunikat, poziom, sciezka, grupaId }
}

function zbudujWynik(bledy: ProblemWalidacjiKontekstu[], ostrzezenia: ProblemWalidacjiKontekstu[]): WynikWalidacjiKontekstu {
  return { poprawny: bledy.length === 0, bledy, ostrzezenia }
}

export function walidujKontekstDokumentu(kontekst: KontekstDokumentuSzkolenia): WynikWalidacjiKontekstu {
  const bledy: ProblemWalidacjiKontekstu[] = []
  const ostrzezenia: ProblemWalidacjiKontekstu[] = []
  const identyfikatoryGrup = new Set<string>()

  if (!kontekst.zrodlo.szczegolyOrganizacyjneId.trim()) {
    bledy.push(utworzProblem('BRAK_ID_SZCZEGOLÓW', 'Brak identyfikatora Szczegółów organizacyjnych.', 'blad', 'zrodlo.szczegolyOrganizacyjneId'))
  }

  if (!kontekst.zrodlo.zmodyfikowano.trim()) {
    bledy.push(utworzProblem('BRAK_DATY_ZRODLA', 'Brak daty modyfikacji danych źródłowych.', 'blad', 'zrodlo.zmodyfikowano'))
  }

  if (!kontekst.zrodlo.odciskDanych.trim()) {
    bledy.push(utworzProblem('BRAK_ODCISKU_DANYCH', 'Brak odcisku danych źródłowych.', 'blad', 'zrodlo.odciskDanych'))
  }

  kontekst.grupy.forEach((grupa, indeks) => {
    if (identyfikatoryGrup.has(grupa.id)) {
      bledy.push(utworzProblem('POWTORZONE_ID_GRUPY', 'Identyfikator grupy występuje więcej niż raz.', 'blad', `grupy.${indeks}.id`, grupa.id))
    }
    identyfikatoryGrup.add(grupa.id)
  })

  return zbudujWynik(bledy, ostrzezenia)
}

export function walidujKontekstListyObecnosci(
  kontekst: KontekstDokumentuSzkolenia,
  grupaId: string | null,
): WynikWalidacjiKontekstu {
  const wynikKontekstu = walidujKontekstDokumentu(kontekst)
  const bledy = [...wynikKontekstu.bledy]
  const ostrzezenia = [...wynikKontekstu.ostrzezenia]

  if (!kontekst.szkolenie.tytul.trim()) {
    bledy.push(utworzProblem('BRAK_TYTULU_SZKOLENIA', 'Brak tytułu szkolenia dla Listy obecności.', 'blad', 'szkolenie.tytul'))
  }

  if (!grupaId) {
    bledy.push(utworzProblem('BRAK_WYBRANEJ_GRUPY', 'Wybierz grupę dla Listy obecności.', 'blad', 'grupy'))
    return zbudujWynik(bledy, ostrzezenia)
  }

  const grupa = kontekst.grupy.find((kandydat) => kandydat.id === grupaId)
  if (!grupa) {
    bledy.push(utworzProblem('GRUPA_NIEISTNIEJE', 'Wybrana grupa nie istnieje w kontekście szkolenia.', 'blad', 'grupy', grupaId))
    return zbudujWynik(bledy, ostrzezenia)
  }

  if (!grupa.daty.length) {
    bledy.push(utworzProblem('BRAK_TERMINU_GRUPY', 'Wybrana grupa nie ma terminu szkolenia.', 'blad', 'daty', grupa.id))
  }

  if (!grupa.uczestnicy.length) {
    bledy.push(utworzProblem('BRAK_UCZESTNIKOW_GRUPY', 'Wybrana grupa nie ma uczestników.', 'blad', 'uczestnicy', grupa.id))
  }

  if (!grupa.trenerzy.length) {
    ostrzezenia.push(utworzProblem('BRAK_TRENERA', 'Brak trenera wybranej grupy.', 'ostrzezenie', 'trenerzy', grupa.id))
  }

  if (!grupa.lokalizacje.some((lokalizacja) => lokalizacja.trybOnline || Boolean(lokalizacja.nazwa))) {
    ostrzezenia.push(utworzProblem('BRAK_LOKALIZACJI', 'Brak lokalizacji wybranej grupy.', 'ostrzezenie', 'lokalizacje', grupa.id))
  }

  if (!kontekst.klient.nazwa) {
    ostrzezenia.push(utworzProblem('BRAK_KLIENTA', 'Brak klienta szkolenia.', 'ostrzezenie', 'klient'))
  }

  if (!kontekst.organizator.nazwa) {
    ostrzezenia.push(utworzProblem('BRAK_ORGANIZATORA', 'Brak organizatora szkolenia.', 'ostrzezenie', 'organizator'))
  }

  if (!kontekst.organizator.logoNazwaPliku && !kontekst.organizator.logoPodglad) {
    ostrzezenia.push(utworzProblem('BRAK_LOGO', 'Brak logo organizatora.', 'ostrzezenie', 'organizator.logo'))
  }

  grupa.uczestnicy.forEach((uczestnik, indeks) => {
    if (!uczestnik.imie.trim() || !uczestnik.nazwisko.trim() || !uczestnik.nazwaPelna.trim()) {
      ostrzezenia.push(utworzProblem('NIEPELNE_IMIE_I_NAZWISKO', 'Uczestnik nie ma pełnego imienia i nazwiska.', 'ostrzezenie', `uczestnicy.${indeks}`, grupa.id))
    }

    if (!uczestnik.email || !uczestnik.stanowisko) {
      ostrzezenia.push(utworzProblem('NIEPELNE_DANE_UCZESTNIKA', 'Uczestnik ma niepełne dane dodatkowe.', 'ostrzezenie', `uczestnicy.${indeks}`, grupa.id))
    }
  })

  return zbudujWynik(bledy, ostrzezenia)
}
