# Tasks: password-crypto-tools

## 1. 依赖与类型层

- [x] 1.1 安装 `bcryptjs` + `jose`(pnpm)
- [x] 1.2 `password-generator/types.ts`:`RandomGenOpts`、`AesResult`、`RsaResult`、`BcryptResult` 类型
- [x] 1.3 `password-strength/types.ts`:`StrengthReport`(score/level/labels/suggestions/checks)、`GenerateOpts`(targetLevel/minLength/requireCharsets/excludeChars)
- [x] 1.4 `jwt-tool/types.ts`:`JwtResult`(header/payload/isValid/verifyError/token/expiresAt)

## 2. password-strength 纯函数层

- [x] 2.1 `analyzeStrength(password): ToolResult<StrengthReport>`:多维度评分(长度/字符集/顺序/键盘序列/重复/常见密码表/年份纯数字),归一 0-100,三档+信号色
- [x] 2.2 中文改进建议:按缺失维度逐条生成
- [x] 2.3 `generateByRules(opts): ToolResult<string>`:按目标强度+自定义规则生成(循环生成直到达标)

## 3. jwt-tool 纯函数层

- [x] 3.1 `parseJwt(token): ToolResult<JwtResult>`:base64url 解码 header/payload,trim 容错,关键字段高亮,剩余有效期;非三段/invalid-input
- [x] 3.2 `verifyJwt(token, secret, alg): ToolResult<JwtResult>`:jose jwtVerify,HS/RS 全算法,失败带原因
- [x] 3.3 `signJwt(payload, secret, alg, expiry): ToolResult<JwtResult>`:jose SignJWT
- [x] 3.4 `renewJwt(token, secret, newExpiry): ToolResult<JwtResult>`:读 payload/header 更新 exp

## 4. password-generator 纯函数层

- [x] 4.1 `generatePassword(opts): string`:`crypto.getRandomValues` 加密安全随机,长度/字符集
- [x] 4.2 `encryptAes(passphrase, plaintext)` / `decryptAes(passphrase, ciphertext)`:Web Crypto AES-256-GCM + PBKDF2(每加密随机 16 字节 salt),输出 base64(salt.iv.tag.ciphertext)
- [x] 4.3 `generateRsaKeyPair()` / `encryptRsa(publicPem, plaintext)` / `decryptRsa(privatePem, ciphertext)`:Web Crypto RSA-OAEP/SHA-256,PKCS#8/PKCS#1 PEM
- [x] 4.4 `hashBcrypt(plaintext)` / `verifyBcrypt(plaintext, hash)`:bcryptjs hashSync/compareSync(cost 默认 10)

## 5. Worker 注册与工具注册

- [x] 5.1 `transform.worker.ts`:注册 `password-strength`(opts.action 区分 analyze/generate)与 `jwt-tool`(actions 区分 parse/verify/sign/renew)
- [x] 5.2 `register.ts`:新增三行 ToolDescriptor(password-generator/password-strength/jwt-tool)+ lazy import

## 6. 页面组件

- [x] 6.1 `password-strength/index.tsx`:useLiveTransform,评分报告 + 建议列表 + 生成面板 + TriStateOutput
- [x] 6.2 `jwt-tool/index.tsx`:useLiveTransform 解析 + 校验/生成/续期触发(opts.action)+ 关键字段展示
- [x] 6.3 `password-generator/index.tsx`:三面板(RandomPanel/CryptoPanel/BcryptPanel),local 按钮触发,复制按钮
- [x] 6.4 图标 + 中文文案遵循 DESIGN.md 电路工作台

## 7. 测试(golden)

- [x] 7.1 `test/password-strength.test.ts`:弱/中/强评分、模式检测、建议、generateByRules 达标
- [x] 7.2 `test/jwt-tool.test.ts`:parse/verify(通过+失败+过期)/sign/renew/unsupported alg
- [x] 7.3 `test/password-generator.test.ts`:**AES/RSA 往返一致**、错误密钥、BCrypt 生成/校验(-invalid-input)
- [x] 7.4 边界:空输入、非法格式、超大数
- [x] 7.5 `pnpm test` 全量回归保持绿

## 8. 收尾验证

- [x] 8.1 `pnpm typecheck` 通过
- [x] 8.2 `pnpm lint` 通过(本项目文件全量 lint 通过;`es-query-builder/components/ConditionNode.tsx` 既有的 `isRange` unused 错误已在 commit 2cf6a76 修复,`eslint .` 全清)
- [x] 8.3 `pnpm test` 全绿
- [x] 8.4 spec-checklist(password-crypto-tools)逐条核对 Scenario 通过
- [x] 8.5 `openspec validate password-crypto-tools` 通过
