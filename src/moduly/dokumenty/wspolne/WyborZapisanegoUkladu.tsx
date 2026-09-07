import { useState } from 'react'
import { pobierzSzablonyDokumentow } from '../../../wspolne/dokumenty/szablonyDokumentow'
import { normalizujBlokiSwobodneDokumentu, type BlokSwobodnyDokumentu } from '../../../wspolne/dokumenty/modelSwobodnychBlokow'

export default function WyborZapisanegoUkladu({ typ, onWybierz }: { typ: 'Ankieta' | 'Lista obecności'; onWybierz: (bloki: BlokSwobodnyDokumentu[]) => void }) {
  const [szablony, ustawSzablony] = useState(pobierzSzablonyDokumentow)
  return <label>Własny szablon układu<select value="" onFocus={() => ustawSzablony(pobierzSzablonyDokumentow())} onChange={(zdarzenie) => {
    const szablon = szablony.find((pozycja) => pozycja.id === zdarzenie.target.value)
    if (szablon) onWybierz(normalizujBlokiSwobodneDokumentu(szablon.dokumentBlokowy.blokiSwobodne))
  }}><option value="">Wybierz zapisany układ…</option>{szablony.filter((szablon) => szablon.typDokumentu === typ && szablon.status !== 'Archiwalny' && szablon.dokumentBlokowy.blokiSwobodne).map((szablon) => <option key={szablon.id} value={szablon.id}>{szablon.nazwa}</option>)}</select></label>
}
