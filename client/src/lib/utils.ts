import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ColorToken {
  bg: string
  border: string
  text: string
  inputBg: string
}

const VARIABLE_PALETTE: ColorToken[] = [
  { bg: '#EDE9FE', border: '#7C3AED', text: '#4C1D95', inputBg: '#F5F3FF' }, // violet
  { bg: '#FCE7F3', border: '#DB2777', text: '#831843', inputBg: '#FDF2F8' }, // pink
  { bg: '#D1FAE5', border: '#059669', text: '#064E3B', inputBg: '#ECFDF5' }, // emerald
  { bg: '#FEF3C7', border: '#D97706', text: '#78350F', inputBg: '#FFFBEB' }, // amber
  { bg: '#DBEAFE', border: '#2563EB', text: '#1E3A8A', inputBg: '#EFF6FF' }, // blue
  { bg: '#FFE4E6', border: '#E11D48', text: '#881337', inputBg: '#FFF1F2' }, // rose
  { bg: '#CCFBF1', border: '#0D9488', text: '#134E4A', inputBg: '#F0FDFA' }, // teal
  { bg: '#F3E8FF', border: '#9333EA', text: '#581C87', inputBg: '#FAF5FF' }, // purple
]

export function getVariableColor(sortOrder: number): ColorToken {
  return VARIABLE_PALETTE[sortOrder % VARIABLE_PALETTE.length]
}

export function colorFromString(colorJson: string): ColorToken {
  try {
    return JSON.parse(colorJson) as ColorToken
  } catch {
    return VARIABLE_PALETTE[0]
  }
}

export function compilePromptClient(
  rawPrompt: string,
  variableValues: Record<string, string>
): string {
  return rawPrompt.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    return variableValues[name] !== undefined ? variableValues[name] : match
  })
}
