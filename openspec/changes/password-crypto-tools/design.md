# Design: password-crypto-tools

> 继承 AI 设计交付物:`docs/superpowers/specs/2026-09-01-tools-14to22-design.md`。
> 本文档为 OpenSpec 落地设计,聚焦架构与边界。

## 架构总览

```
┌─ password-strength (worker: useLiveTransform) ───────────────┐
│  粘贴密码 ──▶ analyzeStrength(pwd) ──▶ 评分报告 (ToolResult<Str>)│
│  opts.action='generate' ──▶ generateByRules(opts) ──▶ 密码     │
└──────────────────────────────────────────────────────────────┘
┌─ jwt-tool (worker: useLiveTransform + opts.action) ──────────┐
│  粘贴 JWT ──▶ parseJwt / verifyJwt / signJwt / renewJwt        │
└──────────────────────────────────────────────────────────────┘
┌─ password-generator (local: 按钮触发, 直接 import) ───────────┐
│  三面板: random / AES·RSA / BCrypt(hash+verify)                │
└──────────────────────────────────────────────────────────────┘
```

## 关键设计决策

### 1. 集成路径选择
- **password-strength / jwt-tool**:走 `useLiveTransform`(粘贴即分析)。JWT 走 `opts.action` 区分 parse/verify/sign/renew(es-query-builder 先例)。
- **password-generator**:按钮触发(local, id-generator 先例)。因含 keygen/加密多步交互,不适合防抖自动刷新。

### 2. async 加密函数无需改共享类型(explore 确认)
worker 走 comlink,`runTransform` 主线程侧天然返回 Promise。注册 async transform(`jwt-tool`、AES/RSA)经 comlink 自动 await,**无需改 `Transform` 类型或 `useLiveTransform`**。password-generator 的 local 路径在按钮 handler 里 `await` 即可。

### 3. BCrypt 必须用 bcryptjs
spring-security `BCryptPasswordEncoder` 的浏览器等价实现。**绝不手写 salt**;`bcryptjs.hashSync(plain, 10)` 自动生成 salt。校验用 `bcrypt.compareSync(plain, hash)`。golden 测试:给定固定 hash,`compareSync` 返回 true;错误明文返回 false。

### 4. AES/RSA 用原生 Web Crypto(不用 crypto-js/jsencrypt)
- crypto-js 默认 KDF 用 MD5(EVP_BytesToKey),弱;jsencrypt 重。
- **AES**:AES-GCM,密钥由用户 Passphrase 经 **PBKDF2**(SHA-256, 高迭代)派生;输出 `iv.tag.ciphertext`(base64 拼接),解密还原。
- **RSA**:RSA-OAEP(SHA-256)。keygen 生成密钥对,输出 PKCS#8/PKCS#1 PEM;加密/解密输入 PEM。
- 往返一致性是 golden 硬断言(加密→解密还原明文)。
- Web Crypto 均为 async,在 worker(password-generator 不走 worker)——无需处理。

### 5. 密码强度评分:纯前端多维度(不引 zxcvbn)
评分维度(各维度独立计分,综合归一 0-100):
- 长度(<8/8-12/>12)
- 字符集覆盖(小写/大写/数字/符号,4 种)
- 顺序字符(1234/abcd)、键盘序列(qwerty/asdf)
- 重复字符(aaa/aaaa)、常见密码表(~50 条内置)、年份/纯数字
- 分档:弱 <40(红)/中 40-70(黄)/强 >70(绿)(遵循 signal-color 规则)
- 建议:按缺失维度逐条给出中文建议。

### 6. JWT 容错
格式容错:允许首尾空白/换行,自动 trim(终端/日志复制常见)。非三段格式 → `invalid-input`「不是合法 JWT」。payload 为 JSON 字符串,base64url 解码失败 → `invalid-input`。

## 数据流与错误三态

| 工具 | Happy | Nil/Empty | Error |
|---|---|---|---|
| password-strength | 分析→评分报告 | 空→EMPTY | 无(纯输入) |
| jwt-tool | 解析/校验→结果 | 空→EMPTY | 非法格式/签名不匹配→invalid-input(带原因) |
| password-generator | 生成→可复制结果 | 空输入→invalid-input | 密钥/输错 PEMP→invalid-input |

## 边界与约束

- **离线优先**:v1 全本地,零网络。密码/密钥**不出本机**。
- **架构一致**:复用 ToolDescriptor + Worker 通道 + TriStateOutput/CopyButton。
- **中文 UI**,遵循 DESIGN.md 电路工作台风格。
- **CPU 密集**:BCrypt cost(默认 10)在 worker/promise 中执行,不阻塞 UI。

## 不做的事(NOT in scope)

- RSA 签名/验签(JWS)——本 change 只做加密;签名归 JWT(RS 已覆盖)但独立 RSA 签名暂不做
- 密码库/密钥管理(保存密钥对、浏览器记忆)——v2
- zxcvbn 集成(纯逻辑够用,模式检测做深;不够再升级)——v2
