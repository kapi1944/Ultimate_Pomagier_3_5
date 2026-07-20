import { domyslnyKolorProfilu, pobierzInicjalyUzytkownika, pobierzKolorTekstuDlaTla, type Uzytkownik } from '../typyUzytkownikow'

export default function AvatarUzytkownika({ uzytkownik }: { uzytkownik: Pick<Uzytkownik, 'imie' | 'nazwisko' | 'pseudonim' | 'kolorProfilu'> }) {
  const kolorTla = /^#[0-9a-f]{6}$/i.test(uzytkownik.kolorProfilu) ? uzytkownik.kolorProfilu : domyslnyKolorProfilu
  return <span aria-label={`Avatar użytkownika ${uzytkownik.pseudonim}`} className="avatar-uzytkownika" style={{ backgroundColor: kolorTla, color: pobierzKolorTekstuDlaTla(kolorTla) }}>{pobierzInicjalyUzytkownika(uzytkownik)}</span>
}
