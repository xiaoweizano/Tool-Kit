## ADDED Requirements

### Requirement: 工具注册与能力声明
REST API 客户端 SHALL 以 `ToolDescriptor` 注册:`id:'rest-api-client'`、`route:'/tools/rest-api-client'`、`capability:{offline:false, network:'rest-client'}`。注册方式遵循既有 `tool-registry` 约定(icon + lazy 组件 + `register.ts` 追加),`ToolCapability.network` 联合类型 SHALL 扩展含 `'rest-client'`。本工具 MUST NOT 注册 `transform.worker.ts`(无重型纯函数)。

#### Scenario: 导航自动出现联网标识工具
- **WHEN** 应用加载注册表
- **THEN** REST API 客户端出现在导航中,标注为联网工具,点击路由到 `/tools/rest-api-client`

#### Scenario: 编译期类型接受 rest-client
- **WHEN** 以 `network:'rest-client'` 注册
- **THEN** `pnpm typecheck` 通过(联合类型已含该值)

### Requirement: 请求构建器
`RequestPanel` SHALL 提供 method 下拉(GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS)、URL 输入、headers 键值对编辑器(增删行)、body 编辑器(带 JSON 格式化按钮)。Headers 编辑器对重复键保留顺序。

#### Scenario: 编辑 headers 增删行
- **WHEN** 用户添加一行 `Authorization: Bearer x` 再删除
- **THEN** 请求头随之更新,发送时仅含现存行

#### Scenario: body JSON 格式化
- **WHEN** 用户在 body 粘贴压缩 JSON 并点「格式化」
- **THEN** body 变为缩进格式化文本,语义不变

### Requirement: cURL 导入(bash + cmd 双方言)
`curl-parse` 纯函数 SHALL 将 cURL 文本解析为 `{method,url,headers,body}`,支持 bash 与 Windows cmd 双方言:bash `\`+换行 与 cmd `^`+换行 续行、bash 单引号/`$'...'` ANSI-C、cmd `^"` 包裹与 `\^"` 内引号。支持 `-H/--header`、`-d/--data/--data-raw/--data-binary/--data-urlencode`(多个取最后一个)、`-X/--request`、`-b`(转 `Cookie` 头);忽略 `--compressed`、`-k/--insecure` 等无害参数。解析失败 SHALL 返回带定位的 `invalid-input`,不静默产出错误请求。

#### Scenario: 解析 Chrome bash 格式
- **WHEN** 粘贴含 `-H` 多条与 `--data-raw` 的 bash 格式 cURL
- **THEN** 得到正确 method(有 body 默认 POST)、url、headers 数组、body,ANSI-C 与续行均正确处理

#### Scenario: 解析 Chrome cmd 格式含内嵌引号
- **WHEN** 粘贴 Windows cmd 方言(`^"` 包裹、`\^"` 内引号、`^` 续行)
- **THEN** 解析结果与等价 bash 输入一致(golden 双方言对照)

#### Scenario: 非 curl 输入明确报错
- **WHEN** 粘贴 PowerShell `Invoke-WebRequest ...`(或非 curl 文本)
- **THEN** 返回 `invalid-input`/`unsupported` 并提示「请使用浏览器 Copy as cURL (bash)」,不产出半截请求

#### Scenario: multipart 明确拒绝
- **WHEN** cURL 含 `-F`/`--form`
- **THEN** 返回 `unsupported`「v1 不支持 multipart 文件上传」,**不**静默丢弃 body

### Requirement: cURL 导出(bash 方言)
`curl-build` 纯函数 SHALL 将当前请求序列化为 bash 方言 cURL 文本,复用与 `curl-parse` 一致的引号/转义逻辑。导入→导出→再导入 MUST 往返一致(golden)。

#### Scenario: 导出可被自身导入还原
- **WHEN** 一个含 headers 与 JSON body 的请求经 `curl-build` 导出,再喂给 `curl-parse`
- **THEN** method/url/headers/body 与原请求语义一致

### Requirement: 环境变量模板替换(原样,零 URL 编码)
`env-resolve` 纯函数 SHALL 对文本内 `{{key}}` 做**纯文本原样替换**(不对值做百分号编码,保证值含 `://` 等不被破坏),返回 `{resolved, undefinedVars}`。变量 SHALL 在 URL、headers、body 三处均生效。未定义变量 MUST 在 UI 高亮提示但不阻断发送。

#### Scenario: baseUrl 变量不被破坏
- **WHEN** 环境 `dev` 的 `baseUrl=https://api.dev.com`,URL 写 `{{baseUrl}}/users`
- **THEN** 解析为 `https://api.dev.com/users`,不被编码成 `https%3A%2F%2F`

#### Scenario: 未定义变量提示
- **WHEN** 请求含 `{{token}}` 但当前环境无 `token`
- **THEN** `undefinedVars` 含 `token`,UI 高亮,发送仍可进行(不静默替换为空)

#### Scenario: 切换环境重发指向新环境
- **WHEN** 同一请求(存的是模板)在 dev 与 prod 间切换环境后重发
- **THEN** 实际 URL/headers 随所选环境变量变化

### Requirement: query 参数编辑器(不经 URL/URLSearchParams)
`query-params` 纯函数 SHALL 手动按 `?`/`&`/`=` 拆分与拼回 query,**保留 `{{var}}` 花括号原样**,对含花括号的值 MUST NOT 经过 `URL`/`URLSearchParams`(否则 `{}` 被编码毁模板)。编辑器与 URL 文本双向同步。round-trip golden 覆盖特殊字符。

#### Scenario: 拆分含变量的 query
- **WHEN** URL 为 `{{baseUrl}}/search?q={{kw}}&page=2`
- **THEN** 解析为参数对 `q={{kw}}`、`page=2`,花括号不被破坏;拼回与原串等价

#### Scenario: 特殊字符往返不损坏
- **WHEN** 参数值含 `&`/`=`/非 ASCII,经编辑器改后拼回
- **THEN** 重新 `parseQuery` 得到一致结果,URL 结构不损坏

### Requirement: 树形集合管理
系统 SHALL 以树形集合组织请求(分组可嵌套含分组与请求),支持新建/重命名/移动/删除分组与请求。集合数据 SHALL 持久化到本地存储,存的是 `{{var}}` 模板原文。

#### Scenario: 新建分组并移入请求
- **WHEN** 用户新建分组「租户服务」并把当前请求拖入
- **THEN** 集合树出现该分组及其子请求,刷新后仍在(持久化)

#### Scenario: 删除分组含子项确认
- **WHEN** 用户删除一个含请求的非空分组
- **THEN** 弹出确认,确认后删除该子树

### Requirement: 多环境与活动环境
系统 SHALL 支持多个命名环境(各含 `vars` 键值表)与一个活动环境;可新建/编辑/删除/切换环境。环境数据持久化本地。

#### Scenario: 切换活动环境
- **WHEN** 用户在侧栏环境下拉从 `dev` 切到 `prod`
- **THEN** 后续所有请求以 `prod` 的 vars 解析 `{{var}}`

### Requirement: 请求历史
每次发送 SHALL 追加一条历史:请求模板快照 + 响应摘要(`status/statusText/durationMs/sizeBytes/finalUrl`)+ 活动环境名。历史 MUST NOT 存响应 body。单条请求 body 快照超过 10KB 时 SHALL 截断并标记。历史上限 50 条,超出淘汰最旧。点击历史 SHALL 回填请求到编辑器。

#### Scenario: 历史不存响应体且有上限
- **WHEN** 连续发送 60 次请求
- **THEN** 历史保留最近 50 条,每条无响应 body,仅有响应摘要

#### Scenario: 大请求体截断入历史
- **WHEN** 一次请求 body 为 20KB
- **THEN** 该历史条 body 快照截断至 10KB 并标 `truncated`,不撑爆存储

#### Scenario: 点击历史回填
- **WHEN** 用户点击一条历史
- **THEN** method/url/headers/body 模板回填到编辑器可再发

### Requirement: 编辑模型:活动草稿 + 脏标记 + 切换确认
当前编辑的请求 SHALL 是独立于集合的「活动草稿」。从集合打开请求载入副本;若草稿有未保存改动(`dirty`),在打开另一请求/新建/离开前 MUST 弹出确认(保存副本 / 丢弃 / 取消),不得静默丢弃改动。

#### Scenario: 丢弃前确认
- **WHEN** 草稿被修改且未保存,用户点击集合中另一请求
- **THEN** 出现确认对话框,用户选择前不切换、不丢改动

### Requirement: 响应面板
`ResponsePanel` SHALL 展示状态码(2xx 绿/4xx5xx 红)、耗时、字节大小、最终 URL、响应 headers、body;body 命中 JSON 时复用 `JsonView` 高亮,提供一键复制(复用 `CopyButton`)。body 文本超过 1MB SHALL 截断显示并提示「复制/深链使用全量」。

#### Scenario: JSON 响应高亮
- **WHEN** 响应 `content-type` 为 JSON
- **THEN** body 以语法高亮树展示,复制按钮复制的是完整原文

#### Scenario: 超大响应截断
- **WHEN** 响应 body 超过 1MB
- **THEN** 面板截断渲染并显示截断提示,不冻结界面

#### Scenario: 空响应
- **WHEN** 响应无 body
- **THEN** 显示 EMPTY 占位而非空白

### Requirement: Web 版错误诚实标注
在 Web 构建中,请求失败 SHALL 区分:CSP 违规(经 `securitypolicyviolation` 可检测)单独标注;CORS / mixed-content / 网络不可达(浏览器统一为 `Failed to fetch`,不可分辨)合并为一条诚实消息并提示改用桌面版。

#### Scenario: Web 无法发送时合并提示
- **WHEN** Web 版请求返回 `TypeError: Failed to fetch`
- **THEN** 显示「请求未发出或被浏览器拦截(可能是 CORS / mixed content / 网络不可达)。桌面版不受此限制」

#### Scenario: HTTP 错误状态正常展示
- **WHEN** 响应为 4xx/5xx
- **THEN** 面板以红色状态码正常展示响应,不当作发送失败

### Requirement: 跨工具深链
响应区 SHALL 提供「用 JSON 解析打开」(发整个响应 body)与「用 JWT 解析打开」(发当前选中文本,无选中则发整个 body)。传递经一次性 `sessionStorage` 载荷 `toolkit.deepLink.<targetId>`,写入 MUST try/catch(超大降级为仅传选中文本)。`useLiveTransform` SHALL 支持可选 `initial` 参数作为挂载初值并立即转换;目标工具挂载读取后 MUST 立即清除。

#### Scenario: 深链到 JSON 解析
- **WHEN** 用户在响应区点「用 JSON 解析打开」
- **THEN** 跳转 `/tools/json-parser`,其输入区被填入响应 body 并即时解析;`sessionStorage` 中该键被清除

#### Scenario: JWT 深链优先选中文本
- **WHEN** 用户选中响应中的一段 token 后点「用 JWT 解析打开」
- **THEN** jwt-tool 输入为选中片段;若无选中则为整个 body

#### Scenario: 深链载荷过大降级
- **WHEN** 响应 body 超 sessionStorage 配额导致 `setItem` 抛出
- **THEN** 捕获后降级为仅传选中文本,不崩,并提示降级

### Requirement: 键盘可达发送
请求面板 SHALL 支持 Ctrl+Enter(macOS Cmd+Enter)发送当前请求;发送中该组合键与发送按钮 SHALL 防重(禁用直至完成/取消)。

#### Scenario: 快捷键发送
- **WHEN** 用户在请求区按 Ctrl+Enter
- **THEN** 发送当前请求,发送期间按钮与快捷键禁用避免并发重复发送

### Requirement: 集合与环境导入导出
系统 SHALL 支持将集合+环境导出为自家族 JSON(含 `version` 字段与 `exportedAt`),并导入合并。导入 MUST 先整体校验后原子提交(校验失败不半合并);按 `id` 合并,同名集合/环境共存不覆盖。导出前若含环境变量明文 token,MUST 在 UI 显式警告。

#### Scenario: 导出清空后导入还原
- **WHEN** 导出集合+环境为 JSON,清空本地,再导入同一文件
- **THEN** 数据一致还原

#### Scenario: 导入损坏文件不污染
- **WHEN** 导入一个 schema 非法/缺 version 的 JSON
- **THEN** 整体校验失败,现有数据不被部分修改

#### Scenario: 含 token 导出警告
- **WHEN** 环境 vars 含值且用户点导出
- **THEN** 显示「导出文件含明文 token,请妥善保管」警告后仍可导出

### Requirement: 存储写失败可见
凡写入用户数据(集合/环境/历史)SHALL 使用新增的 `storageSetChecked`(返回成功/失败),失败时 MUST 在界面顶部一次性展示可见警告「本地存储写入失败,本次修改仅存于会话」,不得静默丢失(遵循产品原则「无静默失败」)。此增强 MUST NOT 改变既有 `storageSet` 的静默行为(21 个工具零回归)。

#### Scenario: 配额溢出可见
- **WHEN** 保存集合时 localStorage 配额溢出 `setItem` 抛出
- **THEN** `storageSetChecked` 返回 `{ok:false}`,UI 顶部展示写失败警告

#### Scenario: 既有静默行为不变
- **WHEN** 主题/最近使用等经旧 `storageSet` 写入失败
- **THEN** 仍静默(行为与本次改动前一致)
