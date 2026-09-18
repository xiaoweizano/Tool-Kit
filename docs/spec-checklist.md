# Spec 自测清单(toolbox-foundation)

> 逐条覆盖 openspec/changes/toolbox-foundation/specs 下 5 个 spec 的全部 Requirement/Scenario。
> 验证方式:`☑ (测试名)` = 已由自动化测试跑通(`pnpm test` 41 用例全绿 / `node scripts/check-web-purity.mjs` OK);
> `☑ 静态核验` = 已做静态代码核验;`☐ 待人工` = 需人工目验(双端同屏 / 主题视觉 / 剪贴板 / 安装首跑)。
>
> 统计:共 **29** 个 Scenario(tool-registry 4 / app-shell 9 / tool-ux-conventions 5 / json-parser-tool 6 / dual-output-build 5;注:brief 预估与 spec 实际条数不符,以 spec 文件实际内容为准)。
> 已验证 ☑ 22 条(其中自动化测试 17、静态核验 5),待人工 ☐ 7 条。
>
> [2026-09-18 rest-api-client-tool 增量统计] 另覆盖 **46** 个 Scenario(rest-api-client 35 / net-fetch-channel 11):已验证 ☑ 46 条(自动化测试 33、静态核验 13,0 条纯待人工);其中主进程端到端与导航 NET 徽标视觉归入「待人工·桌面运行时」段人工目验。上方 29/22/7 为 toolbox-foundation 原口径,不含此增量。

## tool-registry(4 Scenario)

### Requirement: ToolDescriptor 接口契约
- [x] **注册缺少 capability 的工具被编译期拒绝** — ☑ 静态核验:`ToolDescriptor` 为必填字段的 TS 接口,`pnpm typecheck` 全量通过;缺字段对象在编译期即报错(类型测试见 `test/types.test.ts` 4 用例绿)
### Requirement: 注册表驱动导航与路由
- [x] **新增工具后导航自动出现** — ☑ (tests/smoke/home.spec.ts「首页加载…导航渲染工具项」:导航由 register.ts 数组驱动渲染;`test/register.test.ts`「searchTools 空 query 返回全部」)
### Requirement: capability 声明驱动壳层适配
- [ ] **联网工具在导航中带联网标识** — ☐ 待人工:注册表现含 2 个联网工具(translate、rest-api-client,均 `capability.network` 非空);NET 徽标渲染门控(`NavLink.tsx:21`、`Home.tsx:50`)已静态核验并随 translate 首点亮、rest-api-client 复证,但无自动化测试断言徽标 DOM,导航/首页徽标视觉一致性仍需人工目验(见「待人工·桌面运行时」)
- [x] **离线工具断网后完整可用** — ☑ 静态核验:JSON 工具 capability offline: true,transform 为本地纯函数(`test/json-transform.test.ts` 12 用例绿),无任何网络请求;Web 纯度检查通过(产物无 electron/网络依赖)

## app-shell(9 Scenario)

### Requirement: 左侧导航布局
- [x] **点击导航切换工具** — ☑ (tests/smoke/home.spec.ts:导航项渲染 + 工具页粘贴即出,路由切换经 Playwright 守门)
### Requirement: 多主题系统,深色默认
- [x] **首次打开为深色主题** — ☑ 静态核验:`core/theme-store.ts` 初始值 `theme: 'toolkit-dark'`(深色默认)
- [ ] **切换到焦糖色主题即时生效** — ☐ 待人工:主题切换即时视觉生效需人工目验(存储逻辑已由 `test/storage.test.ts` 覆盖)
- [x] **内置主题至少三套** — ☑ 静态核验:`ThemeName = 'toolkit-dark' | 'toolkit-paper' | 'toolkit-caramel'` 三主题均注册
- [x] **主题选择跨会话保持** — ☑ (test/storage.test.ts「set 后 get 返回同值」「缺键返回 fallback」:localStorage 持久化)
### Requirement: 中文 UI
- [ ] **界面文案为中文** — ☐ 待人工:源码静态扫描导航/按钮/提示文案均为中文,但整体视觉需人工目验确认
### Requirement: 首页总览
- [x] **启动落在首页** — ☑ (tests/smoke/home.spec.ts「首页加载无 console error」:首页总览为首屏)
- [ ] **搜索直达工具** — ☐ 待人工:搜索索引逻辑已由 `test/register.test.ts`「searchTools 空 query 返回全部」覆盖,但首页搜索框回车直达交互需人工目验
### Requirement: 设置页
- [ ] **设置页切换主题** — ☐ 待人工:色卡与壳层主题选择器行为一致性需人工目验(底层同用 theme-store)

## tool-ux-conventions(5 Scenario)

### Requirement: 粘贴即出结果
- [x] **粘贴 JSON 立即得到格式化结果** — ☑ (test/json-page.test.tsx「粘贴合法 JSON 自动出格式化结果」+ test/uselivetransform.test.ts「输入经防抖转换」≤200ms 防抖)
- [ ] **一键复制输出** — ☐ 待人工:剪贴板写入与按钮反馈需人工目验(浏览器/桌面剪贴板权限环境差异)
### Requirement: 错误三态,无静默失败
- [x] **粘贴非法 JSON 显示定位错误** — ☑ (test/json-page.test.tsx「非法 JSON 出 ERROR 定位」)
- [x] **空输入显示占位引导** — ☑ (test/json-page.test.tsx「空输入显示 EMPTY 引导」)
### Requirement: 工具核心为纯函数 transform
- [x] **transform 可脱离 UI 直接测试** — ☑ (test/json-transform.test.ts 全部 12 用例直接调用纯函数,无 DOM/网络)

## json-parser-tool(6 Scenario)

### Requirement: JSON 解析与校验
- [x] **粘贴合法 JSON** — ☑ (test/json-transform.test.ts「格式化嵌套对象」+ json-page 页面级用例)
- [x] **粘贴非法 JSON 定位错误** — ☑ (test/json-transform.test.ts「多余逗号给出字符位置」+「posToLineCol 行列换算」)
### Requirement: 格式化输出控制
- [x] **切换缩进宽度** — ☑ (test/json-transform.test.ts「缩进 4 与 tab」)
- [x] **压缩输出** — ☑ (test/json-transform.test.ts「压缩模式」)
### Requirement: 转换逻辑纯函数化与 golden 测试
- [x] **golden 样例回归** — ☑ (test/json-golden.test.ts:fixtures 8 组样例逐条断言全绿)
- [x] **大输入不冻结** — ☑ (test/json-transform.test.ts「1MB 合法输入 <200ms」)

## dual-output-build(5 Scenario)

### Requirement: 单源码双输出
- [ ] **同一 dev 源双通道同时开发** — ☐ 待人工:浏览器与 Electron 壳同屏行为一致 + HMR 需人工启动 dev 目验
- [x] **renderer 产物无 Electron 引用** — ☑ (scripts/check-web-purity.mjs:CI 静态检查,本地运行输出 `web purity OK`)
### Requirement: Electron 安全默认
- [x] **渲染层无法访问 Node API** — ☑ 静态核验:`electron/main.ts:11` `contextIsolation: true, nodeIntegration: false`,preload 仅经 contextBridge 白名单暴露;运行时 `typeof require` 需随待人工项一并抽查
### Requirement: CI 双通道构建
- [x] **tag 触发桌面 Release** — ☑ 静态核验:`.github/workflows/release.yml` 定义 v* tag 触发 Win/Mac 构建并附加 Draft Release(真实触发需推送 tag 验证,属 CI 环境外)
- [x] **在线版静态产物可部署** — ☑ (build:web 产物 dist/web + check-web-purity 通过;CI workflow 含静态产物 artifact 上传)

## tools 2-5(2026-08-25 新增批次)

> 沿用 JSON 黄金模板批量落地 4 个工具:时间戳互转 / SQL 占位符 / ID 生成 / 租户 SQL 组装。
> 每工具 = `src/tools/<id>/` 目录 + register.ts 一行 + (经 worker 工具) transform.worker.ts 一行。

### date-converter(时间戳互转)
- [x] **精度自动检测(s/ms/us/date)** — ☑ test/date-converter.test.ts(11 用例绿)
- [x] **四视图输出(ISO/本地/UTC/unix 秒·毫秒)** — ☑ transform 返回多行文本
- [x] **日期串 ↔ unix 互转(dateStrToUnix)** — ☑
- [x] **非法输入 → invalid-input 定位** — ☑
- [x] **单输入粘贴即出(useLiveTransform)** — ☑ 页面 /tools/date-converter

### sql-placeholder(SQL 占位符替换)
- [x] **? 按序替换 + 引号转义/数字/bool/null** — ☑ test/sql-placeholder.test.ts(6 用例绿)
- [x] **参数不足 → partial 标注 failedItems** — ☑
- [x] **一键默认值(autoFillDefaults)** — ☑
- [x] **反向替换(unfillLiterals)+格式化(formatSql)** — ☑ 纯函数转测试 + 页面按钮(用户裁决接 UI)
- [x] **双输入 worker 适配(参数换行→数组)** — ☑ 页面 /tools/sql-placeholder

### id-generator(ID 生成)
- [x] **UUID v4 格式/version/variant 位** — ☑ test/id-generator.test.ts(8 用例绿)
- [x] **真雪花(41+10+12 位,BigInt 无溢出,单调)** — ☑
- [x] **批量 count 校验/前缀/分隔符选择器(用户裁决补)** — ☑
- [x] **按钮触发不经 worker(纯本地)** — ☑ 页面 /tools/id-generator
- [~] 雪花同毫秒>4096 序列回绕 — deferred(UI 单次 max1000 触不到)

### sql-builder(租户 SQL 组装)
- [x] **每条 SQL×每租户 笛卡尔积分组** — ☑ test/sql-builder.test.ts(4 用例绿)
- [x] **区块头 `-- ===== [租户] =====` + 缺分号自动补** — ☑
- [x] **空租户/空 SQL → invalid-input 定位** — ☑
- [x] **SQL 按行切(文案对齐行为,用户裁决不改 worker)** — ☑ 页面 /tools/sql-builder

## tools 6-7(2026-08-25 第二批)

### regex-generator(正则生成/测试)
- [x] **模板库 23 条(邮箱/手机/IPv4/IPv6/URL/日期/时间/日期时间/整数/小数/身份证/汉字/UUID/颜色/邮编/QQ/微信/车牌/银行卡/MAC/端口/用户名/空白行)** — ☑ test/regex-generator.test.ts golden(每条可编译且与示例匹配)
- [x] **实时匹配列表(序号+位置+内容)+ 截断提示** — ☑ 32 用例全绿
- [x] **测试文本高亮渲染(10K 文本上限防主线程冻结)** — ☑ highlightSegments 分段 + 防护测试
- [x] **非法正则 → invalid-input;空 pattern → invalid-input** — ☑
- [x] **可手输自定义正则 + flags(g/i/m,经通道透传)** — ☑ 页面/worker 适配
- [~] 灾难性回溯正则仍可能慢(务实缓解:10K 上限+guard,完整超时方案留待后续) — parked

### testdata-gen(测试数据生成)
- [x] **建表 SQL 解析(表名/列名/类型;括号深度切分保护 ENUM;跳过约束行;IF NOT EXISTS/无反引号兼容)** — ☑ test/testdata-gen.test.ts 9 用例
- [x] **类型造数(INT/VARCHAR 限长/TEXT 中文/DATE/DATETIME/FLOAT/BOOL/ENUM)** — ☑
- [x] **智能列名(email/phone/name/id 递增|UUID/url/address/status/created_at)** — ☑
- [x] **行数 1-1000 / NULL 比例 0-50% 边界校验** — ☑
- [x] **解析实时反馈(走 worker)+ 生成按钮(本地直调,编辑 SQL 回解析视图)** — ☑ 页面双视图
- [~] NOT NULL 列也可能产 NULL;status 智能造数忽略列类型(plan 取舍) — parked

## 验证记录(第一批 2026-08-25)

- `pnpm test`:16 文件 / 72 用例全部通过
- `pnpm lint` / `pnpm typecheck`:全绿
- `pnpm build:web` + `node scripts/check-web-purity.mjs`:web purity OK

## 验证记录(第二批 2026-08-25)

- `pnpm test`:18 文件 / 114 用例全部通过
- `pnpm lint` / `pnpm typecheck`:全绿
- `pnpm build:web` + `node scripts/check-web-purity.mjs`:web purity OK

## tools 8-10(2026-08-25 收官批次)

### md-word(Markdown ↔ Word)
- [x] **md→Word 生成 .docx(标题/粗斜体/行内代码/代码块/列表/表格/链接/分隔线)** — ☑ test/markdown.test.ts(parseMarkdown 各元素 + buildDocxDocument 冒烟)
- [x] **Word→md(mammoth 解析 + turndown 转 md,表格经 gfm 保真)** — ☑ htmlToMd 测试
- [x] **文件上传/下载(FileDrop + downloadFile)** — ☑ 页面手动目验(.docx 打开验证,待人工确认)

### excel-md(Excel ↔ Markdown)
- [x] **Excel→md(上传 xlsx,首个 sheet 转管道表格)** — ☑ test/excel-md.test.ts(sheetToMarkdown)
- [x] **md→Excel(粘贴表格生成 .xlsx 下载)** — ☑ markdownToSheet
- [x] **列数不一/空表/非表格 → invalid-input** — ☑
- [~] 多 sheet 仅取首个(提示说明) — plan 取舍

### linux-manual(Linux 命令大全)
- [x] **500 条本地库(10 类 × 50,含名称/说明/选项/示例,跨类无重复)** — ☑ test/linux-data.test.ts(数量/schema/唯一/排序)
- [x] **名称/说明实时搜索 + 分类侧栏** — ☑ test/linux-search.test.ts(searchLinux)
- [x] **命令卡片展开看选项与示例** — ☑ 页面
- [~] 命令选项准确性为人工知识(结构测试守门,抽查 6 条正确;全量逐条目验待人工) — 待人工

## tools 11-12(2026-08-26 新增)

### batch-transform(批处理值转换)
- [x] **混合输入解析(每行/逗号/混合,中英逗号)** — ☑ test/batch-transform.test.ts(13 用例)
- [x] **20 种有序操作管线(顺序即应用顺序,可增删重排)** — ☑ 包裹五式/前后缀/去特殊字符(自定义保留集)/截取(前/后)/trim/去空行/去重/排序(字典/数字)/大小写/全半角/编号/URL/Base64 编解码
- [x] **5 种输出格式(逗号/JSON 数组/SQL IN/换行/自定义分隔符)** — ☑
- [x] **纯函数可测 + 注册 offline** — ☑ worker 通道接线,路由 /tools/batch-transform

### translate(翻译·首个联网增强)
- [x] **多语言互译(中/英/日/韩/俄突出 + 法/德/西,源语言自动检测+手动覆盖)** — ☑ test/translate-engines.test.ts(16 用例)
- [x] **五引擎适配器(MyMemory 免费默认/百度/DeepL/有道/谷歌,MD5 RFC 向量锁定 + node crypto 差分 20/20)** — ☑
- [x] **多行逐行翻 + Promise.all 行序收集,单行失败仅标记** — ☑ test/translate-hook.test.ts(7 用例)
- [x] **15s AbortController 超时(无 UI 挂起)+ 单行 >450 字符报错定位行号** — ☑(CEO 评审决定)
- [x] **CORS 修正:桌面经 net-fetch IPC 直连全引擎,Web 仅 MyMemory(browserOk 标记「仅桌面版」)** — ☑ electron main/preload + httpFetch 适配器
- [x] **API key 设置区(按引擎分字段,localStorage 持久化)** — ☑ test/translate-keys.test.ts
- [x] **NET 徽标(capability network:'translate',导航/首页自动)** — ☑ 首个联网工具点亮
- [x] **CSP connect-src 放行 5 翻译域** — ☑ build:web + purity 通过
- [~] 真实翻译联调(各引擎实 key 请求)与桌面 IPC 实测 — 待人工目验

## rest-api-client(2026-09-18 · REST API 客户端 · 35 Scenario)

> 第 22 个工具、第 2 个联网工具(`capability: { offline:false, network:'rest-client' }`)。三栏:侧栏 集合·环境·历史 / 请求区 / 响应区。
> 纯函数(curl-parse/build、env-resolve、query-params、store)与封装层(http-client、httpFetch)均可单测直调;主进程 `net.fetch` 端到端(真超时/取消/跨域收发/302)属桌面运行时,见末尾「待人工·桌面运行时」段。

### Requirement: 工具注册与能力声明
- [x] **导航自动出现联网标识工具** — ☑ 静态核验:`register.ts` 追加 `id:'rest-api-client', network:'rest-client'`;导航/首页 NET 徽标由 `capability.network` 门控(`NavLink.tsx:21`、`Home.tsx:50`),与 translate 同机制点亮。徽标真实视觉待人工(无自动化测试断言徽标 DOM)
- [x] **编译期类型接受 rest-client** — ☑ 静态核验:`core/types.ts:5` `network` 联合已含 `'rest-client'`,`pnpm typecheck` 全绿

### Requirement: 请求构建器
- [x] **编辑 headers 增删行** — ☑ 静态核验:`RequestPanel` HEADERS 表「+ Header」/删行按索引 filter 接线,发送仅含现存行
- [x] **body JSON 格式化** — ☑ 静态核验:`RequestPanel.formatBody` 走 `JSON.parse→stringify(_,2)`,非法 JSON 显式报错不静默

### Requirement: cURL 导入(bash + cmd 双方言)
- [x] **解析 Chrome bash 格式** — ☑ (test/rest-client-curl.test.ts「解析 Chrome bash GET」「--data-raw 触发 POST + body」「ANSI-C 解码 \xNN/\t/\n」)
- [x] **解析 Chrome cmd 格式含内嵌引号** — ☑ (test/rest-client-curl.test.ts「cmd ^" 方言 + \^" 内引号」「cmd 方言与等价 bash 结果一致」)
- [x] **非 curl 输入明确报错** — ☑ (test/rest-client-curl.test.ts「非 curl 输入 → invalid-input」「PowerShell → invalid-input 提示 Copy as cURL (bash)」)
- [x] **multipart 明确拒绝** — ☑ (test/rest-client-curl.test.ts「-F/--form → multipart unsupported 且不静默丢 body」)

### Requirement: cURL 导出(bash 方言)
- [x] **导出可被自身导入还原** — ☑ (test/rest-client-curl.test.ts「build→parse 语义一致」)

### Requirement: 环境变量模板替换(原样,零 URL 编码)
- [x] **baseUrl 变量不被破坏** — ☑ (test/rest-client-env.test.ts「baseUrl 值不被编码」+ test/rest-client-http.test.ts「解析变量后发送,URL 不被编码」)
- [x] **未定义变量提示** — ☑ (test/rest-client-env.test.ts「未定义变量列出且原样保留」+ test/rest-client-http.test.ts「url 与 body 中同一未定义变量去重后返回」)
- [x] **切换环境重发指向新环境** — ☑ (test/rest-client-env.test.ts「body/headers 同样替换」+ test/rest-client-sidebar.test.tsx「6. 编辑活动环境变量」;真实跨环境重发属桌面运行时段)

### Requirement: query 参数编辑器(不经 URL/URLSearchParams)
- [x] **拆分含变量的 query** — ☑ (test/rest-client-query.test.ts「拆分含变量,花括号不被编码」)
- [x] **特殊字符往返不损坏** — ☑ (test/rest-client-query.test.ts「round-trip 保结构」「值含已编码内容原样保留(不 double-encode)」+ test/rest-client-ui.test.tsx「编辑 query 参数值…URL 双向同步」)

### Requirement: 树形集合管理
- [x] **新建分组并移入请求** — ☑ (test/rest-client-sidebar.test.tsx「1. +分组」「4. 移动请求到另一分组」+ test/rest-client-store.test.ts「集合树 add/remove」)
- [x] **删除分组含子项确认** — ☑ (test/rest-client-sidebar.test.tsx「2. 删除含请求的分组 → 触发确认;取消不删,确认删除子树」)

### Requirement: 多环境与活动环境
- [x] **切换活动环境** — ☑ (test/rest-client-sidebar.test.tsx「5. +环境 首个自动 activeEnvId」「6. 编辑活动环境变量」;按所选 vars 解析由 env-resolve 保证)

### Requirement: 请求历史
- [x] **历史不存响应体且有上限** — ☑ (test/rest-client-store.test.ts「历史超 50 淘汰最旧」;HistoryEntry 响应仅存摘要 status/statusText/durationMs/sizeBytes/finalUrl,无 body)
- [x] **大请求体截断入历史** — ☑ (test/rest-client-store.test.ts「历史 body 超 10KB 截断标 truncated」)
- [x] **点击历史回填** — ☑ 静态核验:`index.tsx.onHistoryLoad → loadDraft(entry.request)` 回填 method/url/headers/body 模板,复用 dirty 确认

### Requirement: 编辑模型:活动草稿 + 脏标记 + 切换确认
- [x] **丢弃前确认** — ☑ (test/rest-client-ui.test.tsx「修改 URL 后 dirty=true,切换集合项触发确认(window.confirm)」+ test/rest-client-sidebar.test.tsx「8. 新增分组/环境不触发 discard 确认」)

### Requirement: 响应面板
- [x] **JSON 响应高亮** — ☑ 静态核验:`ResponsePanel` content-type/前缀命中 JSON 走 `JsonView`(其自身测试已覆盖),`CopyButton getText=()=>body` 复制全量原文
- [x] **超大响应截断** — ☑ 静态核验:`ResponsePanel` `body.length>1MB` 走 truncated 分支(slice 预览 + 提示条,绝不整体 parse/建树)。真实 >1MB 渲染目验属桌面运行时段
- [x] **空响应** — ☑ 静态核验:`ResponsePanel` `body===''` 显示「EMPTY · 无响应体」占位

### Requirement: Web 版错误诚实标注
- [x] **Web 无法发送时合并提示** — ☑ (test/rest-client-http.test.ts「network 类错误映射为桌面版提示文案」+ test/http-fetch.test.ts「fetch 抛 TypeError → NetFetchError(network)」)
- [x] **HTTP 错误状态正常展示** — ☑ (test/rest-client-http.test.ts「4xx 是 ok(正常响应)」;`ResponsePanel.statusColor` 4xx/5xx → badge-error 红显)

### Requirement: 跨工具深链
- [x] **深链到 JSON 解析** — ☑ (test/rest-client-deeplink.test.ts「写后读一次即清」;`ResponsePanel.openJson → writeDeepLink('json-parser',body)` 后跳 `/tools/json-parser`)
- [x] **JWT 深链优先选中文本** — ☑ 静态核验:`ResponsePanel.openJwt` 取 `selected() || body`,选中优先、无选中回落整个 body
- [x] **深链载荷过大降级** — ☑ 静态核验:`deep-link.writeDeepLink` setItem try/catch 返 false,`openJwt` 捕获后降级仅传选中文本并提示,不崩

### Requirement: 键盘可达发送
- [x] **快捷键发送** — ☑ (test/rest-client-ui.test.tsx「Ctrl+Enter 发送」;发送中 `send-btn disabled={sending}` + `onKeyDown` 内 `if(!p.sending)` 双重防重)

### Requirement: 集合与环境导入导出
- [x] **导出清空后导入还原** — ☑ (test/rest-client-export.test.ts「导出清空再导入还原」「导出后清空再导入还原集合树(组+子请求)」)
- [x] **导入损坏文件不污染** — ☑ (test/rest-client-export.test.ts「非法 bundle 不污染」「同名共存不覆盖」「重复导入同一 bundle 不产生重复条目(id 跳过)」)
- [x] **含 token 导出警告** — ☑ (test/rest-client-export.test.ts「无任何非空环境变量时 bundleHasSecrets 为 false」;明文 token 导出 UI 警告弹窗目验属桌面运行时段)

### Requirement: 存储写失败可见
- [x] **配额溢出可见** — ☑ (test/rest-client-store.test.ts「持久化底层写失败时标记 writeFailed」「写失败标记」+ test/storage-checked.test.ts「setItem 抛错返回 ok:false 且带 reason」;顶部 `role=alert` 警告见 index.tsx)
- [x] **既有静默行为不变** — ☑ (test/storage-checked.test.ts 新增独立 `storageSetChecked`;既有 `storageSet` 静默行为未改,test/storage.test.ts 全绿,前 21 工具零回归)

## net-fetch-channel(2026-09-18 · 一次性网络通道增强 · 11 Scenario)

> 主进程 `net.fetch` 通道:requestId 关联取消、可配超时、失败以 `{__fail:true,kind}` 结构化返回、响应带回 headers/bodyBytes/finalUrl。渲染层可测逻辑(classifyFetchError/computeBodyBytes/超时默认值/httpFetch 封装/http-client)已单测直调;真实主进程 `net.fetch` 中止、跨域收发、302 属桌面运行时,见末尾桌面段。

### Requirement: 一次性请求携带 requestId 与可配置超时
- [x] **桌面请求在超时时中止** — ☑ 静态核验:`net-channel.classifyFetchError` 将 TimeoutError 归 `timeout`(test/net-channel.test.ts「TimeoutError → timeout」);主进程 `AbortSignal.timeout(ms)` 真中止属桌面运行时段
- [x] **未传 timeoutMs 用默认 15s** — ☑ (test/net-channel.test.ts「DEFAULT_TIMEOUT_MS=15000」)

### Requirement: 在途请求可取消
- [x] **用户取消在途请求** — ☑ (test/http-fetch.test.ts「手动取消 → aborted(不误判为 timeout)」+ test/rest-client-http.test.ts「有在途请求时调用 httpCancel(当前 requestId)」;主进程 `AbortController.abort` 真中断 net.fetch 属桌面运行时段)
- [x] **取消已完成的请求是空操作** — ☑ (test/rest-client-http.test.ts「无在途请求时不调用 httpCancel」)
- [x] **组件卸载触发取消** — ☑ 静态核验:`index.tsx` 卸载 cleanup 副作用调 `cancelCurrent()`;真实中断属桌面运行时段

### Requirement: 错误分类以主进程为唯一来源
- [x] **网络不可达归类为 network** — ☑ (test/net-channel.test.ts「普通 TypeError(Failed to fetch) → network」+ test/http-fetch.test.ts「fetch 抛 TypeError → NetFetchError(network)」)
- [x] **4xx 响应不是失败** — ☑ (test/rest-client-http.test.ts「4xx 是 ok(正常响应)」)
- [x] **主动取消区别于超时** — ☑ (test/net-channel.test.ts「AbortError+user-cancel → aborted」vs「TimeoutError → timeout」,kind 不混淆)

### Requirement: 响应返回头/字节大小/最终 URL
- [x] **重定向暴露最终 URL** — ☑ (test/http-fetch.test.ts「成功返回 headers/bodyBytes/finalUrl」字段透传;真实 302 跟随最终 URL 属桌面运行时段)
- [x] **无 Content-Length 按字节计** — ☑ (test/net-channel.test.ts「缺失按 UTF-8 字节数(中文 3 字节)」「优先 Content-Length」)

### Requirement: 向后兼容既有调用方(translate)
- [x] **translate 旧式调用不受影响** — ☑ 静态核验:`httpFetch` 不传 requestId 仍返 `{ok,status,body}` 子集,translate 既有 test/translate-engines/hook/keys 全绿(零回归)

## 验证记录(tools 11-12 批次 2026-08-26)

- `pnpm test`:28 文件 / 217 用例全部通过
- `pnpm lint` / `pnpm typecheck` / `pnpm build:web` / `check-web-purity`:全绿

## 验证记录(收官批次 2026-08-25)

- `pnpm test`:23 文件 / 140 用例全部通过(10 工具全绿)
- `pnpm lint` / `pnpm typecheck` / `pnpm build:web` / `node scripts/check-web-purity.mjs`:全绿(新增库均无 electron 引用)

## 验证记录(rest-api-client + net-fetch-channel 批次 2026-09-18)

- `pnpm test`:51 文件 / **438** 用例全部通过(前 21 工具零回归;新增 rest-client-* 系列 + net-channel + http-fetch + storage-checked 全绿)
- `pnpm typecheck` / `pnpm lint`:全绿
- `pnpm build:web` + `node scripts/check-web-purity.mjs dist/web`:web purity OK
- Web CSP 放宽:构建产物 `dist/web/index.html` 含 `connect-src *`(经 `scripts/copy-web.mjs` 复制后改写,并带失败即抛守卫);桌面 `out/renderer/index.html` 逐域白名单原样保留(translate/DeepL/有道等域仍在),CSP 未被触碰

## 待人工项汇总

### 既有(foundation 7 条)

1. 联网标识导航徽标(tool-registry):已由 translate + rest-api-client 双联网工具点亮 `capability.network` 门控、静态核验;导航/首页徽标**视觉**目验并入下方桌面运行时段第 12 条
2. 主题切换即时视觉生效(app-shell)
3. 整体中文文案目验(app-shell)
4. 首页搜索回车直达(app-shell)
5. 设置页色卡与主题选择器一致性(app-shell)
6. 一键复制剪贴板反馈(tool-ux-conventions)
7. 双端同屏 dev + 桌面安装首跑,含 SmartScreen/右键打开指引核对(dual-output-build)

### 待人工·桌面运行时(rest-api-client / net-fetch-channel,2026-09-18)

> 以下属真实 Electron 主进程 / 浏览器运行时行为,单元层已测纯逻辑与分类,端到端需桌面手动目验(对应 brief Step 5)。

8. 主进程端到端:真实超时(默认 15s / UI 可选 5·10·15·30·60s)中止、`net-cancel` 真中断在途 `net.fetch`、组件卸载中断、302 重定向暴露 finalUrl、跨域/内网无 CORS 接口收发
9. 界面级:cURL 双方言粘贴导入、切换活动环境后 URL/headers 随 vars 变化、深链跳转 JSON/JWT 目标页填入并清键、含明文 token 导出警告弹窗
10. 响应面板渲染:JSON 高亮树、>1MB 截断预览不冻结且提示「复制/深链用全量」、空响应 EMPTY 占位、4xx/5xx 红显真实响应
11. 深链过大降级路径(setItem 抛 quota → 仅传选中文本)真实配额触发
12. 导航/首页 NET 徽标视觉:translate + rest-api-client 两联网工具均显示徽标、离线工具无徽标(承接第 1 条目验)
