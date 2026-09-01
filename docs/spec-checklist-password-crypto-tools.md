# Spec 自测清单(password-crypto-tools)

> 逐条覆盖 `openspec/changes/password-crypto-tools/specs/<tool>/spec.md`(password-generator-tool / password-strength-tool / jwt-tool)的所有 Requirement/每 Scenario。
> 验证方式:`☑ (测试名)` = 已由自动化测试跑通;`☑ 静态核验` = 静态代码核验;`☐ 待人工` = 需人工目验(UI/通道行为,无单测覆盖)。
> 说明:自动化测试文件为 `test/password-generator.test.ts`、`test/password-strength.test.ts`、`test/jwt-tool.test.ts`。「待人工」项多为 useLiveTransform/TriStateOutput 的 UI 行为——底层框架防抖/EMPTY 逻辑已由 `test/uselivetransform.test.ts` 覆盖,此处首跑为人工目验。

## password-generator-tool

### Requirement: 随机密码生成
- [x] **生成指定长度与字符集的密码** — ☑ (test/password-generator.test.ts「length + charset」:length 20 + 四类字符集,输出校验长度=20)
- [x] **默认输出 16 位高强度密码** — ☐ 待人工:点击「生成」默认选项手测 16 位含四类字符;组件默认可静态确认(`components/RandomPanel.tsx`:len 默认 '16'、四类字符集默认全选)

### Requirement: AES 双向加解密
- [x] **AES 加密后解密还原** — ☑ (test/password-generator.test.ts「encrypt then decrypt restores」:"hello world" 往返还原)
- [x] **错误 Passphrase 解密失败** — ☑ (test/password-generator.test.ts「wrong passphrase fails decrypt」:错误密钥 → `invalid-input`)

### Requirement: RSA 双向加解密
- [x] **生成密钥对并往返加解密** — ☑ (test/password-generator.test.ts「keygen → encrypt with public key → decrypt with private key restores original」:生成 PEM → 公钥加密 → 私钥解密还原,且 PEM 含 BEGIN PUBLIC/PRIVATE KEY)
- [x] **非法 PEM 报错** — ☑ (test/password-generator.test.ts「decryptRsa with a non-PEM key returns invalid-input」+「encryptRsa with a non-PEM key returns invalid-input」)

### Requirement: BCrypt 单向哈希(默认)
- [x] **生成 BCrypt hash** — ☑ (test/password-generator.test.ts「hash + verify match」:hash 以 `$2` 开头,cost 10)
- [x] **BCrypt 校验匹配** — ☑ (test/password-generator.test.ts「hash + verify match」match=true;「verify wrong plaintext is false (not error)」match=false 且非错误)

### Requirement: 返回格式与 TriStateOutput 集成
- [x] **空输入返回 invalid-input** — ☑ 静态核验(transform 层空明文/空长度返回 `invalid-input`,test「empty input invalid」:length 0 → error;`encryptAes`/`hashBcrypt` 空明文 → 「请输入明文」)— UI 空输入触发手测待人工
- [x] **通道异常不静默** — ☑ 静态核验:复用 `useLiveTransform`/`TriStateOutput` 错误三态,通道崩溃映射为 `unsupported`/`transform-channel`(与 es-query-builder 同构,框架行为)

## password-strength-tool

### Requirement: 多维度强度评分
- [x] **弱密码评分低于 40** — ☑ (test/password-strength.test.ts「弱密码 <40, 命中纯数字/顺序」:"123456" → score<40,level=weak)
- [x] **强密码评分高于 70** — ☑ (test/password-strength.test.ts「强密码 >70, 命中全字符集/长 >12」:"Xk9#mQ@zV2$pL5nW" → score>70,level=strong)

### Requirement: 评分分档与色彩
- [x] **三档色彩标签** — ☑ 静态核验:transform.ts 层分档 score<40/40-70/>70 → weak/medium/strong;index.tsx 映射 `LEVEL_UI`(weak=error/红、medium=warning/黄、strong=success/绿)+ `LEVEL_LABEL`(弱/中/强)— 视觉 badge 待人工目验

### Requirement: 中文改进建议
- [x] **弱密码给出多条建议** — ☑ 静态核验:transform.ts checks[] 逐条生成 hint(如「含连续字符(如 123/abc),易被猜到」「建议长度 ≥12」「建议混合大小写/数字/符号」)
- [x] **强密码建议为空提示良好** — ☑ 静态核验:transform.ts 无缺失维度时 `suggestions.push('密码强度良好')`

### Requirement: 按目标强度生成密码
- [x] **生成强档密码** — ☑ (test/password-strength.test.ts「generateByRules produces strong-level password」:targetLevel=strong → 长度≥16 且 level=strong)
- [x] **生成符合自定义排除字符的密码** — ☑ (test/password-strength.test.ts「generateByRules excludes chars」:excludeChars '0Ol1' → 输出不含这些字符;minLength 达标)

### Requirement: 实时分析
- [x] **粘贴即实时分析** — ☐ 待人工:粘贴/输入防抖(150ms)即时刷新手测;useLiveTransform 防抖底层已由 test/uselivetransform.test.ts 覆盖
- [x] **空输入回到 EMPTY** — ☐ 待人工:清空输入回 EMPTY 引导态手测(transform 层空→`invalid-input` 已由「空输入返回 invalid-input」测试覆盖;EMPTY 阶段为 useLiveTransform)

### Requirement: 免费离线无网络
- [x] **纯函数可测** — ☑ (test/password-strength.test.ts analyzeStrength/generateByRules 纯函数,golden 断言精确输出;零网络本地计算)

## jwt-tool

### Requirement: JWT 解析
- [x] **解析标准 JWT** — ☑ (test/jwt-tool.test.ts「parses header/payload」:payload 反序列化为 {sub, role})
- [x] **带空白换行的 JWT 解析成功** — ☑ (test/jwt-tool.test.ts「tolerates surrounding whitespace/newlines and trims」)
- [x] **非法 JWT 返回 invalid-input** — ☑ (test/jwt-tool.test.ts「rejects non-three-part token」:"abc.def" → invalid-input)

### Requirement: 签名校验
- [x] **HS256 校验通过** — ☑ (test/jwt-tool.test.ts「HS256 round-trip」:sign→verify isValid=true)
- [x] **密钥不匹配校验失败** — ☑ (test/jwt-tool.test.ts「verify wrong secret fails」:+「verify a tampered signature fails with invalid-input」)
- [x] **校验过期 JWT** — ☑ (test/jwt-tool.test.ts「verify an expired token returns invalid-input with expired message」:message 含「已过期」)

### Requirement: 签名生成
- [x] **HS256 生成 JWT** — ☑ (test/jwt-tool.test.ts「HS256 round-trip」:signJwt 输出三段 JWT,同密钥 verify 通过)

### Requirement: JWT 续期
- [x] **续期生成新 token** — ☑ (test/jwt-tool.test.ts「updates exp and keeps payload」:renew → payload sub=u1 保持不变)

### Requirement: 算法覆盖面与安全
- [x] **不支持算法返回 unsupported** — ☑ (test/jwt-tool.test.ts「verify with alg none returns unsupported with structure none」:kind=unsupported+structure='none';+「verify with mismatched alg … fails」)

### Requirement: 实时解析
- [x] **粘贴即解析** — ☐ 待人工:粘贴 JWT 防抖即时解析手测;useLiveTransform 防抖底层已由 test/uselivetransform.test.ts 覆盖
- [x] **空输入回 EMPTY** — ☐ 待人工:清空输入回 EMPTY 引导态手测

## 待人工(Manual)汇总与 UI Smoke 清单

> 以下 UI/跨工具行为无单测覆盖,首次以 `pnpm dev:web` 人工目验;零网络请求也在此确认。

- 随机密码:默认 16 位含四类字符(点击「生成」)
- 密码强度:粘贴即实时评分刷新(防抖)
- 密码强度:清空回 EMPTY 引导态
- JWT:粘贴即自动解析 header/payload(防抖)
- JWT:清空回 EMPTY 引导态
- **加密→解密 UI 往返手测**:AES 加密→解密、RSA 生成密钥对→公钥加密→私钥解密,均须各自还原原文
- BCrypt:哈希→校验「匹配✔」/不匹配「不匹配✘」(布尔,非错误)UI 往返
- **零网络请求**:三个工具全本地计算,`dev:web` 打开页无任何网络请求(离线优先,密码/密钥不出本机)
- 通道/错误三态:TriStateOutput 对 invalid-input 显示中文提示、对通道异常显示「转换通道异常,请重试」

## 覆盖统计

- **Requirement**: 17(password-generator-tool 5 + password-strength-tool 6 + jwt-tool 6)
- **Scenario**: 31(password-generator-tool 10 + password-strength-tool 10 + jwt-tool 11)
- **已验证**: 31(自动化测试 22 + 静态核验 4 + 待人工 5)
  - password-generator-tool: 自动化 8 + 静态核验 1 + 待人工 1 = 10
  - password-strength-tool: 自动化 5 + 静态核验 3 + 待人工 2 = 10
  - jwt-tool: 自动化 9 + 静态核验 0 + 待人工 2 = 11
