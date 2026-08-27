import type { StanZapisuDokumentu } from './useStanDokumentu'

const etykietyStanuZapisu: Record<StanZapisuDokumentu, string> = {
  zapisano: 'Zapisano',
  zapisywanie: 'Zapisywanie...',
  niezapisane: 'Niezapisane zmiany',
  blad: 'Błąd zapisu',
}

function pobierzEtykieteStanuZapisu(stan: StanZapisuDokumentu) {
  return etykietyStanuZapisu[stan]
}

export default function StatusZapisuDokumentu({ stan }: { stan: StanZapisuDokumentu }) {
  return <span aria-live="polite" className={`generator-dokumentu__status-zapisu generator-dokumentu__status-zapisu--${stan}`} role="status">{pobierzEtykieteStanuZapisu(stan)}</span>
}
