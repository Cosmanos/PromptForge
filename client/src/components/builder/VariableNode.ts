import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { VariableNodeView } from './VariableNodeView'

// A variable is an inline node whose *text content is the default value* — real
// editable document text, so the caret, selection and multiline wrapping are all
// native (no contenteditable-island hacks). It's `isolating` so it stays
// cohesive: surrounding edits don't shatter or merge into it. The variable's
// name lives in an attribute; its color comes from the variable store.

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    variable: {
      insertVariable: (name: string, text?: string) => ReturnType
      replaceSelectionWithVariable: (name: string, text?: string) => ReturnType
    }
  }
}

export const VariableNode = Node.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  content: 'text*',
  marks: '',
  selectable: false,
  draggable: false,
  isolating: true,

  addAttributes() {
    return {
      name: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-name') ?? '',
        renderHTML: (attrs) => ({ 'data-name': attrs.name }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-variable': '' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableNodeView)
  },

  addKeyboardShortcuts() {
    return {
      // Defaults are single-line: swallow Enter while the caret is inside a
      // variable so it can't split the token across paragraphs.
      Enter: () => {
        const { $from } = this.editor.state.selection
        return $from.parent.type.name === this.name
      },
    }
  },

  addInputRules() {
    // Typing `{{Name}}` anywhere creates an (empty-default) variable. (spec §5.1)
    return [
      nodeInputRule({
        find: /\{\{([A-Za-z0-9_]+)\}\}$/,
        type: this.type,
        getAttributes: (match) => ({ name: match[1] }),
      }),
    ]
  },

  addProseMirrorPlugins() {
    const type = this.type
    return [
      new Plugin({
        // Live-sync repeated instances within this editor: when the variable the
        // caret is in changes, mirror its text to every other same-name node.
        // The edited node is left untouched (its text already matches), so the
        // caret is unaffected; ProseMirror maps the selection through the rest.
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null

          const sel = newState.selection
          let editedName: string | null = null
          let editedText = ''
          newState.doc.descendants((node, pos) => {
            if (node.type !== type) return
            if (sel.from >= pos && sel.to <= pos + node.nodeSize) {
              editedName = node.attrs.name
              editedText = node.textContent
            }
          })
          if (editedName == null) return null

          const targets: Array<{ pos: number; size: number }> = []
          newState.doc.descendants((node, pos) => {
            if (node.type === type && node.attrs.name === editedName && node.textContent !== editedText) {
              targets.push({ pos, size: node.nodeSize })
            }
          })
          if (targets.length === 0) return null

          const tr = newState.tr
          // Apply back-to-front so earlier positions stay valid.
          for (const t of targets.reverse()) {
            const from = t.pos + 1
            const to = t.pos + t.size - 1
            if (editedText) tr.replaceWith(from, to, newState.schema.text(editedText))
            else tr.delete(from, to)
          }
          return tr
        },
      }),
    ]
  },

  addCommands() {
    return {
      insertVariable:
        (name: string, text?: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { name },
            content: text ? [{ type: 'text', text }] : undefined,
          }),
      replaceSelectionWithVariable:
        (name: string, text?: string) =>
        ({ chain }) =>
          chain()
            .deleteSelection()
            .insertContent({
              type: this.name,
              attrs: { name },
              content: text ? [{ type: 'text', text }] : undefined,
            })
            .run(),
    }
  },
})
