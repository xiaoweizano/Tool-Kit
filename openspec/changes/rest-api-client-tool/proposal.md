## Why

开发者每天调接口:从浏览器 F12「Copy as cURL」或日志复制命令、改个参数重发、换 dev/预发/生产环境再发、把常用请求存下来。现有工具都不贴合——Postman/Apifox 太重要登录,curl 命令行改参数不直观,在线 HTTP 工具要把敏感 token 发到别人服务器。ToolKit 已有 21 个本地优先工具却缺一个 API 调试工作台;补上它能让「复制 cURL → 粘贴 → 改参数 → 发送 → 看响应 → 存进集合」全流程本地完成、token 不出机器,并作为工具箱第一个「跨工具工作流」入口。

## What Changes

- 新增第 22 个工具 **REST API 客户端**(完整 API 调试工作台,三栏:侧栏环境/集合/历史 · 请求区 · 响应区)
- 请求构建器:method/URL/headers 键值对/body(JSON 格式化);**URL query 参数编辑器**(键值对化,`{{var}}` 与特殊字符不损坏)
- **cURL 导入**(bash + Windows cmd 双方言,Chrome DevTools 两种复制格式)与 **cURL 导出**(bash 方言,导入导出往返一致)
- **多环境变量**:`{{var}}` 在 URL/headers/body 替换,一键切换环境;**原样文本替换,不经 URL/URLSearchParams 编码**
- **树形集合**(分组→请求,新建/重命名/移动/删除)、**历史**(上限 50 条,不存响应 body)
- **编辑模型**:单一活动草稿 + 脏标记 + 切换/关闭前确认(不静默丢改动)
- **响应面板**:状态色条 + 耗时 + 字节大小 + headers + 最终 URL(重定向)+ body JSON 高亮;超 1MB 截断显示,复制仍全量
- **跨工具深链**:响应区一键「用 JSON 解析打开」/「用 JWT 解析打开」
- **键盘可达**:Ctrl+Enter(Cmd+Enter)发送
- **集合+环境导入导出**(自家族 JSON,含明文 token 时警告,按 id 合并,同名共存)
- **BREAKING(内部协议)**:扩展 `net-fetch` IPC——payload 增 `requestId`/`timeoutMs`,返回增 headers/statusText/sizeBytes/finalUrl;新增 `net-cancel` 通道支持中断。**保持 translate 工具向后兼容**
- Web 构建 CSP 放宽(`connect-src *`,仅 Web 产物,经 `vite.web.config.ts` `transformIndexHtml`)

## Capabilities

### New Capabilities
- `net-fetch-channel`: 桌面/Web HTTP 传输契约——一次性请求+可取消(`requestId` + `net-cancel`)、main 侧强制超时与 `AbortSignal.any`、错误分类(桌面精确 kind,Web 诚实组合消息,CSP 独立检测)、`sizeBytes` 字节口径、重定向最终 URL、返回 headers;向后兼容 translate
- `rest-api-client`: 工具全部用户可见行为——请求构建、cURL 双方言导入/导出、环境变量模板替换、树形集合、多环境、历史、编辑脏模型、响应面板、深链、快捷键、导入导出、存储写失败可见

### Modified Capabilities
无。本工具**遵循**既有已落地约定而不修改其 REQUIREMENTS:`tool-registry`(加目录 + register.ts 一行,`capability.network` 联合类型追加 `'rest-client'` 属实现细节)、`tool-ux-conventions`(错误三态、粘贴即用、纯函数 transform)、`dual-output-build`(一套代码双输出)。这些 spec 未同步进 `openspec/specs/`(仍随 toolbox-foundation 存在),故不产出 delta。

## Impact

- 新目录 `src/renderer/src/tools/rest-api-client/`(index、types、curl-parse、curl-build、env-resolve、query-params、http-client、store、icon、components/{RequestPanel,ResponsePanel,Sidebar})
- 现有文件扩展:`src/renderer/src/core/http.ts`、`src/renderer/src/core/types.ts`(`network` 联合)、`src/renderer/src/core/useLiveTransform.ts`(可选 `initial` 参数,深链种子)、`electron/main.ts`(net-fetch 扩展 + net-cancel + AbortController Map)、`electron/preload.ts`(netCancel + 类型同步)、`src/renderer/src/core/storage.ts`(新增 `storageSetChecked`,不改原有)、`vite.web.config.ts`(CSP 放宽)、`src/renderer/src/tools/register.ts`(注册一行)、`src/renderer/src/tools/json-parser/index.tsx` 与 `jwt-tool/index.tsx`(各 ~2 行读深链种子)
- 测试:`test/rest-api-client-*.test.ts`(+ 1 个 `@vitest-environment jsdom` UI 测试);`openspec/specs` 主目录待 propose→apply 后归档同步
- 无需 worker 注册(纯函数微秒级)、无 DB/迁移、CI 分发已覆盖(随下次 tag)
- 关联:与 JSON 解析、JWT 解析工具联动(深链);延续工具箱「真实粘贴格式优先」理念
