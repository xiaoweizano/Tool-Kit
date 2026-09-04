# Proposal: password-crypto-tools

## Why

ToolKit 已覆盖 13 个本地优先工具,但缺少**密码与加密**整类高频场景。开发者在日常工作中反复遇到:生成强随机密码、给接口配置 AES/RSA 加解密、为 Spring 服务(nacos 账户、用户密码)生成 BCrypt 哈希、分析一个 JWT 里到底有什么、校验 JWT 签名是否有效。现状是散落在各网站(随机密码生成器、jwt.io、在线加密站)+ 手动拼命令(java 的 BCryptPasswordEncoder、openssl),既不方便也不可信(在线加密站可能记录输入,BCrypt 手写容易错)。

本 change 收拢三个工具,覆盖「生成 → 分析 → 加解密(RSA/AES)→ 单项哈希(BCrypt)→ JWT 全生命周期」,全部本地纯前端、粘贴即出,与 ToolKit 现有体验一致。

## What Changes

新增 3 个工具,完全遵循现有 ToolDescriptor + Worker/纯函数模式,无后端:

- **密码生成器**(tool 15):三面板。① 随机密码生成(长度/字符集自定义);② RSA/AES 双向加解密(原生 Web Crypto,安全);③ 单向哈希 BCrypt(默认,spring-security BCryptPasswordEncoder 等价 + 校验)。
- **密码强度分析**(tool 16):粘贴密码即时分析。长度/字符集/连续字符/键盘序列/重复/常见密码表多维度评分(0-100 分三档:弱<40/中40-70/强>70),给出中文改进建议,并支持按目标强度+自定义规则生成密码。
- **JWT 解析**(tool 18):粘贴 JWT 即时解析 header/payload;支持校验签名(HS256/384/512、RS256/384/512)、签名生成、续期(修改 exp)。JWT 格式容错(允许尾部空白/换行)。

不在本 change(后续 v2):密钥管理(保存/导入密钥对)、RSA 签名(JWS 而非加密)、密码库管理。

## Capabilities

### New Capabilities

- `password-generator-tool`: 密码生成工具——随机密码生成、AES/RSA 双向加解密(Web Crypto)、BCrypt 单向哈希与校验。
- `password-strength-tool`: 密码强度分析工具——多维度强度评分、中文改进建议、按目标强度+自定义规则生成密码。
- `jwt-tool`: JWT 解析工具——解析/校验/生成/续期,HS/RS 全算法。

### Modified Capabilities

(无——新增独立工具,不改动既有 13 工具行为)

## Impact

- **代码**:新增 `src/renderer/src/tools/password-generator/`、`src/renderer/src/tools/password-strength/`、`src/renderer/src/tools/jwt-tool/`(各 icon/index/transform/types + 组件);`register.ts` 与 `transform.worker.ts` 各加 3 行
- **依赖**:新增 `bcryptjs`(BCrypt)、`jose`(JWT)。AES/RSA 用浏览器原生 Web Crypto,不加 crypto-js/jsencrypt
- **系统/服务**:无后端;core 纯函数本地运算(BCrypt 哈希是 CPU 密集,走独立调用不阻塞 UI 主线程)
- **风险对齐**:加密正确性为硬门槛——golden 测试覆盖 AES/RSA/JWT/BCrypt **往返一致**(加密→解密还原);BCrypt 绝不用手写 salt;JWT 校验失败返回明确 kind 而非静默
