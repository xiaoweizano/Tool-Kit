import type { ToolResult } from '@core/types'
import type { JvmOptions } from './types'

const GC = {
  g1: ['-XX:+UseG1GC', '-XX:MaxGCPauseMillis=100'],
  zgc: ['-XX:+UseZGC', '-XX:+UnlockExperimentalVMOptions'],
  shenandoah: ['-XX:+UseShenandoahGC']
}

export function generateJvmParams(o: JvmOptions): ToolResult<string> {
  const rows: { flag: string; note: string }[] = []
  if (o.xms) rows.push({ flag: `-Xms${o.xms}`, note: '初始堆大小' })
  if (o.xmx) rows.push({ flag: `-Xmx${o.xmx}`, note: '最大堆大小' })
  if (o.xmn) rows.push({ flag: `-Xmn${o.xmn}`, note: '新生代大小' })
  if (o.metaspace) rows.push({ flag: `-XX:MetaspaceSize=${o.metaspace}`, note: '元空间大小' })
  if (o.gc) for (const f of GC[o.gc]) rows.push({ flag: f, note: `${o.gc.toUpperCase()} 垃圾回收器` })
  if (o.heapDump) rows.push({ flag: '-XX:+HeapDumpOnOutOfMemoryError', note: 'OOM 时堆转储' })
  if (o.heapDumpPath) rows.push({ flag: `-XX:HeapDumpPath=${o.heapDumpPath}`, note: '转储路径' })
  if (o.remoteDebugPort) rows.push({ flag: `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:${o.remoteDebugPort}`, note: '远程调试' })
  if (o.printGc) rows.push({ flag: '-XX:+PrintGCDetails', note: '打印 GC 详情' })
  if (o.jmxPort) rows.push({ flag: `-Dcom.sun.management.jmxremote.port=${o.jmxPort}`, note: 'JMX 端口' })
  if (o.flightRecorder) rows.push({ flag: '-XX:+FlightRecorder', note: 'JFR 采样' })
  if (o.container) rows.push({ flag: '-XX:+UseContainerSupport', note: '容器感知' })
  if (o.container && o.xmx) rows.push({ flag: '-XX:MaxRAMPercentage=75.0', note: '容器内按可用内存百分比' })
  for (const e of o.extra.filter(Boolean)) rows.push({ flag: e, note: '自定义' })
  if (rows.length === 0) return { status: 'ok', data: '' }
  const text = rows.map((r) => `${r.flag}   # ${r.note}`).join('\n')
  return { status: 'ok', data: text }
}
