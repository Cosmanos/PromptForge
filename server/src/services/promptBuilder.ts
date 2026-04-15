/**
 * Replace {{variable_name}} placeholders in a prompt with provided values.
 * Missing variables are left as-is.
 */
export function compilePrompt(
  rawPrompt: string,
  variableValues: Record<string, string>
): string {
  return rawPrompt.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    return variableValues[name] !== undefined ? variableValues[name] : match
  })
}
