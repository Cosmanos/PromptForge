import type { Editor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'

// Two-way mapping between the stored form (`{{Name}}` tokens inside plain text)
// and the editor's ProseMirror document, where each variable is an inline node
// whose text content is its default value. Each source line maps to a
// paragraph; tokens map to variable nodes carrying their default text inline.

const TOKEN = /\{\{([A-Za-z0-9_]+)\}\}/g

function lineToInline(line: string, getDefault: (name: string) => string): JSONContent[] {
  const content: JSONContent[] = []
  let last = 0
  let m: RegExpExecArray | null
  TOKEN.lastIndex = 0
  while ((m = TOKEN.exec(line)) !== null) {
    if (m.index > last) content.push({ type: 'text', text: line.slice(last, m.index) })
    const def = getDefault(m[1])
    content.push({
      type: 'variable',
      attrs: { name: m[1] },
      content: def ? [{ type: 'text', text: def }] : undefined,
    })
    last = TOKEN.lastIndex
  }
  if (last < line.length) content.push({ type: 'text', text: line.slice(last) })
  return content
}

/** Build a ProseMirror doc from raw prompt text, filling defaults from the store. */
export function rawToDoc(raw: string, getDefault: (name: string) => string): JSONContent {
  const lines = raw.split('\n')
  const content: JSONContent[] = lines.map((line) => {
    const inline = lineToInline(line, getDefault)
    return inline.length > 0 ? { type: 'paragraph', content: inline } : { type: 'paragraph' }
  })
  if (content.length === 0) content.push({ type: 'paragraph' })
  return { type: 'doc', content }
}

/** Serialize the doc back to stored form: text + `{{Name}}`, lines joined by \n. */
export function docToRaw(editor: Editor): string {
  const lines: string[] = []
  editor.state.doc.forEach((block) => {
    let line = ''
    block.forEach((child) => {
      if (child.type.name === 'variable') line += `{{${child.attrs.name}}}`
      else if (child.isText) line += child.text ?? ''
      else if (child.type.name === 'hardBreak') line += '\n'
    })
    lines.push(line)
  })
  return lines.join('\n')
}

/** Unique variables referenced in the doc (name + current default text), in order. */
export function collectVariables(editor: Editor): Array<{ name: string; text: string }> {
  const seen = new Set<string>()
  const out: Array<{ name: string; text: string }> = []
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'variable' && node.attrs.name && !seen.has(node.attrs.name)) {
      seen.add(node.attrs.name)
      out.push({ name: node.attrs.name, text: node.textContent })
    }
  })
  return out
}
