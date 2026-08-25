import { useState } from 'react'
import { useMultiFieldTransform } from '@core/useMultiFieldTransform'
import { CopyButton } from '@components/CopyButton'
import { InputZone } from '@components/InputZone'
import { TriStateOutput } from '@components/TriStateOutput'
import type { ToolResult } from '@core/types'
import { genInserts } from './transform'

interface TdInput { sql: string }

const isEmpty = (input: TdInput): boolean => !input.sql.trim()

export default function TestDataGenPage(): JSX.Element {
  const [rows, setRows] = useState(10)
  const [nullRate, setNullRate] = useState(0)
  const [generated, setGenerated] = useState<ToolResult<string> | null>(null)
  const { input, setField, phase, result } = useMultiFieldTransform<TdInput, string>('testdata-gen', isEmpty)

  const onSqlChange = (v: string): void => { setGenerated(null); setField({ sql: v }) }
  const gen = (): void => { setGenerated(genInserts({ sql: (input?.sql ?? ''), rows, nullRate })) }

  const shown = generated ?? result
  const shownPhase = generated ? 'done' : phase

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">测试数据生成</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">CREATE TABLE → INSERT</span>
        <CopyButton getText={() => (shown?.status === 'ok' ? shown.data : '')} enabled={shownPhase === 'done' && shown?.status === 'ok'} />
      </header>
      <section className="border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">INPUT · 建表 SQL</span>
        <InputZone value={input?.sql ?? ''} onChange={onSqlChange} placeholder="粘贴 CREATE TABLE 语句,解析结果即刻点亮;点「生成」产出测试数据…" />
      </section>
      <div className="flex flex-wrap items-center gap-3 py-3" role="toolbar">
        <label className="flex items-center gap-2 text-sm text-neutral">行数
          <input type="number" min={1} max={1000} value={rows} onChange={(e) => setRows(Number(e.target.value))} className="input input-bordered input-sm w-24 font-mono" />
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral">NULL 比例
          <select value={nullRate} onChange={(e) => setNullRate(Number(e.target.value))} className="select select-bordered select-sm font-mono">
            {[0, 0.1, 0.2, 0.3, 0.5].map((v) => <option key={v} value={v}>{Math.round(v * 100)}%</option>)}
          </select>
        </label>
        <button className="btn btn-sm btn-primary ml-auto" onClick={gen}>生成</button>
      </div>
      <TriStateOutput result={shown} phase={shownPhase} emptyHint="粘贴建表 SQL 实时解析;点「生成」得到 N 行测试 INSERT…" />
      {generated && <p className="mt-1 font-mono text-[11px] text-neutral">已生成(编辑 SQL 返回解析视图)</p>}
    </div>
  )
}

export { TestDataGenPage }
