import type { ColorToken } from '@/lib/utils'

// ---- API Types ----

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
