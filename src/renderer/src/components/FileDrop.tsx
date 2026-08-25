import { useRef, useState } from 'react'

interface Props { accept: string; onFile: (f: File) => void; hint: string }

export function FileDrop({ accept, onFile, hint }: Props): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const handle = (f: File | undefined): void => { if (f) onFile(f) }
  return (
    <div
      className={`cursor-pointer border border-dashed p-6 text-center transition
        ${drag ? 'border-primary bg-base-200/60' : 'border-base-300 hover:border-primary/60'}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]) }}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => { handle(e.target.files?.[0]); e.target.value = '' }} />
      <p className="text-sm text-neutral">{hint}</p>
      <p className="mt-1 font-mono text-[11px] text-neutral">点击或拖拽文件到此处</p>
    </div>
  )
}
