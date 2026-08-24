# json-parser-tool Specification

## ADDED Requirements

### Requirement: JSON 解析与校验
JSON 工具 MUST 对粘贴的输入自动解析:合法输入进入格式化输出;非法输入返回 invalid-input 错误,错误信息 MUST 包含出错位置(行/列或字符偏移)。工具 MUST 100% 在本地运算,无网络请求。

#### Scenario: 粘贴合法 JSON
- **WHEN** 用户粘贴 `{"a":1,"b":[1,2]}`
- **THEN** 输出区展示格式化(缩进)后的 JSON

#### Scenario: 粘贴非法 JSON 定位错误
- **WHEN** 用户粘贴 `{"a": 1,,}` 
- **THEN** ERROR 态展示错误信息,并定位到第二个逗号附近的行/列

### Requirement: 格式化输出控制
工具 SHALL 支持缩进宽度选择(2/4 空格、Tab)与压缩(单行)输出切换;切换 MUST 即时反映到输出。

#### Scenario: 切换缩进宽度
- **WHEN** 用户将缩进从 2 空格切换为 4 空格
- **THEN** 输出即时以 4 空格缩进重新格式化

#### Scenario: 压缩输出
- **WHEN** 用户选择压缩模式
- **THEN** 输出为去除多余空白的单行 JSON

### Requirement: 转换逻辑纯函数化与 golden 测试
JSON 工具的解析/格式化逻辑 MUST 实现为纯函数并配套 golden-file 测试,覆盖:嵌套对象/数组、中英文与 emoji 字符串、数字边界(大数、精度)、null/true/false、空对象/空数组、截断输入、非法字符(带位置断言)、1MB 级大输入(不抛异常)。

#### Scenario: golden 样例回归
- **WHEN** 测试运行并逐条执行 fixtures 中的输入/期望输出对
- **THEN** 全部断言通过,任何 transform 行为变更都会使测试失败

#### Scenario: 大输入不冻结
- **WHEN** transform 接收 1MB 合法 JSON 字符串
- **THEN** 在可接受时间内返回结果,不抛异常
