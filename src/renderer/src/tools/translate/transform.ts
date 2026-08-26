// 语言与引擎纯函数层:URL/签名构造 + 响应解析 + 错误映射,全部无副作用可单测

export interface LangDef { code: string; label: string }
export const LANGUAGES: LangDef[] = [
  { code: 'zh-CN', label: '中文' }, { code: 'en', label: '英语' }, { code: 'ja', label: '日语' },
  { code: 'ko', label: '韩语' }, { code: 'ru', label: '俄语' },
  { code: 'fr', label: '法语' }, { code: 'de', label: '德语' }, { code: 'es', label: '西班牙语' }
]
export const AUTO = 'auto'
export const MAX_LINE_LEN = 450

// ---- 纯 JS MD5(标准实现,RFC 1321 测试向量锁定) ----
function md5cycle(x: number[], k: number[]): void {
  let [a, b, c, d] = x
  const ff = (a2: number, b2: number, c2: number, d2: number, x2: number, s: number, t: number): number => cmn(b2 & c2 | ~b2 & d2, a2, b2, x2, s, t)
  const gg = (a2: number, b2: number, c2: number, d2: number, x2: number, s: number, t: number): number => cmn(b2 & d2 | c2 & ~d2, a2, b2, x2, s, t)
  const hh = (a2: number, b2: number, c2: number, d2: number, x2: number, s: number, t: number): number => cmn(b2 ^ c2 ^ d2, a2, b2, x2, s, t)
  const ii = (a2: number, b2: number, c2: number, d2: number, x2: number, s: number, t: number): number => cmn(c2 ^ (b2 | ~d2), a2, b2, x2, s, t)
  function cmn(q: number, a2: number, b2: number, x2: number, s: number, t: number): number {
    a2 = (((a2 + q) | 0) + ((x2 + t) | 0)) | 0
    return (((a2 << s) | (a2 >>> (32 - s))) + b2) | 0
  }
  a = ff(a, b, c, d, k[0], 7, -680876936)
  d = ff(d, a, b, c, k[1], 12, -389564586)
  c = ff(c, d, a, b, k[2], 17, 606105819)
  b = ff(b, c, d, a, k[3], 22, -1044525330)
  a = ff(a, b, c, d, k[4], 7, -176418897)
  d = ff(d, a, b, c, k[5], 12, 1200080426)
  c = ff(c, d, a, b, k[6], 17, -1473231341)
  b = ff(b, c, d, a, k[7], 22, -45705983)
  a = ff(a, b, c, d, k[8], 7, 1770035416)
  d = ff(d, a, b, c, k[9], 12, -1958414417)
  c = ff(c, d, a, b, k[10], 17, -42063)
  b = ff(b, c, d, a, k[11], 22, -1990404162)
  a = ff(a, b, c, d, k[12], 7, 1804603682)
  d = ff(d, a, b, c, k[13], 12, -40341101)
  c = ff(c, d, a, b, k[14], 17, -1502002290)
  b = ff(b, c, d, a, k[15], 22, 1236535329)
  a = gg(a, b, c, d, k[1], 5, -165796510)
  d = gg(d, a, b, c, k[6], 9, -1069501632)
  c = gg(c, d, a, b, k[11], 14, 643717713)
  b = gg(b, c, d, a, k[0], 20, -373897302)
  a = gg(a, b, c, d, k[5], 5, -701558691)
  d = gg(d, a, b, c, k[10], 9, 38016083)
  c = gg(c, d, a, b, k[15], 14, -660478335)
  b = gg(b, c, d, a, k[4], 20, -405537848)
  a = gg(a, b, c, d, k[9], 5, 568446438)
  d = gg(d, a, b, c, k[14], 9, -1019803690)
  c = gg(c, d, a, b, k[3], 14, -187363961)
  b = gg(b, c, d, a, k[8], 20, 1163531501)
  a = gg(a, b, c, d, k[13], 5, -1444681467)
  d = gg(d, a, b, c, k[2], 9, -51403784)
  c = gg(c, d, a, b, k[7], 14, 1735328473)
  b = gg(b, c, d, a, k[12], 20, -1926607734)
  a = hh(a, b, c, d, k[5], 4, -378558)
  d = hh(d, a, b, c, k[8], 11, -2022574463)
  c = hh(c, d, a, b, k[11], 16, 1839030562)
  b = hh(b, c, d, a, k[14], 23, -35309556)
  a = hh(a, b, c, d, k[1], 4, -1530992060)
  d = hh(d, a, b, c, k[4], 11, 1272893353)
  c = hh(c, d, a, b, k[7], 16, -155497632)
  b = hh(b, c, d, a, k[10], 23, -1094730640)
  a = hh(a, b, c, d, k[13], 4, 681279174)
  d = hh(d, a, b, c, k[0], 11, -358537222)
  c = hh(c, d, a, b, k[3], 16, -722521979)
  b = hh(b, c, d, a, k[6], 23, 76029189)
  a = hh(a, b, c, d, k[9], 4, -640364487)
  d = hh(d, a, b, c, k[12], 11, -421815835)
  c = hh(c, d, a, b, k[15], 16, 530742520)
  b = hh(b, c, d, a, k[2], 23, -995338651)
  a = ii(a, b, c, d, k[0], 6, -198630844)
  d = ii(d, a, b, c, k[7], 10, 1126891415)
  c = ii(c, d, a, b, k[14], 15, -1416354905)
  b = ii(b, c, d, a, k[5], 21, -57434055)
  a = ii(a, b, c, d, k[12], 6, 1700485571)
  d = ii(d, a, b, c, k[3], 10, -1894986606)
  c = ii(c, d, a, b, k[10], 15, -1051523)
  b = ii(b, c, d, a, k[1], 21, -2054922799)
  a = ii(a, b, c, d, k[8], 6, 1873313359)
  d = ii(d, a, b, c, k[15], 10, -30611744)
  c = ii(c, d, a, b, k[6], 15, -1560198380)
  b = ii(b, c, d, a, k[13], 21, 1309151649)
  a = ii(a, b, c, d, k[4], 6, -145523070)
  d = ii(d, a, b, c, k[11], 10, -1120210379)
  c = ii(c, d, a, b, k[2], 15, 718787259)
  b = ii(b, c, d, a, k[9], 21, -343485551)
  x[0] = (x[0] + a) | 0; x[1] = (x[1] + b) | 0; x[2] = (x[2] + c) | 0; x[3] = (x[3] + d) | 0
}

const hexChr = '0123456789abcdef'
function rhex(n: number): string {
  let s = ''
  for (let j = 0; j < 4; j++) s += hexChr.charAt((n >> (j * 8 + 4)) & 0x0f) + hexChr.charAt((n >> (j * 8)) & 0x0f)
  return s
}

function md5utf8(s: string): string {
  // 先转 UTF-8 字节再按字节分块(RFC 要求按消息字节处理)
  const bytes = Array.from(new TextEncoder().encode(s), (b) => b)
  const nblk = ((bytes.length + 8) >> 6) + 1
  const blks = new Array<number>(nblk * 16).fill(0)
  for (let i = 0; i < bytes.length; i++) blks[i >> 2] |= bytes[i] << ((i % 4) * 8)
  blks[bytes.length >> 2] |= 0x80 << ((bytes.length % 4) * 8)
  blks[nblk * 16 - 2] = bytes.length * 8
  const x = [1732584193, -271733879, -1732584194, 271733878]
  for (let i = 0; i < blks.length; i += 16) md5cycle(x, blks.slice(i, i + 16))
  return x.map(rhex).join('')
}

export const md5 = md5utf8

export async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

// ---- 引擎适配器 ----
export interface EngineKeys { appid?: string; secret?: string; apiKey?: string }
export interface EngineRequest { url: string; init?: { method?: string; headers?: Record<string, string>; body?: string } }
export interface TranslateEngine {
  id: string
  label: string
  needsKey: boolean
  browserOk: boolean
  // MyMemory 为纯同步 URL 构造;含签名引擎为异步 —— 调用方统一 await 皆可
  buildRequest(text: string, from: string, to: string, keys: EngineKeys): EngineRequest | Promise<EngineRequest>
}
interface MyMemoryEngine extends TranslateEngine {
  buildRequest(text: string, from: string, to: string, keys: EngineKeys): EngineRequest
}
interface BaiduEngine extends TranslateEngine {
  toEngineCode(code: string): string
}
export interface TranslateEngineMap {
  mymemory: MyMemoryEngine
  baidu: BaiduEngine
  deepl: TranslateEngine
  youdao: TranslateEngine
  google: TranslateEngine
  // 任意字符串键可索引(Task 3 按运行时 engine id 取);baidu 带 toEngineCode 扩展
  [engineId: string]: TranslateEngine | BaiduEngine
}

const BAIDU_CODE: Record<string, string> = { 'zh-CN': 'zh', en: 'en', ja: 'jp', ko: 'kor', ru: 'ru', fr: 'fra', de: 'de', es: 'spa' }
const DEEPL_CODE: Record<string, string> = { 'zh-CN': 'ZH', en: 'EN', ja: 'JA', ko: 'KO', ru: 'RU', fr: 'FR', de: 'DE', es: 'ES' }

export const ENGINES: TranslateEngineMap = {
  mymemory: {
    id: 'mymemory', label: 'MyMemory(免费)', needsKey: false, browserOk: true,
    buildRequest(text, from, to) {
      const src = from === AUTO ? 'Autodetect' : from
      return { url: `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${to}` }
    }
  },
  baidu: {
    id: 'baidu', label: '百度翻译', needsKey: true, browserOk: false,
    async buildRequest(text, from, to, keys) {
      const salt = String(Date.now())
      const sign = md5(`${keys.appid ?? ''}${text}${salt}${keys.secret ?? ''}`)
      const body = new URLSearchParams({
        q: text, from: from === AUTO ? 'auto' : BAIDU_CODE[from] ?? from, to: BAIDU_CODE[to] ?? to,
        appid: keys.appid ?? '', salt, sign
      }).toString()
      return { url: 'https://fanyi-api.baidu.com/api/trans/vip/translate', init: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body } }
    },
    toEngineCode(code: string): string { return BAIDU_CODE[code] ?? code }
  },
  deepl: {
    id: 'deepl', label: 'DeepL(免费版 key)', needsKey: true, browserOk: false,
    async buildRequest(text, from, to, keys) {
      return {
        url: 'https://api-free.deepl.com/v2/translate',
        init: {
          method: 'POST',
          headers: { Authorization: `DeepL-Auth-Key ${keys.apiKey ?? ''}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: [text], ...(from !== AUTO ? { source_lang: DEEPL_CODE[from] } : {}), target_lang: DEEPL_CODE[to] })
        }
      }
    }
  },
  youdao: {
    id: 'youdao', label: '有道翻译', needsKey: true, browserOk: false,
    async buildRequest(text, from, to, keys) {
      const salt = String(Date.now())
      const curtime = String(Math.floor(Date.now() / 1000))
      const sign = await sha256hex(`${keys.appid ?? ''}${text}${salt}${curtime}${keys.secret ?? ''}`)
      const q = new URLSearchParams({
        q: text, from: from === AUTO ? 'auto' : from, to, appKey: keys.appid ?? '', salt, sign, curtime, signType: 'v3'
      }).toString()
      return { url: `https://openapi.youdao.com/api?${q}` }
    }
  },
  google: {
    id: 'google', label: '谷歌翻译', needsKey: true, browserOk: false,
    async buildRequest(text, _from, to, keys) {
      return {
        url: `https://translation.googleapis.com/language/translate/v2?key=${keys.apiKey ?? ''}`,
        init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: text, target: to, format: 'text' }) }
      }
    }
  }
}

// 响应解析(各引擎样例 golden;错误形态映射为可读中文异常)
export class EngineParseError extends Error {}
export function parseEngineResponse(engineId: string, body: unknown): string {
  const b = body as Record<string, unknown>
  switch (engineId) {
    case 'mymemory': {
      const status = Number(b?.responseStatus)
      const rd = (b?.responseData ?? {}) as { translatedText?: string }
      if (status >= 200 && status < 300) {
        if (typeof rd.translatedText === 'string' && rd.translatedText) return rd.translatedText
      }
      if (status === 429 || String(b?.responseDetails ?? '').includes('LIMIT')) throw new EngineParseError('免费额度受限(限流),可在设置页配置自有 key')
      throw new EngineParseError('MyMemory 返回异常响应')
    }
    case 'baidu': {
      if (b?.error_code) throw new EngineParseError(`百度错误 ${String(b.error_code)}:${String(b.error_msg ?? '')}`)
      const tr = (b?.trans_result ?? []) as { dst?: string }[]
      if (tr.length > 0 && typeof tr[0].dst === 'string') return tr.map((x) => x.dst).join('')
      throw new EngineParseError('百度返回异常响应')
    }
    case 'deepl': {
      const tr = (b?.translations ?? []) as { text?: string }[]
      if (tr.length > 0 && typeof tr[0].text === 'string') return tr[0].text
      if (b?.message) throw new EngineParseError(`DeepL 错误:${String(b.message)}`)
      throw new EngineParseError('DeepL 返回异常响应')
    }
    case 'youdao': {
      if (b?.errorCode && b.errorCode !== '0') throw new EngineParseError(`有道错误码 ${String(b.errorCode)}`)
      // 有道 translation 实为数组,取首项;字符串形态兜底
      const t = b?.translation
      if (Array.isArray(t) && t.length > 0) return String(t[0])
      if (typeof t === 'string' && t) return t
      throw new EngineParseError('有道返回异常响应')
    }
    case 'google': {
      const tr = (b?.data as { translations?: { translatedText?: string }[] })?.translations ?? []
      if (tr.length > 0 && typeof tr[0].translatedText === 'string') return tr[0].translatedText
      if (b?.error) throw new EngineParseError(`谷歌错误:${String((b.error as { message?: string }).message ?? '')}`)
      throw new EngineParseError('谷歌返回异常响应')
    }
  }
  throw new EngineParseError(`未知引擎 ${engineId}`)
}
