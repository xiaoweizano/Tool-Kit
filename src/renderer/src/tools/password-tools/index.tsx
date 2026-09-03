import { useState } from 'react'
import { RandomPanel } from '@tools/password-generator/components/RandomPanel'
import { CryptoPanel } from '@tools/password-generator/components/CryptoPanel'
import { BcryptPanel } from '@tools/password-generator/components/BcryptPanel'
import { StrengthPanel } from './components/StrengthPanel'

type TabId = 'random' | 'strength' | 'crypto' | 'bcrypt'
const TABS: [TabId, string][] = [
  ['random', '随机生成'], ['strength', '强度分析'], ['crypto', 'AES/RSA'], ['bcrypt', 'BCrypt'],
]
export default function PasswordToolsPage(): JSX.Element {
  const [tab, setTab] = useState<TabId>('random')
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">密码工具</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">GENERATE · STRENGTH · ENCRYPT · HASH</span>
      </header>
      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <section className="border border-base-300 bg-base-200/40 p-4">
        {tab === 'random' && <RandomPanel />}
        {tab === 'strength' && <StrengthPanel />}
        {tab === 'crypto' && <CryptoPanel />}
        {tab === 'bcrypt' && <BcryptPanel />}
      </section>
    </div>
  )
}
