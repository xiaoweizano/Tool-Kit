import { useMemo, useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { diffText, diffSideBySide, textStats, applyCase, segmentText } from './transform'
import type { DiffMode, TextStats, CaseMode, SegmentType, Segment, CellKind, DiffRow } from './types'

type TabId = 'diff' | 'stats' | 'case' | 'segment'

const TABS: [TabId, string][] = [
  ['diff', '对比'],
  ['stats', '统计'],
  ['case', '大小写'],
  ['segment', '分词']
]

const DIFF_MODES: { id: DiffMode; label: string }[] = [
  { id: 'line', label: '逐行' },
  { id: 'word', label: '逐词' },
  { id: 'char', label: '逐字符' }
]

const CASE_MODES: { id: CaseMode; label: string }[] = [
  { id: 'upper', label: '全大写' },
  { id: 'lower', label: '全小写' },
  { id: 'title', label: 'Title' },
  { id: 'sentence', label: '首句' },
  { id: 'camel', label: 'camelCase' },
  { id: 'pascal', label: 'PascalCase' },
  { id: 'snake', label: 'snake_case' },
  { id: 'kebab', label: 'kebab-case' },
  { id: 'constant', label: 'CONSTANT_CASE' },
  { id: 'alternating', label: '交替' }
]

const STAT_ITEMS: { key: keyof Pick<TextStats, 'chars' | 'letters' | 'digits' | 'symbols' | 'punct' | 'spaces' | 'words' | 'lines' | 'paragraphs' | 'uniqueChars'>; label: string }[] = [
  { key: 'chars', label: '字符' },
  { key: 'letters', label: '字母' },
  { key: 'digits', label: '数字' },
  { key: 'punct', label: '标点' },
  { key: 'symbols', label: '符号' },
  { key: 'spaces', label: '空格' },
  { key: 'words', label: '单词' },
  { key: 'lines', label: '行数' },
  { key: 'paragraphs', label: '段落' },
  { key: 'uniqueChars', label: '去重字符' }
]

const SEG_STYLE: Record<SegmentType, string> = {
  letters: 'border-blue-500/40 bg-blue-500/15 text-blue-300',
  digits: 'border-green-500/40 bg-green-500/15 text-green-300',
  symbols: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  whitespace: 'border-neutral-500/40 bg-neutral-500/15 text-neutral-400'
}
const SEG_LABEL: Record<SegmentType, string> = {
  letters: '字母',
  digits: '数字',
  symbols: '符号',
  whitespace: '空白'
}

const visibleChar = (c: string): string => {
  if (c === ' ') return '␣'
  if (c === '\t') return '⇥'
  if (c === '\n') return '⏎'
  if (c === '\r') return '␍'
  return c
}
const tokenText = (t: Segment): string => t.type === 'whitespace' ? [...t.text].map(visibleChar).join('') : t.text

const EmptyHint = ({ children }: { children: string }): JSX.Element => (
  <div className="border border-base-300 bg-base-200/50 p-6 text-center text-sm text-neutral">{children}</div>
)

const cellCls = (kind: CellKind): string => {
  if (kind === 'removed') return 'bg-red-500/15 text-red-300'
  if (kind === 'added') return 'bg-green-500/15 text-green-300'
  if (kind === 'same') return 'text-base-content'
  return '' // blank -> transparent
}

const SideBySide = ({ rows }: { rows: DiffRow[] }): JSX.Element => (
  <div className="rounded border border-base-300 bg-base-100">
    <div className="grid grid-cols-2 border-b border-base-300 bg-base-200/60 font-mono text-[11px] tracking-widest text-neutral">
      <div className="px-3 py-2">原文本 A</div>
      <div className="border-l border-base-300 px-3 py-2">对比文本 B</div>
    </div>
    {rows.map((row, i) => (
      <div key={i} className="grid grid-cols-2">
        <div className={`whitespace-pre-wrap break-words border-b border-base-300 px-3 py-1 font-mono text-sm ${cellCls(row.left.kind)}`}>
          <span className="mr-2 select-none text-neutral/40">{i + 1}</span>{row.left.text || ' '}
        </div>
        <div className={`whitespace-pre-wrap break-words border-b border-l border-base-300 px-3 py-1 font-mono text-sm ${cellCls(row.right.kind)}`}>
          <span className="mr-2 select-none text-neutral/40">{i + 1}</span>{row.right.text || ' '}
        </div>
      </div>
    ))}
    <div className="flex gap-4 border-t border-base-300 bg-base-200/60 px-3 py-2 font-mono text-[11px] text-neutral">
      <span className="text-green-300">绿=新增</span>
      <span className="text-red-300">红=删除</span>
    </div>
  </div>
)

export default function TextDiffPage(): JSX.Element {
  const [tab, setTab] = useState<TabId>('diff')

  // 对比 (live):two inputs,debounce-free direct diff
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  const [diffMode, setDiffMode] = useState<DiffMode>('line')
  const [diffView, setDiffView] = useState<'side' | 'merged'>('side')
  const diff = useMemo(() => (textA || textB) ? diffText(textA, textB, diffMode) : null, [textA, textB, diffMode])
  const sideDiff = useMemo(() => (textA || textB) ? diffSideBySide(textA, textB, diffMode) : null, [textA, textB, diffMode])

  // 统计/大小写/分词 share one input
  const [single, setSingle] = useState('')
  const hasSingle = single.length > 0

  // 统计 (button-triggered)
  const [stats, setStats] = useState<TextStats | null>(null)
  const runStats = (): void => {
    const r = textStats(single)
    setStats(r.status === 'ok' ? r.data : null)
  }

  // 大小写 (button-triggered)
  const [caseMode, setCaseMode] = useState<CaseMode>('upper')
  const [caseOut, setCaseOut] = useState('')
  const runCase = (): void => {
    const r = applyCase(single, caseMode)
    setCaseOut(r.status === 'ok' ? r.data : '')
  }

  // 分词 (button-triggered)
  const [customDelims, setCustomDelims] = useState('')
  const [segments, setSegments] = useState<Segment[] | null>(null)
  const runSegment = (): void => {
    const r = segmentText(single, { customDelims })
    setSegments(r.status === 'ok' ? r.data : null)
  }
  const merged = useMemo(() => (segments ? segments.map((s) => s.text).join('│') : ''), [segments])

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">文本处理</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">DIFF · STATS · CASE · SEGMENT</span>
      </header>
      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <section className="border border-base-300 bg-base-200/40 p-4">
        {tab === 'diff' && (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {DIFF_MODES.map((m) => (
                <button key={m.id} className={`btn btn-sm ${diffMode === m.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDiffMode(m.id)}>{m.label}</button>
              ))}
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <button className={`btn btn-sm ${diffView === 'side' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDiffView('side')}>左右对比</button>
              <button className={`btn btn-sm ${diffView === 'merged' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDiffView('merged')}>合并</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <textarea value={textA} onChange={(e) => setTextA(e.target.value)} placeholder="原文本 A" className="textarea textarea-bordered w-full font-mono" rows={8} />
              <textarea value={textB} onChange={(e) => setTextB(e.target.value)} placeholder="对比文本 B" className="textarea textarea-bordered w-full font-mono" rows={8} />
            </div>
            <div className="mt-4">
              {diffView === 'side' ? (
                sideDiff?.status === 'ok' ? (
                  <SideBySide rows={sideDiff.data} />
                ) : sideDiff ? (
                  <div role="alert" className="border border-error/60 bg-base-200 p-4 font-mono text-sm">
                    <span className="text-error">✕ ERROR · 输入无效</span>
                    <p className="mt-1 text-base-content">{sideDiff.message}</p>
                  </div>
                ) : (
                  <EmptyHint>输入两侧文本开始对比…</EmptyHint>
                )
              ) : diff?.status === 'ok' ? (
                <div className="rounded border border-base-300 bg-base-100 p-4" dangerouslySetInnerHTML={{ __html: diff.data }} />
              ) : diff ? (
                <div role="alert" className="border border-error/60 bg-base-200 p-4 font-mono text-sm">
                  <span className="text-error">✕ ERROR · 输入无效</span>
                  <p className="mt-1 text-base-content">{diff.message}</p>
                </div>
              ) : (
                <EmptyHint>输入两侧文本开始对比…</EmptyHint>
              )}
            </div>
          </>
        )}
        {tab === 'stats' && (
          <>
            <textarea value={single} onChange={(e) => setSingle(e.target.value)} placeholder="输入要统计的文本…" className="textarea textarea-bordered w-full font-mono" rows={6} />
            <div className="mt-3 flex justify-end">
              <button className="btn btn-sm btn-primary" onClick={runStats} disabled={!hasSingle}>统计</button>
            </div>
            <div className="mt-4">
              {!hasSingle ? (
                <EmptyHint>输入文本后查看统计结果…</EmptyHint>
              ) : stats ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {STAT_ITEMS.map((it) => (
                      <div key={it.key} className="rounded border border-base-300 bg-base-200/40 p-3">
                        <div className="font-mono text-[11px] tracking-widest text-neutral">{it.label}</div>
                        <div className="mt-1 font-mono text-xl">{stats[it.key]}</div>
                      </div>
                    ))}
                  </div>
                  {stats.topChars.length > 0 && (
                    <div className="mt-4">
                      <div className="mb-2 font-mono text-[11px] tracking-[0.25em] text-neutral">TOP CHARS · 字符频率</div>
                      <div className="flex flex-wrap gap-2">
                        {stats.topChars.map((t, i) => (
                          <div key={`${t.char}|${i}`} className="flex items-center gap-2 rounded border border-base-300 bg-base-200/40 px-3 py-1.5 font-mono text-sm">
                            <span className="text-lg leading-none">{visibleChar(t.char)}</span>
                            <span className="text-neutral">×{t.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <EmptyHint>点「统计」生成统计结果…</EmptyHint>
              )}
            </div>
          </>
        )}
        {tab === 'case' && (
          <>
            <textarea value={single} onChange={(e) => setSingle(e.target.value)} placeholder="输入要转换的文本…" className="textarea textarea-bordered w-full font-mono" rows={6} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <select value={caseMode} onChange={(e) => setCaseMode(e.target.value as CaseMode)} className="select select-bordered select-sm font-mono">
                {CASE_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <button className="btn btn-sm btn-primary" onClick={runCase} disabled={!hasSingle}>转换</button>
            </div>
            <div className="mt-4">
              {!hasSingle ? (
                <EmptyHint>输入文本后查看转换结果…</EmptyHint>
              ) : caseOut ? (
                <div className="rounded border border-base-300 bg-base-100 p-4">
                  <div className="flex items-start gap-3">
                    <pre className="flex-1 whitespace-pre-wrap break-words font-mono text-sm">{caseOut}</pre>
                    <CopyButton getText={() => caseOut} enabled={caseOut.length > 0} />
                  </div>
                </div>
              ) : (
                <EmptyHint>点「转换」查看大小写结果…</EmptyHint>
              )}
            </div>
          </>
        )}
        {tab === 'segment' && (
          <>
            <textarea value={single} onChange={(e) => setSingle(e.target.value)} placeholder="输入要分词的文本…" className="textarea textarea-bordered w-full font-mono" rows={6} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-neutral">自定义分隔符
                <input value={customDelims} onChange={(e) => setCustomDelims(e.target.value)} placeholder="如 @_- " className="input input-bordered input-sm w-32 font-mono" />
              </label>
              <button className="btn btn-sm btn-primary" onClick={runSegment} disabled={!hasSingle}>分词</button>
            </div>
            <div className="mt-4">
              {!hasSingle ? (
                <EmptyHint>输入文本后查看分词结果…</EmptyHint>
              ) : segments ? (
                <>
                  <div className="mb-2 font-mono text-[11px] tracking-[0.25em] text-neutral">TOKENS · 分词</div>
                  <div className="flex flex-wrap gap-2">
                    {segments.map((s, i) => (
                      <span key={i} className={`inline-flex items-center gap-1.5 whitespace-pre rounded border px-2 py-0.5 font-mono text-sm ${SEG_STYLE[s.type]}`}>
                        <span>{tokenText(s)}</span>
                        <span className="text-[11px] opacity-70">{SEG_LABEL[s.type]}</span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 font-mono text-[11px] tracking-[0.25em] text-neutral">MERGE · 合并预览</div>
                    <div className="flex items-start gap-3 rounded border border-base-300 bg-base-100 p-4">
                      <pre className="flex-1 whitespace-pre-wrap break-words font-mono text-sm">{merged}</pre>
                      <CopyButton getText={() => merged} enabled={merged.length > 0} />
                    </div>
                  </div>
                </>
              ) : (
                <EmptyHint>点「分词」查看结果…</EmptyHint>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
