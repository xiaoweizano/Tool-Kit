# translation Spec

## ADDED Requirements

### Requirement: 多语言互译
系统 SHALL 支持中/英/日/韩/俄(UI 突出)及法/德/西等更多语言(下拉)的互译;源语言默认自动检测,可手动覆盖。

#### Scenario: 中译英
- **WHEN** 用户输入中文文本,目标语言为英语(默认)
- **THEN** 系统输出英文译文

#### Scenario: 手动覆盖源语言
- **WHEN** 自动检测结果有误,用户手动选择源语言
- **THEN** 系统按手动选择的源语言翻译

### Requirement: 多行逐行翻译
系统 SHALL 对多行输入逐行翻译,结果逐行对应显示。

#### Scenario: 多行输入
- **WHEN** 用户粘贴多行文本(每行一个短句)
- **THEN** 每行独立翻译,输出按行对应

### Requirement: 多引擎适配
系统 SHALL 提供翻译引擎适配器:MyMemory(免费默认)、百度、DeepL、有道、谷歌;除 MyMemory 外需在设置页配置对应 API key 方可启用;当前引擎可切换。

#### Scenario: 默认 MyMemory 免配置可用
- **WHEN** 用户未配置任何 key,直接输入文本翻译
- **THEN** 系统经 MyMemory 完成翻译,无需任何配置

#### Scenario: 切换到自配 key 引擎
- **WHEN** 用户在设置页填入百度 appid/secret 并在工具中切换引擎为百度
- **THEN** 系统经百度 API 翻译,请求含正确签名

### Requirement: 联网增强与离线降级
系统 SHALL 将本工具定位为联网增强:断网/超时/限流/鉴权失败时返回明确的错误 ToolResult(三态无静默),提示网络不可用或建议配置自有 key;不影响其他本地工具。

#### Scenario: 断网提示
- **WHEN** 网络不可用时发起翻译
- **THEN** 显示明确错误"网络不可用,翻译需要联网",不静默

#### Scenario: 免费限流提示
- **WHEN** MyMemory 返回限流错误
- **THEN** 显示"免费额度受限,可在设置页配置自有 key"

### Requirement: API key 设置
系统 SHALL 在设置页提供翻译引擎 key 配置区(按引擎分字段),持久化存储;key 仅存本地。

#### Scenario: key 持久化
- **WHEN** 用户填入并保存百度 appid/secret
- **THEN** 刷新后配置仍在,翻译工具可选用百度引擎

### Requirement: NET 徽标与联网能力标识
系统 SHALL 为本工具标注联网能力(capability.network),导航与首页显示 NET 徽标,与本地工具区分。

#### Scenario: 导航显示 NET 徽标
- **WHEN** 工具注册且标注联网
- **THEN** 左侧导航该工具项带 NET 徽标,首页工具卡片同样显示

### Requirement: 纯函数层与网络层分离
系统 SHALL 将语言映射/URL 与签名构造/响应解析/错误映射实现为纯函数(可单测);网络请求经共享 hook 发起。

#### Scenario: 适配器纯函数可测
- **WHEN** 测试直接调用某引擎适配器的响应解析纯函数
- **THEN** 对固定响应样例恒定输出正确 ToolResult

### Requirement: 注册为联网工具
系统 SHALL 将本工具注册进 ToolDescriptor 注册表,id `translate`,capability `{ offline: false, network: 'translate' }`。

#### Scenario: 注册后可达
- **WHEN** 工具注册
- **THEN** 路由 `/tools/translate` 可达,导航出现"翻译"入口
