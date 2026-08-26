# batch-value-transform Spec

## ADDED Requirements

### Requirement: 批量输入混合解析
系统 SHALL 接受混合格式的值输入(每行一个、逗号分隔、或两者混合),自动切分为值数组。

#### Scenario: 每行一个值
- **WHEN** 用户粘贴多行文本(每行一个值)
- **THEN** 系统按换行切分为值数组,每值 trim

#### Scenario: 逗号分隔
- **WHEN** 用户粘贴 `a, b, c`(中英文逗号均可)
- **THEN** 系统按逗号切分为值数组,每值 trim

#### Scenario: 混合输入
- **WHEN** 用户粘贴既含换行又含逗号的文本
- **THEN** 系统先按行切再按逗号切,得到扁平值数组

### Requirement: 有序可组合处理管线
系统 SHALL 以有序操作列表处理值数组,按用户选择顺序逐个应用操作;每个操作可独立配置参数。

#### Scenario: 顺序即应用顺序
- **WHEN** 用户依次添加"去特殊字符"→"双引号包裹"两个操作
- **THEN** 系统先执行去特殊字符,再对结果执行双引号包裹

#### Scenario: 操作可增删重排
- **WHEN** 用户添加多个操作后,删除其中一个或调整顺序
- **THEN** 管线按调整后的顺序重新应用,输出实时更新

### Requirement: 操作集
系统 SHALL 提供以下操作(每项可参数化):包裹(单引号/双引号/反引号/圆括号/方括号)、前后缀、去特殊字符(自定义保留集)、截取长度(前/后 N 字符)、trim、去空行、去重、排序(字典序/数字序)、大小写转换(全大/全小)、全半角统一、加编号(1. / 1、)、URL 编码、Base64 编码/解码。

#### Scenario: 包裹单引号
- **WHEN** 值 `abc` 应用"单引号包裹"
- **THEN** 输出 `'abc'`

#### Scenario: 去特殊字符
- **WHEN** 值 `a!b@c` 应用"去特殊字符"(默认保留集)
- **THEN** 特殊字符被移除,输出仅保留默认字符集

#### Scenario: 截取长度
- **WHEN** 值 `abcdef` 应用"截取前 3 字符"
- **THEN** 输出 `abc`

#### Scenario: 去重
- **WHEN** 值数组含重复项
- **THEN** 仅保留首次出现,后续重复项移除

### Requirement: 输出格式预设
系统 SHALL 支持输出格式:逗号拼接、JSON 数组、SQL IN 括号(如 `('a','b')`)、换行拼接、自定义分隔符拼接。

#### Scenario: SQL IN 格式
- **WHEN** 值 `['a','b']` 选择"SQL IN"输出且已应用单引号包裹
- **THEN** 输出 `('a','b')`

#### Scenario: JSON 数组格式
- **WHEN** 值 `['a','b']` 选择"JSON 数组"输出
- **THEN** 输出合法 JSON 数组字符串

#### Scenario: 自定义分隔符
- **WHEN** 用户填写自定义分隔符(如 ` | `)
- **THEN** 值按该分隔符拼接输出

### Requirement: 处理核心为纯函数
系统 SHALL 将解析/操作/输出格式化实现为纯函数(无 DOM/网络),可直接单测。

#### Scenario: 纯函数可测
- **WHEN** 测试直接调用 transform 纯函数
- **THEN** 相同输入恒定输出,无副作用

### Requirement: 注册为本地工具
系统 SHALL 将本工具注册进 ToolDescriptor 注册表,id `batch-transform`,capability `{ offline: true }`,导航/路由自动生效。

#### Scenario: 注册后导航可见
- **WHEN** 工具注册
- **THEN** 左侧导航出现"批处理值转换"入口,路由 `/tools/batch-transform` 可达
