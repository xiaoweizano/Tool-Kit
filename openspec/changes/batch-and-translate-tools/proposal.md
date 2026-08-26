# Proposal: batch-and-translate-tools

## Why

ToolKit 已落地 10 个高频开发工具,全部纯本地离线。本次补上两个开发高频场景:批量加工一批值(id 列表加引号/逗号/去特殊字符等)、以及跨语言翻译。两者共同补全"从一堆原始数据到可用形态"的开发生涯缺口。

翻译工具是首个需要联网的增强工具——PRODUCT.md 明确允许"无网络时除联网增强外全部可用",它作为**联网增强**定位(离线优雅降级)首次引入 NET/联网能力,同时解决 spec-checklist 遗留的"联网标识首个工具待人工"项。

## What Changes

- 新增工具 **批处理值转换**(`/tools/batch-transform`):给定一批值(混合解析:每行/逗号/混合),按**用户选择顺序**叠加处理管线(包裹引号/括号、前后缀、去特殊字符、截取长度、trim/去空行、去重/排序、大小写、全半角、编号、URL 编码、Base64 编解码等,操作集可扩展),输出支持逗号拼接 / JSON 数组 / SQL IN 括号 / 换行 / 自定义分隔符。
- 新增工具 **翻译**(`/tools/translate`):多语言互译。源语言自动检测 + 可手动覆盖;语言集中/英/日/韩/俄 UI 突出 + 法/德/西等更多下拉;多行逐行翻;多引擎适配(MyMemory 免费默认 / 百度 / DeepL / 有道 / 谷歌,设置页可选配 key);离线/失败明确错误提示(三态无静默)。
- **首个联网工具**:capability.network 引入 NET 徽标;renderer CSP `connect-src` 放宽翻译 API 域名。
- 新增共享联网 hook(`useNetworkFetch`/`useTranslate`)供工具 12 复用,为后续联网工具铺路。

## Capabilities

### New Capabilities

- `batch-value-transform`: 批量值处理工具——一批输入值经可排序、可组合的字符串处理管线,输出多种预设格式(逗号/JSON 数组/SQL IN/换行/自定义分隔符)。
- `translation`: 多语言翻译工具——自动/手动源语言、多目标语言、多引擎适配、多行逐行翻、联网增强离线降级。

### Modified Capabilities

- (无既有 spec 行为变更)

## Impact

- **代码**:`src/renderer/src/tools/batch-transform/`、`src/renderer/src/tools/translate/` 新增;`src/renderer/src/utils/`(纯函数操作管线)、`src/renderer/src/core/`(共享联网 hook、API key 存储);`core/types.ts` 扩展 `capability.network`;注册表 register.ts 各 +1。
- **依赖**:无新增 runtime 库(翻译用原生 fetch;批量处理纯字符串)。
- **电子安全**:renderer 仍禁 electron;联网经 XMLHttpRequest/fetch 直连(桌面端 v0.1 也走同源,不上 preload)。
- **布局**:设置页新增"翻译引擎 API key"配置区。
- **配置**:`.impeccable/design.json` 与 `docs/spec-checklist.md` 追加两条目。
