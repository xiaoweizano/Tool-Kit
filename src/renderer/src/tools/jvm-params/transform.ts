import type { ToolResult } from '@core/types'
import type { JvmOptions, JvmPreset } from './types'

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
  if (o.server) rows.push({ flag: '-server', note: '服务器模式(默认)' })
  if (o.xss) rows.push({ flag: `-Xss${o.xss}`, note: '线程栈大小' })
  if (o.maxMetaspace) rows.push({ flag: `-XX:MaxMetaspaceSize=${o.maxMetaspace}`, note: '元空间上限' })
  if (o.maxDirectMemory) rows.push({ flag: `-XX:MaxDirectMemorySize=${o.maxDirectMemory}`, note: '直接内存上限' })
  if (o.gcLog) rows.push({ flag: '-Xlog:gc*', note: '统一日志 GC' })
  if (o.oomExit) rows.push({ flag: '-XX:+ExitOnOutOfMemoryError', note: 'OOM 时退出进程' })
  if (o.compressedOops) rows.push({ flag: '-XX:+UseCompressedOops', note: '压缩对象指针' })
  if (o.encoding) rows.push({ flag: '-Dfile.encoding=UTF-8', note: '文件编码' })
  if (rows.length === 0) return { status: 'ok', data: '' }
  const text = rows.map((r) => `${r.flag}   # ${r.note}`).join('\n')
  return { status: 'ok', data: text }
}

export const JVM_PRESETS: JvmPreset[] = [
  { id: 'small', label: '小(1-2G)', options: { xms: '256m', xmx: '1g', xmn: '256m', metaspace: '256m', maxMetaspace: '512m', server: true } },
  { id: 'medium', label: '中(4G)', options: { xms: '1g', xmx: '4g', xmn: '1g', metaspace: '512m', maxMetaspace: '1g', server: true, gcLog: true, compressedOops: true, encoding: true } },
  { id: 'large', label: '大(8G+)', options: { xms: '2g', xmx: '8g', xmn: '2g', metaspace: '1g', maxMetaspace: '2g', server: true, gcLog: true, oomExit: true, compressedOops: true, encoding: true } },
  { id: 'container', label: '容器内', options: { container: true, maxMetaspace: '256m', server: true } },
]
