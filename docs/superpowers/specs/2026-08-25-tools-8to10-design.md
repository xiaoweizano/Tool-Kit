# ToolKit 工具 8-10 实现设计（md-word / excel-md / linux-manual）

> 阶段:tools 批量扩展收官批次。前 7 个简单工具已落地;本批 3 个复杂工具引入前端库与文件交互。设计要点已在用户 3 项裁决确认:md↔Word 双向(docx+mammoth)、Excel↔md 双向+文件上传/下载(xlsx)、Linux 命令库 500 条。

## Goal

新增 3 个工具,完成 10 工具清单:md↔Word 双向转换(保真:标题/表格/列表/粗斜体/代码/链接)、Excel↔md 双向(文件上传/下载)、Linux 命令大全(500 条本地库+搜索分类)。全部纯前端本地、中文 UI、golden/结构测试。

## Tech Stack（新增依赖,均浏览器安全）

`docx`(md→Word 生成)、`mammoth`(Word→HTML 解析)、`turndown`(HTML→md)、`xlsx`(SheetJS,Excel 读写)。库在工具页 lazy import(路由级代码分割,不进主 bundle);web purity 不受影响(均无 electron 依赖)。

## 全局约束（沿用前批次）

- 输出统一 `ToolResult<string>`;纯函数可测;共享文件 append-only;TDD;每 task commit;中文 UI;三态无静默失败
- **新交互**:二进制无法粘贴 → 文件上传/拖拽(FileDrop)+ 输出下载(downloadFile);按钮触发不经 useLiveTransform(id-generator/testdata-gen 先例)
- **新组件**:`components/FileDrop.tsx` + `core/download.ts`(downloadFile),md-word/excel-md 共用

## 工具 8:`md-word` md↔Word（双 tab）

**md→Word**:
- 自有轻量 md 解析 `parseMarkdown(md) → Block[]`(用户批准此取舍,覆盖:标题 #-######/段落/粗**/**斜*/**粗斜***/行内代码`/代码块```/有序无序列表/管道表格/链接[text](url)/分隔线---)
- `blocksToDocx(blocks) → string`(生成 docx 的 XML,或经 docx 库 API)——实现选**docx 库 API**(Paragraph/HeadingLevel/TextRun/Table)构造,返回 docx 二进制(Uint8Array)
- 输出:下载 `.docx`
- 边界:空 md → EMPTY;仅支持元素之外的内容原样段落(无静默失败)

**Word→md**:
- 上传 .docx → `mammoth.convertToHtml()` → 自有 htmlToMd 或 turndown → md 文本
- 保真:标题/表格/列表/粗斜体;复杂布局(mammoth 输出中本就降级的)如实呈现,不静默吞掉
- 输出:展示+复制

**页面**:双 tab(md→Word / Word→md)。方向 A:md textarea + 「生成 .docx」按钮 → 下载;方向 B:FileDrop 选 .docx → 「转换」按钮 → md 输出。

## 工具 9:`excel-md` Excel↔md（双 tab）

**Excel→md**:
- FileDrop 上传 .xlsx → xlsx 库读首个 sheet → `sheetToMarkdown(rows): string`(首行为表头,管道表格;多 sheet v0.1 取首个 + 提示"仅首个 sheet")
- 输出:展示+复制;非 .xlsx / 空 → invalid-input

**md→Excel**:
- md 表格 textarea → `markdownToSheet(md): { aoa: unknown[][] } | error`(解析管道表格行) → xlsx 生成 .xlsx → 下载
- 非法表格(列数不一致/非表格文本)→ invalid-input 定位

## 工具 10:`linux-manual` Linux 命令大全

**数据**(500 条 = 10 类 × 50 条):
- 10 类:`文件与目录`/`文本处理`/`查找与定位`/`进程与任务`/`网络与远程`/`权限与用户`/`磁盘与分区`/`压缩与打包`/`系统信息`/`软件包与Shell`
- 10 个数据文件 `src/tools/linux-manual/data/cat-<slug>.ts`,每文件导出 `LinuxEntry[]`
- `interface LinuxEntry { id: string; name: string; category: CatSlug; desc: string; options?: { flag: string; desc: string }[]; examples?: string[] }`
- 汇总 `src/tools/linux-manual/data/index.ts` 导出 `LINUX_ENTRIES`(并集+按名称排序)

**页面**:
- 搜索框(名称/描述实时过滤)+ 分类侧栏(含"全部")+ 命令卡片列表(名称+一句话 desc,展开见选项与示例)
- 纯展示本地过滤,无 worker/文件交互
- **结构测试守门**:总数 ≥500、id 唯一、name 非空唯一、category 属 10 类、选项/示例字段非空

## 执行批次（SDD 任务划分）

1. 共享组件(FileDrop + downloadFile)+ 安装 4 依赖(docx/mammoth/turndown/xlsx)
2. `md-word` 双向(parseMarkdown/blocksToDocx/mammoth+htmlToMd + 双 tab 页面)
3. `excel-md` 双向(sheetToMarkdown/markdownToSheet + 双 tab + FileDrop)
4. linux 数据批 A(5 类 250 条)
5. linux 数据批 B(5 类 250 条)+ 工具页 + 注册
6. 全量回归 + spec-checklist

## 错误处理

三态统一;二进制读取失败/非预期类型 → invalid-input;转换降级如实呈现不静默;空输入 EMPTY 引导。

## 测试

- `test/markdown.test.ts`:parseMarkdown 各元素(标题/粗斜体/行内代码/代码块/列表/表格/链接);blocksToDocx 冒烟(生成非空 docx 字节);htmlToMd 标题/表格
- `test/excel-md.test.ts`:sheetToMarkdown 首行表头/多行;markdownToSheet 合法表格/列数不一报错
- `test/linux-data.test.ts`:结构守门(500+/唯一/分类/字段非空)
- 页面级:md-word 双 tab 切换、excel-md 上传/下载(可测的纯函数层为主,文件交互手动目验)

## 里程碑

`pnpm dev:web` 三工具手测(md→docx 下载并打开、docx→md 保真、xlsx 往返、Linux 搜索 500 条);`pnpm test` 全绿;spec-checklist 追加。

---

## Self-Review

1. 无占位符;md 解析元素清单、数据结构、10 类、任务划分具体。
2. 一致性:输出 ToolResult<string>;按钮触发/id-generator 先例;FileDrop 两消费者共用;lazy import 保 bundle 分割。
3. 范围:3 工具单 plan 可承载(linux 数据 500 条按 2 批授权)。
4. 歧义已消:md→Word 自有解析(用户批准);多 sheet 取首个;Linux 500=10×50。