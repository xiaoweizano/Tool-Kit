# Design: batch-and-translate-tools

## Context

ToolKit 基座成熟:10 个本地工具走统一黄金模板(纯函数 transform + 注册表 + Worker 通道 + 三态输出)。本变更新增两个工具,其中一个(翻译)首次引入**联网**能力,打破"一切纯本地"的既有模式,需要新的架构原语而不破坏现有契约。

相关背景约束:
- PRODUCT.md:本地优先;联网增强允许,离线必须优雅降级
- DESIGN.md:线路图工作台设计体系,工具页统一布局,NET 徽标为描边非填充
- `core/types.ts`:`ToolCapability = { offline: boolean; network?: false | 'search' | 'ai' }`
- CSP `connect-src 'self' http://localhost:8400 https://api.github.com`

## Goals / Non-Goals

**Goals:**
- 工具 11:可组合、可排序的字符串处理管线,一次输入多种输出格式
- 工具 12:多语言互译,多引擎适配,设置页可配置 API key
- 引入共享联网 hook,为后续联网工具(如搜索)铺路
- 保持本地工具的"纯函数可测"哲学——网络请求与纯逻辑分离

**Non-Goals:**
- 不做本地翻译模型
- 不做整段文档/文件翻译(仅多行逐行)
- 不做翻译历史/收藏
- 不引入 Electron preload 转发层(v0.1 直接 fetch)

## Decisions

### 1. 工具 11 的处理管线模型:有序操作列表

**决策**:状态是 `Operation[]`(有序数组),每个元素 `{ id: OperationId, params?: {...} }`;应用时按数组顺序逐个执行 `applyOperation(values, op)`。

**为什么**:与"选择顺序 = 应用顺序"的需求自然对应;添加/删除/重排操作对应数组操作,UI 简单(每行一个操作,带上下移按钮);纯函数逐个叠加,天然可测。

**替代方案**:固定管道(每个操作一个 checkbox,固定顺序)——不符合"用户选顺序"需求;函数组合/表达式——过度工程。

**操作集**(初始 14 类,可扩展):
包裹(单/双/反引号/圆括号/方括号)· 前后缀 · 去特殊字符(自定义保留集)· 截取长度(前/后 N)· trim · 去空行 · 去重 · 排序(字典/数字)· 大小写 · 全半角统一 · 加编号 · URL 编码 · Base64 编/解码

### 2. 工具 11 的输入解析:混合解析

**决策**:一个 `parseInput(raw): string[]` 纯函数——按行切,再按逗号(中英文逗号)切,trim,保留空字符串由"去空行"操作决定去留。

**为什么**:同时支持"每行一个"、"逗号分隔"、"混合粘贴"三种输入习惯,零配置自动适应。

### 3. 工具 12 架构:纯函数层 + 共享联网 hook

**决策**:transform.ts 只放**纯函数**(语言映射、langpair 构造、URL/签名构造、响应解析、错误映射 → ToolResult);网络请求在共享 hook `useTranslate`(防抖→fetch→纯函数解析→结果)。

```
Input(多行) → 防抖 → useTranslate → fetch(引擎适配) → parseResponse(纯) → ToolResult
                                  ↑ 断网/超时/限流 → 映射为 error ToolResult(无静默)
```

**为什么**:网络不可纯函数化,但解析/构造/映射可以;这样测试覆盖纯层(单测),网络层薄(hook 集成测试可选)。

**CEO 评审追加决定(HOLD SCOPE,2026-08-26)**:
- **行序保证**:多行翻译用 `Promise.all` 按索引收集,结果恒按行序对应;单行失败仅标记该行,不阻塞其他行
- **请求超时**:fetch 包 `AbortController`,15 秒超时 → 错误 ToolResult「翻译请求超时,请重试或换引擎」(防 UI 挂起)
- **超长行**:单行超过 450 字符 → 报错并定位行号(不静默截断、不分块),提示拆行重试

**替代方案**:把 fetch 也放 worker——worker 可 fetch,但破坏"纯函数 transform"契约且增加复杂度;Electron main 转发——v0.1 不需要,Web 端也无法用。

### 4. 引擎适配器:注册表模式

**决策**:`TranslateEngine` 接口 `{ id, label, needsKey, buildUrl?, buildHeaders?, parseResponse, detectError }`,适配器注册在 `engines/` 目录(MyMemory/百度/DeepL/有道/谷歌)。UI 下拉切换;默认 MyMemory。

**为什么**:新增引擎 = 加一个适配器文件 + 注册一行,与 ToolDescriptor 注册表哲学一致;key 配置按引擎存(如 `toolkit.settings.translateKeys.<engineId>`)。

### 5. 源语言:自动检测 + 手动覆盖

**决策**:默认"自动"(MyMemory 自带 `langpair=Autodetect|目标`);UI 下拉可手动选(中/英/日/韩/俄/法/德/西/更多)。目标语言默认英文(中文输入时)或中文(非中文输入时),可改。

### 6. CSP 放宽与 CORS 现实(writing-plans 阶段修正,2026-08-26)

**CORS 现实**:百度/DeepL/有道/谷歌的翻译 API **不返回 CORS 头**,浏览器直接 fetch 必失败;仅 MyMemory/LibreTranslate 可 Web 直连。

**决策**:
- **HTTP 适配器 `httpFetch(url, init)`**:桌面端(`window.toolkitAPI.netFetch` 存在)走 Electron main 的 `net-fetch` IPC(Electron `net` 模块,无 CORS 限制);Web 端走浏览器 fetch(CORS 生效)。与既有 `checkUpdate` 的 toolkitAPI 适配模式一致,renderer 仍不 import electron。
- **引擎标注 `browserOk`**:MyMemory=true;百度/DeepL/有道/谷歌=false。Web 端这些引擎在下拉中禁用并标注「仅桌面版」;桌面端全量可用。
- **CSP `connect-src` 一次性追加全部引擎域名**(Web 端仅 MyMemory 实际使用;桌面 meta CSP 同样列出)。

**改动面新增**:`electron/main.ts`(+`net-fetch` IPC)、`electron/preload.ts`(+`netFetch`)。preload 白名单仍是最小暴露。

### 7. CSP 域名清单

`connect-src` 追加:`https://api.mymemory.translated.net https://fanyi-api.baidu.com https://api-free.deepl.com https://openapi.youdao.com https://translation.googleapis.com`

### 7. NET 徽标与 capability 扩展

**决策**:`ToolCapability.network` 类型扩展为 `false | 'search' | 'ai' | 'translate'`(类型宽松,值仅用于展示判断)。翻译工具 `capability: { offline: false, network: 'translate' }` → 导航/首页显示 NET 徽标(已有逻辑,自动生效)。

### 8. API key 存储

**决策**:设置页新增"翻译引擎"区块,按引擎分字段(百度 appid+secret、DeepL key、有道 key、谷歌 key)。存 localStorage(同 toolkit.settings 键域,新建 `toolkit.translate-keys`)。PRODUCT.md 提到"桌面密钥入 OS keychain"为 v0.2 计划,v0.1 用 localStorage 过渡。

## Risks / Trade-offs

- [MyMemory 免费限流] → 错误映射为明确提示"免费额度已用完/限流,可在设置配置自有 key";不影响其他工具
- [多引擎响应格式差异] → 每个适配器独立解析,单测锁定各引擎的响应样例(golden)
- [百度 MD5 签名在浏览器环境] → Web Crypto 的 `crypto.subtle.digest('MD5')` **不支持**(只有 SHA 系列);用轻量纯 JS MD5 实现(自写 ~30 行,入 transform 纯函数可测)
- [CSP 一次性放行 5 个翻译域] → 攻击面略增,但均为知名 HTTPS API 域;可接受
- [逐行翻译请求数多] → 逐行独立请求(MyMemory GET 简单);批翻译请求合并 v0.2 优化
- [自动检测误判] → UI 明确显示检测到的源语言,用户可手动覆盖

## Migration Plan

1. 工具 11(纯本地,零风险)先落地
2. 共享 hook + 引擎适配器(含 MyMemory 默认)
3. 工具 12 页面 + 设置页 key 配置 + CSP
4. 回归 + spec-checklist + NET 徽标目验

回滚:两工具均为新增目录 + register 各一行,回滚即删除。

## Open Questions

(无——引擎方案/架构/操作集已在 office-hours 与 explore 阶段确认)
