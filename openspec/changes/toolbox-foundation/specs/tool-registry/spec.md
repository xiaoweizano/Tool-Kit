# tool-registry Specification

## ADDED Requirements

### Requirement: ToolDescriptor 接口契约
每个工具 MUST 以 `ToolDescriptor` 对象声明自身元数据:id(kebab-case 唯一)、name(中文显示名)、icon、route、component(懒加载组件)、capability(offline/network/async 声明)。TypeScript 类型系统 SHALL 在编译期拒绝缺字段或类型不符的注册。

#### Scenario: 注册缺少 capability 的工具被编译期拒绝
- **WHEN** 开发者在 `register.ts` 中登记一个缺少 `capability` 字段的工具对象
- **THEN** TypeScript 编译报错,注册不成立

### Requirement: 注册表驱动导航与路由
应用左侧导航与路由表 SHALL 由 `register.ts` 中的工具数组自动生成,壳层代码 MUST NOT 硬编码任何具体工具的导航项或路由。

#### Scenario: 新增工具后导航自动出现
- **WHEN** 开发者创建 `src/tools/xxx/` 目录并在 `register.ts` 数组中追加一行该工具的 ToolDescriptor
- **THEN** 左侧导航出现该工具入口,访问其 route 渲染其组件,壳层与布局代码零改动

### Requirement: capability 声明驱动壳层适配
壳层 SHALL 依据 capability 声明适配 UI:声明 `offline: true` 的工具在无网络时 MUST 全功能可用;声明联网 capability(`network: 'search' | 'ai'`)的工具 MUST 在导航或工具页展示联网标识。

#### Scenario: 联网工具在导航中带联网标识
- **WHEN** 某工具声明 `capability: { offline: false, network: 'search' }`
- **THEN** 该工具在导航中显示联网标识,用户可预期其离线时功能降级

#### Scenario: 离线工具断网后完整可用
- **WHEN** 用户断开网络并使用声明 `offline: true` 的工具
- **THEN** 该工具全部功能正常,无任何网络请求依赖
