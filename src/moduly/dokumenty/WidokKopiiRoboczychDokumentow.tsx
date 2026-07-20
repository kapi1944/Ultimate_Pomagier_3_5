import type { Dokument, TypDokumentu } from '../../wspolne/dokumenty/modelDokumentu'
import ListaDokumentow from './ListaDokumentow'

type WlasciwosciWidokuKopiiRoboczychDokumentow = {
  otworzDokument: (dokument: Dokument<unknown, unknown>) => void
  typyStale?: TypDokumentu[]
  tytul?: string
  opis?: string
}

export default function WidokKopiiRoboczychDokumentow({
  otworzDokument,
  typyStale,
  tytul = 'Kopie robocze',
  opis = 'Dokumenty o statusie Roboczy.',
}: WlasciwosciWidokuKopiiRoboczychDokumentow) {
  return (
    <ListaDokumentow
      czyStatusStaly
      filtrPoczatkowy={{ status: 'ROBOCZY', czyZarchiwizowany: false, czyUsunietyMiekko: false }}
      opis={opis}
      otworzDokument={otworzDokument}
      typyStale={typyStale}
      tytul={tytul}
    />
  )
}
