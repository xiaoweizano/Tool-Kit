## 1. 网络传输层扩展(阻塞其余一切,先行)

- [ ] 1.1 `core/types.ts`:`ToolCapability.network` 联合追加 `'rest-client'`(验证:`pnpm typecheck` 通过)
- [ ] 1.2 定义共享 `net-fetch` payload/result 类型(`requestId`/`timeoutMs`/`headers`/`bodyBytes`/`finalUrl`/`__fail`/`kind`);electron 与 renderer 双侧可引用(保持双 tsconfig 可编译)
- [ ] 1.3 `electron/main.ts`:`net-fetch` 加 `AbortController` Map + `AbortSignal.any([ac.signal, AbortSignal.timeout(ms)])`;`try/catch` 转 `{__fail,kind}`;返回 headers/bodyBytes(Content-Length 优先否则字节计)/finalUrl;`finally` 删除 Map 项
- [ ] 1.4 `electron/main.ts`:新增 `ipcMain.handle('net-cancel', id=>...)`,取消命中 `abort('user-cancel')`,对已完成 id 返回 false 无副作用
- [ ] 1.5 `electron/preload.ts`:暴露 `netCancel(requestId)`;`netFetch` payload 类型同步
- [ ] 1.6 `core/http.ts`:扩展签名透传 `requestId`/`timeoutMs`,Web 分支保留浏览器 `fetch` + `AbortSignal.timeout`,统一返回结构;桌面 reject 兜底分类
- [ ] 1.7 单元/集成测试:超时→`kind:timeout`、取消→`kind:aborted`、ENOTFOUND→`kind:network`、4xx→正常、无 Content-Length 中文字节计、translate 向后兼容(旧调用仍得 `{ok,status,body}`)

## 2. Web 构建 CSP 放宽

- [ ] 2.1 `vite.web.config.ts`:加 `transformIndexHtml` 钩子,仅 Web 产物将 `connect-src` 放宽为 `*`(桌面 `index.html` 的 CSP 不改)
- [ ] 2.2 验证:构建 Web 产物 grep index 确认 `connect-src *`,且 `scripts/check-web-purity.mjs` 仍 OK

## 3. 纯函数核心(test-first,均 golden)

- [ ] 3.1 `env-resolve.ts` + golden:原样替换(值含 `://` 不被编码)、undefinedVars 列表、URL/headers/body 三处生效、切换环境重解析
- [ ] 3.2 `query-params.ts` + golden:手写按 `?`/`&`/`=` 拆分/拼回、保留 `{{}}` 花括号、特殊字符(`&?=`/非 ASCII)往返一致、禁用 `URL`/`URLSearchParams`
- [ ] 3.3 `curl-parse.ts` + golden:bash 方言(`-H`/`-d`/`--data-raw`/`-X`/`-b`/`--compressed` 忽略/`\` 续行/`$'...'` ANSI-C)
- [ ] 3.4 `curl-parse.ts` + golden:cmd 方言(`^"`/`\^"`/`^` 续行)与等价 bash 解析结果一致
- [ ] 3.5 `curl-parse.ts` 边界:非 curl→`invalid-input`、PowerShell→友好拒绝、`-F`/`--form`→`unsupported` 不丢 body、`-d @file`→`unsupported`、多 `-d` 取最后
- [ ] 3.6 `curl-build.ts` + golden:导出 bash 方言;导入→导出→再导入 round-trip 一致

## 4. 存储层

- [ ] 4.1 `core/storage.ts`:新增 `storageSetChecked(key,value):{ok}|{ok:false,reason}`,**不改** `storageSet`/`storageSetRaw` 静默行为
- [ ] 4.2 `rest-api-client/store.ts`(zustand):collections 树 / environments / history schema,存 `{{var}}` 模板原文,id 用 `crypto.randomUUID()`
- [ ] 4.3 集合树操作:新建/重命名/移动/删除(分组+请求);删除非空分组确认
- [ ] 4.4 历史:发送追加快照+响应摘要(不存 body)、body>10KB 截断标 truncated、上限 50 淘汰最旧、点击回填
- [ ] 4.5 导入导出:`{version,exportedAt,collections,environments}`;导入先整体校验后原子提交;按 id 合并、同名共存;含明文 token 导出警告
- [ ] 4.6 store 测试:写失败可见(`storageSetChecked` 返回 false→UI 警告)、既有 `storageSet` 静默不变、历史上限/截断、导入损坏文件不污染、round-trip 导出导入还原

## 5. UI 三栏

- [ ] 5.1 `index.tsx` 三栏骨架 + `icon.tsx`
- [ ] 5.2 `Sidebar.tsx`:环境下拉切换 + 集合树 + 历史列表
- [ ] 5.3 `RequestPanel.tsx`:method 下拉 + URL + query 参数编辑器(双向同步 3.2)+ headers 键值对编辑器 + body 编辑器(格式化)
- [ ] 5.4 `http-client.ts` 封装:调 `httpFetch`、生成 requestId、测 `durationMs`、`{__fail}`→抛带 kind、发送中防重(禁用)、卸载 `netCancel`
- [ ] 5.5 响应面板 `ResponsePanel.tsx`:状态色/耗时/大小/最终 URL/headers/body(`JsonView` 高亮)/`CopyButton`;>1MB 截断提示;EMPTY 态
- [ ] 5.6 Web 错误标注:CSP 单独 + CORS/mixed/network 合并诚实消息;4xx/5xx 正常展示
- [ ] 5.7 编辑模型:活动草稿 + dirty + 打开/新建/离开前确认(不静默丢)
- [ ] 5.8 快捷键:Ctrl/Cmd+Enter 发送,发送中禁用防重
- [ ] 5.9 jsdom UI 测试(`@vitest-environment jsdom`):query 编辑器往返、dirty 确认弹出、快捷键触发发送、响应截断提示

## 6. 跨工具深链

- [ ] 6.1 `core/useLiveTransform.ts`:加可选 `initial` 参数,mount 立即 `run(initial)`(对空仍早退)
- [ ] 6.2 深链写入:ResponsePanel「用 JSON/JWT 解析打开」写 `sessionStorage`(try/catch,>5MB 降级仅传选中文本)
- [ ] 6.3 目标页读取:json-parser 读种子传 `useLiveTransform` initial 并 `removeItem`;jwt-tool 同理(选中优先,fallback 整个 body)
- [ ] 6.4 测试:useLiveTransform initial 初值生效;深链挂载即清;超配额降级不崩

## 7. 注册与文档

- [ ] 7.1 `register.ts` 追加注册(icon + lazy + 条目,`capability:{offline:false,network:'rest-client'}`)
- [ ] 7.2 确认**不**注册 `transform.worker.ts`;在 `docs/workflow/development-workflow.md` 或代码注释标注本工具属交互型免注册
- [ ] 7.3 更新 `docs/spec-checklist.md`:新增 rest-api-client/net-fetch-channel 场景清单;补验「联网工具导航标识」人工场景(第 2 个联网工具)

## 8. 全绿与零回归

- [ ] 8.1 `pnpm test` 全绿(curl-parse/env-resolve/query-params/curl-build/store/http-client/UI golden 与单元)
- [ ] 8.2 `pnpm typecheck` + `check-web-purity.mjs` OK;现有 21 工具测试零回归
- [ ] 8.3 桌面手动验证:内网无 CORS 接口收发、取消在途请求、超时、切换环境重发 URL 变化、深链跳转
- [ ] 8.4 应用 `openspec archive` 前置:`openspec validate --changes rest-api-client-tool` 通过
