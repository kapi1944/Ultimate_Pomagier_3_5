import { czyDokumentMaNowszeDaneZrodlowe, type Dokument, type TypDokumentu } from '../../dokumenty/modelDokumentu'
import { repozytoriumWspolnychDokumentow } from '../../dokumenty/rejestrDokumentow'
import { zapiszDokumentRoboczyGeneratora } from '../../dokumenty/zapisDokumentuGeneratora'
import { utworzUstawieniaUkladuDokumentu } from '../../dokumenty/ustawieniaUkladuDokumentu'
import { utworzChecklistePaczkiZeZrodla } from '../../../moduly/dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek'
import { serializujDaneAnkiety, utworzDaneAnkietyZKontekstu } from '../../../moduly/dokumenty/generatory/ankiety/modelAnkiety'
import { zbudujDaneSeryjnychDyplomow } from '../../../moduly/dokumenty/generatory/dyplomy/modelSeryjnychDyplomow'
import { serializujDaneKartyNaDrzwi, utworzKartyZGrupISal, utworzUstawieniaBazowegoSzablonu } from '../../../moduly/dokumenty/generatory/karta_na_drzwi/modelKartyNaDrzwi'
import { utworzListeObecnosciZeSzczegolow } from '../../../moduly/dokumenty/generatory/listy_obecnosci/rejestrListObecnosci'
import { domyslnyProgramSzkolenia } from '../../../moduly/dokumenty/generatory/programy_szkolen/modelProgramuSzkolenia'
import { importujTekstProgramu, zastosujZaakceptowaneZmianyImportuProgramu } from '../../../moduly/dokumenty/generatory/programy_szkolen/pipelineImportuProgramu'
import { parsujTekstProgramu } from '../../../moduly/dokumenty/generatory/programy_szkolen/ParserTekstu'
import { zapiszProgramWRejestrze } from '../../../moduly/dokumenty/generatory/programy_szkolen/rejestrProgramowSzkolen'
import { pobierzNazweOpiekuna } from '../../../moduly/zamkniete/szczegoly_organizacyjne/uzytkownicySzczegolow'
import type { WersjaRoboczaGeneratora } from '../../../moduly/zamkniete/szczegoly_organizacyjne/typy'
import { przygotujZrodloZWersjiRoboczej, zbudujKontekstZeSzczegolow } from './zbudujKontekstZeSzczegolow'

export type RodzajDokumentuZeSzczegolow = 'program' | 'lista' | 'ankieta' | 'dyplomy' | 'karty' | 'checklista'

export type WynikUtworzeniaDokumentu = {
  rodzaj: RodzajDokumentuZeSzczegolow
  etykieta: string
  grupaId: string | null
  status: 'utworzono' | 'istnieje' | 'pomieto' | 'blad'
  dokument: Dokument<unknown, unknown> | null
  komunikat: string
}

export const etykietyDokumentowZeSzczegolow: Record<RodzajDokumentuZeSzczegolow, string> = {
  program: 'Program szkolenia',
  lista: 'Lista obecności',
  ankieta: 'Ankieta',
  dyplomy: 'Dyplomy / Certyfikaty',
  karty: 'Karta na drzwi',
  checklista: 'Checklista paczek',
}

export const rodzajePakietuPodstawowego: RodzajDokumentuZeSzczegolow[] = ['program', 'lista', 'ankieta', 'dyplomy']
export const rodzajeDokumentowDodatkowych: RodzajDokumentuZeSzczegolow[] = ['karty', 'checklista']
export const rodzajeWszystkichDokumentow: RodzajDokumentuZeSzczegolow[] = [...rodzajePakietuPodstawowego, ...rodzajeDokumentowDodatkowych]

const typyRodzajow: Record<RodzajDokumentuZeSzczegolow, TypDokumentu[]> = {
  program: ['PROGRAM_SZKOLENIA'],
  lista: ['LISTA_OBECNOSCI'],
  ankieta: ['ANKIETA'],
  dyplomy: ['CERTYFIKAT', 'ZASWIADCZENIE', 'DYPLOM'],
  karty: ['KARTA_NA_DRZWI'],
  checklista: ['CHECKLISTA_PACZKI'],
}

export function pobierzRodzajDokumentuZeSzczegolow(typ: TypDokumentu) {
  return (Object.entries(typyRodzajow) as Array<[RodzajDokumentuZeSzczegolow, TypDokumentu[]]>).find(([, typy]) => typy.includes(typ))?.[0] ?? null
}

export function czyDokumentJestGrupowy(rodzaj: RodzajDokumentuZeSzczegolow) {
  return rodzaj === 'lista' || rodzaj === 'ankieta' || rodzaj === 'dyplomy' || rodzaj === 'checklista'
}

export function pobierzDokumentyPowiazaneZeSzczegolami(szczegolyId: string) {
  return repozytoriumWspolnychDokumentow.pobierzWszystkie().filter((dokument) =>
    !dokument.czyUsunietyMiekko
    && (dokument.powiazania.szczegolyOrganizacyjneId === szczegolyId || dokument.integralnosc.idZrodlowychSzczegolow === szczegolyId),
  )
}

export function pobierzIstniejacyDokument(szczegolyId: string, rodzaj: RodzajDokumentuZeSzczegolow, grupaId: string | null) {
  return pobierzDokumentyPowiazaneZeSzczegolami(szczegolyId).find((dokument) =>
    typyRodzajow[rodzaj].includes(dokument.typ)
    && (!czyDokumentJestGrupowy(rodzaj) || dokument.powiazania.grupaId === grupaId),
  ) ?? null
}

export function pobierzStanDokumentuZeSzczegolow(wersja: WersjaRoboczaGeneratora, rodzaj: RodzajDokumentuZeSzczegolow, grupaId: string | null) {
  const kontekst = zbudujKontekstZeSzczegolow(przygotujZrodloZWersjiRoboczej(wersja))
  const dokument = pobierzIstniejacyDokument(kontekst.zrodlo.szczegolyOrganizacyjneId, rodzaj, grupaId)
  if (!dokument) return { stan: 'brak' as const, dokument: null }
  return {
    stan: czyDokumentMaNowszeDaneZrodlowe(dokument, kontekst.zrodlo.odciskDanych) ? 'wymaga_aktualizacji' as const : 'istnieje' as const,
    dokument,
  }
}

function zbudujPowiazania(wersja: WersjaRoboczaGeneratora, grupaId: string | null) {
  const kontekst = zbudujKontekstZeSzczegolow(przygotujZrodloZWersjiRoboczej(wersja))
  return {
    kontekst,
    powiazania: {
      szkolenieId: kontekst.szkolenie.id,
      grupaId,
      klientId: kontekst.klient.id,
      organizatorId: kontekst.organizator.id,
      szczegolyOrganizacyjneId: kontekst.zrodlo.szczegolyOrganizacyjneId,
      wersjaSzczegolowId: kontekst.zrodlo.wersjaSzczegolowId,
      odciskDanychZrodlowych: kontekst.zrodlo.odciskDanych,
    },
    integralnosc: {
      powiazanieZeSzczegolami: 'POWIAZANY_ZE_SZCZEGOLAMI' as const,
      idZrodlowychSzczegolow: kontekst.zrodlo.szczegolyOrganizacyjneId,
      znacznikDanychZrodlowych: kontekst.zrodlo.odciskDanych,
      reczneNadpisania: {},
    },
  }
}

function wynikPominiecia(rodzaj: RodzajDokumentuZeSzczegolow, grupaId: string | null, komunikat: string): WynikUtworzeniaDokumentu {
  return { rodzaj, etykieta: etykietyDokumentowZeSzczegolow[rodzaj], grupaId, status: 'pomieto', dokument: null, komunikat }
}

function wynikBledu(rodzaj: RodzajDokumentuZeSzczegolow, grupaId: string | null, blad: unknown): WynikUtworzeniaDokumentu {
  return {
    rodzaj,
    etykieta: etykietyDokumentowZeSzczegolow[rodzaj],
    grupaId,
    status: 'blad',
    dokument: null,
    komunikat: blad instanceof Error ? blad.message : 'Nieznany błąd tworzenia dokumentu',
  }
}

export function utworzDokumentZeSzczegolow(wersja: WersjaRoboczaGeneratora, rodzaj: RodzajDokumentuZeSzczegolow, grupaId: string | null, uzytkownikId: string | null): WynikUtworzeniaDokumentu {
  const { kontekst, powiazania, integralnosc } = zbudujPowiazania(wersja, grupaId)
  const istniejacy = pobierzIstniejacyDokument(kontekst.zrodlo.szczegolyOrganizacyjneId, rodzaj, grupaId)
  if (istniejacy) return { rodzaj, etykieta: etykietyDokumentowZeSzczegolow[rodzaj], grupaId, status: 'istnieje', dokument: istniejacy, komunikat: 'Już istnieje' }

  if (czyDokumentJestGrupowy(rodzaj) && (!grupaId || !kontekst.grupy.some((grupa) => grupa.id === grupaId))) {
    return wynikPominiecia(rodzaj, grupaId, 'Brak grupy')
  }

  if (rodzaj === 'lista') {
    const wynik = utworzListeObecnosciZeSzczegolow(kontekst, grupaId!)
    return wynik.status === 'brak_grupy'
      ? wynikPominiecia(rodzaj, grupaId, 'Brak grupy')
      : { rodzaj, etykieta: etykietyDokumentowZeSzczegolow[rodzaj], grupaId, status: wynik.status, dokument: wynik.dokument, komunikat: wynik.status === 'utworzono' ? 'Utworzono' : 'Już istnieje' }
  }

  if (rodzaj === 'program') {
    const wynikImportu = importujTekstProgramu(wersja.dane.programSzkolenia)
    const pola = wynikImportu.propozycje.map((propozycja) => propozycja.pole)
    const model = zastosujZaakceptowaneZmianyImportuProgramu({ ...domyslnyProgramSzkolenia, tytulSzkolenia: kontekst.szkolenie.tytul, ustawienia: { ...domyslnyProgramSzkolenia.ustawienia, profilFirmy: kontekst.organizator.marka?.toUpperCase() === 'IIST' ? 'iist' : 'semper' } }, wynikImportu, 'UZUPELNIJ', pola).model
    const program = parsujTekstProgramu(model.trescProgramu)
    const dokument = zapiszProgramWRejestrze({ tryb: 'zapisz', tytul: model.tytulSzkolenia, statusBiznesowy: 'robocza', daneDokumentu: model, uzytkownikId: uzytkownikId ?? undefined, powiazania, integralnosc, metadane: { organizator: model.ustawienia.profilFirmy === 'iist' ? 'IIST' : 'SEMPER', liczbaDni: program.dni.length, liczbaModulow: program.dni.reduce((suma, dzien) => suma + dzien.moduly.length, 0), klient: kontekst.klient.nazwa ?? undefined, szkolenieId: kontekst.szkolenie.id ?? undefined, dataSzkolenia: kontekst.grupy[0]?.daty[0], zrodloProgramu: 'Szczegóły organizacyjne', czyWynikParsowaniaZatwierdzony: model.czyWynikParsowaniaZatwierdzony } })
    return { rodzaj, etykieta: etykietyDokumentowZeSzczegolow[rodzaj], grupaId: null, status: 'utworzono', dokument, komunikat: 'Utworzono' }
  }

  if (rodzaj === 'ankieta') {
    const dane = utworzDaneAnkietyZKontekstu(kontekst, grupaId)
    const dokument = zapiszDokumentRoboczyGeneratora({ typ: 'ANKIETA', generatorId: 'ankiety', tytul: `Ankieta — ${dane.tytulSzkolenia}`, daneDokumentu: { tekst: serializujDaneAnkiety(dane), ankieta: dane }, ustawieniaDokumentu: { wariantSzablonu: dane.wariantSzablonu, preset: dane.preset, ukladDokumentu: utworzUstawieniaUkladuDokumentu(dane.blokiSwobodne) }, autorId: uzytkownikId, wlascicielId: uzytkownikId, powiazania, integralnosc })
    return { rodzaj, etykieta: etykietyDokumentowZeSzczegolow[rodzaj], grupaId, status: 'utworzono', dokument, komunikat: 'Utworzono' }
  }

  if (rodzaj === 'dyplomy') {
    const daneSeryjne = zbudujDaneSeryjnychDyplomow(kontekst, grupaId!)
    if (!daneSeryjne) return wynikPominiecia(rodzaj, grupaId, 'Brak grupy')
    const daneDokumentu = { trybTytulu: 'certyfikat', szczegolyOrganizacyjneId: kontekst.zrodlo.szczegolyOrganizacyjneId, grupaId, tytulSzkolenia: daneSeryjne.tytulSzkolenia, trybSzkolenia: daneSeryjne.trybSzkolenia, miejsceSzkolenia: daneSeryjne.miejsceSzkolenia, trener: daneSeryjne.trener, liczbaGodzin: daneSeryjne.liczbaGodzin ?? '', wybraneDaty: daneSeryjne.daty, miesiacKalendarza: daneSeryjne.daty[0]?.slice(0, 7) ?? '', uczestnicyTekst: daneSeryjne.uczestnicy.join('\n'), motywKoloru: daneSeryjne.organizator === 'IIST' ? 'iist' : 'semper', wariantSzablonu: 'CRM' }
    const dokument = zapiszDokumentRoboczyGeneratora({ typ: 'CERTYFIKAT', generatorId: 'dyplomy', tytul: `Certyfikaty — ${daneSeryjne.tytulSzkolenia}`, daneDokumentu, ustawieniaDokumentu: { motywKoloru: daneDokumentu.motywKoloru, trybTytulu: 'certyfikat' }, autorId: uzytkownikId, wlascicielId: uzytkownikId, powiazania, integralnosc })
    return { rodzaj, etykieta: etykietyDokumentowZeSzczegolow[rodzaj], grupaId, status: 'utworzono', dokument, komunikat: 'Utworzono' }
  }

  if (rodzaj === 'karty') {
    const karty = utworzKartyZGrupISal(kontekst, pobierzNazweOpiekuna(wersja.dane.opiekunId))
    if (!karty.length) return wynikPominiecia(rodzaj, null, 'Brak grupy lub sali')
    const ustawieniaSzablonu = utworzUstawieniaBazowegoSzablonu()
    const dane = { wersjaSchematu: 4 as const, zestaw: { szczegolyOrganizacyjneId: kontekst.zrodlo.szczegolyOrganizacyjneId, nazwaZestawu: `Karty — ${karty[0].tytulSzkolenia}`, kartaZaznaczonaId: karty[0].id }, karty, ustawieniaSzablonu }
    const dokument = zapiszDokumentRoboczyGeneratora({ typ: 'KARTA_NA_DRZWI', generatorId: 'karta_na_drzwi', tytul: `Karty na drzwi — ${karty[0].tytulSzkolenia}`, daneDokumentu: { tekst: serializujDaneKartyNaDrzwi(dane), kartaNaDrzwi: dane }, ustawieniaDokumentu: { orientacja: ustawieniaSzablonu.orientacja, ukladDokumentu: utworzUstawieniaUkladuDokumentu(ustawieniaSzablonu.blokiSwobodne) }, autorId: uzytkownikId, wlascicielId: uzytkownikId, powiazania: { ...powiazania, grupaId: null }, integralnosc })
    return { rodzaj, etykieta: etykietyDokumentowZeSzczegolow[rodzaj], grupaId: null, status: 'utworzono', dokument, komunikat: 'Utworzono' }
  }

  const odbiorca = wersja.dane.odbiorcaPaczki
  const dokument = utworzChecklistePaczkiZeZrodla(kontekst, grupaId!, { opiekunId: wersja.dane.opiekunId, finansowanie: wersja.dane.dodatkoweWymogi.uwagiDodatkowe, odbiorca: { ...odbiorca, zrodloPropozycji: null } }, uzytkownikId)
  if (!dokument) return wynikPominiecia(rodzaj, grupaId, 'Brak grupy')
  repozytoriumWspolnychDokumentow.aktualizuj(dokument.id, {
    powiazania: { ...dokument.powiazania, ...powiazania },
    integralnosc: { ...dokument.integralnosc, ...integralnosc },
  })
  return { rodzaj, etykieta: etykietyDokumentowZeSzczegolow[rodzaj], grupaId, status: 'utworzono', dokument: repozytoriumWspolnychDokumentow.pobierzPoId(dokument.id), komunikat: 'Utworzono' }
}

export function utworzPakietDokumentow(wersja: WersjaRoboczaGeneratora, rodzaje: RodzajDokumentuZeSzczegolow[], uzytkownikId: string | null) {
  return rodzaje.flatMap((rodzaj) => {
    const grupyId = czyDokumentJestGrupowy(rodzaj)
      ? (wersja.grupy.length ? wersja.grupy.map((grupa) => grupa.id) : [null])
      : [null]

    return grupyId.map((grupaId) => {
      if (czyDokumentJestGrupowy(rodzaj) && !grupaId) return wynikPominiecia(rodzaj, null, 'Brak grupy')
      try {
        return utworzDokumentZeSzczegolow(wersja, rodzaj, grupaId, uzytkownikId)
      } catch (blad) {
        return wynikBledu(rodzaj, grupaId, blad)
      }
    })
  })
}
