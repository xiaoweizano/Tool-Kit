## ADDED Requirements

### Requirement: 一次性请求携带 requestId 与可配置超时
`net-fetch` 通道 SHALL 接受 `requestId`(字符串)与 `timeoutMs`(可选,默认 15000),并在**主进程侧**强制执行超时;超时不依赖 renderer。`requestId` 用于关联取消。

#### Scenario: 桌面请求在超时时中止
- **WHEN** 桌面版发起 `net-fetch`,`timeoutMs=5000`,目标接口 8s 才响应
- **THEN** main 侧 `AbortSignal.timeout(5000)` 触发,请求中止,返回 `{__fail:true, kind:'timeout'}`

#### Scenario: 未传 timeoutMs 用默认 15s
- **WHEN** 调用 `net-fetch` 未提供 `timeoutMs`
- **THEN** 主进程以 15000ms 超时执行(等价现有 Web 分支默认)

### Requirement: 在途请求可取消
系统 SHALL 提供 `net-cancel(requestId)` 通道取消指定在途请求;`net-fetch` 执行期间以 `requestId` 为主进程内 `Map<requestId, AbortController>` 的键,完成/失败/取消后 MUST 从 Map 删除。取消 MUST 真正中断主进程 `net.fetch`,而非仅 renderer 忽略结果。

#### Scenario: 用户取消在途请求
- **WHEN** 请求在途时 renderer 调 `net-cancel(requestId)`
- **THEN** 主进程对应 `AbortController.abort('user-cancel')`,`net.fetch` 中止,`net-fetch` 返回 `{__fail:true, kind:'aborted'}`

#### Scenario: 取消已完成的请求是空操作
- **WHEN** 对一个已从 Map 删除(已完成)的 `requestId` 调 `net-cancel`
- **THEN** 返回 false 且无副作用,不抛错

#### Scenario: 组件卸载触发取消
- **WHEN** rest-api-client 请求面板在请求在途时卸载
- **THEN** renderer 在清理副作用中对当前 `requestId` 调 `net-cancel`,主进程中止该请求

### Requirement: 错误分类以主进程为唯一来源
主进程 MUST `try/catch` 包裹 `net.fetch`,将失败转为结构化返回 `{__fail:true, kind, message}`,`kind ∈ {timeout, aborted, network, other}`;**MUST NOT 让错误以 reject 形式冒泡到 renderer**(否则 renderer 只能拿到无 kind 的 reject)。HTTP 4xx/5xx MUST 作为正常响应返回(非 `__fail`)。

#### Scenario: 网络不可达归类为 network
- **WHEN** 目标域名解析失败(`net.fetch` 抛 `ENOTFOUND`)
- **THEN** 返回 `{__fail:true, kind:'network', message}` 含底层错误码

#### Scenario: 4xx 响应不是失败
- **WHEN** 目标返回 HTTP 404
- **THEN** 返回正常响应对象 `status=404, ok=false`,**不**带 `__fail`

#### Scenario: 主动取消区别于超时
- **WHEN** 同一请求可能因用户取消或超时中止
- **THEN** `kind` 分别为 `aborted` 与 `timeout`,由 `AbortSignal.any` 的来源信号判定,不混淆

### Requirement: 响应返回头/字节大小/最终 URL
成功响应 SHALL 返回 `{ok, status, statusText, headers, body, bodyBytes, finalUrl}`。`headers` 为 `Record<string,string>`(含 `set-cookie` 合并)。`bodyBytes` 优先取 `Content-Length`,缺失时按 UTF-8 字节数计(非字符串长度)。`finalUrl` 为重定向后的最终 URL。`durationMs` 由 renderer 封装层测量。

#### Scenario: 重定向暴露最终 URL
- **WHEN** 请求 `http://a` 302 跳到 `http://b` 且 `net.fetch` 自动跟随
- **THEN** 返回的 `finalUrl` 为 `http://b` 的 URL

#### Scenario: 无 Content-Length 按字节计
- **WHEN** 响应头无 `Content-Length`,body 含非 ASCII(如中文)
- **THEN** `bodyBytes` 等于 UTF-8 字节长度(不等于 `body.length`)

### Requirement: 向后兼容既有调用方(translate)
扩展 MUST 不破坏既有 `netFetch` 调用:不传 `requestId`/`timeoutMs` 的旧调用仍得到 `{ok,status,body}` 子集字段且正常工作。

#### Scenario: translate 旧式调用不受影响
- **WHEN** translate 经 `httpFetch` 发起未携带 `requestId` 的请求
- **THEN** 请求正常完成,返回体仍含 `ok/status/body`,translate 功能零回归
