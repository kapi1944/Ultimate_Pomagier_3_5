export type KanalAktualizacji = 'stabilny' | 'testowy'

export function czyZgodnaAktualizacja(obecna: string, dostepna: string, metadane: Record<string, unknown>, kanal: KanalAktualizacji, zgodnoscDanych: number): boolean {
  return czyNowszaWersjaStabilna(obecna, dostepna)
    && metadane.kanal === kanal
    && metadane.zgodnoscDanych === zgodnoscDanych
    && typeof metadane.commit === 'string' && /^[a-f0-9]{40}$/.test(metadane.commit)
}

export function czyNowszaWersjaStabilna(obecna: string, dostepna: string): boolean {
  const wzorzec = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
  if (!wzorzec.test(obecna) || !wzorzec.test(dostepna)) return false
  const czesciObecnej = obecna.split('.').map(BigInt)
  const czesciDostepnej = dostepna.split('.').map(BigInt)
  for (let indeks = 0; indeks < 3; indeks += 1) {
    if (czesciDostepnej[indeks] !== czesciObecnej[indeks]) return czesciDostepnej[indeks] > czesciObecnej[indeks]
  }
  return false
}

export async function pobierzIZainstalujPodpisanaAktualizacje(aktualizacja: {
  download: () => Promise<void>
  install: (opcje: { restartAfterInstall: boolean }) => Promise<void>
}) {
  // Tauri sprawdza podpis podczas download; błąd musi zatrzymać instalację.
  await aktualizacja.download()
  await aktualizacja.install({ restartAfterInstall: true })
}
