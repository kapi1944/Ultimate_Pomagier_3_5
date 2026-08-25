import { utworzNowyDokument } from './modelDokumentu'
import { repozytoriumWspolnychDokumentow } from './rejestrDokumentow'

export type TypGeneratoraKopiiRoboczej = 'programy_szkolen' | 'szczegoly_organizacyjne' | 'listy_obecnosci'
export type KopiaRobocza<TypDanych = unknown> = { id: string; typGeneratora: TypGeneratoraKopiiRoboczej; tytul: string; status: string; utworzono: string; zaktualizowano: string; daneDokumentu: TypDanych; wersjaFormatu?: string }
type DaneKopiiRoboczej<TypDanych> = { id?: string; typGeneratora: TypGeneratoraKopiiRoboczej; tytul: string; status: string; daneDokumentu: TypDanych; wersjaFormatu?: string }

function typDokumentu(typGeneratora: TypGeneratoraKopiiRoboczej) { return typGeneratora === 'programy_szkolen' ? 'PROGRAM_SZKOLENIA' as const : typGeneratora === 'szczegoly_organizacyjne' ? 'SZCZEGOLY_ORGANIZACYJNE' as const : 'LISTA_OBECNOSCI' as const }
function jakoKopieRobocza<TypDanych>(dokument: ReturnType<typeof repozytoriumWspolnychDokumentow.pobierzWszystkie>[number]): KopiaRobocza<TypDanych> { return { id: dokument.id, typGeneratora: dokument.generatorId as TypGeneratoraKopiiRoboczej, tytul: dokument.tytul, status: dokument.statusBiznesowy ?? 'robocza', utworzono: dokument.utworzono, zaktualizowano: dokument.zaktualizowano, daneDokumentu: dokument.daneDokumentu as TypDanych, wersjaFormatu: dokument.wersjaFormatu ?? undefined } }

export function pobierzWszystkieKopieRobocze() { return repozytoriumWspolnychDokumentow.pobierzWszystkie().filter((dokument) => (dokument.generatorId === 'programy_szkolen' || dokument.generatorId === 'szczegoly_organizacyjne' || dokument.generatorId === 'listy_obecnosci') && dokument.status === 'ROBOCZY' && !dokument.czyUsunietyMiekko).map((dokument) => jakoKopieRobocza(dokument)) }
export function pobierzKopieRoboczeGeneratora<TypDanych>(typGeneratora: TypGeneratoraKopiiRoboczej) { return pobierzWszystkieKopieRobocze().filter((kopia) => kopia.typGeneratora === typGeneratora).sort((pierwsza, druga) => Date.parse(druga.zaktualizowano) - Date.parse(pierwsza.zaktualizowano)) as KopiaRobocza<TypDanych>[] }
export function zapiszKopieRobocza<TypDanych>(dane: DaneKopiiRoboczej<TypDanych>) {
  const poprzednia = dane.id ? repozytoriumWspolnychDokumentow.pobierzPoId(dane.id) : null
  if (poprzednia) return jakoKopieRobocza<TypDanych>(repozytoriumWspolnychDokumentow.aktualizuj(poprzednia.id, { tytul: dane.tytul, statusBiznesowy: dane.status, daneDokumentu: dane.daneDokumentu, wersjaFormatu: dane.wersjaFormatu ?? null })!)
  const dokument = utworzNowyDokument({ id: dane.id, typ: typDokumentu(dane.typGeneratora), tytul: dane.tytul, generatorId: dane.typGeneratora, statusBiznesowy: dane.status, wersjaFormatu: dane.wersjaFormatu ?? null, daneDokumentu: dane.daneDokumentu, ustawieniaDokumentu: {} })
  repozytoriumWspolnychDokumentow.utworz(dokument)
  return jakoKopieRobocza<TypDanych>(dokument)
}
export function usunKopieRobocza(_typGeneratora: TypGeneratoraKopiiRoboczej, id: string) { repozytoriumWspolnychDokumentow.usunMiekko(id) }
