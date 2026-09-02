// src/renderer/src/tools/jvm-params/types.ts
export type GcStrategy = 'g1' | 'zgc' | 'shenandoah'
export interface JvmOptions {
  xms?: string; xmx?: string; xmn?: string; metaspace?: string
  gc?: GcStrategy
  heapDump?: boolean; heapDumpPath?: string; remoteDebugPort?: string
  printGc?: boolean; jmxPort?: string; flightRecorder?: boolean
  container?: boolean; extra: string[]
}
