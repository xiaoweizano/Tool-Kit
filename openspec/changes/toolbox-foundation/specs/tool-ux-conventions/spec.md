# tool-ux-conventions Specification

## ADDED Requirements

### Requirement: 粘贴即出结果
转换类工具 MUST 在输入变化后自动执行转换(防抖 ≤200ms),MUST NOT 要求用户点击「转换」按钮才能看到结果;结果区 SHALL 提供一键复制按钮。

#### Scenario: 粘贴 JSON 立即得到格式化结果
- **WHEN** 用户向 JSON 工具输入区粘贴合法 JSON 字符串
- **THEN** 200ms 内输出区自动展示格式化结果,无需点击任何按钮

#### Scenario: 一键复制输出
- **WHEN** 用户点击结果区的复制按钮
- **THEN** 输出内容进入系统剪贴板,按钮给出复制成功反馈

### Requirement: 错误三态,无静默失败
每个转换类工具 MUST 实现 OK/ERROR/EMPTY 三态渲染:EMPTY(空输入)显示占位引导;ERROR 按 ToolResult 的 kind(invalid-input/partial/unsupported/engine)分别呈现——invalid-input MUST 展示错误信息并尽可能定位到输入位置;partial MUST 标注失败项;unsupported MUST 明确指出不支持的结构;engine(联网增强失败:HTTP 错误/超时/key 缺失等,输入本身有效)MUST 明确给出失败原因与可行动提示。任何失败 MUST NOT 静默(界面无变化且无提示)。

#### Scenario: 粘贴非法 JSON 显示定位错误
- **WHEN** 用户向 JSON 工具粘贴含非法字符的字符串
- **THEN** 输出区展示 ERROR 态,错误信息包含非法字符的行/列位置提示

#### Scenario: 空输入显示占位引导
- **WHEN** 工具输入区为空
- **THEN** 输出区展示 EMPTY 占位引导文案,不显示错误

### Requirement: 工具核心为纯函数 transform
每个转换类工具 MUST 将转换逻辑实现为纯函数 `transform(input) => ToolResult<T>`,不包含 DOM 访问、网络请求或全局状态读写;UI 组件只负责输入采集、调用 transform 与结果渲染。

#### Scenario: transform 可脱离 UI 直接测试
- **WHEN** 测试直接调用工具的 transform 函数并传入样例输入
- **THEN** 返回 ToolResult 对象,行为与 UI 中呈现一致
