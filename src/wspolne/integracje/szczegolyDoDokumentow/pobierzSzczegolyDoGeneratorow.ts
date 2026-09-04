import type {
  DaneFormularza,
  GrupaSzkoleniowa,
  OpublikowaneSzczegolyOrganizacyjne,
  WersjaRoboczaGeneratora,
} from '../../../moduly/zamkniete/szczegoly_organizacyjne/typy'
import { repozytoriumWspolnychDokumentow } from '../../dokumenty/rejestrDokumentow'
import {
  przygotujZrodloZOpublikowanychSzczegolow,
  przygotujZrodloZWersjiRoboczej,
} from './zbudujKontekstZeSzczegolow'
import type { DaneSzczegolowDoKontekstu } from './typyKontekstuDokumentu'

export type SzczegolyDoGeneratoraDokumentu = {
  id: string
  nazwa: string
  dane: DaneFormularza
  grupy: GrupaSzkoleniowa[]
  opiekunId: string
  czyKopiaRobocza: boolean
  zrodloKontekstu: DaneSzczegolowDoKontekstu
}

function czyWersjaRoboczaSzczegolow(wartosc: unknown): wartosc is WersjaRoboczaGeneratora {
  return Boolean(
    wartosc
      && typeof wartosc === 'object'
      && Array.isArray((wartosc as WersjaRoboczaGeneratora).grupy)
      && typeof (wartosc as WersjaRoboczaGeneratora).dokumentId === 'string'
      && (wartosc as WersjaRoboczaGeneratora).dane,
  )
}

function czyOpublikowaneSzczegoly(wartosc: unknown): wartosc is OpublikowaneSzczegolyOrganizacyjne {
  return Boolean(
    wartosc
      && typeof wartosc === 'object'
      && Array.isArray((wartosc as OpublikowaneSzczegolyOrganizacyjne).grupy)
      && typeof (wartosc as OpublikowaneSzczegolyOrganizacyjne).id === 'string'
      && (wartosc as OpublikowaneSzczegolyOrganizacyjne).dane,
  )
}

export function pobierzSzczegolyDoGeneratorow(): SzczegolyDoGeneratoraDokumentu[] {
  return repozytoriumWspolnychDokumentow
    .pobierzWszystkie()
    .filter((dokument) => dokument.typ === 'SZCZEGOLY_ORGANIZACYJNE' && dokument.generatorId === 'szczegoly_organizacyjne' && !dokument.czyUsunietyMiekko)
    .flatMap((dokument): SzczegolyDoGeneratoraDokumentu[] => {
      if (czyWersjaRoboczaSzczegolow(dokument.daneDokumentu)) {
        const wersja = dokument.daneDokumentu
        return [{
          id: dokument.id,
          nazwa: wersja.dane.tytulSzkolenia || wersja.nazwa,
          dane: wersja.dane,
          grupy: wersja.grupy,
          opiekunId: wersja.dane.opiekunId,
          czyKopiaRobocza: true,
          zrodloKontekstu: przygotujZrodloZWersjiRoboczej(wersja),
        }]
      }

      if (czyOpublikowaneSzczegoly(dokument.daneDokumentu)) {
        const szczegoly = dokument.daneDokumentu
        return [{
          id: dokument.id,
          nazwa: szczegoly.dane.tytulSzkolenia || szczegoly.nazwa,
          dane: szczegoly.dane,
          grupy: szczegoly.grupy,
          opiekunId: szczegoly.opiekunId,
          czyKopiaRobocza: false,
          zrodloKontekstu: przygotujZrodloZOpublikowanychSzczegolow(szczegoly),
        }]
      }

      return []
    })
    .filter((szczegoly) => szczegoly.grupy.length > 0)
}
