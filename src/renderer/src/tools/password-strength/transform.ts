import type { ToolResult } from '@core/types'
import type { StrengthReport, StrengthCheck, Level, GenerateOpts } from './types'

const COMMON = ['123456','password','12345678','qwerty','abc123','111111','123123','admin','letmein','welcome','monkey','iloveyou','1234567890','1234567','000000','dragon','sunshine','master','shadow','superman','qwertyuiop','654321','1qaz2wsx','zaq1xsw2','baseball','trustno1','hello','abcabc','a123456','123321','666666','121212','qwe123','asdfgh','zxcvbn','passwd','admin123','welcome1','p@ssw0rd']
const SEQ = 'abcdefghijklmnopqrstuvwxyz0123456789qwertyuiopasdfghjklzxcvbnm'
const CHARSET = { lower: /[a-z]/, upper: /[A-Z]/, digit: /[0-9]/, symbol: /[^a-zA-Z0-9]/ }
const KEYROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890']

const hasSeq = (s: string): boolean => {
  for (let i = 0; i + 3 <= s.length; i++) {
    const t = s.slice(i, i + 3).toLowerCase()
    if (SEQ.indexOf(t) >= 0) return true
  }
  return false
}
const hasKeyboard = (s: string): boolean => {
  const lo = s.toLowerCase()
  for (let i = 0; i + 3 <= lo.length; i++) {
    const t = lo.slice(i, i + 3)
    for (const row of KEYROWS) if (row.includes(t)) return true
  }
  return false
}
const hasRepeat = (s: string): boolean => /(.)\1{2,}/.test(s)
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/~`'
const randChar = (set: string): string => { const b = new Uint32Array(1); crypto.getRandomValues(b); return set[b[0] % set.length] }
function breakRuns(out: string): string {
  let guard = 0
  while (guard < 80 && (hasSeq(out) || hasKeyboard(out) || hasRepeat(out))) {
    guard++
    const lo = out.toLowerCase()
    let pos = -1
    for (let i = 0; i + 3 <= lo.length; i++) {
      const t = lo.slice(i, i + 3)
      if (SEQ.indexOf(t) >= 0 || KEYROWS.some((r) => r.includes(t))) { pos = i + 1; break }
    }
    if (pos < 0) { const m = out.match(/(.)\1{2,}/); if (m) { pos = out.indexOf(m[1].repeat(2)) + 1 } }
    if (pos < 0) break
    out = out.slice(0, pos) + randChar(SYMBOLS) + out.slice(pos)
  }
  return out
}

function isCommon(p: string): boolean { return COMMON.includes(p.toLowerCase()) }

export function analyzeStrength(password: string): ToolResult<StrengthReport> {
  if (!password) return { status: 'error', kind: 'invalid-input', message: '请输入密码' }
  const len = password.length
  const counts = Object.values(CHARSET).filter((re) => re.test(password)).length

  const checks: StrengthCheck[] = [
    { id: 'length', label: '长度 ≥12', passed: len >= 12, hint: len >= 12 ? undefined : '建议长度 ≥12' },
    { id: 'charset', label: '含大小写+数字+符号', passed: counts >= 3, hint: counts >= 3 ? undefined : '建议混合大小写/数字/符号' },
    { id: 'seq', label: '无连续字符', passed: !hasSeq(password), hint: hasSeq(password) ? '含连续字符(如 123/abc),易被猜到' : undefined },
    { id: 'keyboard', label: '无键盘序列', passed: !hasKeyboard(password), hint: hasKeyboard(password) ? '含键盘序列(如 qwerty),易被猜到' : undefined },
    { id: 'repeat', label: '无重复字符', passed: !hasRepeat(password), hint: hasRepeat(password) ? '含重复字符(如 aaa),易被猜到' : undefined },
    { id: 'common', label: '非常见密码', passed: !isCommon(password), hint: isCommon(password) ? '命中常见密码表,请更换' : undefined }
  ]

  // score: length(0-25) + charset(0-25) + pattern penalties(bonus 0-25) + common penalty
  let score = 0
  score += Math.min(25, Math.round((len / 12) * 25))
  score += Math.min(25, counts * 8)
  const penalties = checks.filter((c) => ['seq','keyboard','repeat','common'].includes(c.id) && !c.passed).length
  score += Math.max(0, 25 - penalties * 10)
  score = Math.min(100, score)
  if (isCommon(password)) score = Math.min(score, 20)
  if (len < 8) score = Math.min(score, 25)

  const level: Level = score < 40 ? 'weak' : score <= 70 ? 'medium' : 'strong'
  const suggestions = checks.filter((c) => !c.passed && c.hint).map((c) => c.hint as string)
  if (suggestions.length === 0) suggestions.push('密码强度良好')
  return { status: 'ok', data: { score, level, length: len, checks, suggestions } }
}

export function improvePassword(password: string, opts: GenerateOpts): ToolResult<string> {
  if (!password) return { status: 'error', kind: 'invalid-input', message: '请先输入一个密码' }
  const target = opts.targetLevel ?? 'medium'
  const minLen = Math.max(opts.minLength ?? (target === 'strong' ? 12 : target === 'medium' ? 8 : password.length), password.length)
  const need = opts.requireCharsets ?? (target === 'strong' ? ['lower','upper','digit','symbol'] : target === 'medium' ? ['lower','upper','digit'] : ['lower','digit'])
  const pools: Record<string,string> = { lower:'abcdefghijklmnopqrstuvwxyz', upper:'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digit:'0123456789', symbol:'!@#$%^&*()-_=+[]{};:,.<>?' }
  const allowed = (set: string): string => opts.excludeChars ? [...set].filter((c) => !opts.excludeChars!.includes(c)).join('') : set
  const meets = (s: string, t: Level): boolean => {
    const a = analyzeStrength(s)
    if (a.status !== 'ok') return false
    if (t === 'strong') return a.data.level === 'strong'
    if (t === 'medium') return a.data.level !== 'weak'
    return true
  }
  let result = password
  // 1) ensure each required charset present (insert 1 char, into the middle to break runs)
  for (const cs of need) {
    if (!CHARSET[cs as keyof typeof CHARSET].test(result)) {
      const pool = allowed(pools[cs]) || pools[cs]
      if (pool) { const pos = result.length ? Math.floor(result.length / 2) : 0; result = result.slice(0, pos) + randChar(pool) + result.slice(pos) }
    }
  }
  // 2) pad to minLen via SPREAD inserts (position = (len+1)*k/(n+1), interleaved, breaks contiguous runs)
  let guard = 0
  const pool = need.map((c) => allowed(pools[c]) || pools[c]).join('')
  while (result.length < minLen && pool && guard < 300) {
    const k = result.length - password.length + 1
    const pos = Math.floor(((result.length + 1) * k) / (k + 1))
    result = result.slice(0, pos) + randChar(pool) + result.slice(pos)
    guard++
  }
  // 2.5) 打散连续字符/键盘序列/重复片段,避免模式惩罚把分数拖垮
  result = breakRuns(result)
  // 3) if not meeting target, inject extra random chars (CSPRNG position) and retry a few times
  for (let i = 0; i < 12 && !meets(result, target); i++) {
    const cs = (['upper','digit','symbol','lower'] as const)[i % 4]
    const p = allowed(pools[cs]) || pools[cs]
    if (p) { const pos = crypto.getRandomValues(new Uint32Array(1))[0] % (result.length + 1); result = result.slice(0, pos) + randChar(p) + result.slice(pos) }
  }
  return { status: 'ok', data: result }
}
