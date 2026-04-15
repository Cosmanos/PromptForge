export interface Tag {
  id: number
  name: string
  hint: string
  sort_order: number
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
