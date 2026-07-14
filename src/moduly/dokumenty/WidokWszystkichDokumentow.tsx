import type { Dokument } from '../../wspolne/dokumenty/modelDokumentu'
import ListaDokumentow from './ListaDokumentow'

type WlasciwosciWidokuWszystkichDokumentow = {
  otworzDokument: (dokument: Dokument<unknown, unknown>) => void
}

export default function WidokWszystkichDokumentow({ otworzDokument }: WlasciwosciWidokuWszystkichDokumentow) {
  return <ListaDokumentow tytul="Wszystkie dokumenty" opis="Wspolny rejestr dokumentow zapisanych przez generatory." otworzDokument={otworzDokument} />
}
