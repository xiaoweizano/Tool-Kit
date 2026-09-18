export function resolveVars(text: string, vars: Record<string, string>): { resolved: string; undefinedVars: string[] } {
  const undefinedVars: string[] = []
  const resolved = (text ?? '').replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_m, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) return vars[key]
    if (!undefinedVars.includes(key)) undefinedVars.push(key)
    return `{{${key}}}`
  })
  return { resolved, undefinedVars }
}
