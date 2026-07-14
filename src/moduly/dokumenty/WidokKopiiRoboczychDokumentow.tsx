import type { Dokument } from '../../wspolne/dokumenty/modelDokumentu'
import ListaDokumentow from './ListaDokumentow'

type WlasciwosciWidokuKopiiRoboczychDokumentow = {
  otworzDokument: (dokument: Dokument<unknown, unknown>) => void
}

export default function WidokKopiiRoboczychDokumentow({ otworzDokument }: WlasciwosciWidokuKopiiRoboczychDokumentow) {
  return <ListaDokumentow tytul="Kopie robocze" opis="Dokumenty o statusie Roboczy." filtrPoczatkowy={{ status: 'ROBOCZY', czyZarchiwizowany: false, czyUsunietyMiekko: false }} czyStatusStaly otworzDokument={otworzDokument} />
}
