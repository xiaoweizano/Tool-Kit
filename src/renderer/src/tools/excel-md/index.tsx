import { useState } from 'react'
import * as XLSX from 'xlsx'
import { FileDrop } from '@components/FileDrop'
import { TriStateOutput } from '@components/TriStateOutput'
import { downloadFile } from '@core/download'
import { sheetToMarkdown, markdownToSheet } from './transform'
import type { ToolResult } from '@core/types'

export default function ExcelMdPage(): JSX.Element {
  const [tab, setTab] = useState<'xls2md' | 'md2xls'>('xls2md')
  const [mdOut, setMdOut] = useState<ToolResult<string> | null>(null)
  const [mdIn, setMdIn] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const fromXls = async (f: File): Promise<void> => {
    try {
      const wb = XLSX.read(await f.arrayBuffer())
      const name = wb.SheetNames[0]
      const ws = wb.Sheets[name]
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]
      const r = sheetToMarkdown(aoa)
      if (r.status === 'ok' && wb.SheetNames.length > 1) {
        setMdOut({ status: 'ok', data: r.data + `\n\n(注:${wb.SheetNames.length} 个 sheet,已取首个「${name}」)` })
      } else setMdOut(r)
    } catch (e) { setMdOut({ status: 'error', kind: 'invalid-input', message: `读取失败:${(e as Error).message}` }) }
  }

  const toXls = (): void => {
    const r = markdownToSheet(mdIn)
    if (r.status !== 'ok') { setMsg({ ok: false, text: r.message }); return }
    try {
      const ws = XLSX.utils.aoa_to_sheet(r.data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      downloadFile('output.xlsx', [out as ArrayBuffer], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      setMsg({ ok: true, text: '已生成并下载 output.xlsx' })
    } catch (e) { setMsg({ ok: false, text: `生成失败:${(e as Error).message}` }) }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">Excel ↔ Markdown</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">XLSX ↔ MD</span>
      </header>
      <div className="tabs tabs-boxed mb-4 w-fit">
        <button className={`tab ${tab === 'xls2md' ? 'tab-active' : ''}`} onClick={() => setTab('xls2md')}>Excel → md</button>
        <button className={`tab ${tab === 'md2xls' ? 'tab-active' : ''}`} onClick={() => setTab('md2xls')}>md → Excel</button>
      </div>
      {tab === 'xls2md' ? (
        <>
          <FileDrop accept=".xlsx,.xls" onFile={(f) => void fromXls(f)} hint="选择 .xlsx 文件,转换为 Markdown 表格" />
          <div className="mt-4">
            <TriStateOutput result={mdOut} phase="done" emptyHint="上传 .xlsx 后此处显示 Markdown 表格(可复制)" />
          </div>
          {mdOut?.status === 'ok' && (
            <div className="mt-3">
              <button className="btn btn-outline btn-xs" onClick={() => downloadFile('output.md', [mdOut.data], 'text/markdown')}>下载 .md</button>
            </div>
          )}
        </>
      ) : (
        <>
          <section className="border border-base-300 bg-base-200/40">
            <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">MARKDOWN 表格</span>
            <textarea className="h-56 w-full resize-none border-0 bg-transparent p-4 font-mono text-[13px] leading-relaxed outline-none"
              placeholder="粘贴 Markdown 表格(表头+分隔行+数据行)…" value={mdIn} onChange={(e) => setMdIn(e.target.value)} />
          </section>
          <div className="mt-3 flex items-center gap-3">
            <button className="btn btn-sm btn-primary" onClick={toXls}>生成 .xlsx</button>
            {msg && <span className={`font-mono text-[11px] ${msg.ok ? 'text-success' : 'text-error'}`}>{msg.text}</span>}
          </div>
        </>
      )}
    </div>
  )
}

export { ExcelMdPage }
