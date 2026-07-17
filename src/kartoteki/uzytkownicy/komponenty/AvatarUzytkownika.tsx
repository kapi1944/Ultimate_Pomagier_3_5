import { pobierzInicjalyUzytkownika, type Uzytkownik } from '../typyUzytkownikow'

export default function AvatarUzytkownika({ uzytkownik }: { uzytkownik: Pick<Uzytkownik, 'imie' | 'nazwisko' | 'pseudonim' | 'kolorProfilu'> }) {
  return <span aria-label={`Avatar użytkownika ${uzytkownik.pseudonim}`} className="avatar-uzytkownika" style={{ backgroundColor: uzytkownik.kolorProfilu }}>{pobierzInicjalyUzytkownika(uzytkownik)}</span>
}
