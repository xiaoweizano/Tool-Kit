// src/renderer/src/tools/jvm-params/types.ts
export type GcStrategy = 'g1' | 'zgc' | 'shenandoah'
export interface JvmOptions {
  xms?: string; xmx?: string; xmn?: string; metaspace?: string
  gc?: GcStrategy
  heapDump?: boolean; heapDumpPath?: string; remoteDebugPort?: string
  printGc?: boolean; jmxPort?: string; flightRecorder?: boolean
  container?: boolean
  xss?: string; maxMetaspace?: string; maxDirectMemory?: string
  server?: boolean; gcLog?: boolean; oomExit?: boolean; compressedOops?: boolean; encoding?: boolean
  extra: string[]
}
export interface JvmPreset { id: string; label: string; options: Partial<JvmOptions> }
