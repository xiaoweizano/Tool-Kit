import { lazy } from 'react'
import type { ToolDescriptor } from '@core/types'
import { JsonIcon } from '@tools/json-parser/icon'

// lazy 放在 register.ts 而非页面 index.tsx,避免页面自引用自身模块的循环导入
const JsonParserPage = lazy(() => import('@tools/json-parser'))

// 加一个工具 = 在此数组追加一行(实现接口 + 目录),导航/路由自动生效
export const tools: ToolDescriptor[] = [
  {
    id: 'json-parser', name: 'JSON 解析', icon: JsonIcon,
    route: '/tools/json-parser', component: JsonParserPage,
    capability: { offline: true }
  }
]

export function searchTools(query: string): ToolDescriptor[] {
  const q = query.trim().toLowerCase()
  if (!q) return tools
  return tools.filter((t) => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
}
