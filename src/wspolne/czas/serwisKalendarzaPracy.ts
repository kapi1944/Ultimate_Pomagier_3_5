import { pobierzUstawieniaAplikacji } from '../../aplikacja/ustawienia/magazynUstawienAplikacji'
import { ocenDzienPracy, type KalendarzPracy } from './kalendarzPracy'

export function pobierzKalendarzPracy(): KalendarzPracy {
  const { pulpit } = pobierzUstawieniaAplikacji()
  return { dniPracy: pulpit.dniPracy, wyjatki: pulpit.harmonogramPracy.wyjatkiKalendarza ?? [] }
}

export function sprawdzDzienPracy(data: string | Date, uzytkownikId: string) {
  return ocenDzienPracy(data, uzytkownikId, pobierzKalendarzPracy())
}

export function czyDzienRoboczy(data: string | Date, uzytkownikId: string): boolean {
  return sprawdzDzienPracy(data, uzytkownikId).roboczy
}

export { czyDzienRoboczy as isWorkingDay }
