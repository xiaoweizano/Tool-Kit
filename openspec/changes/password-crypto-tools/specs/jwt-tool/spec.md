# jwt-tool Specification

## ADDED Requirements

### Requirement: JWT 解析
`parseJwt(token)` MUST 将 JWT 三段(base64url header.payload.signature)解码:header 与 payload 格式化为 JSON 输出,高亮关键字段(exp/iat/sub/iss/aud),并计算剩余有效期。JWT 格式容错:允许首尾空白/换行,自动 trim。非三段格式或 base64url 解码失败 MUST 返回 `invalid-input`。

#### Scenario: 解析标准 JWT
- **WHEN** 用户粘贴合法 JWT
- **THEN** 输出 header/payload JSON,展示 exp/iat/sub/iss/aud 关键字段与剩余有效期

#### Scenario: 带空白换行的 JWT 解析成功
- **WHEN** JWT 前后带空白/换行(从终端/日志复制)
- **THEN** 自动 trim 后解析成功

#### Scenario: 非法 JWT 返回 invalid-input
- **WHEN** 粘贴非三段格式(如纯 base64 或空字符串或"abc.def")
- **THEN** 返回 `{status:'error', kind:'invalid-input', message:'不是合法 JWT'}`

### Requirement: 签名校验
`verifyJwt(token, secret, algorithm)` MUST 校验 JWT 签名:支持 HS256/HS384/HS512(对称密钥)与 RS256/RS384/RS512(公钥 PEM 或 JWK)。校验通过返回 `{isValid:true}`;失败返回 `invalid-input` 带原因(签名不匹配/已过期/alg 不支持)。

#### Scenario: HS256 校验通过
- **WHEN** 用户以生成该 JWT 的密钥校验
- **THEN** 返回 `{isValid:true}`

#### Scenario: 密钥不匹配校验失败
- **WHEN** 以不同密钥校验
- **THEN** 返回 `{status:'error', kind:'invalid-input', message:'签名不匹配'}`

#### Scenario: 校验过期 JWT
- **WHEN** 校验一个 exp 已过的 JWT
- **THEN** 返回 `{status:'error', kind:'invalid-input', message:'Token 已过期'}`

### Requirement: 签名生成
`signJwt(payload, secret, algorithm, expiry)` MUST 生成 JWT:输入 payload JSON + 密钥 + 算法(默认 HS256)+ 过期时间(如 '1h'/'7d')。生成结果 MUST 可复制。

#### Scenario: HS256 生成 JWT
- **WHEN** 用户输入 payload `{"sub":"u1","role":"admin"}` + 密钥 "secret",点生成
- **THEN** 输出三段 JWT,用同一密钥 verify 通过

### Requirement: JWT 续期
`renewJwt(token, secret, newExpiry)` MUST 读取原 JWT 的 payload 与 header,仅更新 `exp`(默认 +1h),重新签名生成新 JWT。原 token 非法或已过期但 header/payload 可读时,续期仍可基于当前时间生成。

#### Scenario: 续期生成新 token
- **WHEN** 用户粘贴 JWT 并指定 newExpiry '7d'
- **THEN** 输出新 JWT,其 exp 距今约 7 天,payload 其余字段不变

### Requirement: 算法覆盖面与安全
MUST 支持 HS 全算法(HS256/HS384/HS512 对称密钥);RS*(非对称)为 v2 规划,当前不启用。解析不校验签名(仅解码);校验/签名/续期必须用 `jose`(浏览器原生、安全实现),禁用自研签名逻辑。alg 不支持 MUST 返回 `unsupported`(`structure: alg`)。

#### Scenario: 不支持算法返回 unsupported
- **WHEN** 用户用不支持的算法(如 'none')
- **THEN** 返回 `{status:'error', kind:'unsupported', structure:'none', message:'暂不支持该算法'}`

### Requirement: 实时解析
JWT 解析 MUST 走 `useLiveTransform`,粘贴 JWT 防抖即时解析;空输入 MUST 返回 EMPTY;校验/生成/续期按钮触发走 `opts.action` 分发;复用 TriStateOutput。

#### Scenario: 粘贴即解析
- **WHEN** 用户粘贴 JWT
- **THEN** header/payload 即时展示(防抖),无需点击

#### Scenario: 空输入回 EMPTY
- **WHEN** 用户清空输入
- **THEN** 回到 EMPTY 引导态
