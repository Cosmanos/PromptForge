import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import HardBreak from '@tiptap/extension-hard-break'
import { UndoRedo, Placeholder } from '@tiptap/extensions'
import { VariableNode } from './VariableNode'
import { useVariableStore } from '@/lib/variableStore'
import { rawToDoc, docToRaw, collectVariables } from '@/lib/promptDoc'

export interface PromptEditorHandle {
  loadFromRaw: (raw: string) => void
  newVariable: () => void
  focus: () => void
}

interface PromptEditorProps {
  /** Stable id distinguishing the original vs rewritten editor in the store. */
  editorId: string
  initialRaw: string
  placeholder?: string
  disabled?: boolean
  /** Fired with the serialized prompt; `dirty` is false for programmatic loads. */
  onChange: (rawPrompt: string, dirty: boolean) => void
}

export const PromptEditor = forwardRef<PromptEditorHandle, PromptEditorProps>(function PromptEditor(
  { editorId, initialRaw, placeholder, disabled, onChange },
  ref
) {
  const store = useVariableStore()
  const getDefault = (name: string) => store.getEntry(name)?.defaultValue ?? ''

  function sync(editor: Editor, dirty: boolean) {
    store.reportVariables(editorId, collectVariables(editor))
    onChange(docToRaw(editor), dirty)
  }

  const editor = useEditor({
    editable: !disabled,
    content: rawToDoc(initialRaw, getDefault),
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak,
      UndoRedo,
      Placeholder.configure({ placeholder: placeholder ?? '' }),
      VariableNode,
    ],
    editorProps: {
      attributes: { class: 'pf-editor-content' },
    },
    onCreate: ({ editor }) => sync(editor, false),
    onUpdate: ({ editor }) => sync(editor, true),
  })

  useEffect(() => {
    if (!editor) return
    store.registerEditor(editorId, editor)
    return () => store.unregisterEditor(editorId)
  }, [editor, editorId]) // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(
    ref,
    () => ({
      loadFromRaw(raw: string) {
        if (!editor) return
        editor.commands.setContent(rawToDoc(raw, getDefault), { emitUpdate: false })
        sync(editor, false)
      },
      newVariable() {
        if (!editor) return
        const { from, to } = editor.state.selection
        const selectedText = editor.state.doc.textBetween(from, to, '\n')
        const name = store.createVariable(selectedText)
        if (selectedText) {
          editor.chain().focus().replaceSelectionWithVariable(name, selectedText).run()
        } else {
          editor.chain().focus().insertVariable(name).run()
        }
      },
      focus() {
        editor?.commands.focus()
      },
    }),
    [editor] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <div className="min-h-[200px] w-full rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed focus-within:ring-1 focus-within:ring-ring">
      <EditorContent editor={editor} />
    </div>
  )
})
