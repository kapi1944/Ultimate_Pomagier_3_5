import { EditorContent, useEditor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useEffect, useState } from 'react'
import { konwertujHtmlNaTekstProgramu, konwertujHtmlNaWierszeProgramu, obsluzWklejenieProgramu, oczyscHtmlProgramu } from './konwersjaProgramuWysiwyg'
import { RozszerzenieOznaczenProgramu, pobierzPozycjeOznaczenEdytora } from './rozszerzenieOznaczenProgramu'
import { rozpoznajOznaczenieProgramu, styleOznaczenProgramu } from '../oznaczeniaProgramu'

const pusteStylePoziomow: string[] = []
const domyslneStyleEdytora = ['arabskie.', '◦', '▪']

type WlasciwosciEdytoraProgramuWysiwyg = {
  domyslneStylePoziomow?: string[]
  stylePoziomow?: string[]
  onZmianaStyluPoziomu?: (poziom: number, styl: string) => void
  wartoscHtml: string
  onZmianaHtml: (html: string) => void
  onZmianaTekstuProgramu: (tekst: string) => void
}

export function EdytorProgramuWysiwyg({
  wartoscHtml,
  stylePoziomow = pusteStylePoziomow,
  domyslneStylePoziomow = domyslneStyleEdytora,
  onZmianaStyluPoziomu,
  onZmianaHtml,
  onZmianaTekstuProgramu,
}: WlasciwosciEdytoraProgramuWysiwyg) {
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
      rozszerzenie.options.stylePoziomow = stylePoziomow
      rozszerzenie.options.domyslneStyle = domyslneStylePoziomow
    }
    edytor.view.dispatch(edytor.state.tr)
  }, [edytor, stylePoziomow, domyslneStylePoziomow])

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
      <EditorContent className="program-szkolen__obszar-edytora" editor={edytor} />
    </div>
  )
}
