import { metadaneOdznak, type OdznakaUzytkownika as TypOdznakiUzytkownika } from '../typyUzytkownikow'

export default function OdznakaUzytkownika({ odznaka, kompaktowa = false }: { odznaka: TypOdznakiUzytkownika; kompaktowa?: boolean }) {
  const metadane = metadaneOdznak[odznaka]
  return <span aria-label={metadane.opis} className={`odznaka-uzytkownika odznaka-uzytkownika--dodatkowa${kompaktowa ? ' odznaka-uzytkownika--kompaktowa' : ''}`} title={metadane.opis}>{metadane.etykieta}</span>
}
