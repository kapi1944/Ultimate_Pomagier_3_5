import type { Dokument, TypDokumentu } from '../../wspolne/dokumenty/modelDokumentu'
import ListaDokumentow from './ListaDokumentow'

type WlasciwosciWidokuWszystkichDokumentow = {
  otworzDokument: (dokument: Dokument<unknown, unknown>) => void
  typyStale?: TypDokumentu[]
  tytul?: string
  opis?: string
}

export default function WidokWszystkichDokumentow({
  otworzDokument,
  typyStale,
  tytul = 'Wszystkie dokumenty',
  opis = 'Wspólny rejestr dokumentów zapisanych przez generatory.',
}: WlasciwosciWidokuWszystkichDokumentow) {
  return <ListaDokumentow tytul={tytul} opis={opis} otworzDokument={otworzDokument} typyStale={typyStale} />
}
