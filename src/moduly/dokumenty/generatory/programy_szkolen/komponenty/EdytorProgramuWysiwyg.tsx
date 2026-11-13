import { EditorContent, useEditor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { closeHistory } from '@tiptap/pm/history'
import { useEffect, useState } from 'react'
import { konwertujHtmlNaTekstProgramu, konwertujHtmlNaWierszeProgramu, obsluzWklejenieProgramu, oczyscHtmlProgramu } from './konwersjaProgramuWysiwyg'
import { RozszerzenieOznaczenProgramu, pobierzPozycjeOznaczenEdytora } from './rozszerzenieOznaczenProgramu'
import { kategorieWciecProgramu, maksymalneWciecieProgramuMm, normalizujWciecieProgramu, rozpoznajOznaczenieProgramu, styleOznaczenProgramu } from '../oznaczeniaProgramu'

const pusteWciecia: Record<string, number> = {}
const pusteStylePoziomow: string[] = []
const domyslneStyleEdytora = ['arabskie.', '◦', '▪']

type WlasciwosciEdytoraProgramuWysiwyg = {
  domyslneStylePoziomow?: string[]
  stylePoziomow?: string[]
  onZmianaStyluPoziomu?: (poziom: number, styl: string) => void
  wcieciaPresetu?: Record<string, number>
  onZapiszWcieciePresetu?: (kategoria: string, wartosc: number) => void
  wartoscHtml: string
  onZmianaHtml: (html: string) => void
  onZmianaTekstuProgramu: (tekst: string) => void
}

export function EdytorProgramuWysiwyg({
  wartoscHtml,
  wcieciaPresetu = pusteWciecia,
  onZapiszWcieciePresetu,
  stylePoziomow = pusteStylePoziomow,
  domyslneStylePoziomow = domyslneStyleEdytora,
  onZmianaStyluPoziomu,
  onZmianaHtml,
  onZmianaTekstuProgramu,
}: WlasciwosciEdytoraProgramuWysiwyg) {
  const [kategoriaWciecia, ustawKategorieWciecia] = useState('2')
  const [zakresWciecia, ustawZakresWciecia] = useState('program')
  const [wpisaneWciecie, ustawWpisaneWciecie] = useState<string | null>(null)
  const [zakres, ustawZakres] = useState('pozycja')
  const [wybor, ustawWybor] = useState({ poziom: 0, styl: 'oryginalne' })
  const edytor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      RozszerzenieOznaczenProgramu.configure({ stylePoziomow, domyslneStyle: domyslneStylePoziomow }),
      Placeholder.configure({
        placeholder: 'Wklej lub edytuj pełny program szkolenia...',
      }),
    ],
    content: wartoscHtml || '<p></p>',
    editorProps: {
      attributes: {
        class: 'program-szkolen__tiptap',
      },
      handlePaste: obsluzWklejenieProgramu,
    },
    onSelectionUpdate: ({ editor }) => {
      const pozycja = pobierzPozycjeOznaczenEdytora(editor.state.doc).filter((element) => element.pozycja <= editor.state.selection.from && element.pozycja + element.rozmiar > editor.state.selection.from).at(-1)
      ustawWybor({ poziom: pozycja?.poziom ?? 0, styl: pozycja?.styl ?? 'oryginalne' })
    },
    onUpdate: ({ editor }) => {
      const pozycja = pobierzPozycjeOznaczenEdytora(editor.state.doc).filter((element) => element.pozycja <= editor.state.selection.from && element.pozycja + element.rozmiar > editor.state.selection.from).at(-1)
      ustawWybor({ poziom: pozycja?.poziom ?? 0, styl: pozycja?.styl ?? 'oryginalne' })
      const html = oczyscHtmlProgramu(editor.getHTML())

      onZmianaHtml(html)
      onZmianaTekstuProgramu(konwertujHtmlNaTekstProgramu(html))
    },
  })

  useEffect(() => {
    if (!edytor) {
      return
    }

    const oczyszczonaWartoscHtml = oczyscHtmlProgramu(wartoscHtml || '<p></p>')
    if (JSON.stringify(konwertujHtmlNaWierszeProgramu(edytor.getHTML())) !== JSON.stringify(konwertujHtmlNaWierszeProgramu(oczyszczonaWartoscHtml))) {
      edytor.commands.setContent(oczyszczonaWartoscHtml, { emitUpdate: false })
    }
  }, [edytor, wartoscHtml])

  useEffect(() => {
    if (!edytor) return
    const rozszerzenie = edytor.extensionManager.extensions.find((element) => element.name === 'oznaczeniaProgramu')
    if (rozszerzenie) {
      rozszerzenie.options.wcieciaPresetu = wcieciaPresetu
      rozszerzenie.options.stylePoziomow = stylePoziomow
      rozszerzenie.options.domyslneStyle = domyslneStylePoziomow
    }
    edytor.view.dispatch(edytor.state.tr)
  }, [edytor, stylePoziomow, domyslneStylePoziomow, wcieciaPresetu])

  function zmienOznaczenie(styl: string) {
    if (!edytor) return
    ustawWybor((aktualny) => ({ ...aktualny, styl }))
    if (zakres === 'poziom') { onZmianaStyluPoziomu?.(wybor.poziom, styl); return }
    const typ = edytor.isActive('listItem') ? 'listItem' : edytor.isActive('heading') ? 'heading' : 'paragraph'
    const pozycja = edytor.state.selection.$from
    const akapit = pozycja.parent
    const oznaczenie = rozpoznajOznaczenieProgramu(akapit.textContent)
    const lancuch = edytor.chain().focus()
    if (oznaczenie) {
      const dlugoscPrefiksu = akapit.textContent.length - oznaczenie.tresc.length
      lancuch.deleteRange({ from: pozycja.start(), to: pozycja.start() + dlugoscPrefiksu })
    }
    lancuch.updateAttributes(typ, { stylOznaczenia: styl, ...(oznaczenie ? { oznaczenieOryginalne: oznaczenie.oznaczenie.zapis } : {}) }).run()
  }

  function zmienPoziom(zmiana: number) {
    if (!edytor) return
    const pozycja = pobierzPozycjeOznaczenEdytora(edytor.state.doc).filter((element) => element.pozycja <= edytor.state.selection.from && element.pozycja + element.rozmiar > edytor.state.selection.from).at(-1)
    const poziom = Math.max(0, Math.min(8, (pozycja?.poziom ?? 0) + zmiana))
    if (edytor.isActive('listItem')) {
      if (zmiana > 0) edytor.chain().focus().sinkListItem('listItem').run()
      else edytor.chain().focus().liftListItem('listItem').run()
    }
    const typ = edytor.isActive('listItem') ? 'listItem' : edytor.isActive('heading') ? 'heading' : 'paragraph'
    edytor.chain().focus().updateAttributes(typ, { poziomProgramu: poziom, ...(pozycja?.oryginalne ? { oznaczenieOryginalne: pozycja.oryginalne } : {}) }).run()
  }

  const zaznaczenie = edytor?.state.selection
  const pasujace = edytor ? pobierzPozycjeOznaczenEdytora(edytor.state.doc).filter((pozycja) =>
    pozycja.kategoriaWciecia === kategoriaWciecia &&
    (zakresWciecia === 'program' || (zaznaczenie && !zaznaczenie.empty &&
      zaznaczenie.from < pozycja.koniecTresci - 1 && zaznaczenie.to > pozycja.pozycja + 1)),
  ) : []
  const domyslneWciecie = wcieciaPresetu[kategoriaWciecia] ?? 0
  const wartosciWciec = new Set(pasujace.map((pozycja) => pozycja.wciecieMm ?? domyslneWciecie))
  const wspolneWciecie = wartosciWciec.size <= 1 ? wartosciWciec.values().next().value ?? domyslneWciecie : undefined

  function zmienWciecie(oblicz: (wartosc: number) => number | null) {
    if (!edytor) return
    const transakcja = closeHistory(edytor.state.tr)
    for (const pozycja of pasujace) {
      const wezel = transakcja.doc.nodeAt(pozycja.pozycja)
      if (!wezel) continue
      const wartosc = oblicz(pozycja.wciecieMm ?? domyslneWciecie)
      const wciecieMm = normalizujWciecieProgramu(wartosc) ?? null
      if (wezel.attrs.wciecieMm === wciecieMm || (wartosc !== null && wciecieMm === (pozycja.wciecieMm ?? domyslneWciecie))) continue
      transakcja.setNodeMarkup(pozycja.pozycja, undefined, { ...wezel.attrs, wciecieMm })
    }
    if (transakcja.docChanged) {
      edytor.view.dispatch(transakcja)
      edytor.view.dispatch(closeHistory(edytor.state.tr))
    }
    ustawWpisaneWciecie(null)
    edytor.commands.focus()
  }

  const czyAktywny = (nazwa: string, opcje?: Record<string, unknown>) => Boolean(edytor?.isActive(nazwa, opcje))

  return (
    <div className="program-szkolen__edytor-wysiwyg">
      <div className="program-szkolen__pasek-edytora">
        <span>Poziom {wybor.poziom + 1}</span>
        <label>Zakres <select aria-label="Zakres zmiany oznaczenia" value={zakres} onChange={(zdarzenie) => ustawZakres(zdarzenie.target.value)}><option value="pozycja">Ta pozycja</option><option value="poziom">Cały poziom</option></select></label>
        <label>Oznaczenie <select aria-label="Oznaczenie pozycji" disabled={!edytor} value={zakres === 'poziom' ? stylePoziomow[wybor.poziom] ?? 'oryginalne' : wybor.styl} onChange={(zdarzenie) => zmienOznaczenie(zdarzenie.target.value)}>{styleOznaczenProgramu.map(([wartosc, etykieta]) => <option key={wartosc} value={wartosc}>{etykieta}</option>)}</select></label>
        <button
          className={`program-szkolen__przycisk ${czyAktywny('bold') ? 'program-szkolen__przycisk--aktywny' : ''}`}
          disabled={!edytor}
          onClick={() => edytor?.chain().focus().toggleBold().run()}
          type="button"
        >
          B
        </button>
        <button
          className={`program-szkolen__przycisk ${czyAktywny('italic') ? 'program-szkolen__przycisk--aktywny' : ''}`}
          disabled={!edytor}
          onClick={() => edytor?.chain().focus().toggleItalic().run()}
          type="button"
        >
          I
        </button>
        <button
          className={`program-szkolen__przycisk ${czyAktywny('underline') ? 'program-szkolen__przycisk--aktywny' : ''}`}
          disabled={!edytor}
          onClick={() => edytor?.chain().focus().toggleUnderline().run()}
          type="button"
        >
          U
        </button>
        <button
          className={`program-szkolen__przycisk ${
            czyAktywny('heading', { level: 2 }) ? 'program-szkolen__przycisk--aktywny' : ''
          }`}
          disabled={!edytor}
          onClick={() => edytor?.chain().focus().toggleHeading({ level: 2 }).run()}
          type="button"
        >
          Nagłówek
        </button>
        <button
          className={`program-szkolen__przycisk ${czyAktywny('bulletList') ? 'program-szkolen__przycisk--aktywny' : ''}`}
          disabled={!edytor}
          onClick={() => edytor?.chain().focus().toggleBulletList().updateAttributes('listItem', { stylOznaczenia: '•' }).run()}
          type="button"
        >
          Lista punktowana
        </button>
        <button
          className={`program-szkolen__przycisk ${czyAktywny('orderedList') ? 'program-szkolen__przycisk--aktywny' : ''}`}
          disabled={!edytor}
          onClick={() => edytor?.chain().focus().toggleOrderedList().updateAttributes('listItem', { stylOznaczenia: 'arabskie.' }).run()}
          type="button"
        >
          Lista numerowana
        </button>
        <button
          className="program-szkolen__przycisk"
          disabled={!edytor}
          aria-label="Zmniejsz poziom listy"
          onClick={() => zmienPoziom(-1)}
          type="button"
        >
          &lt;&lt;
        </button>
        <button
          className="program-szkolen__przycisk"
          disabled={!edytor}
          aria-label="Zwiększ poziom listy"
          onClick={() => zmienPoziom(1)}
          type="button"
        >
          &gt;&gt;
        </button>
        <button
          className="program-szkolen__przycisk"
          disabled={!edytor}
          onClick={() => edytor?.chain().focus().setHorizontalRule().run()}
          type="button"
        >
          Separator
        </button>
        <button
          className="program-szkolen__przycisk"
          disabled={!edytor}
          onClick={() => edytor?.chain().focus().unsetAllMarks().clearNodes().run()}
          type="button"
        >
          Wyczyść formatowanie
        </button>
      </div>
      <fieldset className="program-szkolen__formatowanie-zbiorcze">
        <legend>Formatowanie zbiorcze</legend>
        <div className="program-szkolen__pasek-edytora">
          <label>Poziom <select value={kategoriaWciecia} onChange={(zdarzenie) => { ustawKategorieWciecia(zdarzenie.target.value); ustawWpisaneWciecie(null) }}>
            {kategorieWciecProgramu.map((kategoria) => <option key={kategoria} value={kategoria}>{kategoria === 'punktory' ? 'Listy punktowane' : `Poziom ${kategoria}`}</option>)}
          </select></label>
          <label>Zakres <select value={zakresWciecia} onChange={(zdarzenie) => { ustawZakresWciecia(zdarzenie.target.value); ustawWpisaneWciecie(null) }}>
            <option value="program">Cały program</option><option value="zaznaczenie">Zaznaczony fragment</option>
          </select></label>
          <button type="button" className="program-szkolen__przycisk" disabled={!pasujace.length} aria-label="Zmniejsz wcięcie o 5 mm" onClick={() => zmienWciecie((wartosc) => wartosc - 5)}>←</button>
          <div className="program-szkolen__pasek-edytora">
            <label>Wcięcie (mm) <input type="number" min={0} max={maksymalneWciecieProgramuMm} step="any" disabled={!pasujace.length} placeholder="Różne" value={wpisaneWciecie ?? wspolneWciecie ?? ''} onChange={(zdarzenie) => ustawWpisaneWciecie(zdarzenie.target.value)} onKeyDown={(zdarzenie) => {
              if (zdarzenie.key !== 'Enter' || !wpisaneWciecie?.trim()) return
              zdarzenie.preventDefault()
              zmienWciecie(() => Number(wpisaneWciecie))
            }} /></label>
            <button type="button" className="program-szkolen__przycisk" disabled={!pasujace.length || !wpisaneWciecie?.trim()} onClick={() => zmienWciecie(() => Number(wpisaneWciecie))}>Zastosuj</button>
          </div>
          <button type="button" className="program-szkolen__przycisk" disabled={!pasujace.length} aria-label="Zwiększ wcięcie o 5 mm" onClick={() => zmienWciecie((wartosc) => wartosc + 5)}>→</button>
          <button type="button" className="program-szkolen__przycisk" disabled={!pasujace.length} onClick={() => zmienWciecie(() => null)}>Przywróć wcięcie presetu</button>
          {onZapiszWcieciePresetu && <button type="button" className="program-szkolen__przycisk" disabled={zakresWciecia !== 'program' || !pasujace.length || wspolneWciecie === undefined} onClick={() => {
            if (wspolneWciecie !== undefined) onZapiszWcieciePresetu(kategoriaWciecia, wspolneWciecie)
          }}>Zapisz w presecie</button>}
        </div>
      </fieldset>
      <EditorContent className="program-szkolen__obszar-edytora" editor={edytor} />
    </div>
  )
}
