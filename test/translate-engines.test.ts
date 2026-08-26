import { describe, it, expect } from 'vitest'
import { md5, LANGUAGES, ENGINES, parseEngineResponse, MAX_LINE_LEN } from '@tools/translate/transform'

describe('md5(RFC 1321 向量锁定)', () => {
  it('已知向量', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
    expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72')
    // 注:计划原文此向量系笔误,已按 RFC 1321 真值修正(node crypto/certutil 双源验证)
    expect(md5('message digest')).toBe('f96b697d7cb7938d525a2f31aaf161d0')
    expect(md5('abcdefghijklmnopqrstuvwxyz')).toBe('c3fcd3d76192e4007dfb496cca67e13b')
  })
  it('中文输入稳定', () => {
    expect(md5('中文')).toBe(md5('中文'))
    expect(md5('中文')).toHaveLength(32)
  })
})

describe('语言表', () => {
  it('含 5 突出 + 3 扩展,code 唯一', () => {
    const codes = LANGUAGES.map((l) => l.code)
    expect(new Set(codes).size).toBe(LANGUAGES.length)
    for (const need of ['zh-CN', 'en', 'ja', 'ko', 'ru', 'fr', 'de', 'es']) expect(codes).toContain(need)
  })
  it('MAX_LINE_LEN = 450', () => { expect(MAX_LINE_LEN).toBe(450) })
})

describe('MyMemory 适配器', () => {
  const eng = ENGINES.mymemory
  it('URL 构造(自动源)', () => {
    const req = eng.buildRequest('hello', 'auto', 'zh-CN', {})
    expect(req.url).toContain('https://api.mymemory.translated.net/get?q=hello')
    expect(req.url).toContain('langpair=Autodetect|zh-CN')
  })
  it('响应解析', () => {
    const body = { responseData: { translatedText: '你好', match: 1 }, responseStatus: 200 }
    expect(parseEngineResponse('mymemory', body)).toBe('你好')
  })
  it('限流/错误响应映射为可读消息', () => {
    const body = { responseStatus: 429, responseDetails: 'MYMEMORY WARNING' }
    expect(() => parseEngineResponse('mymemory', body)).toThrow(/限流|额度/)
  })
})

describe('百度适配器', () => {
  const eng = ENGINES.baidu
  it('POST 表单构造含 MD5 签名', async () => {
    const req = await eng.buildRequest('你好', 'auto', 'en', { appid: 'appid1', secret: 'sec1' })
    expect(req.url).toBe('https://fanyi-api.baidu.com/api/trans/vip/translate')
    expect(String(req.init?.body)).toContain('q=%E4%BD%A0%E5%A5%BD')
    expect(String(req.init?.body)).toContain('appid=appid1')
    expect(String(req.init?.body)).toMatch(/sign=[0-9a-f]{32}/)
  })
  it('语言码映射(zh-CN→zh, ja→jp)', () => {
    expect((eng as unknown as { toEngineCode: (c: string) => string }).toEngineCode('zh-CN')).toBe('zh')
    expect((eng as unknown as { toEngineCode: (c: string) => string }).toEngineCode('ja')).toBe('jp')
  })
  it('响应解析', () => {
    const body = { from: 'zh', to: 'en', trans_result: [{ src: '你好', dst: 'hello' }] }
    expect(parseEngineResponse('baidu', body)).toBe('hello')
  })
})

describe('DeepL 适配器', () => {
  const eng = ENGINES.deepl
  it('JSON body + Auth 头', async () => {
    const req = await eng.buildRequest('hello', 'auto', 'zh-CN', { apiKey: 'k:fx' })
    expect(req.url).toBe('https://api-free.deepl.com/v2/translate')
    expect(String(req.init?.method)).toBe('POST')
    expect(JSON.parse(String(req.init?.body))).toEqual({ text: ['hello'], target_lang: 'ZH' })
    expect((req.init?.headers as Record<string, string>).Authorization).toBe('DeepL-Auth-Key k:fx')
  })
  it('响应解析', () => {
    const body = { translations: [{ detected_source_language: 'EN', text: '你好' }] }
    expect(parseEngineResponse('deepl', body)).toBe('你好')
  })
})

describe('有道适配器', () => {
  const eng = ENGINES.youdao
  it('GET 带 sha256 签名(异步)', async () => {
    const req = await eng.buildRequest('hi', 'auto', 'zh-CN', { appid: 'yd1', secret: 'yds' })
    expect(req.url).toContain('https://openapi.youdao.com/api?')
    expect(req.url).toContain('appKey=yd1')
    expect(req.url).toMatch(/sign=[0-9a-f]{64}/)
  })
})

describe('谷歌适配器', () => {
  const eng = ENGINES.google
  it('POST v2 key', async () => {
    const req = await eng.buildRequest('hello', 'auto', 'zh-CN', { apiKey: 'g1' })
    expect(req.url).toBe('https://translation.googleapis.com/language/translate/v2?key=g1')
    expect(JSON.parse(String(req.init?.body))).toEqual({ q: 'hello', target: 'zh-CN', format: 'text' })
  })
  it('响应解析', () => {
    const body = { data: { translations: [{ translatedText: '你好', detectedSourceLanguage: 'en' }] } }
    expect(parseEngineResponse('google', body)).toBe('你好')
  })
})

describe('引擎注册表', () => {
  it('五引擎齐备,browserOk 仅 mymemory', () => {
    expect(Object.keys(ENGINES).sort()).toEqual(['baidu', 'deepl', 'google', 'mymemory', 'youdao'])
    expect(ENGINES.mymemory.browserOk).toBe(true)
    for (const id of ['baidu', 'deepl', 'youdao', 'google']) expect(ENGINES[id].browserOk).toBe(false)
  })
})
