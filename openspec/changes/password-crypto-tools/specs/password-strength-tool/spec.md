# password-strength-tool Specification

## ADDED Requirements

### Requirement: 多维度强度评分
`analyzeStrength(password)` MUST 对密码做多维度评分并归一为 0-100 分:长度(<8/8-12/>12)、字符集覆盖(小写/大写/数字/符号)、顺序字符(1234/abcd)、键盘序列(qwerty/asdf)、重复字符(aaa/aaaa)、常见密码表、年份/纯数字。返回 `ToolResult<StrengthReport>`。

#### Scenario: 弱密码评分低于 40
- **WHEN** 用户粘贴 "123456"
- **THEN** 评分 <40,命中「纯数字/顺序/常见密码表」,分值归入弱档

#### Scenario: 强密码评分高于 70
- **WHEN** 用户粘贴 "Xk9#mQ@zV2$pL5nW"
- **THEN** 评分 >70,命中「全字符集/长度>12」,分值归入强档

### Requirement: 评分分档与色彩
评分 MUST 分三档:弱(<40)/中(40-70)/强(>70),并映射信号色(红/黄/绿)。结果 MUST 以中文文字标签 + 色彩呈现。

#### Scenario: 三档色彩标签
- **WHEN** 一个密码评分为 82
- **THEN** 显示「强」+ 绿色;评分 55 显示「中」+ 黄色;评分 20 显示「弱」+ 红色

### Requirement: 中文改进建议
MUST 按缺失维度逐条给出中文改进建议(如「长度不足,建议 ≥12」「缺少符号」「含键盘序列 qwerty,易被猜到」)。无缺失时提示「密码强度良好」。

#### Scenario: 弱密码给出多条建议
- **WHEN** 密码 "abc12345" 分析
- **THEN** 给出「含顺序字符 123」「纯小写+数字,缺少符号/大写」「长度建议 ≥12」等建议列表

#### Scenario: 强密码建议为空提示良好
- **WHEN** 强密码分析
- **THEN** 建议区显示「密码强度良好」

### Requirement: 改造当前输入密码到目标强度
`improvePassword(password, opts)` MUST 基于当前输入密码(保留其字符),补足目标强度所需字符集/长度 生成改造结果:opts 含 targetLevel(weak/medium/strong)+ 自定义规则(minLength/requireCharsets/excludeChars)。空输入返回 `invalid-input`;excludeChars 排除字符不出现在结果。返回 `ToolResult<string>`。

#### Scenario: 改造强档密码
- **WHEN** 用户输入 "mypassword2024" 并选「强」求改造
- **THEN** 输出长度 ≥12 且满足强档评分(>70),含四类字符集,保留输入字符(非随机)

#### Scenario: excludeChars 排除字符不出现在结果
- **WHEN** 用户自定义 excludeChars 不含 0/O/1/l
- **THEN** 输出不含这些排除字符,且评分达标

### Requirement: 实时分析
密码强度分析 MUST 走 `useLiveTransform`,输入变化防抖(150ms)即时刷新;空输入 MUST 返回 EMPTY;复用 TriStateOutput 展示报告。

#### Scenario: 粘贴即实时分析
- **WHEN** 用户在输入框粘贴/输入密码
- **THEN** 评分报告随输入防抖刷新,无需点击

#### Scenario: 空输入回到 EMPTY
- **WHEN** 用户清空输入
- **THEN** 回到 EMPTY 引导态(非错误)

### Requirement: 免费离线无网络
强度分析与生成 MUST 全本地纯前端计算,零网络请求;核心为纯函数,可脱离 UI 直接 golden 测试。

#### Scenario: 纯函数可测
- **WHEN** 直接调用 analyzeStrength / improvePassword
- **THEN** 返回确定的 `ToolResult`,由 golden test 断言精确输出
