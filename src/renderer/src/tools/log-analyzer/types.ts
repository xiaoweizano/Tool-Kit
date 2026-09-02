export interface LevelStat { level: string; count: number; pct: number }
export interface TimelinePoint { ts: string; count: number }
export interface ExceptionCluster { type: string; message: string; count: number; sampleLine: number; stackHash: string }
export interface Keyword { word: string; count: number }
export interface IdHit { id: string; lineCount: number }
export interface EndpointAgg { path: string; errors: { type: string; count: number }[] }
export interface LogAnalysisResult {
  totalLines: number
  levelStats: LevelStat[]
  timeline: TimelinePoint[]
  exceptions: ExceptionCluster[]
  keywords: Keyword[]
  traceIds: IdHit[]
  requestIds: IdHit[]
  ips: IdHit[]
  endpoints: EndpointAgg[]
}
