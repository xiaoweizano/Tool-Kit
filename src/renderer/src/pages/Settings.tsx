import { useState } from 'react'
import { useThemeStore, type ThemeName } from '@core/theme-store'
import { checkUpdate, openReleases, APP_VERSION } from '@core/check-update'

const THEMES: { id: ThemeName; label: string; swatch: string[] }[] = [
  { id: 'toolkit-dark', label: '深色(平黑)', swatch: ['#0A0A0A', '#F4F1EA', '#E30613'] },
  { id: 'toolkit-paper', label: '纸白', swatch: ['#F4F1EA', '#1A1917', '#C50A10'] },
  { id: 'toolkit-caramel', label: '焦糖', swatch: ['#2B1F14', '#FFB300', '#F2E6D4'] }
]

export function Settings(): JSX.Element {
  const { theme, setTheme } = useThemeStore()
  const [upd, setUpd] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">设置</h1>
      <section className="mt-6">
        <h2 className="font-mono text-[11px] tracking-[0.3em] text-neutral">THEME · 主题</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <button key={t.id} onClick={() => setTheme(t.id)}
              className={`border p-3 text-left text-sm ${theme === t.id ? 'border-primary' : 'border-base-300'}`}>
              <span className="flex gap-1">
                {t.swatch.map((c) => <span key={c} className="h-4 w-4" style={{ background: c }} />)}
              </span>
              <span className="mt-2 block">{t.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral">自定义主题(v0.2):修改 daisyUI 主题变量集</p>
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

export default Settings
