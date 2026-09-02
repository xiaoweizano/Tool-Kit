# base-converter-tool Specification

## ADDED Requirements

### Requirement: 任意进制互转
`convertBase(str, {source})` MUST 将任意进制整数字符串转换为 2/8/10/16 四种输出,返回 `ToolResult<{bin,oct,dec,hex}>`。输出 bin 带 `0b` 前缀、oct 带 `0o`、hex 带 `0x` 大写、dec 不带前缀。

#### Scenario: 十进制转全部进制
- **WHEN** 输入 "255",source 为 10
- **THEN** 输出 bin=0b11111111、oct=0o377、dec=255、hex=0xFF

#### Scenario: 十六进制转十进制
- **WHEN** 输入 "0xFF",无 source(前缀自动识别)
- **THEN** 输出 dec=255

### Requirement: 前缀自动识别
输入含 `0x`/`0b`/`0o` 前缀时,MUST 自动识别源进制并剥离,忽略 opts.source。无前缀时用 opts.source(默认 10)。

#### Scenario: 二进制前缀识别
- **WHEN** 输入 "0b101010"
- **THEN** 输出 dec=42

### Requirement: BigInt 支持大数
转换 MUST 用 BigInt 承载任意长度整数(超出 Number 安全范围仍正确)。

#### Scenario: 超大数转换
- **WHEN** 输入 20 位以上十进制数
- **THEN** 各进制输出精确不丢失精度

### Requirement: 非法字符定位
输入含当前进制非法字符(如二进制含 "2")MUST 返回 `invalid-input` 并定位非法字符位置。

#### Scenario: 二进制含非法字符
- **WHEN** 输入 "10201"(二进制)
- **THEN** 返回 `{status:'error', kind:'invalid-input', position:2, message:'非法的二进制字符 "2"'}`

### Requirement: 实时转换
转换 MUST 走 useLiveTransform,粘贴输入即输出全部进制,防抖刷新;空输入 MUST 返回 EMPTY;复用 TriStateOutput。

#### Scenario: 粘贴即转换
- **WHEN** 用户粘贴数字串
- **THEN** 四种进制即时展示

#### Scenario: 空输入回 EMPTY
- **WHEN** 用户清空输入
- **THEN** 回到 EMPTY 引导态
