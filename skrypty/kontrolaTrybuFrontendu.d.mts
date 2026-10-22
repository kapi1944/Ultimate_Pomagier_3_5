export type ManifestTrybuFrontendu = {
  wersjaSchematu: 1
  trybVite: string
  tryb: 'demonstracyjny' | 'programistyczny' | 'produkcyjny'
}

export const polecenieBudowaniaDesktop: string
export function okreslTrybFrontendu(trybVite: string, zmienne: Readonly<Record<string, string | undefined>>): ManifestTrybuFrontendu
export function sprawdzKonfiguracjeDesktop(konfiguracja: { build?: { beforeBuildCommand?: unknown; frontendDist?: string } }): void
export function sprawdzManifestProdukcyjny(manifest: unknown): void
export function sprawdzFrontendDesktop(katalog?: string): Promise<void>
