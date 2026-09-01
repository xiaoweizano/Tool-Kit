import { useState } from 'react'
import { RandomPanel } from './components/RandomPanel'
import { CryptoPanel } from './components/CryptoPanel'
import { BcryptPanel } from './components/BcryptPanel'

export default function PasswordGeneratorPage(): JSX.Element {
  const [tab, setTab] = useState<'random' | 'crypto' | 'bcrypt'>('random')
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">密码生成</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">RANDOM · AES · RSA · BCRYPT</span>
      </header>
      <div className="mb-3 flex gap-2">
        {([['random', '随机'], ['crypto', 'AES/RSA'], ['bcrypt', 'BCrypt']] as const).map(([id, label]) => (
          <button key={id} className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <section className="border border-base-300 bg-base-200/40 p-4">
        {tab === 'random' && <RandomPanel />}
        {tab === 'crypto' && <CryptoPanel />}
        {tab === 'bcrypt' && <BcryptPanel />}
      </section>
    </div>
  )
}
