import type { ColorToken } from '@/lib/utils'

// ---- API Types ----

// `hint` holds the applies-when text (when Analyze should suggest the tag);
// rewrite_instructions is what Rewrite weaves into the prompt. counter_tag_ids
// lists the tags this one conflicts with (bidirectional, warn-only).
export interface Tag {
  id: number
  user_id: string
  name: string
  hint: string
  rewrite_instructions: string
  sort_order: number
  counter_tag_ids: number[]
}

// Admin template tag (no owner). Shape otherwise mirrors Tag.
export interface DefaultTag {
  id: number
  name: string
  hint: string
  rewrite_instructions: string
  sort_order: number
  counter_tag_ids: number[]
}

export interface Me {
  user_id: string
  is_admin: boolean
}

// A connected provider key — never includes the key itself, only last4.
export interface Connection {
  provider: 'anthropic' | 'openai'
  last4: string
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

export interface PromptListItem {
  id: number
  name: string
  model: string
  active_version: 'original' | 'rewritten'
  variable_count: number
  created_at: string
  updated_at: string
}

export interface PromptWithDetails {
  id: number
  name: string
  raw_prompt: string
  rewritten_prompt: string | null
  active_version: 'original' | 'rewritten'
  model: string
  created_at: string
  updated_at: string
  variables: Variable[]
  tag_ids: number[]
}

export interface SessionListItem {
  id: number
  prompt_id: number
  variable_values: string
  compiled_prompt: string
  model: string
  created_at: string
  first_message: string
  message_count: number
}

export interface Message {
  id: number
  session_id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface SessionWithMessages {
  id: number
  prompt_id: number
  variable_values: string
  compiled_prompt: string
  model: string
  created_at: string
  messages: Message[]
}

// ---- Segment Editor Types ----

export type TextSegment = {
  type: 'text'
  id: string
  content: string
}

export type VariableSegment = {
  type: 'variable'
  id: string
  name: string
  defaultValue: string
  color: ColorToken
  isExpanded: boolean
}

export type Segment = TextSegment | VariableSegment
