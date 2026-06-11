// `hint` holds the applies-when text (when to suggest the tag);
// rewrite_instructions is what Rewrite weaves into the prompt.
export interface Tag {
  id: number
  user_id: string
  name: string
  hint: string
  rewrite_instructions: string
  sort_order: number
}

export interface DefaultTag {
  id: number
  name: string
  hint: string
  rewrite_instructions: string
  sort_order: number
}

// API shape: a tag plus the ids it counters (expanded from the canonical
// stored pairs to both directions).
export interface TagWithCounters extends Tag {
  counter_tag_ids: number[]
}

export interface DefaultTagWithCounters extends DefaultTag {
  counter_tag_ids: number[]
}

export interface Profile {
  id: string
  is_admin: boolean
  created_at: string
}

export interface Variable {
  id: number
  prompt_id: number
  name: string
  default_value: string
  color: string
  sort_order: number
}

export interface Prompt {
  id: number
  user_id: string
  name: string
  raw_prompt: string
  rewritten_prompt: string | null
  active_version: 'original' | 'rewritten'
  model: string
  created_at: string
  updated_at: string
}

export interface PromptWithDetails extends Prompt {
  variables: Variable[]
  tag_ids: number[]
}

export interface Session {
  id: number
  user_id: string
  prompt_id: number
  variable_values: string
  compiled_prompt: string
  model: string
  created_at: string
}

export interface Message {
  id: number
  session_id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface SessionWithMessages extends Session {
  messages: Message[]
}
