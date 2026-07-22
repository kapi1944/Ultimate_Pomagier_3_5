import type { RolaUzytkownika } from '../../../../kartoteki/uzytkownicy/typyUzytkownikow'

export function czyMoznaZmienicKontekstPulpitu(rola: RolaUzytkownika | null | undefined) {
  return rola === 'ARCHITEKT'
}
