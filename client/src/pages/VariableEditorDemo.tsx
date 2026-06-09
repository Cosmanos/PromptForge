import { useEffect, useRef, useState } from 'react'
import { VariableStoreProvider, useVariableStore } from '@/lib/variableStore'
import { PromptEditor, type PromptEditorHandle } from '@/components/builder/PromptEditor'
import { getVariableColor } from '@/lib/utils'
import type { Variable } from '@/types'

// Dev-only harness (route: /var-demo) for exercising the inline variable editor
// in isolation — no auth, no backend. Drive the §8 acceptance checks here.

const DEMO_RAW =
  'You are a helpful assistant for {{Company}}.\n' +
  'Greet the customer {{Customer}} warmly, and remember {{Company}} values clarity.\n' +
  'Use a {{Tone}} tone. This one is empty: {{Notes}}.\n' +
  'Long default to test wrapping: {{Bio}}'

const SEED: Variable[] = [
  { name: 'Company', default_value: 'Acme Corporation' },
  { name: 'Customer', default_value: 'Jane Doe' },
  { name: 'Tone', default_value: 'friendly and concise' },
  { name: 'Notes', default_value: '' },
  {
    name: 'Bio',
    default_value:
      'a seasoned product designer with over a decade of experience shipping delightful, accessible interfaces across web and mobile',
  },
].map((v, i) => ({
  id: i,
  prompt_id: 0,
  name: v.name,
  default_value: v.default_value,
  color: JSON.stringify(getVariableColor(i)),
  sort_order: i,
}))

function DemoInner() {
  const store = useVariableStore()
  const editorRef = useRef<PromptEditorHandle>(null)
  const [raw, setRaw] = useState(DEMO_RAW)
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    store.loadVariables(SEED)
    setSeeded(true)
  }, []) // eslint-disable-line

  if (!seeded) return null

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-4">
      <h1 className="text-lg font-semibold">Variable editor harness</h1>
      <p className="text-sm text-muted-foreground">
        Click a variable to edit its default inline. Repeated {'{{Company}}'} should stay in sync.
        {' {{Notes}}'} starts empty (a dashed slot). Try typing {'{{NewVar}}'}, the New variable
        button, rename, and remove.
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => editorRef.current?.newVariable()}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          + New variable
        </button>
      </div>

      <PromptEditor
        ref={editorRef}
        editorId="demo"
        initialRaw={DEMO_RAW}
        onChange={(r) => setRaw(r)}
        placeholder="Write your prompt..."
      />

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="font-medium mb-1">Serialized raw_prompt</div>
          <pre className="whitespace-pre-wrap rounded bg-track p-2">{raw}</pre>
        </div>
        <div>
          <div className="font-medium mb-1">variables (to persist)</div>
          <pre className="whitespace-pre-wrap rounded bg-track p-2">
            {JSON.stringify(store.variables, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default function VariableEditorDemo() {
  return (
    <VariableStoreProvider>
      <DemoInner />
    </VariableStoreProvider>
  )
}
