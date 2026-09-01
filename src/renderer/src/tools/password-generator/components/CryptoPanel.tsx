import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import type { ToolResult } from '@core/types'
import { encryptAes, decryptAes, generateRsaKeyPair, encryptRsa, decryptRsa } from '../transform'

export function CryptoPanel(): JSX.Element {
  const [tab, setTab] = useState<'aes' | 'rsa'>('aes')
  const [pass, setPass] = useState('')
  const [plain, setPlain] = useState('')
  const [cipher, setCipher] = useState('')
  const [pub, setPub] = useState('')
  const [priv, setPriv] = useState('')
  const [out, setOut] = useState('')
  const run = async (fn: () => Promise<ToolResult<string>>): Promise<void> => {
    const r = await fn(); setOut(r.status === 'ok' ? r.data : r.message)
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button className={`btn btn-sm ${tab === 'aes' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('aes')}>AES-GCM</button>
        <button className={`btn btn-sm ${tab === 'rsa' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('rsa')}>RSA-OAEP</button>
      </div>
      {tab === 'aes' ? (
        <div className="space-y-2">
          <input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Passphrase(明文/解密共用)" className="input input-bordered input-sm w-full font-mono" />
          <div className="flex gap-2"><input value={plain} onChange={(e) => setPlain(e.target.value)} placeholder="明文" className="input input-bordered input-sm flex-1 font-mono" />
            <button className="btn btn-sm btn-primary" onClick={() => run(() => encryptAes(pass, plain))}>加密</button></div>
          <div className="flex gap-2"><input value={cipher} onChange={(e) => setCipher(e.target.value)} placeholder="密文(base64)" className="input input-bordered input-sm flex-1 font-mono" />
            <button className="btn btn-sm" onClick={() => run(() => decryptAes(pass, cipher))}>解密</button></div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2"><button className="btn btn-sm btn-outline" onClick={async () => { const r = await generateRsaKeyPair(); if (r.status === 'ok') { setPub(r.data.publicKey); setPriv(r.data.privateKey) } }}>生成密钥对</button></div>
          <textarea value={pub} onChange={(e) => setPub(e.target.value)} placeholder="公钥 PEM" className="textarea textarea-bordered textarea-sm w-full font-mono" rows={2} />
          <textarea value={priv} onChange={(e) => setPriv(e.target.value)} placeholder="私钥 PEM" className="textarea textarea-bordered textarea-sm w-full font-mono" rows={2} />
          <div className="flex gap-2"><input value={plain} onChange={(e) => setPlain(e.target.value)} placeholder="明文" className="input input-bordered input-sm flex-1 font-mono" />
            <button className="btn btn-sm btn-primary" onClick={() => run(() => encryptRsa(pub, plain))}>公钥加密</button></div>
          <div className="flex gap-2"><input value={cipher} onChange={(e) => setCipher(e.target.value)} placeholder="密文(base64)" className="input input-bordered input-sm flex-1 font-mono" />
            <button className="btn btn-sm" onClick={() => run(() => decryptRsa(priv, cipher))}>私钥解密</button></div>
        </div>
      )}
      {out && <div className="flex items-center gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-xs">{out}</pre><CopyButton getText={() => out} enabled={!!out} /></div>}
    </div>
  )
}
