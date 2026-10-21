export function TrescStopkiOrganizatora({ tekst, czyKolorowac }: { tekst: string; czyKolorowac: boolean }) {
  const [pierwszaLinia, ...pozostaleLinie] = tekst.split('\n')
  return <><strong>{czyKolorowac ? pierwszaLinia.split(/(SEMPER|IIST)/g).map((fragment, indeks) => fragment === 'SEMPER' || fragment === 'IIST'
    ? <span key={indeks} style={{ color: fragment === 'SEMPER' ? '#dc2626' : '#1d4ed8' }}>{fragment}</span>
    : fragment) : pierwszaLinia}</strong>{pozostaleLinie.length > 0 && `\n${pozostaleLinie.join('\n')}`}</>
}
