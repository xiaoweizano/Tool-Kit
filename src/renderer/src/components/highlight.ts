const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function highlightLine(line: string, lang: 'json'): string {
  if (lang !== 'json' || !line.trim()) return esc(line)
  let out = ''
  let i = 0
  const n = line.length
  while (i < n) {
    const ch = line[i]
    if (ch === '"') {
      const end = line.indexOf('"', i + 1)
      const seg = line.slice(i, end === -1 ? n : end + 1)
      // 行内下一个非空白 token 是否 ':' → 键,否则字符串
      const rest = line.slice(end === -1 ? n : end + 1)
      const isKey = /^\s*:/.test(rest)
      out += `<span class="${isKey ? 'tk-k' : 'tk-s'}">${esc(seg)}</span>`
      i = end === -1 ? n : end + 1
    } else if (/[0-9-]/.test(ch)) {
      let j = i
      while (j < n && /[0-9.eE+-]/.test(line[j]!)) j++
      out += `<span class="tk-n">${esc(line.slice(i, j))}</span>`; i = j
    } else if (line.startsWith('true', i) || line.startsWith('false', i) || line.startsWith('null', i)) {
      const w = line.startsWith('true', i) ? 4 : line.startsWith('false', i) ? 5 : 4
      out += `<span class="tk-p">${line.slice(i, i + w)}</span>`; i += w
    } else {
      out += esc(ch); i++
    }
  }
  return out
}
