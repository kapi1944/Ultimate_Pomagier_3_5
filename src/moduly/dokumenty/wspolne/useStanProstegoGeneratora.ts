import { useCallback, useEffect, useState } from 'react'
import type { TypDokumentu } from '../../../wspolne/dokumenty/modelDokumentu'
import { zapiszDokumentRoboczyGeneratora } from '../../../wspolne/dokumenty/zapisDokumentuGeneratora'
import { useOchronaNiezapisanegoDokumentu, useStanDokumentu } from './useStanDokumentu'

export type KonfiguracjaStanuProstegoGeneratora = {
  typDokumentu: TypDokumentu
  generatorId: string
  tytulDokumentu: string
  kluczSzkicu: string
  danePoczatkowe: string
  uzytkownikId?: string
}

export function useStanProstegoGeneratora({
  danePoczatkowe,
  generatorId,
  kluczSzkicu,
  typDokumentu,
  tytulDokumentu,
  uzytkownikId,
}: KonfiguracjaStanuProstegoGeneratora) {
  const [daneWejsciowe, ustawDaneWejsciowe] = useState(() => localStorage.getItem(kluczSzkicu) ?? danePoczatkowe)
  const [idDokumentu, ustawIdDokumentu] = useState<string | null>(() => localStorage.getItem(`${kluczSzkicu}.dokumentId`))

  const zapiszDane = useCallback((tekst: string) => {
    const dokument = zapiszDokumentRoboczyGeneratora({
      id: idDokumentu,
      typ: typDokumentu,
      generatorId,
      tytul: tytulDokumentu,
      daneDokumentu: { tekst },
      ustawieniaDokumentu: {},
      autorId: uzytkownikId,
      wlascicielId: uzytkownikId,
    })

    if (!dokument) {
      throw new Error('Nie udało się zapisać dokumentu roboczego.')
    }

    ustawIdDokumentu(dokument.id)
    localStorage.setItem(`${kluczSzkicu}.dokumentId`, dokument.id)
  }, [generatorId, idDokumentu, kluczSzkicu, typDokumentu, tytulDokumentu, uzytkownikId])

  const stanDokumentu = useStanDokumentu({ dane: daneWejsciowe, zapiszAutomatycznie: zapiszDane })

  useEffect(() => {
    localStorage.setItem(kluczSzkicu, daneWejsciowe)
  }, [daneWejsciowe, kluczSzkicu])

  useOchronaNiezapisanegoDokumentu(stanDokumentu.czyNiezapisaneZmiany, () => {
    void stanDokumentu.zapiszTeraz()
  })

  const zapiszWRejestr = useCallback(async (komunikatPoZapisie = 'Podgląd jest aktualny. Dokument roboczy zapisano w rejestrze.') => {
    return await stanDokumentu.zapiszTeraz()
      ? komunikatPoZapisie
      : 'Podgląd jest aktualny, ale nie udało się zapisać dokumentu roboczego.'
  }, [stanDokumentu])

  function zmienDaneWejsciowe(wartosc: string) {
    ustawDaneWejsciowe(wartosc)
  }

  function wyczysc() {
    ustawDaneWejsciowe('')
    ustawIdDokumentu(null)
    localStorage.removeItem(kluczSzkicu)
    localStorage.removeItem(`${kluczSzkicu}.dokumentId`)
    stanDokumentu.oznaczJakoZapisany('')
  }

  return {
    daneWejsciowe,
    stanZapisu: stanDokumentu.stanZapisu,
    zapiszWRejestr,
    zmienDaneWejsciowe,
    wyczysc,
  }
}
