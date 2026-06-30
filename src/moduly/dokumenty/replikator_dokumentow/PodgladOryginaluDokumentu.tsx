import type { DokumentPomagiera } from '../../../wspolne/dokumenty/typyDokumentu'

type WlasciwosciPodgladuOryginalu = {
  dokument: DokumentPomagiera
}

export default function PodgladOryginaluDokumentu({ dokument }: WlasciwosciPodgladuOryginalu) {
  const { zrodlo } = dokument

  if (zrodlo.typ === 'docx' && zrodlo.podgladHtml) {
    return (
      <iframe
        className="replikator-dokumentow__oryginal-ramka"
        srcDoc={zrodlo.podgladHtml}
        title={`Oryginał DOCX: ${zrodlo.nazwaPliku ?? dokument.nazwa}`}
      />
    )
  }

  if ((zrodlo.typ === 'tekst' || zrodlo.typ === 'csv') && zrodlo.podgladTekst !== undefined) {
    return <pre className="replikator-dokumentow__oryginal-tekst">{zrodlo.podgladTekst || 'Brak treści źródłowej.'}</pre>
  }

  if (zrodlo.typ === 'pdf' && zrodlo.podgladOryginalu) {
    return (
      <object
        className="replikator-dokumentow__oryginal-plik"
        data={zrodlo.podgladOryginalu}
        type={zrodlo.typMime || 'application/pdf'}
      >
        Nie można osadzić PDF w tej przeglądarce.
      </object>
    )
  }

  if (zrodlo.typ === 'obraz' && zrodlo.podgladOryginalu) {
    return <img alt={`Oryginał: ${zrodlo.nazwaPliku ?? dokument.nazwa}`} src={zrodlo.podgladOryginalu} />
  }

  if (zrodlo.typ === 'ocr') {
    return <div className="replikator-dokumentow__brak-oryginalu">Plik wymaga OCR przed utworzeniem edytowalnej warstwy.</div>
  }

  return (
    <div className="replikator-dokumentow__brak-oryginalu">
      Nieobsługiwany podgląd oryginału: {zrodlo.nazwaPliku ?? dokument.nazwa}. Brak bezpiecznej reprezentacji HTML/obrazu/PDF.
    </div>
  )
}
