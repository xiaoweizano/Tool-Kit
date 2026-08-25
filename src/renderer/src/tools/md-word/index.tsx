import { useState } from 'react'
import { Packer } from 'docx'
import mammoth from 'mammoth'
import { FileDrop } from '@components/FileDrop'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import { downloadFile } from '@core/download'
import { parseMarkdown, buildDocxDocument, htmlToMd } from './transform'

export default function MdWordPage(): JSX.Element {
  const [tab, setTab] = useState<'to' | 'from'>('to')
  const [md, setMd] = useState('')
  const [mdResult, setMdResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [docxMd, setDocxMd] = useState('')
  const [fromErr, setFromErr] = useState<string | null>(null)

  const toDocx = async (): Promise<void> => {
    if (!md.trim()) { setMdResult({ ok: false, message: '请输入 Markdown' }); return }
    try {
      const doc = buildDocxDocument(parseMarkdown(md))
      const blob = await Packer.toBlob(doc)
      downloadFile('output.docx', [blob], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      setMdResult({ ok: true, message: '已生成并下载 output.docx' })
    } catch (e) { setMdResult({ ok: false, message: `生成失败:${(e as Error).message}` }) }
  }

  const fromDocx = async (f: File): Promise<void> => {
    try {
      const r = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() })
      setDocxMd(htmlToMd(r.value))
      setFromErr(null)
    } catch (e) { setFromErr(`转换失败:${(e as Error).message}`) }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">Markdown ↔ Word</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">MD ↔ DOCX</span>
      </header>
      <div className="tabs tabs-boxed mb-4 w-fit">
        <button className={`tab ${tab === 'to' ? 'tab-active' : ''}`} onClick={() => setTab('to')}>md → Word</button>
        <button className={`tab ${tab === 'from' ? 'tab-active' : ''}`} onClick={() => setTab('from')}>Word → md</button>
      </div>
      {tab === 'to' ? (
        <>
          <section className="border border-base-300 bg-base-200/40">
            <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">MARKDOWN · 输入</span>
            <textarea className="h-56 w-full resize-none border-0 bg-transparent p-4 font-mono text-[13px] leading-relaxed outline-none"
              placeholder="粘贴 Markdown,支持标题/粗斜体/代码块/列表/表格/链接…" value={md} onChange={(e) => setMd(e.target.value)} />
          </section>
          <div className="mt-3 flex items-center gap-3">
            <button className="btn btn-sm btn-primary" onClick={() => void toDocx()}>生成 .docx</button>
            {mdResult && <span className={`font-mono text-[11px] ${mdResult.ok ? 'text-success' : 'text-error'}`}>{mdResult.message}</span>}
          </div>
        </>
      ) : (
        <>
          <FileDrop accept=".docx" onFile={(f) => void fromDocx(f)} hint="选择 .docx 文件,自动转换为 Markdown" />
          {fromErr && <p className="mt-2 font-mono text-[11px] text-error">{fromErr}</p>}
          {docxMd && (
            <section className="mt-3 border border-base-300 bg-base-200/40">
              <div className="flex items-center justify-between px-4 pt-2">
                <span className="font-mono text-[11px] tracking-widest text-neutral">MARKDOWN · 结果</span>
                <CopyButton getText={() => docxMd} enabled={!!docxMd} />
              </div>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-4 font-mono text-[13px] leading-relaxed">{docxMd}</pre>
            </section>
          )}
          {!docxMd && !fromErr && <div className="mt-3"><TriStateOutput result={null} phase="idle" emptyHint="上传 .docx 后此处显示转换出的 Markdown" /></div>}
        </>
      )}
    </div>
  )
}

export { MdWordPage }
