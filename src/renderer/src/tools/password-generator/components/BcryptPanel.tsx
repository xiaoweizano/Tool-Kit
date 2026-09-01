import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { hashBcrypt, verifyBcrypt } from '../transform'

export function BcryptPanel(): JSX.Element {
  const [plain, setPlain] = useState('')
  const [hash, setHash] = useState('')
  const [out, setOut] = useState('')
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><input value={plain} onChange={(e) => setPlain(e.target.value)} placeholder="明文(如 nacos 密码)" className="input input-bordered input-sm flex-1 font-mono" />
        <button className="btn btn-sm btn-primary" onClick={() => { const r = hashBcrypt(plain); setOut(r.status === 'ok' ? r.data : r.message) }}>BCrypt 哈希</button></div>
      <div className="flex gap-2"><textarea value={hash} onChange={(e) => setHash(e.target.value)} placeholder="已有 BCrypt hash 用于校验" className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={2} />
        <button className="btn btn-sm" onClick={() => { const r = verifyBcrypt(plain, hash); setOut(r.status === 'ok' ? (r.data.match ? '匹配 ✔(明文对此 hash 有效)' : '不匹配 ✘') : r.message) }}>校验</button></div>
      {out && <div className="flex items-center gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{out}</pre><CopyButton getText={() => out} enabled={!!out} /></div>}
    </div>
  )
}
