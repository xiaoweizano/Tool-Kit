# password-generator-tool Specification

## ADDED Requirements

### Requirement: 随机密码生成
用户 MUST 能生成强随机密码:可配置长度(8-128,默认16)、字符集(小写/大写/数字/符号/自定义字符),使用加密安全的随机源(`crypto.getRandomValues`)。结果 MUST 可一键复制。

#### Scenario: 生成指定长度与字符集的密码
- **WHEN** 用户设长度 20、勾选大小写+数字+符号并点击生成
- **THEN** 输出一个 20 位、仅含所选字符集的随机密码

#### Scenario: 默认输出 16 位高强度密码
- **WHEN** 用户未改选项直接生成
- **THEN** 输出 16 位、含全部四类字符的密码

### Requirement: AES 双向加解密
工具 MUST 支持 AES 加密与解密:明文/密文输入 + 用户 Passphrase;密钥经 PBKDF2(SHA-256)派生,算法 AES-256-GCM。加密输出 `iv.tag.ciphertext` 的 base64;解密还原原文。加密→解密往返 MUST 一致;错误 Passphrase 解密 MUST 返回 `invalid-input`。

#### Scenario: AES 加密后解密还原
- **WHEN** 明文 "hello world" + Passphrase "secret" 加密,再以同 Passphrase 解密
- **THEN** 解密输出与原文一致(往返 round-trip 由 golden test 锁定)

#### Scenario: 错误 Passphrase 解密失败
- **WHEN** 以不同 Passphrase 解密密文
- **THEN** 返回 `{status:'error', kind:'invalid-input', message:'解密失败:密钥不匹配或密文损坏'}`

### Requirement: RSA 双向加解密
工具 MUST 支持 RSA 加解密:可生成密钥对(输出 PKCS#8/PKCS#1 PEM),或输入已有 PEM;加密用公钥(RSA-OAEP/SHA-256)、解密用私钥。往返一致;密钥格式错误 MUST 返回 `invalid-input`。

#### Scenario: 生成密钥对并往返加解密
- **WHEN** 用户点「生成密钥对」,用公钥加密 "secret",再用私钥解密
- **THEN** 解密还原 "secret",且密钥对可复制

#### Scenario: 非法 PEM 报错
- **WHEN** 用户输入非 PEM 格式密钥
- **THEN** 返回 `{status:'error', kind:'invalid-input', message:'密钥格式无效'}`

### Requirement: BCrypt 单向哈希(默认)
工具 MUST 支持 BCrypt 单向哈希,默认对应 spring-security `BCryptPasswordEncoder`:输入明文生成 BCrypt hash(bcryptjs,自动 salt,cost 默认 10);支持输入明文+已有 hash 校验是否匹配。**绝不展示或允许手写 salt**。校验不匹配返回 false(非错误)。

#### Scenario: 生成 BCrypt hash
- **WHEN** 用户输入 "nacos-password" 并点哈希
- **THEN** 输出形如 `$2a$10$...` 的 BCrypt hash,可复制

#### Scenario: BCrypt 校验匹配
- **WHEN** 用户输入明文 + 已有合法 BCrypt hash
- **THEN** 匹配则显示「匹配✔」,不匹配显示「不匹配✘」(布尔结果,非错误)

### Requirement: 返回格式与 TriStateOutput 集成
三个面板的 transform MUST 返回 `ToolResult<string|结构>`;遵循错误三态(OK/ERROR/EMPTY);空输入返回 `invalid-input`;复用 TriStateOutput 与 CopyButton。

#### Scenario: 空输入返回 invalid-input
- **WHEN** 用户在加密/哈希面板未输入内容即触发
- **THEN** 返回 `{status:'error', kind:'invalid-input'}`,TriStateOutput 显示中文提示

#### Scenario: 通道异常不静默
- **WHEN** worker/通道崩溃
- **THEN** 映射为 `{status:'error', kind:'unsupported', structure:'transform-channel'}`,UI 显示「转换通道异常,请重试」
