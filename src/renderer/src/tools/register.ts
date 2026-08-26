import { lazy } from 'react'
import type { ToolDescriptor } from '@core/types'
import { JsonIcon } from '@tools/json-parser/icon'
import { DateIcon } from '@tools/date-converter/icon'
import { SqlIcon } from '@tools/sql-placeholder/icon'
import { IdIcon } from '@tools/id-generator/icon'
import { SqlBuilderIcon } from '@tools/sql-builder/icon'
import { RegexIcon } from '@tools/regex-generator/icon'
import { TestDataIcon } from '@tools/testdata-gen/icon'
import { MdWordIcon } from '@tools/md-word/icon'
import { ExcelMdIcon } from '@tools/excel-md/icon'
import { LinuxIcon } from '@tools/linux-manual/icon'
import { BatchIcon } from '@tools/batch-transform/icon'
import { TranslateIcon } from '@tools/translate/icon'

// lazy 放在 register.ts 而非页面 index.tsx,避免页面自引用自身模块的循环导入
const JsonParserPage = lazy(() => import('@tools/json-parser'))
const DateConverterPageLazy = lazy(() => import('@tools/date-converter'))
const SqlPlaceholderPageLazy = lazy(() => import('@tools/sql-placeholder'))
const IdGeneratorPageLazy = lazy(() => import('@tools/id-generator'))
const SqlBuilderPageLazy = lazy(() => import('@tools/sql-builder'))
const RegexGeneratorPageLazy = lazy(() => import('@tools/regex-generator'))
const TestDataGenPageLazy = lazy(() => import('@tools/testdata-gen'))
const MdWordPageLazy = lazy(() => import('@tools/md-word'))
const ExcelMdPageLazy = lazy(() => import('@tools/excel-md'))
const LinuxManualPageLazy = lazy(() => import('@tools/linux-manual'))
const BatchTransformPageLazy = lazy(() => import('@tools/batch-transform'))
const TranslatePageLazy = lazy(() => import('@tools/translate'))

// 加一个工具 = 在此数组追加一行(实现接口 + 目录),导航/路由自动生效
export const tools: ToolDescriptor[] = [
  {
    id: 'json-parser', name: 'JSON 解析', icon: JsonIcon,
    route: '/tools/json-parser', component: JsonParserPage,
    capability: { offline: true }
  },
  {
    id: 'date-converter', name: '时间戳互转', icon: DateIcon,
    route: '/tools/date-converter', component: DateConverterPageLazy,
    capability: { offline: true }
  },
  {
    id: 'sql-placeholder', name: 'SQL 占位符', icon: SqlIcon,
    route: '/tools/sql-placeholder', component: SqlPlaceholderPageLazy,
    capability: { offline: true }
  },
  {
    id: 'id-generator', name: 'ID 生成', icon: IdIcon,
    route: '/tools/id-generator', component: IdGeneratorPageLazy,
    capability: { offline: true }
  },
  {
    id: 'sql-builder', name: '租户 SQL 组装', icon: SqlBuilderIcon,
    route: '/tools/sql-builder', component: SqlBuilderPageLazy,
    capability: { offline: true }
  },
  {
    id: 'regex-generator', name: '正则生成/测试', icon: RegexIcon,
    route: '/tools/regex-generator', component: RegexGeneratorPageLazy,
    capability: { offline: true }
  },
  {
    id: 'testdata-gen', name: '测试数据生成', icon: TestDataIcon,
    route: '/tools/testdata-gen', component: TestDataGenPageLazy,
    capability: { offline: true }
  },
  {
    id: 'md-word', name: 'Markdown↔Word', icon: MdWordIcon,
    route: '/tools/md-word', component: MdWordPageLazy,
    capability: { offline: true }
  },
  {
    id: 'excel-md', name: 'Excel↔Markdown', icon: ExcelMdIcon,
    route: '/tools/excel-md', component: ExcelMdPageLazy,
    capability: { offline: true }
  },
  {
    id: 'linux-manual', name: 'Linux 命令大全', icon: LinuxIcon,
    route: '/tools/linux-manual', component: LinuxManualPageLazy,
    capability: { offline: true }
  },
  {
    id: 'batch-transform', name: '批处理值转换', icon: BatchIcon,
    route: '/tools/batch-transform', component: BatchTransformPageLazy,
    capability: { offline: true }
  },
  {
    id: 'translate', name: '翻译', icon: TranslateIcon,
    route: '/tools/translate', component: TranslatePageLazy,
    capability: { offline: false, network: 'translate' }
  }
]

export function searchTools(query: string): ToolDescriptor[] {
  const q = query.trim().toLowerCase()
  if (!q) return tools
  return tools.filter((t) => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
}
