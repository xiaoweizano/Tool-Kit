import * as Comlink from 'comlink'
import type { ToolResult, TransformOpts } from './types'

type WorkerApi = { run(id: string, input: unknown, opts?: TransformOpts): Promise<ToolResult<unknown>> }

let remote: WorkerApi | null = null
function getRemote(): WorkerApi {
  if (!remote) {
    const w = new Worker(new URL('./transform.worker.ts', import.meta.url), { type: 'module' })
    remote = Comlink.wrap<WorkerApi>(w)
  }
  return remote
}

export async function runTransform(id: string, input: unknown, opts?: TransformOpts): Promise<ToolResult<unknown>> {
  return getRemote().run(id, input, opts)
}
