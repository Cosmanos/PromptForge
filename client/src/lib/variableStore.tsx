import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Editor } from '@tiptap/react'
import { getVariableColor, colorFromString, type ColorToken } from '@/lib/utils'
import type { Variable } from '@/types'

// ---------------------------------------------------------------------------
// The variable store is the single source of truth for every variable's
// default value and color, keyed by name. It is lifted above the editor(s) so
// that repeated instances — and the two editors behind the Original/Rewritten
// toggle — all read from one place: editing a default in one spot updates every
// instance live (spec §1), and a rename/remove propagates across both editors.
//
// The ProseMirror docs themselves carry only each variable's `name`; the
// rendered default + color come from here. Serialization walks the docs for
// `{{Name}}` order and pulls default/color back out of the store.
// ---------------------------------------------------------------------------

export interface VariableEntry {
  defaultValue: string
  color: ColorToken
  /** Creation order — drives the deterministic color and persisted sort_order. */
  sortOrder: number
}

/** Shape persisted to the `variables` table (matches the PATCH payload). */
export interface VariableForSave {
  name: string
  default_value: string
  color: string
  sort_order: number
}

export interface VariableStoreApi {
  entries: Record<string, VariableEntry>
  /** Variables actually referenced by some editor, ready to persist. */
  variables: VariableForSave[]
  isDirty: boolean
  /** Name whose inline rename field should be open (just-created variables). */
  editingName: string | null
  getEntry: (name: string) => VariableEntry | undefined
  rename: (oldName: string, newName: string) => boolean
  remove: (name: string) => void
  /** Create a brand-new variable (unique name) and open its rename field. */
  createVariable: (defaultValue: string) => string
  beginNaming: (name: string) => void
  endNaming: () => void
  registerEditor: (id: string, editor: Editor) => void
  unregisterEditor: (id: string) => void
  /**
   * Report the variables present in an editor's doc (name + current default
   * text). Drives the `variables` union and mirrors defaults for persistence.
   */
  reportVariables: (id: string, vars: Array<{ name: string; text: string }>) => void
  /** Seed entries from the server and reset the dirty flag (call once on load). */
  loadVariables: (vars: Variable[]) => void
}

const VariableStoreContext = createContext<VariableStoreApi | null>(null)

const VALID_NAME = /^[A-Za-z0-9_]+$/

function sameNames(a: string[] | undefined, b: string[]): boolean {
  if (!a || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

// Walk a doc replacing the `name` attr on every matching variable node.
function applyRename(editor: Editor, oldName: string, newName: string) {
  const { state, view } = editor
  const tr = state.tr
  // setNodeMarkup never changes doc size, so positions stay valid mid-walk.
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'variable' && node.attrs.name === oldName) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, name: newName })
    }
  })
  if (tr.docChanged) view.dispatch(tr)
}

// Walk a doc replacing every matching variable node with its own literal text
// (its current default). Replacing shifts positions, so collect first then
// apply back-to-front.
function applyRemove(editor: Editor, name: string) {
  const { state, view } = editor
  const ranges: Array<{ from: number; to: number; text: string }> = []
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'variable' && node.attrs.name === name) {
      ranges.push({ from: pos, to: pos + node.nodeSize, text: node.textContent })
    }
  })
  if (ranges.length === 0) return
  const tr = state.tr
  for (const r of ranges.reverse()) {
    if (r.text) tr.replaceWith(r.from, r.to, state.schema.text(r.text))
    else tr.delete(r.from, r.to)
  }
  view.dispatch(tr)
}

export function VariableStoreProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, VariableEntry>>({})
  const [namesByEditor, setNamesByEditor] = useState<Record<string, string[]>>({})
  const [editingName, setEditingName] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const editorsRef = useRef<Map<string, Editor>>(new Map())

  const nextSortOrder = useCallback((current: Record<string, VariableEntry>) => {
    return Object.values(current).reduce((max, e) => Math.max(max, e.sortOrder + 1), 0)
  }, [])

  const getEntry = useCallback((name: string) => entries[name], [entries])

  const reportVariables = useCallback(
    (id: string, vars: Array<{ name: string; text: string }>) => {
      const names = vars.map((v) => v.name)
      setNamesByEditor((prev) => (sameNames(prev[id], names) ? prev : { ...prev, [id]: names }))
      // Ensure an entry per referenced name (handles typed {{X}} and paste), and
      // mirror the current default text so it can be persisted.
      setEntries((prev) => {
        let changed = false
        const next = { ...prev }
        let order = nextSortOrder(prev)
        for (const { name, text } of vars) {
          const cur = next[name]
          if (!cur) {
            next[name] = { defaultValue: text, color: getVariableColor(order), sortOrder: order }
            order++
            changed = true
          } else if (cur.defaultValue !== text) {
            next[name] = { ...cur, defaultValue: text }
            changed = true
          }
        }
        return changed ? next : prev
      })
    },
    [nextSortOrder]
  )

  const createVariable = useCallback((defaultValue: string) => {
    let name = ''
    setEntries((prev) => {
      let n = 1
      while (prev[`variable_${n}`]) n++
      name = `variable_${n}`
      const order = nextSortOrder(prev)
      return { ...prev, [name]: { defaultValue, color: getVariableColor(order), sortOrder: order } }
    })
    setEditingName(name)
    setIsDirty(true)
    return name
  }, [nextSortOrder])

  const rename = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed || !VALID_NAME.test(trimmed)) return false
    if (trimmed === oldName) {
      setEditingName(null)
      return true
    }
    let ok = false
    setEntries((prev) => {
      if (!prev[oldName] || prev[trimmed]) return prev // collision or missing
      ok = true
      const { [oldName]: moved, ...rest } = prev
      return { ...rest, [trimmed]: moved }
    })
    if (!ok) return false
    editorsRef.current.forEach((editor) => applyRename(editor, oldName, trimmed))
    setEditingName((cur) => (cur === oldName ? null : cur))
    setIsDirty(true)
    return true
  }, [])

  const remove = useCallback((name: string) => {
    editorsRef.current.forEach((editor) => applyRemove(editor, name))
    setEntries((prev) => {
      if (!prev[name]) return prev
      const { [name]: _gone, ...rest } = prev
      return rest
    })
    setEditingName((cur) => (cur === name ? null : cur))
    setIsDirty(true)
  }, [])

  const beginNaming = useCallback((name: string) => setEditingName(name), [])
  const endNaming = useCallback(() => setEditingName(null), [])

  const registerEditor = useCallback((id: string, editor: Editor) => {
    editorsRef.current.set(id, editor)
  }, [])
  const unregisterEditor = useCallback((id: string) => {
    editorsRef.current.delete(id)
    setNamesByEditor((prev) => {
      if (!(id in prev)) return prev
      const { [id]: _gone, ...rest } = prev
      return rest
    })
  }, [])

  const loadVariables = useCallback((vars: Variable[]) => {
    const next: Record<string, VariableEntry> = {}
    vars.forEach((v, i) => {
      next[v.name] = {
        defaultValue: v.default_value,
        color: colorFromString(v.color),
        sortOrder: v.sort_order ?? i,
      }
    })
    setEntries(next)
    setIsDirty(false)
  }, [])

  // Variables to persist: only names actually referenced by some editor, in
  // creation order. A token deleted from every editor drops out automatically.
  const variables = useMemo<VariableForSave[]>(() => {
    const present = new Set<string>()
    for (const names of Object.values(namesByEditor)) for (const n of names) present.add(n)
    return [...present]
      .map((name) => ({ name, entry: entries[name] }))
      .filter((x): x is { name: string; entry: VariableEntry } => Boolean(x.entry))
      .sort((a, b) => a.entry.sortOrder - b.entry.sortOrder)
      .map(({ name, entry }) => ({
        name,
        default_value: entry.defaultValue,
        color: JSON.stringify(entry.color),
        sort_order: entry.sortOrder,
      }))
  }, [entries, namesByEditor])

  const api = useMemo<VariableStoreApi>(
    () => ({
      entries,
      variables,
      isDirty,
      editingName,
      getEntry,
      rename,
      remove,
      createVariable,
      beginNaming,
      endNaming,
      registerEditor,
      unregisterEditor,
      reportVariables,
      loadVariables,
    }),
    [
      entries,
      variables,
      isDirty,
      editingName,
      getEntry,
      rename,
      remove,
      createVariable,
      beginNaming,
      endNaming,
      registerEditor,
      unregisterEditor,
      reportVariables,
      loadVariables,
    ]
  )

  return <VariableStoreContext.Provider value={api}>{children}</VariableStoreContext.Provider>
}

export function useVariableStore(): VariableStoreApi {
  const ctx = useContext(VariableStoreContext)
  if (!ctx) throw new Error('useVariableStore must be used within a VariableStoreProvider')
  return ctx
}
