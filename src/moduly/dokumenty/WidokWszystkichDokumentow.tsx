import type { Dokument, TypDokumentu } from '../../wspolne/dokumenty/modelDokumentu'
import ListaDokumentow from './ListaDokumentow'

type WlasciwosciWidokuWszystkichDokumentow = {
  otworzDokument: (dokument: Dokument<unknown, unknown>) => void
  typyStale?: TypDokumentu[]
  tytul?: string
  opis?: string
  czyKosz?: boolean
}

export default function WidokWszystkichDokumentow({
  otworzDokument,
  typyStale,
  tytul = 'Wszystkie dokumenty',
  opis = 'Wspólny rejestr dokumentów zapisanych przez generatory.',
  czyKosz = false,
}: WlasciwosciWidokuWszystkichDokumentow) {
  return <ListaDokumentow czyKosz={czyKosz} filtrPoczatkowy={{ czyUsunietyMiekko: czyKosz }} opis={opis} otworzDokument={otworzDokument} tytul={tytul} typyStale={typyStale} />
}
