import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { ustawObslugeNiezapisanegoDokumentu } from './strzeznikNiezapisanegoDokumentu'

export type StanZapisuDokumentu = 'zapisano' | 'zapisywanie' | 'niezapisane' | 'blad'

type KonfiguracjaStanuDokumentu<Dane> = {
  dane: Dane
  czyAutosaveAktywny?: boolean
  opoznienieAutosave?: number
  serializuj?: (dane: Dane) => string
  zapiszAutomatycznie?: (dane: Dane) => void | Promise<void>
}

export function utworzOdciskStanuDokumentu(dane: unknown) {
  return JSON.stringify(dane)
}

export function czyStanDokumentuZmieniony(aktualnyOdcisk: string, zapisanyOdcisk: string) {
  return aktualnyOdcisk !== zapisanyOdcisk
}

export function useStanDokumentu<Dane>({
  dane,
  czyAutosaveAktywny = true,
  opoznienieAutosave = 650,
  serializuj = utworzOdciskStanuDokumentu,
  zapiszAutomatycznie,
}: KonfiguracjaStanuDokumentu<Dane>) {
  const odciskAktualny = serializuj(dane)
  const odciskAktualnyRef = useRef(odciskAktualny)
  const daneRef = useRef(dane)
  const zapiszAutomatycznieRef = useRef(zapiszAutomatycznie)
  const [odciskZapisany, ustawOdciskZapisany] = useState(odciskAktualny)
  const [stanZapisu, ustawStanZapisu] = useState<StanZapisuDokumentu>('zapisano')
  const trwajacyZapis = useRef<Promise<boolean> | null>(null)
  const czyNiezapisaneZmiany = czyStanDokumentuZmieniony(odciskAktualny, odciskZapisany)
  const skutecznyStanZapisu: StanZapisuDokumentu = czyNiezapisaneZmiany && stanZapisu === 'zapisano'
    ? 'niezapisane'
    : !czyNiezapisaneZmiany && stanZapisu === 'niezapisane' ? 'zapisano' : stanZapisu

  useLayoutEffect(() => {
    odciskAktualnyRef.current = odciskAktualny
    daneRef.current = dane
    zapiszAutomatycznieRef.current = zapiszAutomatycznie
  }, [dane, odciskAktualny, zapiszAutomatycznie])

  const oznaczJakoZapisany = useCallback((zapisaneDane?: Dane) => {
    const odcisk = serializuj(zapisaneDane ?? daneRef.current)
    ustawOdciskZapisany(odcisk)
    ustawStanZapisu(odciskAktualnyRef.current === odcisk ? 'zapisano' : 'niezapisane')
  }, [serializuj])

  const oznaczBladZapisu = useCallback(() => ustawStanZapisu('blad'), [])
  const rozpocznijZapis = useCallback(() => ustawStanZapisu('zapisywanie'), [])

  const zapiszTeraz = useCallback(async () => {
    if (trwajacyZapis.current) return trwajacyZapis.current
    const adapterZapisu = zapiszAutomatycznieRef.current

    if (!adapterZapisu) {
      return false
    }

    const zapisywaneDane = daneRef.current
    const odciskZapisywanychDanych = serializuj(zapisywaneDane)
    rozpocznijZapis()

    const operacja = (async () => {
      try {
        await adapterZapisu(zapisywaneDane)
        ustawOdciskZapisany(odciskZapisywanychDanych)
        ustawStanZapisu(odciskAktualnyRef.current === odciskZapisywanychDanych ? 'zapisano' : 'niezapisane')
        return odciskAktualnyRef.current === odciskZapisywanychDanych
      } catch {
        oznaczBladZapisu()
        return false
      }
    })()
    trwajacyZapis.current = operacja
    try {
      return await operacja
    } finally {
      if (trwajacyZapis.current === operacja) trwajacyZapis.current = null
    }
  }, [oznaczBladZapisu, rozpocznijZapis, serializuj])

  useEffect(() => {
    if (!czyNiezapisaneZmiany) {
      return
    }

    if (!czyAutosaveAktywny || !zapiszAutomatycznieRef.current) {
      return
    }

    const identyfikator = window.setTimeout(() => {
      void zapiszTeraz()
    }, opoznienieAutosave)

    return () => window.clearTimeout(identyfikator)
  }, [czyAutosaveAktywny, czyNiezapisaneZmiany, odciskAktualny, opoznienieAutosave, zapiszTeraz])

  return {
    czyNiezapisaneZmiany,
    oznaczBladZapisu,
    oznaczJakoZapisany,
    rozpocznijZapis,
    stanZapisu: skutecznyStanZapisu,
    zapiszTeraz,
  }
}

type OpcjeOchronyNiezapisanychZmian = {
  identyfikatorInstancji?: string
  etykieta?: string
  czyTrwaZapis?: () => boolean
  odrzucZmiany?: () => void
}

export function useOchronaNiezapisanegoDokumentu(
  czyNiezapisaneZmiany: boolean,
  zapiszPrzedWyjsciem: () => boolean | void | Promise<boolean | void>,
  opcje: OpcjeOchronyNiezapisanychZmian = {},
) {
  const identyfikatorHooka = useId()
  const czyNiezapisaneZmianyRef = useRef(czyNiezapisaneZmiany)
  const zapiszPrzedWyjsciemRef = useRef(zapiszPrzedWyjsciem)
  const czyTrwaZapisRef = useRef(opcje.czyTrwaZapis ?? (() => false))
  const odrzucZmianyRef = useRef(opcje.odrzucZmiany ?? (() => {}))

  useLayoutEffect(() => {
    czyNiezapisaneZmianyRef.current = czyNiezapisaneZmiany
    zapiszPrzedWyjsciemRef.current = zapiszPrzedWyjsciem
    czyTrwaZapisRef.current = opcje.czyTrwaZapis ?? (() => false)
    odrzucZmianyRef.current = opcje.odrzucZmiany ?? (() => {})
  }, [czyNiezapisaneZmiany, zapiszPrzedWyjsciem, opcje.czyTrwaZapis, opcje.odrzucZmiany])

  useLayoutEffect(() => ustawObslugeNiezapisanegoDokumentu({
    identyfikatorInstancji: opcje.identyfikatorInstancji ?? identyfikatorHooka,
    etykieta: opcje.etykieta,
    czySaNiezapisaneZmiany: () => czyNiezapisaneZmianyRef.current,
    zapiszPrzedWyjsciem: () => zapiszPrzedWyjsciemRef.current(),
    czyTrwaZapis: () => czyTrwaZapisRef.current(),
    odrzucZmiany: () => odrzucZmianyRef.current(),
  }), [identyfikatorHooka, opcje.etykieta, opcje.identyfikatorInstancji])
}
