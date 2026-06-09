import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react'
import { Pencil, X, Check } from 'lucide-react'
import { useVariableStore } from '@/lib/variableStore'
import { getVariableColor } from '@/lib/utils'

// KNOWN ISSUE: the text insertion caret is not visible while editing a
// variable's default value, even though typing works. Tried so far:
//   - atom node + contenteditable island (caret blanked by NodeSelection's
//     .ProseMirror-hideselection { caret-color: transparent }),
//   - selectable: false to avoid the NodeSelection,
//   - this inline-content model (default value is real editable PM text),
//   - explicit caret-color on the editable span.
// None restored a visible caret. Editing still functions; the cursor is just
// invisible. Deferred — revisit (likely a ProseMirror selection-rendering /
// caret-color interaction specific to inline nodes).

export function VariableNodeView({ node, editor, getPos }: NodeViewProps) {
  const store = useVariableStore()
  const name: string = node.attrs.name

  const entry = store.getEntry(name)
  const color = entry?.color ?? getVariableColor(0)
  const isEmpty = node.content.size === 0

  const wrapRef = useRef<HTMLSpanElement>(null)
  const toolbarRef = useRef<HTMLSpanElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [active, setActive] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(name)

  // The variable is "active" (cursor inside → show toolbar) when the editor
  // selection falls within this node's range.
  useEffect(() => {
    const update = () => {
      const pos = typeof getPos === 'function' ? getPos() : undefined
      if (pos == null) return setActive(false)
      const { from, to } = editor.state.selection
      setActive(editor.isFocused && from >= pos && to <= pos + node.nodeSize)
    }
    update()
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    editor.on('focus', update)
    editor.on('blur', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
      editor.off('focus', update)
      editor.off('blur', update)
    }
  }, [editor, getPos, node])

  // Just-created variables open their rename field automatically (spec §5).
  useEffect(() => {
    if (store.editingName === name) {
      setDraftName(name)
      setRenaming(true)
    }
  }, [store.editingName, name])

  useEffect(() => {
    if (renaming) nameInputRef.current?.focus()
  }, [renaming])

  const showToolbar = active || renaming

  // Keep the floating toolbar inside the editor: if it would overflow the right
  // edge, slide it left to fit.
  useLayoutEffect(() => {
    const tb = toolbarRef.current
    if (!tb) return
    tb.style.transform = ''
    const container = tb.closest('.ProseMirror') as HTMLElement | null
    if (!container) return
    const t = tb.getBoundingClientRect()
    const c = container.getBoundingClientRect()
    const pad = 6
    let shift = 0
    if (t.right > c.right - pad) shift = c.right - pad - t.right
    if (t.left + shift < c.left + pad) shift = c.left + pad - t.left
    if (shift) tb.style.transform = `translateX(${Math.round(shift)}px)`
  }, [showToolbar, renaming, name, node.content.size])

  function commitRename() {
    if (store.rename(name, draftName)) setRenaming(false)
    else nameInputRef.current?.focus()
  }

  function cancelRename() {
    setDraftName(name)
    setRenaming(false)
    store.endNaming()
  }

  return (
    <NodeViewWrapper as="span" className="pf-var-wrap" ref={wrapRef}>
      {showToolbar && (
        <span
          ref={toolbarRef}
          className="pf-var-toolbar"
          contentEditable={false}
          // Keep the editor focused (and the caret in this variable) when the
          // toolbar is clicked — except the rename input, which needs focus.
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault()
          }}
          style={{ borderColor: color.border }}
        >
          <span className="pf-var-dot" style={{ backgroundColor: color.border }} />
          {renaming ? (
            <>
              <input
                ref={nameInputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitRename()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    cancelRename()
                  }
                }}
                className="pf-var-name-input"
                style={{ color: color.text }}
                spellCheck={false}
              />
              <button type="button" className="pf-var-btn" onClick={commitRename} title="Confirm name">
                <Check className="h-3 w-3" />
              </button>
            </>
          ) : (
            <>
              <span className="pf-var-name" style={{ color: color.text }}>
                {name}
              </span>
              <button
                type="button"
                className="pf-var-btn"
                onClick={() => {
                  setDraftName(name)
                  setRenaming(true)
                }}
                title="Rename variable"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="pf-var-btn"
                onClick={() => store.remove(name)}
                title="Remove variable (keep its text)"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          )}
        </span>
      )}

      <NodeViewContent<'span'>
        as="span"
        className="pf-var"
        data-active={active || undefined}
        data-empty={isEmpty || undefined}
        data-name={name}
        spellCheck={false}
        style={{
          backgroundColor: color.bg,
          borderColor: color.border,
          color: color.text,
          caretColor: color.border,
        }}
      />
    </NodeViewWrapper>
  )
}
