# text-diff-tool Specification

## ADDED Requirements

本文档描述「文本处理」工具(text-diff-tool):一个 4-tab 多能力文本工具,含 对比 / 统计 / 大小写 / 分词 四个能力。各能力均为纯函数实现、全本地前端计算(无网络请求),可脱离 UI 直接 golden 测试。

### Requirement: 两段文本差异高亮
「对比」tab 提供 左右分栏(diffSideBySide)与 合并(diffText) 两种视图,经 左右对比/合并 切换。`diffText(textA, textB, mode)` MUST 计算两段文本差异并以 HTML 字符串返回高亮结果(新增绿底、删除红底、未变默认);`diffSideBySide(textA, textB, mode)` MUST 返回 `DiffRow[]` 左右成对行(每行 `{left: DiffCell, right: DiffCell}`,cell kind 为 same/removed/added/blank),差异在对应侧高亮——左列红底删除、右列绿底新增,空位为 blank 透明以对齐。mode 均支持 line/word/char,返回 `ToolResult`。渲染 MUST 经 HTML 转义(无 XSS)。本能力对应「文本处理」工具的「对比」tab。

#### Scenario: 逐行差异高亮
- **WHEN** textA="a\nb\nc"、textB="a\nb\nX",mode 为 line
- **THEN** 输出 c 行被标记为删除、X 行为新增的高亮 HTML

#### Scenario: 左右分栏差异成对行
- **WHEN** diffSideBySide("a\nb\nc", "a\nX\nc", "line")
- **THEN** 输出 `DiffRow[]` 且 b→X 为同一行:left.kind=removed/left.text=b、right.kind=added/right.text=X;same 行左右均为 same,空位 blank 透明对齐

#### Scenario: 逐词差异高亮
- **WHEN** mode 为 word,两段单个长句差异
- **THEN** 差异词高亮,其余词不变

#### Scenario: 空输入返回 invalid-input
- **WHEN** textA 或 textB 之一为空
- **THEN** 返回 `{status:'error', kind:'invalid-input', message:'请粘贴两段文本'}`

### Requirement: 三模式切换
`mode`(line/word/char)MUST 可切换,切换后结果立即刷新(useMultiFieldTransform 防抖)。

#### Scenario: 切换模式刷新结果
- **WHEN** 用户从 line 切到 char
- **THEN** 高亮结果按字符粒度重新计算并展示

### Requirement: 实时对比
两段文本输入 MUST 走 useMultiFieldTransform,输入防抖(150ms)即时刷新;textA/textB 都空 MUST 返回 EMPTY;复用 TriStateOutput 展示错误。

#### Scenario: 粘贴即对比
- **WHEN** 用户粘贴两段文本
- **THEN** 差异即时刷新,无需点击

#### Scenario: 两侧都空回 EMPTY
- **WHEN** textA 与 textB 均为空
- **THEN** 回到 EMPTY 引导态

### Requirement: 文本统计
`textStats(text)` MUST 返回字符/字母/数字/符号/空白/单词/行数/去重字符数与高频字符 Top5。返回 `ToolResult<TextStats>`。

#### Scenario: 统计一段混合文本
- **WHEN** 输入 "Hello World 123!"
- **THEN** 返回 chars=16, letters=10, digits=3, symbols=1, whitespace=2, words=3, lines=1, uniqueChars=12,topChars 含频率最高的字符

### Requirement: 多模式大小写转换
`applyCase(text, mode)` MUST 支持 upper/lower/title/sentence/camel/pascal/snake/kebab/constant/alternating 十种模式。返回 `ToolResult<string>`。

#### Scenario: camelCase 与 snake_case 转换
- **WHEN** applyCase("foo bar","camel")
- **THEN** 返回 "fooBar";applyCase("foo bar","snake") 返回 "foo_bar"

#### Scenario: 交替大小写
- **WHEN** applyCase("ab","alternating")
- **THEN** 返回 "Ab"

### Requirement: 差异化分词分割
`segmentText(text, opts)` MUST 按字符类别(字母/数字/符号/空白)将连续同类字符归为一段;`opts.customDelims` 中字符作为硬切分点,各自成为独立符号段。返回 `ToolResult<Segment[]>`。

#### Scenario: 按类别分组
- **WHEN** segmentText("abc123!@def 456")
- **THEN** 分为 [letters abc][digits 123][symbols !@][letters def][whitespace " "][digits 456]

#### Scenario: 自定义分隔符硬切分
- **WHEN** segmentText("!@",{customDelims:"@"})
- **THEN** 符号段被拆为 [symbols !][symbols @] 两个独立 token

### Requirement: 免费离线无网络
对比 MUST 全本地纯前端计算(jsdiff),零网络请求;核心为纯函数,可脱离 UI 直接 golden 测试。

#### Scenario: 纯函数可测
- **WHEN** 直接调用 diffText / diffSideBySide
- **THEN** 返回确定的 `ToolResult`,由 golden test 断言精确输出(HTML 或 DiffRow[])
