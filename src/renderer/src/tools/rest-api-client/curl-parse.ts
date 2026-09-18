import type { ToolResult } from '@core/types'
import type { RequestModel, KV } from './types'

const newKv = (key: string, value: string): KV => ({ id: crypto.randomUUID(), key, value })

const INVALID = (): ToolResult<RequestModel> => ({
  status: 'error',
  kind: 'invalid-input',
  message: '不是有效的 cURL 命令',
})

/**
 * Decode a single backslash escape inside a bash `$'...'` ANSI-C quoted string.
 *
 * `start` is the index of the character immediately after the backslash. The
 * decoded value is pushed through `push` and the index of the next unread
 * character is returned.
 *
 * Supported: `\n \t \r \\ \' \" \a \b \f \v \0` and `\xNN` (two hex digits ->
 * that byte's character). Unknown escapes yield the escaped character verbatim.
 */
function decodeAnsi(s: string, start: number, push: (v: string) => void): number {
  const c = s[start]
  switch (c) {
    case undefined:
      push('\\')
      return start
    case 'n':
      push('\n')
      return start + 1
    case 't':
      push('\t')
      return start + 1
    case 'r':
      push('\r')
      return start + 1
    case 'a':
      push('\x07')
      return start + 1
    case 'b':
      push('\b')
      return start + 1
    case 'f':
      push('\f')
      return start + 1
    case 'v':
      push('\v')
      return start + 1
    case '0':
      push('\0')
      return start + 1
    case '\\':
      push('\\')
      return start + 1
    case "'":
      push("'")
      return start + 1
    case '"':
      push('"')
      return start + 1
    case 'x': {
      const hex = s.slice(start + 1, start + 3)
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        push(String.fromCharCode(parseInt(hex, 16)))
        return start + 3
      }
      push('x')
      return start + 1
    }
    default:
      push(c)
      return start + 1
  }
}

/**
 * Split a cURL command line into argument tokens.
 *
 * Dialects handled:
 * - bash: `'...'` (literal), `"..."` (backslash escapes `\\ \" \$ \``), and
 *   `$'...'` ANSI-C quoting (see {@link decodeAnsi}).
 * - cmd: `^"..."` quoting where an inner literal quote is written `\^"` and
 *   `^` otherwise escapes the following character.
 * - Line continuations: bash `\`-at-EOL and cmd `^`-at-EOL join with a space.
 *
 * Whitespace outside quotes separates tokens; adjacent segments (`'a'"b"`) glue
 * into one token. `{{...}}` templates are preserved verbatim.
 */
export function tokenize(input: string): string[] {
  const src = input.replace(/\\\r?\n/g, ' ').replace(/\^\r?\n/g, ' ')
  const toks: string[] = []
  const n = src.length
  let i = 0
  while (i < n) {
    while (i < n && /\s/.test(src[i])) i++
    if (i >= n) break
    let tok = ''
    while (i < n && !/\s/.test(src[i])) {
      const c = src[i]
      if (c === '$' && src[i + 1] === "'") {
        i += 2
        while (i < n && src[i] !== "'") {
          if (src[i] === '\\') {
            i = decodeAnsi(src, i + 1, (v) => {
              tok += v
            })
          } else {
            tok += src[i++]
          }
        }
        i++ // closing quote
        continue
      }
      if (c === "'") {
        i++
        while (i < n && src[i] !== "'") tok += src[i++]
        i++ // closing quote
        continue
      }
      if (c === '"') {
        i++
        while (i < n && src[i] !== '"') {
          if (src[i] === '\\') {
            const nx = src[i + 1]
            tok += nx === '\\' ? '\\' : nx === '"' ? '"' : nx === '$' ? '$' : nx === '`' ? '`' : '\\' + (nx ?? '')
            i += 2
          } else {
            tok += src[i++]
          }
        }
        i++ // closing quote
        continue
      }
      if (c === '^' && src[i + 1] === '"') {
        i += 2
        while (i < n) {
          if (src[i] === '\\' && src[i + 1] === '^' && src[i + 2] === '"') {
            tok += '"'
            i += 3
            continue
          }
          if (src[i] === '^' && src[i + 1] === '"') {
            i += 2
            break
          }
          if (src[i] === '^') {
            tok += src[i + 1] ?? ''
            i += 2
            continue
          }
          tok += src[i++]
        }
        continue
      }
      tok += c
      i++
    }
    toks.push(tok)
  }
  return toks.filter((t) => t !== '')
}

const BODY_FLAGS = new Set(['-d', '--data', '--data-raw', '--data-binary', '--data-urlencode'])
const IGNORED_FLAGS = new Set(['--compressed', '-k', '--insecure', '-L', '--location'])

/** Parse a Chrome/DevTools `Copy as cURL` command into a RequestModel. */
export function parseCurl(text: string): ToolResult<RequestModel> {
  const toks = tokenize(text ?? '')
  if (toks.length === 0) return INVALID()
  const cmd = (toks[0] ?? '').toLowerCase().replace(/\.exe$/, '')
  if (cmd !== 'curl') return INVALID()

  let method = ''
  let url = ''
  let body = ''
  const headers: KV[] = []

  const header = (raw: string): KV => {
    const cut = raw.indexOf(':')
    if (cut === -1) return newKv(raw.trim(), '')
    return newKv(raw.slice(0, cut).trim(), raw.slice(cut + 1).trim())
  }

  for (let i = 1; i < toks.length; i++) {
    const t = toks[i]
    // `--flag=value` form for value-taking long flags.
    let flag = t
    let inline: string | undefined
    if (t.startsWith('--')) {
      const eq = t.indexOf('=')
      if (eq !== -1) {
        flag = t.slice(0, eq)
        inline = t.slice(eq + 1)
      }
    }
    const value = (): string => (inline !== undefined ? inline : toks[++i] ?? '')

    if (flag === '-X' || flag === '--request') {
      method = value()
    } else if (flag === '-H' || flag === '--header') {
      const raw = value()
      if (raw !== '') headers.push(header(raw))
    } else if (BODY_FLAGS.has(flag)) {
      body = value()
    } else if (flag === '-b' || flag === '--cookie') {
      headers.push(newKv('Cookie', value()))
    } else if (IGNORED_FLAGS.has(flag)) {
      // no-op
    } else if (t.startsWith('-')) {
      // Unknown flag: leave the token untouched (never mistaken for the URL if
      // a value follows — best-effort for v1).
      continue
    } else if (url === '') {
      url = t
    }
  }

  if (url === '') return INVALID()
  if (method === '') method = body !== '' ? 'POST' : 'GET'
  return { status: 'ok', data: { method, url, headers, body } }
}
