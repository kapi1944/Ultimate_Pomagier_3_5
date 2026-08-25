import { useCallback, useEffect, useRef, useState } from 'react'
import type { TypDokumentu } from '../../../wspolne/dokumenty/modelDokumentu'
import { zapiszDokumentRoboczyGeneratora } from '../../../wspolne/dokumenty/zapisDokumentuGeneratora'

export type KonfiguracjaStanuProstegoGeneratora = {
  typDokumentu: TypDokumentu
  generatorId: string
  tytulDokumentu: string
  kluczSzkicu: string
  danePoczatkowe: string
  uzytkownikId?: string
}

export type StanZapisuGeneratora = 'lokalny' | 'zapisywanie' | 'zapisany' | 'blad'

const komunikatyStanu: Record<StanZapisuGeneratora, string> = {
  lokalny: 'Szkic zapisany lokalnie.',
  zapisywanie: 'Zapisywanie kopii roboczej...',
  zapisany: 'Automatycznie zapisano kopię roboczą.',
  blad: 'Szkic lokalny zapisano, ale zapis w rejestrze nie powiódł się.',
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
  const [stanZapisu, ustawStanZapisu] = useState<StanZapisuGeneratora>('lokalny')
  const czyZmienionoPrzezUzytkownika = useRef(false)

  const zapiszWRejestr = useCallback((komunikatPoZapisie = 'Podgląd jest aktualny. Dokument roboczy zapisano w rejestrze.') => {
    ustawStanZapisu('zapisywanie')

    try {
      const dokument = zapiszDokumentRoboczyGeneratora({
        id: idDokumentu,
        typ: typDokumentu,
        generatorId,
        tytul: tytulDokumentu,
        daneDokumentu: { tekst: daneWejsciowe },
        ustawieniaDokumentu: {},
        autorId: uzytkownikId,
        wlascicielId: uzytkownikId,
      })

      if (!dokument) {
        ustawStanZapisu('blad')
        return 'Podgląd jest aktualny, ale nie udało się zapisać dokumentu roboczego.'
      }

      ustawIdDokumentu(dokument.id)
      localStorage.setItem(`${kluczSzkicu}.dokumentId`, dokument.id)
      ustawStanZapisu('zapisany')
      return komunikatPoZapisie
    } catch {
      ustawStanZapisu('blad')
      return 'Podgląd jest aktualny, ale nie udało się zapisać dokumentu roboczego.'
    }
  }, [daneWejsciowe, generatorId, idDokumentu, kluczSzkicu, typDokumentu, tytulDokumentu, uzytkownikId])

  useEffect(() => {
    localStorage.setItem(kluczSzkicu, daneWejsciowe)
    if (!czyZmienionoPrzezUzytkownika.current) return

    ustawStanZapisu('zapisywanie')
    const identyfikator = window.setTimeout(() => {
      zapiszWRejestr()
    }, 650)

    return () => window.clearTimeout(identyfikator)
  }, [daneWejsciowe, kluczSzkicu, zapiszWRejestr])

  function zmienDaneWejsciowe(wartosc: string) {
    czyZmienionoPrzezUzytkownika.current = true
    ustawDaneWejsciowe(wartosc)
  }

  function wyczysc() {
    czyZmienionoPrzezUzytkownika.current = false
    ustawDaneWejsciowe('')
    ustawIdDokumentu(null)
    localStorage.removeItem(kluczSzkicu)
    localStorage.removeItem(`${kluczSzkicu}.dokumentId`)
    ustawStanZapisu('lokalny')
  }

  return {
    daneWejsciowe,
    komunikatStanu: komunikatyStanu[stanZapisu],
    stanZapisu,
    zapiszWRejestr,
    zmienDaneWejsciowe,
    wyczysc,
  }
}
