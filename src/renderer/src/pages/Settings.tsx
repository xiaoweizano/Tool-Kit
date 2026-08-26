import { useState } from 'react'
import { useThemeStore, type ThemeName } from '@core/theme-store'
import { DEFAULT_CUSTOM_VARS, type CustomThemeVars } from '@core/custom-theme'
import { checkUpdate, openReleases, APP_VERSION } from '@core/check-update'

const HEX_RE = /^#[0-9a-fA-F]{6}$/

const VAR_ROWS: { key: keyof CustomThemeVars; label: string }[] = [
  { key: 'base100', label: '底色' },
  { key: 'baseContent', label: '文字' },
  { key: 'primary', label: '强调' },
  { key: 'error', label: '错误红' },
  { key: 'warning', label: '处理琥珀' },
  { key: 'success', label: '通过绿' }
]

export function Settings(): JSX.Element {
  const { theme, setTheme, custom, setCustomVars, resetCustom } = useThemeStore()
  const [upd, setUpd] = useState<string | null>(null)

  const themes: { id: ThemeName; label: string; swatch: string[] }[] = [
    { id: 'toolkit-dark', label: '深色(平黑)', swatch: ['#0A0A0A', '#F4F1EA', '#E30613'] },
    { id: 'toolkit-paper', label: '纸白', swatch: ['#F4F1EA', '#1A1917', '#C50A10'] },
    { id: 'toolkit-caramel', label: '焦糖', swatch: ['#2B1F14', '#FFB300', '#F2E6D4'] },
    { id: 'toolkit-custom', label: '自定义', swatch: [custom.base100, custom.primary, custom.error] }
  ]

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">设置</h1>
      <section className="mt-6">
        <h2 className="font-mono text-[11px] tracking-[0.3em] text-neutral">THEME · 主题</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {themes.map((t) => (
            <button key={t.id} onClick={() => setTheme(t.id)}
              className={`border p-3 text-left text-sm ${theme === t.id ? 'border-primary' : 'border-base-300'}`}>
              <span className="flex gap-1">
                {t.swatch.map((c) => <span key={c} className="h-4 w-4" style={{ background: c }} />)}
              </span>
              <span className="mt-2 block">{t.label}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="mt-6 border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">CUSTOM · 自定义主题编辑器</span>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
            {VAR_ROWS.map((row) => (
              <ColorRow key={row.key} label={row.label} value={custom[row.key]} onChange={(v) => setCustomVars({ [row.key]: v })} />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button className="btn btn-outline btn-xs" onClick={resetCustom}>重置为默认</button>
            <span className="font-mono text-[11px] text-neutral">
              底色/抬面/边框自动分层;强调与信号色文字自动反差;编辑即时生效并保存
            </span>
          </div>
        </div>
      </section>
      <section className="mt-8">
        <h2 className="font-mono text-[11px] tracking-[0.3em] text-neutral">ABOUT · 关于</h2>
        <p className="mt-2 font-mono text-sm">ToolKit v{APP_VERSION} · 本地优先 · 一套代码双输出</p>
        <button className="btn btn-outline btn-sm mt-3" onClick={async () => {
          const r = await checkUpdate()
          setUpd(r.verdict === 'newer' ? `发现新版本 ${r.latest},即将打开发布页` : r.verdict === 'unknown' ? '暂时无法获取版本信息' : '已是最新版本')
          if (r.verdict === 'newer') openReleases()
        }}>检查更新</button>
        {upd && <p className="mt-2 text-sm text-neutral">{upd}</p>}
      </section>
    </div>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }): JSX.Element {
  const [text, setText] = useState(value)
  const [focused, setFocused] = useState(false)
  const shown = focused ? text : value
  const commit = (v: string): void => {
    setText(v)
    if (HEX_RE.test(v)) onChange(v.toLowerCase())
  }
  return (
    <label className="flex items-center gap-2 text-sm text-neutral">
      <input type="color" aria-label={label} value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_CUSTOM_VARS.base100}
        className="h-7 w-9 cursor-pointer border border-base-300 bg-transparent p-0.5"
        onChange={(e) => commit(e.target.value)} />
      <span className="w-16 shrink-0">{label}</span>
      <input value={shown} spellCheck={false}
        className="input input-bordered input-xs w-24 font-mono"
        onFocus={() => { setFocused(true); setText(value) }}
        onBlur={() => { setFocused(false); if (HEX_RE.test(text)) onChange(text.toLowerCase()); else setText(value) }}
        onChange={(e) => commit(e.target.value)} />
    </label>
  )
}

export default Settings
