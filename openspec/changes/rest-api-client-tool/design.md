## Context

第 22 个工具:REST API 客户端(完整 API 调试工作台)。ToolKit 是本地优先开发者工具箱(Electron 桌面为产品本体 + GitHub Pages 静态 Web 过渡版),一套代码双输出,renderer 环境无关,Electron 能力经 preload 注入。已批准设计见 office-hours 产物,CEO 计划见 `docs/designs/rest-api-client.md`。

关键现状(探索已核实):
- `core/http.ts` 的 `httpFetch` 已是双路适配器:桌面走 `toolkitAPI.netFetch`(Electron `net.fetch`,无 CORS),Web 走浏览器 `fetch`;但**当前仅返回 `{ok,status,body}`,超时只在 Web 分支(renderer AbortController),桌面路径无超时**。
- `electron/main.ts:86` 的 `net-fetch` 用 `ipcRenderer.invoke` 一次性调用,**renderer 无法中断在途请求**。
- `storage.ts:14/23` 持久化失败**故意静默吞掉**(对主题偏好正确);本工具存用户手写的集合/环境,静默丢失=事故。
- `useLiveTransform(toolId)` 无初值参数、不持久化输入(输入永远从空开始)。
- Electron 33 = Node 22,`AbortSignal.any()`/`AbortSignal.timeout()` 稳定可用。
- 现有 21 个工具经 `ToolDescriptor` 注册;`tool-ux-conventions` 要求错误三态、粘贴即用、纯函数 transform + golden。

## Goals / Non-Goals

**Goals:**
- 覆盖「复制 cURL → 粘贴 → 改参数 → 发送 → 看响应 → 存集合 → 换环境重发」全主路径
- 网络层扩展向后兼容(translate 零回归)
- 所有失败可见、可定位,无静默丢数据
- 核心逻辑(curl-parse/curl-build/env-resolve/query-params/store)为纯函数 + golden 测试锁定

**Non-Goals(v1 明确不做,进 v2 候选):**
- multipart 文件上传(`-F`/`--form` → 明确报不支持);`-d @file` 文件引用报不支持
- 二进制响应预览(图片/PDF):仅显示大小 + 文本预览
- 请求脚本/断言、WebSocket/gRPC、Postman/OpenAPI 集合导入、多 tab 并行请求
- cURL 导出仅 bash 方言(不做 cmd 导出切换)

## Decisions

### D1. 网络传输:扩展而非新建 `net-fetch-channel`
- **requestId + 取消通道**:`net-fetch` payload 增 `requestId`(renderer `crypto.randomUUID()`)、`timeoutMs`。main 维护 `Map<requestId, AbortController>`,`signal = AbortSignal.any([ac.signal, AbortSignal.timeout(timeoutMs)])`;新增 `ipcMain.handle('net-cancel', (id) => inflight.get(id)?.abort('user-cancel'))`。组件卸载/用户点取消 → `netCancel(requestId)`。
  - *备选*:requestId-less 单飞(每 webContents 一个 controller)——更简单但为多 tab 埋雷;用户 D10 明确要完整生命周期控制,选 requestId。
- **错误分类的唯一源头是 main**:main `catch` 后返回 `{__fail:true, kind, message}`(kind: `timeout|aborted|network|other`),**renderer 从不猜测**。`net.fetch` 抛错经 `ipcMain.handle` 会变成 invoke reject,故 main 必须 `try/catch` 转结构化返回,不裸抛。
- **返回体扩展**:`{ok,status,statusText,headers:Record<string,string>,body,bodyBytes,finalUrl,durationMs}`。`durationMs` 在 renderer 侧测量(含 IPC 开销,可接受)。`bodyBytes` 优先 `Content-Length`,缺失按 UTF-8 `Buffer.byteLength`/`TextEncoder` 计(string length ≠ bytes)。`finalUrl`=`res.url`(重定向可见,对齐 curl 语义)。
- **向后兼容**:translate 调用不传 `requestId`/`timeoutMs` → 走默认超时、不注册 controller;`httpFetch` 对旧返回字段仍可读。改动分四层(types→preload→main→http),**排期在任何 UI 任务之前**。

### D2. Web 版错误标注:CSP 可辨、其余诚实合并
- 浏览器把 CORS / network-down / mixed-content 全渲染成同一个 `TypeError: Failed to fetch`(故意设计,防探测)。**无法可靠区分** → Web 版这三类合并为一条诚实消息:「请求未发出或响应被浏览器拦截(可能是 CORS / mixed content / 网络不可达)。桌面版不受此限制」。
- CSP 可通过 `securitypolicyviolation` 事件独立检测,单独标注。CEO 评审 D8 已批准 Web 构建 `connect-src` 放宽为 `*`(仅 Web 产物),故放宽后 CSP 拦截本不应发生,该消息仅命中缓存旧版网页等意外。
- **HTTP 4xx/5xx 不是失败**:正常返回、状态码红色展示(这是数据,不是错误)。
- *备选*:Web 侧也强行细分 CORS/mixed-content——做不到,是伪精确,拒绝。

### D3. cURL 双方言解析:`curl-parse.ts` 纯函数
- 状态机分词(3 态: bare / in-single-quote / in-ANSI-C `$'...'`),不依赖 shell 库。cmd 方言以首参 `^"` 前缀识别。
- 支持 `-H/--header`、`-d/--data/--data-raw/--data-binary/--data-urlencode`(多个取最后一个,对齐 curl 覆盖语义)、`-X/--request`(有 body 时默认 POST)、`-b`(等价 `Cookie:` header)、`--compressed/-k/--insecure`(忽略)。续行: bash `\`+newline、cmd `^`+newline。
- ANSI-C `$'...'` 处理 `\' \\ \n \t \xNN`(→ 对应字符);`\xNN` 按 latin1 字节还原,超出集报错而非猜测。
- `-F`/`--form` → `{status:'error',kind:'unsupported'}`「v1 不支持 multipart」;`-d @file`/`--data @` → unsupported「不支持文件引用」;PowerShell(`Invoke-WebRequest`/`-Uri`/`-Method`)→ 友好提示改用 bash 格式。
- `{{` 出现在 cURL 中**原样保留**(导入后交 env-resolve)。
- **golden 以 Chrome DevTools「Copy as cURL (bash)」与 (cmd) 真实粘贴为最高频输入**,含非 ASCII(`测试`)、body 内引号、长 header 值。
- *备选*:引入 shell-quote 第三方库——为可控转义表与零新依赖,选自研小状态机。

### D4. 环境变量:`env-resolve.ts` 原样替换,零 URL 魔法
- `resolve(text, vars)` 返回 `{resolved, undefinedVars[]}`。替换是**纯文本 `{{key}}` → value,不做任何百分号编码**——保证 `{{baseUrl}}`(值含 `://`)不被破坏。
- **关键地雷(D2 探索发现 B)**:任何 URL 解析/拼回**禁止经过 `URL`/`URLSearchParams`**(会把 `{` `}` 编成 `%7B%7D` 毁模板)。query 拆分见 D5。整条 URL 的非法字符仅做 `encodeURI` 级(保留结构),且 `{{var}}` 段先作哨兵保护再编码。
- 未定义变量在 URL/headers/body 三处高亮提示(UI),不阻断发送(交由后端返回 4xx 也可见)。

### D5. query 参数编辑器:`query-params.ts` 手写拆分
- `parseQuery(url)` 手动按 `?`/`&`/`=` 切分,**保留原始 `{}` 与已编码内容**,返回 `[{key,value}]`;`serializeQuery(base, pairs)` 仅对「用户新输入的键值」做 `encodeURIComponent`,对含 `{{` 的值原样。
- 编辑器与 URL 文本框双向同步:改表→拼回 URL;改 URL 文本→重解析表。**round-trip golden** 锁定含 `&`/`?`/`=`/`{{var}}`/非 ASCII 不损坏。
- *备选*:用 `URL` 解析——见 D4,毁模板,拒绝。

### D6. 存储:`storageSetChecked` + 集合树 schema + 历史裁剪
- `store.ts`(zustand + `core/storage`),键 `toolkit.rest-client.*`:
  - `collections`: 树 `Group{id,type:'group',name,children:Node[]}` | `Request{id,type:'request',name,method,url,headers,body}`(存 `{{var}}` **模板原文**,发送时才 resolve)
  - `environments`: `{activeId, list:[{id,name,vars:Record<string,string>}]}`
  - `history`: 每条 = 请求模板快照(method/url/headers/body,**body 截断至 10KB 并标 truncated**)+ 响应摘要 `{status,statusText,durationMs,sizeBytes,finalUrl}`(**不存响应 body**);**上限 50 条淘汰最旧**;记 `activeEnvName` 便于回放识别打的是哪个环境
- **写失败可见**:新增 `storageSetChecked(key,value):{ok:true}|{ok:false,reason}`(不改原 `storageSet`),store 用它;失败时顶部一次性 amber 警告「本地存储写入失败,本次修改仅存于会话」,不静默。
- 新建 id 用 `crypto.randomUUID()`。

### D7. 编辑模型:单草稿 + 脏标记 + 切换确认(原则 #3)
- 活动请求是独立于集合树的「草稿」。从集合打开 → 载入副本;草稿有未保存改动(`dirty`)时,打开另一请求/新建/关页 → 确认对话框(保存为副本/丢弃/取消)。
- 「保存」写入当前树位置;「另存为」新建。避免「编辑即污染集合项」与「切走丢改动」两种静默失败。

### D8. 跨工具深链:`useLiveTransform` 加可选 `initial`
- 响应区「用 JSON 解析打开」发**整个 body**;「用 JWT 解析打开」发**选中文本,fallback 整个 body**。
- 传递:`sessionStorage.setItem('toolkit.deepLink.<targetId>', payload)`,写用 try/catch(>~5MB 降级为仅传选中文本);目标页挂载读一次即 `removeItem`。
- `useLiveTransform(toolId, initial?)`:有 initial 则作为 `useState` 初值,mount 的 opts effect 立即 `run(initial)`(现有 `String(v)===''` 早退对非空不触发)。
  - *备选*:页面 `useEffect(() => setInput(seed), [])`——但 `setInput` 引用随 opts 变,需 ref-guard/eslint-disable,有隐藏坑;选 hook 显式初值。
- json-parser/jwt-tool 各加 ~2 行(读种子 + 传入),属跨工具小改。

### D9. 响应体渲染:大 body 截断显示
- body 文本 `> 1MB` → 显示截断 + 「仅显示前 1MB,复制/深链用全量」提示;JSON 智能检测命中则复用 `components/JsonView` 高亮。空/无 body → EMPTY 态。

### D10. CSP / 分发
- Web 产物把 `connect-src` 放宽为 `*`(CEO 批准的取舍:放宽作用于整个 origin 而非逐域白名单),规则单一来源为 `scripts/relax-csp.mjs`(指令缺失即抛错,双端共享)。落地路径分两条:`build:web` = `electron-vite build` + `scripts/copy-web.mjs`(改写 `dist/web/index.html`——这是发布产物的真正路径);`dev:web` = `vite.web.config.ts` 的 `transformIndexHtml`(仅覆盖 dev,不参与构建产物)。桌面 CSP 不动。CI(GitHub Actions 双通道)与版本发布(tag 自动携带)已覆盖,无新增分发。

## Risks / Trade-offs

- [IPC reject 语义] `ipcMain.handle` 抛错使 invoke reject → main 必须 try/catch 转 `{__fail}` 结构返回,禁止裸抛(否则 renderer 只拿到无 kind 的 reject)→ 由 net-fetch-channel spec 的 scenario 强制。
- [`AbortSignal.any` 版本] Electron 33/Node 22 稳定;若降级需手写 setTimeout→ac.abort 兜底 → design 锁定 Electron ≥33。
- [Web 错误不可分] 合并消息牺牲精确度换诚实(伪精确是更大的坑)→ 桌面为产品本体兜底。
- [明文 token 导出] 集合导出 JSON 含 env 里的 token → 导出前 UI 显式警告 + 文件名提示;不加密(premise 2 自用工具)。
- [历史 body 截断] 10KB 截断使历史不保真 → 历史是「快速回放模板」非「审计快照」;完整 body 通过保存进集合保留。
- [深链耦合] json-parser/jwt-tool 新增读取逻辑 → 仅 2 行 + `useLiveTransform` 一处增强,耦合面小且换取工作流价值(D7.1 已批)。
- [四层协议改动量大] net-fetch 扩展触及 4 个现有文件 → 排最前、单元覆盖错误分类与向后兼容路径。

## Migration Plan

- 纯新增工具 + 向后兼容的网络层扩展,无 DB、无破坏性数据变更。
- 部署:随现有 CI 构建并入下一 tag;Web 版构建经 `scripts/copy-web.mjs`(dev:web 经 `vite.web.config.ts`)产放宽 CSP 的 index。
- 回滚:`git revert` 本 change 提交即移除工具与扩展(无残留迁移);net-fetch 扩展因向后兼容,单独 revert HTTP 通道亦不破坏 translate。

## Open Questions

- cURL 多个 `-b` cookie 合并 vs 覆盖(Chrome 仅产一个,低优先,apply 期以「最后一个胜出」暂定)
- 历史条目「完整 body 可重发」的确切来源:从集合打开保留全量,纯历史点击则用截断模板 + 提示(v1 暂定)
- query 编辑器与手改 URL 文本的双向同步防抖粒度(UI 打磨期定,不阻塞 spec)
