import type { WersjaRoboczaGeneratora } from '../../../moduly/zamkniete/szczegoly_organizacyjne/typy'
import { wczytajFontyPdf } from '../rendererPdf'
import { pobierzMetadanePakietu, przygotujPlanPakietu, sygnaturaZrodel, nazwaPlikuPakietu, type KonfiguracjaPakietu } from './modelPakietu'
import { renderujDokumentPakietu, type WynikEksportuDokumentu } from './renderujDokumentPakietu'
import { scalPakietPdf, type ScalonyPakiet } from './scalPakietPdf'

export type GotowyPakiet = ScalonyPakiet & { sygnatura: string; nazwaPliku: string; blob: Blob }
export type PostepPakietu = { procent: number; komunikat: string }
export async function przygotujPakiet(wersja: WersjaRoboczaGeneratora, konfiguracja: KonfiguracjaPakietu, sygnal: AbortSignal, postep: (postep: PostepPakietu) => void): Promise<GotowyPakiet> {
  const sygnatura = sygnaturaZrodel(wersja, konfiguracja)
  const plan = przygotujPlanPakietu(wersja, konfiguracja)
  const dokumenty: WynikEksportuDokumentu[] = []
  for (const [indeks, dokument] of plan.entries()) {
    sygnal.throwIfAborted()
    postep({ procent: Math.round(indeks / plan.length * 85), komunikat: 'Generowanie dokumentu ' + (indeks + 1) + ' z ' + plan.length + ': ' + dokument.tytul })
    try { dokumenty.push(await renderujDokumentPakietu(dokument, konfiguracja, sygnal)) }
    catch (blad) {
      if (sygnal.aborted) throw blad
      throw new Error(dokument.tytul + ': ' + (blad instanceof Error ? blad.message : 'Nie udało się wyrenderować dokumentu.'), { cause: blad })
    }
  }
  postep({ procent: 90, komunikat: 'Scalanie wszystkich stron i przygotowywanie spisu dokumentów…' })
  const metadane = pobierzMetadanePakietu(wersja)
  const wynik = await scalPakietPdf(dokumenty, konfiguracja, metadane, Object.fromEntries(wersja.grupy.map((grupa) => [grupa.id, grupa.nazwa])), await wczytajFontyPdf(), sygnal)
  sygnal.throwIfAborted()
  if (sygnatura !== sygnaturaZrodel(wersja, konfiguracja)) throw new Error('Dokumenty źródłowe zmieniły się podczas generowania. Przygotuj pakiet ponownie.')
  postep({ procent: 100, komunikat: 'Kompletny pakiet jest gotowy.' })
  return { ...wynik, sygnatura, nazwaPliku: nazwaPlikuPakietu(metadane), blob: new Blob([new Uint8Array(wynik.pdfBytes)], { type: 'application/pdf' }) }
}

export async function pobierzGotowyPakiet(pakiet: GotowyPakiet, wersja: WersjaRoboczaGeneratora, konfiguracja: KonfiguracjaPakietu): Promise<string> {
  if (pakiet.sygnatura !== sygnaturaZrodel(wersja, konfiguracja)) throw new Error('Źródła lub ustawienia zmieniły się. Wygeneruj podgląd ponownie przed pobraniem.')
  const { isTauri, invoke } = await import('@tauri-apps/api/core')
  if (isTauri()) return invoke<string>('zapisz_pakiet_pdf', { nazwa: pakiet.nazwaPliku, bajty: Array.from(pakiet.pdfBytes) })
  const adres = URL.createObjectURL(pakiet.blob)
  const odnosnik = document.createElement('a')
  try {
    odnosnik.href = adres
    odnosnik.download = pakiet.nazwaPliku
    document.body.append(odnosnik)
    odnosnik.click()
  } finally {
    odnosnik.remove()
    window.setTimeout(() => URL.revokeObjectURL(adres), 60000)
  }
  return 'Plik przekazano do pobrania. Znajdziesz go w folderze pobierania przeglądarki lub w wybranej lokalizacji.'
}
