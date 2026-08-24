import { useEffect, useRef, useState } from 'react'

interface Props { getText: () => string; enabled: boolean }

export function CopyButton({ getText, enabled }: Props): JSX.Element {
  const [msg, setMsg] = useState('')
  // 用 ref 读取最新的 enabled/getText,避免全局热键闭包捕获过期状态
  const enabledRef = useRef(enabled)
  const getTextRef = useRef(getText)
  enabledRef.current = enabled
  getTextRef.current = getText

  const copy = async (): Promise<void> => {
    const text = getTextRef.current()
    try {
      await navigator.clipboard.writeText(text)
      setMsg('已复制')
    } catch {
      // 回退:隐藏 textarea + execCommand
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      setMsg(ok ? '已复制' : '复制失败,请手动选择')
    }
    setTimeout(() => setMsg(''), 1600)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c' && enabledRef.current) {
        e.preventDefault(); void copy()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })  // 挂载期绑定一次

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="font-mono text-[11px] text-success">{msg}</span>}
      <button
        className="btn btn-xs btn-success"
        title={enabled ? undefined : '无结果可复制'}
        disabled={!enabled}
        onClick={() => void copy()}
      >
        复制
      </button>
    </div>
  )
}
