import { etykietyRol, koloryRol, type RolaUzytkownika } from '../typyUzytkownikow'

export default function OdznakaRoli({ rola, kompaktowa = false }: { rola: RolaUzytkownika; kompaktowa?: boolean }) {
  return <span aria-label={`Rola: ${etykietyRol[rola]}`} className={`odznaka-uzytkownika${kompaktowa ? ' odznaka-uzytkownika--kompaktowa' : ''}`} style={{ backgroundColor: koloryRol[rola] }}>{etykietyRol[rola]}</span>
}
