# Tasks: batch-and-translate-tools

## 1. 批处理值转换(纯本地)

- [ ] 1.1 实现纯函数操作管线:`src/renderer/src/tools/batch-transform/transform.ts`——`parseInput`(混合解析)、14 类操作 `applyOperation`、`formatOutput`(逗号/JSON 数组/SQL IN/换行/自定义分隔符);TDD 全覆盖
- [ ] 1.2 工具页 `index.tsx` + `icon.tsx`:输入区(混合解析)、有序操作列表(增删/上下移/参数配置)、输出格式选择 + TriStateOutput 输出;注册 register.ts(id `batch-transform`,offline)
- [ ] 1.3 worker 通道接线(transform.worker.ts 注册)与全量回归

## 2. 翻译(联网增强)

- [ ] 2.1 `core/types.ts` 扩展 `capability.network` 类型支持 `'translate'`
- [ ] 2.2 纯函数层 `src/renderer/src/tools/translate/transform.ts`:语言映射表、MyMemory/百度/DeepL/有道/谷歌 五个适配器的 URL/Header/签名构造(含纯 JS MD5)与响应解析、错误 ToolResult 映射;TDD 用各引擎响应样例做 golden
- [ ] 2.3 共享联网 hook `src/renderer/src/core/useTranslate.ts`(防抖→fetch→纯函数解析→结果/错误映射,无静默)
- [ ] 2.4 API key 存储 `core/translate-keys.ts`(localStorage `toolkit.translate-keys`,按引擎分字段)+ 设置页"翻译引擎"配置区(带 key 的引擎才可切)
- [ ] 2.5 工具页 `index.tsx` + `icon.tsx`:源语言(自动+手动)/目标语言/引擎下拉、多行逐行翻、三态输出;注册 register.ts(id `translate`,network:'translate',NET 徽标自动)
- [ ] 2.6 CSP `connect-src` 放宽五个翻译 API 域名;断网/限流/鉴权失败错误提示验证

## 3. 收尾

- [ ] 3.1 全量回归(test/lint/typecheck/build:web/purity)+ spec-checklist 追加两工具条目 + NET 徽标人工目验记录
