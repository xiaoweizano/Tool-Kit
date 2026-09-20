import { useCallback, useEffect, useRef, useState } from 'react'
import { useRestStore } from './store'
import { sendRequest, cancelCurrent } from './http-client'
import { buildCurl } from './curl-build'
import { parseCurl } from './curl-parse'
import { Sidebar } from './components/Sidebar'
import { RequestPanel } from './components/RequestPanel'
import { ResponsePanel } from './components/ResponsePanel'
import type { Env, HistoryEntry, RequestModel, RequestNode, ResponseModel, UiError } from './types'

const EMPTY_REQUEST: RequestModel = { method: 'GET', url: '', headers: [], body: '' }

const clone = (r: RequestModel): RequestModel => ({
  method: r.method,
  url: r.url,
  body: r.body,
  headers: r.headers.map((h) => ({ ...h }))
})

const uid = (): string => crypto.randomUUID()

export default function RestApiClientPage(): JSX.Element {
  const environments = useRestStore((s) => s.environments)
  const activeEnvId = useRestStore((s) => s.activeEnvId)
  const collections = useRestStore((s) => s.collections)
  const history = useRestStore((s) => s.history)
  const writeFailed = useRestStore((s) => s.writeFailed)
  const setActiveEnv = useRestStore((s) => s.setActiveEnv)
  const pushHistory = useRestStore((s) => s.pushHistory)
  const addRequest = useRestStore((s) => s.addRequest)
  const addGroup = useRestStore((s) => s.addGroup)

  const [draft, setDraft] = useState<RequestModel>(EMPTY_REQUEST)
  const [baseline, setBaseline] = useState<RequestModel>(EMPTY_REQUEST)
  const [name, setName] = useState('未命名请求')
  const [timeoutSec, setTimeoutSec] = useState(15)
  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState<ResponseModel | null>(null)
  const [error, setError] = useState<UiError | null>(null)

  const env: Env | undefined = environments.find((e) => e.id === activeEnvId)
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline)

  // 卸载即取消在途请求,防止内存中悬挂
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      cancelCurrent()
    }
  }, [])

  const patch = useCallback((p: Partial<RequestModel>): void => {
    setDraft((d) => ({ ...d, ...p }))
  }, [])

  /** dirty 时弹确认;true=继续(丢弃),false=取消。绝不静默丢草稿 */
  const confirmDiscardIfDirty = useCallback((): boolean => {
    if (!dirty) return true
    return window.confirm('当前请求有未保存的修改,确定放弃并切换?')
  }, [dirty])

  const loadDraft = useCallback((model: RequestModel, label: string): void => {
    const c = clone(model)
    setDraft(c)
    setBaseline(c)
    setName(label)
    setResponse(null)
    setError(null)
  }, [])

  const onNewRequest = useCallback((): void => {
    if (!confirmDiscardIfDirty()) return
    loadDraft(EMPTY_REQUEST, '未命名请求')
  }, [confirmDiscardIfDirty, loadDraft])

  const onLoadRequest = useCallback(
    (node: RequestNode): void => {
      if (!confirmDiscardIfDirty()) return
      loadDraft({ method: node.method, url: node.url, headers: node.headers, body: node.body }, node.name)
    },
    [confirmDiscardIfDirty, loadDraft]
  )

  const onHistoryLoad = useCallback(
    (entry: HistoryEntry): void => {
      if (!confirmDiscardIfDirty()) return
      loadDraft(entry.request, entry.request.url || '历史请求')
    },
    [confirmDiscardIfDirty, loadDraft]
  )

  const send = useCallback((): void => {
    if (sending) return
    setSending(true)
    setError(null)
    void sendRequest(draft, env, { timeoutMs: timeoutSec * 1000 }).then((res) => {
      if (!mounted.current) return
      setSending(false)
      if (res.status === 'ok') {
        setResponse(res.data)
        pushHistory({
          id: uid(),
          request: clone(draft),
          response: {
            status: res.data.status,
            statusText: res.data.statusText,
            durationMs: res.data.durationMs,
            sizeBytes: res.data.bodyBytes,
            finalUrl: res.data.finalUrl
          },
          envName: env?.name ?? '',
          at: Date.now()
        })
      } else {
        setResponse(null)
        setError({ title: '请求失败', message: res.message })
      }
    })
  }, [draft, env, sending, timeoutSec, pushHistory])

  const onImportCurl = useCallback(
    (text: string): void => {
      if (!text.trim()) return
      const r = parseCurl(text)
      if (r.status === 'ok') {
        if (!confirmDiscardIfDirty()) return
        loadDraft(r.data, r.data.url || 'cURL 导入')
        setError(null)
      } else {
        // 粘贴解析失败 ≠ 请求失败:标题区分,不把导入错误伪装成请求错误
        setError({ title: '导入失败', message: `cURL 解析失败:${r.message}` })
        setResponse(null)
      }
    },
    [confirmDiscardIfDirty, loadDraft]
  )

  const onExportCurl = useCallback((): void => {
    const text = buildCurl(draft)
    void navigator.clipboard?.writeText(text).catch(() => {})
  }, [draft])

  // 另存为副本是「防丢」动作:它不销毁当前草稿,故绝不弹丢弃确认,
  // 否则用户在确认框点「取消」会静默中断保存、重新引入丢工作风险。
  const onSaveCopy = useCallback((): void => {
    let gid = collections[0]?.id
    if (!gid) {
      addGroup('', '默认集合')
      gid = useRestStore.getState().collections[0].id
    }
    addRequest(gid, { id: uid(), name: name || '副本', method: draft.method, url: draft.url, headers: draft.headers, body: draft.body })
    setBaseline(clone(draft))
  }, [addRequest, addGroup, collections, draft, name])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {writeFailed && (
        <div role="alert" className="border-b border-warning bg-warning/15 px-4 py-2 font-mono text-sm text-warning">
          ⚠ 本地存储写入失败,本次修改仅存于会话
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          environments={environments}
          activeEnvId={activeEnvId}
          onSetEnv={setActiveEnv}
          collections={collections}
          onLoadRequest={onLoadRequest}
          history={history}
          onHistoryLoad={onHistoryLoad}
          onNewRequest={onNewRequest}
        />
        <div className="flex min-w-0 flex-1 gap-3 overflow-auto p-4">
          <RequestPanel
            draft={draft}
            onChange={patch}
            timeoutSec={timeoutSec}
            onTimeoutChange={setTimeoutSec}
            env={env}
            sending={sending}
            onSend={send}
            onImportCurl={onImportCurl}
            onExportCurl={onExportCurl}
            name={name}
            onNameChange={setName}
            onSaveCopy={onSaveCopy}
          />
          <ResponsePanel
            response={response}
            error={error}
            sending={sending}
            onCancel={() => {
              cancelCurrent()
              setSending(false)
            }}
          />
        </div>
      </div>
    </div>
  )
}

export { RestApiClientPage }
