import { czyMozeWysylac } from '../../../../kartoteki/uzytkownicy/uprawnienia'
import { pobierzUzytkownika } from '../../../../kartoteki/uzytkownicy/magazynUzytkownikow'
import { pobierzChecklistePaczki, pobierzChecklistyPaczek, pobierzSzczegolyDoChecklisty, utworzChecklistePaczkiZeZrodla, zapiszChecklistePaczki } from '../../../dokumenty/generatory/checklisty_paczek/rejestrChecklistPaczek'
import { zbudujKontekstZeSzczegolow } from '../../../../wspolne/integracje/szczegolyDoDokumentow/zbudujKontekstZeSzczegolow'
import type { WysylkaMonitora } from '../logika/monitorWysylek'

export function otworzLubUtworzChecklistePulpitu(wysylka: WysylkaMonitora, uzytkownikId: string | null) {
  if (wysylka.checklistaId) return pobierzChecklistePaczki(wysylka.checklistaId)
  // Ponowny odczyt chroni przed duplikacją po utworzeniu checklisty w innej karcie.
  const istniejaca = pobierzChecklistyPaczek().find((dokument) => !dokument.czyUsunietyMiekko
    && [wysylka.szczegolyId, wysylka.zrodloSzczegolowId].includes(dokument.daneDokumentu.szczegolyOrganizacyjneId ?? '')
    && dokument.daneDokumentu.grupaId === wysylka.grupaId)
  if (istniejaca) return istniejaca
  const szczegoly = pobierzSzczegolyDoChecklisty().find((rekord) => rekord.id === wysylka.szczegolyId)
  if (!szczegoly || !szczegoly.grupy.some((grupa) => grupa.id === wysylka.grupaId)) return null
  return utworzChecklistePaczkiZeZrodla(zbudujKontekstZeSzczegolow(szczegoly.zrodloKontekstu), wysylka.grupaId, {
    opiekunId: szczegoly.opiekunId,
    finansowanie: szczegoly.dane.dodatkoweWymogi.kfs ? 'KFS' : '',
    odbiorca: { ...szczegoly.dane.odbiorcaPaczki, zrodloPropozycji: 'Szczegóły organizacyjne' },
    logotypy: szczegoly.dane.logotypy.nazwaPliku ? [{ nazwa: szczegoly.dane.logotypy.nazwaPliku, podglad: szczegoly.dane.logotypy.podglad }] : [],
  }, uzytkownikId)
}

export function oznaczWysylkeChecklisty(wysylka: WysylkaMonitora, uzytkownikId: string | null) {
  if (!uzytkownikId || !czyMozeWysylac(pobierzUzytkownika(uzytkownikId))) return null
  const dokument = wysylka.checklistaId ? pobierzChecklistePaczki(wysylka.checklistaId) : null
  if (!dokument || dokument.czyUsunietyMiekko || dokument.czyZarchiwizowany
    || ['WYDRUKOWANA', 'KOMPLETNA', 'ZARCHIWIZOWANA'].includes(dokument.daneDokumentu.statusChecklisty)
    || dokument.daneDokumentu.wersjeWydruku.length) return null
  const dane = dokument.daneDokumentu
  if (dane.grupaId !== wysylka.grupaId || ![wysylka.szczegolyId, wysylka.zrodloSzczegolowId].includes(dane.szczegolyOrganizacyjneId ?? '')) return null
  const paczka = dane.paczki.find((obecna) => obecna.id === wysylka.paczkaId)
  if (!paczka) return null
  if (paczka.statusOperacyjny === 'WYSŁANA') return dokument
  return zapiszChecklistePaczki(dokument.id, { ...dane,
    paczki: dane.paczki.map((obecna) => obecna.id === paczka.id ? { ...obecna, statusOperacyjny: 'WYSŁANA' } : obecna),
  }, uzytkownikId, `Potwierdzono wysyłkę paczki: ${paczka.nazwa}.`)
}
