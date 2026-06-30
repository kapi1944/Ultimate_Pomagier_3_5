import { EditorContent, useEditor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useEffect } from 'react'
import { konwertujHtmlNaTekstProgramu, oczyscHtmlProgramu } from './konwersjaProgramuWysiwyg'

type WlasciwosciEdytoraProgramuWysiwyg = {
  wartoscHtml: string
  onZmianaHtml: (html: string) => void
  onZmianaTekstuProgramu: (tekst: string) => void
}

export function EdytorProgramuWysiwyg({
  wartoscHtml,
  onZmianaHtml,
  onZmianaTekstuProgramu,
}: WlasciwosciEdytoraProgramuWysiwyg) {
  const edytor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Wklej lub edytuj pełny program szkolenia...',
      }),
    ],
    content: wartoscHtml || '<p></p>',
    editorProps: {
      attributes: {
        class: 'program-szkolen__tiptap',
      },
      transformPastedHTML: oczyscHtmlProgramu,
    },
    onUpdate: ({ editor }) => {
      const html = oczyscHtmlProgramu(editor.getHTML())

      onZmianaHtml(html)
      onZmianaTekstuProgramu(konwertujHtmlNaTekstProgramu(html))
    },
  })

  useEffect(() => {
    if (!edytor || !wartoscHtml || edytor.getHTML() === wartoscHtml) {
      return
    }

    edytor.commands.setContent(wartoscHtml, { emitUpdate: false })
  }, [edytor, wartoscHtml])

  const czyAktywny = (nazwa: string, opcje?: Record<string, unknown>) => Boolean(edytor?.isActive(nazwa, opcje))

  return (
    <div className="program-szkolen__edytor-wysiwyg">
      <div className="program-szkolen__pasek-edytora">
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
          onClick={() => edytor?.chain().focus().toggleBulletList().run()}
          type="button"
        >
          Lista punktowana
        </button>
        <button
          className={`program-szkolen__przycisk ${czyAktywny('orderedList') ? 'program-szkolen__przycisk--aktywny' : ''}`}
          disabled={!edytor}
          onClick={() => edytor?.chain().focus().toggleOrderedList().run()}
          type="button"
        >
          Lista numerowana
        </button>
        <button
          className="program-szkolen__przycisk"
          disabled={!edytor}
          onClick={() => edytor?.chain().focus().liftListItem('listItem').run()}
          type="button"
        >
          &lt;&lt;
        </button>
        <button
          className="program-szkolen__przycisk"
          disabled={!edytor}
          onClick={() => edytor?.chain().focus().sinkListItem('listItem').run()}
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
