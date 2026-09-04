# nginx-generator-tool Specification

## ADDED Requirements

### Requirement: 基础站点配置生成
`generateNginxConfig(options)` MUST 生成 nginx.conf:含 server_name、listen、root(静态站)或 proxy_pass(反代)。返回 `ToolResult<string>`。缺 server_name→ `invalid-input`。

#### Scenario: 生成基础 server 块
- **WHEN** 用户填 server_name=example.com、listen=80、root=/var/www/html
- **THEN** 输出含 `server_name example.com`、`root /var/www/html` 的合法 server 块

### Requirement: 反向代理
勾选反代时 MUST 输出 proxy_pass 配置,并含 WebSocket 支持(proxy_set_header upgrade/connection)。

#### Scenario: 反代含 WebSocket 头
- **WHEN** 用户填 proxy_pass=http://backend:8080 并勾选 WebSocket
- **THEN** 输出 proxy_pass 与 `proxy_set_header Upgrade`/`Connection "upgrade"`

### Requirement: SSL 配置
勾选 SSL 时 MUST 输出 listen 443 ssl、证书路径(ssl_certificate/ssl_certificate_key)、可选强制 HTTPS 重定向与 HSTS。

#### Scenario: 生成带 SSL 的 server 块
- **WHEN** 用户填证书路径并勾选强制 HTTPS
- **THEN** 输出 443 ssl 与 80→443 redirect,含 HSTS 头

### Requirement: 缓存/压缩/安全头
勾选缓存/压缩/安全头时 MUST 分别输出 expires 缓存规则、gzip 配置、安全响应头(X-Frame-Options/CSP/server_tokens off)。

#### Scenario: 生成 gzip 与安全头
- **WHEN** 用户勾选 gzip 与安全头
- **THEN** 输出 gzip on 与对应安全响应头配置

### Requirement: 负载均衡 upstream
勾选负载均衡时 MUST 输出 upstream 块:server 列表 + 策略(轮询/least_conn/ip_hash)。server 列表为空但勾选→ `invalid-input`。

#### Scenario: 生成 upstream 块
- **WHEN** 用户填 server1:8080、server2:8080 并选 least_conn
- **THEN** 输出含 least_conn 与两个 server 的 upstream 块

#### Scenario: 空 server 列表返回 invalid-input
- **WHEN** 勾选负载均衡但未填 server
- **THEN** 返回 `{status:'error', kind:'invalid-input', message:'请填写至少一个 upstream server'}`

### Requirement: 注释与本地离线
输出 conf MUST 带注释说明每段用途;全本地纯前端零网络;结果可一键复制;核心为纯函数可 golden 测试。

#### Scenario: 纯函数可测且带注释
- **WHEN** 直接调用 generateNginxConfig
- **THEN** 返回确定 `ToolResult<string>`,注释段逐条断言,由 golden test 锁定
