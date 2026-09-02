import type { ToolResult } from '@core/types'
import type { StrengthReport, StrengthCheck, Level } from './types'

const COMMON = ['123456','password','12345678','qwerty','abc123','111111','123123','admin','letmein','welcome','monkey','iloveyou','1234567890','1234567','000000','dragon','sunshine','master','shadow','superman','qwertyuiop','654321','1qaz2wsx','zaq1xsw2','baseball','trustno1','hello','abcabc','a123456','123321','666666','121212','qwe123','asdfgh','zxcvbn','passwd','admin123','welcome1','p@ssw0rd']
const SEQ = 'abcdefghijklmnopqrstuvwxyz0123456789qwertyuiopasdfghjklzxcvbnm'
const CHARSET = { lower: /[a-z]/, upper: /[A-Z]/, digit: /[0-9]/, symbol: /[^a-zA-Z0-9]/ }
const KEYBOARD = ['qwerty','asdfgh','zxcvbn','1qaz2wsx','qazwsx','ab','12','23','34','45','56','67','78','89','0q','as','df','qw','wer','sdf','xcv']

const hasSeq = (s: string): boolean => {
  for (let i = 0; i + 3 <= s.length; i++) {
    const t = s.slice(i, i + 3).toLowerCase()
    if (SEQ.indexOf(t) >= 0) return true
  }
  return false
}
const hasKeyboard = (s: string): boolean => {
  const lo = s.toLowerCase()
  return KEYBOARD.some((k) => lo.includes(k))
}
const hasRepeat = (s: string): boolean => /(.)\1{2,}/.test(s)

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

import type { GenerateOpts } from './types'

function randChar(set: string): string {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return set[buf[0] % set.length]
}
function makeCandidate(o: Required<Pick<GenerateOpts,'minLength'>> & GenerateOpts): string {
  const lower = 'abcdefghijklmnopqrstuvwxyz', upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digit = '0123456789', symbol = '!@#$%^&*()-_=+[]{};:,.<>?'
  const required = o.requireCharsets ?? (o.targetLevel === 'strong' ? ['lower','upper','digit','symbol'] : ['lower','digit'])
  const pools: Record<string,string> = { lower, upper, digit, symbol }
  let allow = required.map((r) => pools[r]).join('')
  const ex = o.excludeChars
  if (ex) allow = [...allow].filter((c) => !ex.includes(c)).join('')
  if (!allow) allow = lower + digit
  const chars = required.map((r) => randChar(pools[r].split('').filter((c) => !(o.excludeChars ?? '').includes(c)).join('') || pools[r]))
  while (chars.length < o.minLength) chars.push(randChar(allow))
  // shuffle (CSPRNG Fisher-Yates — never Math.random for password material)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export function generateByRules(opts: GenerateOpts): ToolResult<string> {
  if ((opts.minLength ?? 12) < 4) return { status: 'error', kind: 'invalid-input', message: '长度至少 4' }
  const target = opts.targetLevel ?? 'medium'
  for (let i = 0; i < 2000; i++) {
    const cand = makeCandidate({ ...opts, minLength: opts.minLength ?? 12 })
    const a = analyzeStrength(cand)
    if (a.status === 'ok') {
      const lv = a.data.level
      if ((target === 'strong' && lv === 'strong') || (target === 'medium' && lv !== 'weak') || (target === 'weak')) {
        return { status: 'ok', data: cand }
      }
    }
  }
  return { status: 'ok', data: makeCandidate({ ...opts, minLength: opts.minLength ?? 12 }) }
}
