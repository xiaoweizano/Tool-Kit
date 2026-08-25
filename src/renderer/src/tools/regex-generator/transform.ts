import type { ToolResult } from '@core/types'

export interface RegexTemplate {
  id: string; name: string; pattern: string; flags: string; desc: string; example: string
}

export const REGEX_LIBRARY: RegexTemplate[] = [
  { id: 'email', name: '邮箱', pattern: '[\\w.-]+@[\\w-]+(\\.[\\w-]+)+', flags: '', desc: '通用邮箱地址', example: 'user@example.com' },
  { id: 'phone-cn', name: '中国手机号', pattern: '1[3-9]\\d{9}', flags: '', desc: '1 开头 11 位,第二位 3-9', example: '13812345678' },
  { id: 'ipv4', name: 'IPv4 地址', pattern: '((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)', flags: '', desc: '0.0.0.0 - 255.255.255.255', example: '192.168.1.1' },
  { id: 'ipv6', name: 'IPv6 地址(完整)', pattern: '([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}', flags: '', desc: '完整格式 8 组冒号分隔', example: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' },
  { id: 'url', name: 'URL', pattern: 'https?://[^\\s]+', flags: '', desc: 'http/https 链接', example: 'https://example.com/path' },
  { id: 'date', name: '日期 yyyy-MM-dd', pattern: '\\d{4}-\\d{2}-\\d{2}', flags: '', desc: '连字符日期', example: '2026-08-25' },
  { id: 'time', name: '时间 HH:mm:ss', pattern: '([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d', flags: '', desc: '24 小时制时刻', example: '14:30:59' },
  { id: 'datetime', name: '日期时间', pattern: '\\d{4}-\\d{2}-\\d{2} ([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d', flags: '', desc: '日期 + 空格 + 时刻', example: '2026-08-25 14:30:59' },
  { id: 'int', name: '整数', pattern: '-?\\d+', flags: '', desc: '可选负号的整数', example: '-42' },
  { id: 'decimal', name: '小数', pattern: '-?\\d+\\.\\d+', flags: '', desc: '带小数点的数', example: '3.14' },
  { id: 'idcard', name: '身份证号(格式)', pattern: '\\d{17}[\\dXx]', flags: '', desc: '18 位,末位可 X(仅格式,不验校验位)', example: '110101199003077758' },
  { id: 'hanzi', name: '汉字', pattern: '[\\u4e00-\\u9fa5]+', flags: '', desc: '连续中文字符', example: '工具箱' },
  { id: 'uuid', name: 'UUID', pattern: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', flags: 'i', desc: '8-4-4-4-12 十六进制', example: '550e8400-e29b-41d4-a716-446655440000' },
  { id: 'hexcolor', name: '十六进制颜色', pattern: '#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})', flags: '', desc: '#FFF 或 #FF5733 形态', example: '#FF5733' },
  { id: 'zipcode', name: '邮政编码', pattern: '\\d{6}', flags: '', desc: '6 位数字', example: '100000' },
  { id: 'qq', name: 'QQ 号', pattern: '[1-9]\\d{4,10}', flags: '', desc: '5-11 位,首号非 0', example: '123456789' },
  { id: 'wechat', name: '微信号', pattern: '[a-zA-Z][a-zA-Z0-9_-]{5,19}', flags: '', desc: '字母开头 6-20 位', example: 'wx_user_123' },
  { id: 'plate', name: '车牌号', pattern: '[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9挂学警港澳]', flags: '', desc: '省份简称+字母+5 位', example: '京A12345' },
  { id: 'bankcard', name: '银行卡号(格式)', pattern: '\\d{15,19}', flags: '', desc: '15-19 位数字(不验 Luhn)', example: '6222020200112233445' },
  { id: 'mac', name: 'MAC 地址', pattern: '([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}', flags: '', desc: '冒号分隔 6 组十六进制', example: '00:1A:2B:3C:4D:5E' },
  { id: 'port', name: '端口号', pattern: '([1-9]\\d{0,3}|[1-5]\\d{4}|6[0-4]\\d{3}|65[0-4]\\d{2}|655[0-2]\\d|6553[0-5])', flags: '', desc: '1-65535', example: '8080' },
  { id: 'username', name: '用户名', pattern: '[a-zA-Z][a-zA-Z0-9_]{2,19}', flags: '', desc: '字母开头 3-20 位', example: 'dev_user' },
  { id: 'blank', name: '空白行', pattern: '^\\s*$', flags: 'm', desc: '多行模式下的空行/纯空白行', example: '   ' }
]

function buildRegex(pattern: string, flags: string): RegExp | null {
  try {
    const f = flags.includes('g') ? flags : flags + 'g'
    return new RegExp(pattern, f)
  } catch { return null }
}

export function matchRegex(input: { pattern: string; flags: string; text: string }): ToolResult<string> {
  const { pattern, flags, text } = input
  if (!pattern.trim()) return { status: 'error', kind: 'invalid-input', message: '正则表达式为空' }
  const re = buildRegex(pattern, flags)
  if (!re) return { status: 'error', kind: 'invalid-input', message: '正则表达式语法错误,请检查' }
  const hits: string[] = []
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(text)) !== null) {
    hits.push(`第 ${hits.length + 1} 处 [${m.index}-${m.index + m[0].length}] ${m[0] === '' ? '(空串匹配)' : m[0]}`)
    if (m[0] === '') re.lastIndex++ // 防空匹配死循环
    if (++guard > 10000) break // 超长文本兜底
  }
  if (hits.length === 0) return { status: 'ok', data: '无匹配(正则合法,但测试文本中没有命中)' }
  return { status: 'ok', data: [`匹配 ${hits.length} 处:`, ...hits].join('\n') }
}

export function highlightSegments(
  pattern: string, flags: string, text: string
): { segments: { text: string; matched: boolean }[] } {
  const re = pattern.trim() ? buildRegex(pattern, flags) : null
  if (!re) return { segments: [{ text, matched: false }] }
  const segments: { text: string; matched: boolean }[] = []
  let last = 0
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index), matched: false })
    segments.push({ text: m[0], matched: true })
    last = m.index + m[0].length
    if (m[0] === '') re.lastIndex++
    if (++guard > 10000) break
  }
  if (last < text.length) segments.push({ text: text.slice(last), matched: false })
  return { segments }
}
