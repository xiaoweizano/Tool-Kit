import { useState } from 'react'
import { RunTab } from './components/RunTab'
import { ComposeTab } from './components/ComposeTab'
import { DockerfileTab } from './components/DockerfileTab'
import { CheatSheetTab } from './components/CheatSheetTab'
import { ImageParseTab } from './components/ImageParseTab'
import { RegistryParseTab } from './components/RegistryParseTab'

type TabId = 'run' | 'compose' | 'dockerfile' | 'cheatsheet' | 'imgparse' | 'regparse'

const TABS: [TabId, string][] = [
  ['run', 'Docker Run'],
  ['compose', 'Compose'],
  ['dockerfile', 'Dockerfile'],
  ['cheatsheet', '命令速查'],
  ['imgparse', '镜像名解析'],
  ['regparse', '注册表']
]

export default function DockerToolsPage(): JSX.Element {
  const [tab, setTab] = useState<TabId>('run')
  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">Docker 生成</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">RUN · COMPOSE · DOCKERFILE</span>
      </header>
      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <section className="border border-base-300 bg-base-200/40 p-4">
        {tab === 'run' && <RunTab />}
        {tab === 'compose' && <ComposeTab />}
        {tab === 'dockerfile' && <DockerfileTab />}
        {tab === 'cheatsheet' && <CheatSheetTab />}
        {tab === 'imgparse' && <ImageParseTab />}
        {tab === 'regparse' && <RegistryParseTab />}
      </section>
    </div>
  )
}
