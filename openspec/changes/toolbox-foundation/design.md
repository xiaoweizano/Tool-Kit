# Design: toolbox-foundation

## Context

全新仓库 `D:\a-tool-kit`(无既有代码,仅 project-docs/design.md 设计文档与 openspec/)。上游决策已锁定:React+TS+Vite+Electron、本地优先、10 工具 v0.1(本 change 只做骨架+第一个工具)、CI/分发从第一天搭建、md 保真 v0.1 用前端库(pandoc 后置 v0.2)。CEO 评审加固了五项要求:ToolDescriptor 契约、错误三态、安全姿态、golden-file 测试、粘贴即出结果。边界探索确认:在线与桌面「一套代码」承诺只在工具逻辑层成立,渲染层必须环境无关,Electron 专属能力经由适配器注入。

## Goals / Non-Goals

**Goals:**

- 证明「一套代码双输出」:同一源码,浏览器 HMR 与 Electron 壳同时可开发,`vite build` 出静态在线版、electron-builder 出 Win/Mac 安装包
- ToolDescriptor 契约 + 注册表落地,导航/壳按注册表自动生成,加工具=加目录+注册一行
- 工具 UX 约定落地:粘贴即出结果、OK/ERROR/EMPTY 三态、一键复制
- JSON 解析工具作为黄金模板走通全闭环,并以 golden-file 测试锁定行为
- CI(GitHub Actions)从第一天构建双通道产物

**Non-Goals:**

- 工具 2-10(后续 change,每个或每组一个)
- pandoc 高保真转换、AI/同步增强(第二阶段)
- 代码签名证书/公证(自用阶段用「仍可运行」绕过,证书后补)
- Linux 命令大全的联网搜索(仅在本 change 留 capability 接口位)

## Decisions

### D1: 构建工具用 electron-vite(而非手配 vite+electron)

- **选**: [electron-vite](https://electron-vite.org)——社区成熟方案,统一管理 main/preload/renderer 三进程构建,HMR、打包、生产构建一体。
- **弃**: 手动 concurrently + 两份 vite 配置(配置漂移、HMR 踩坑多);electron-forge+ vite 插件(模板束缚,双输出灵活性差)。
- **双输出关键约束**: renderer 构建产物必须是**环境无关**的标准静态产物——renderer 代码禁止直接 import Electron 模块。桌面专属能力(如未来 OS keychain、原生文件对话框)通过 preload 注入 `window.toolkitAPI` 适配器;Web 环境下该适配器为 `null`,代码按 capability 降级。这是「一套代码」承诺的落地机制。

### D2: ToolDescriptor 是 TypeScript 接口,注册表是编译期数组

```ts
interface ToolDescriptor {
  id: string;                    // 'json-parser'
  name: string;                  // 中文名,如 'JSON 解析'
  icon: LucideIcon;
  route: string;                 // '/tools/json-parser'
  component: LazyExoticComponent<ComponentType>;
  capability: {
    offline: boolean;            // 默认 true;联网工具声明 false+'search'|'ai'
    network?: false | 'search' | 'ai';
    async?: boolean;
  };
}
```

- **选**: TS 模块数组(`register.ts` 导出 `tools: ToolDescriptor[]`)——编译期类型检查、tree-shaking、无运行时加载复杂度;10~20 个工具规模下无需插件式动态加载。
- **弃**: 运行时 JSON 清单(丢类型安全);动态 `import.meta.glob` 全自动注册(省一行注册,但失去显式排序/分组控制,且「注册一行」的显式性正是扩展契约的一部分)。
- 路由由注册表驱动 `react-router`,工具组件 `React.lazy` 按需加载。

### D3: 工具核心 = 纯函数 transform + Result 判别联合(错误三态的落地)

```ts
type ToolResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'error'; kind: 'invalid-input'; message: string; position?: number }
  | { status: 'error'; kind: 'partial'; message: string; failedItems?: number[] }
  | { status: 'error'; kind: 'unsupported'; structure: string; message: string };

type Transform<Input, Output> = (input: Input) => ToolResult<Output>;
```

- 每个「转换类」工具实现一个纯 `transform`,UI 组件只负责:输入区(粘贴)、调 transform、按 status 渲染三态、输出区+复制。
- 空输入是 UI 层占位态(EMPTY),不进 transform。
- 纯函数 = golden-file 测试的直接目标;错误态天然可测。
- 「粘贴即出结果」由共享 `useLiveTransform` hook 实现:输入变化→防抖 150ms→transform→状态机。工具无需各写防抖。

### D4: UI 基座 Tailwind + daisyUI 主题系统,多主题可自定义(2026-08-24 用户决策,取代原 shadcn/ui 选型)

- **选**: Tailwind CSS + daisyUI。核心动因:产品要求「用户可自定义 UI 样式」,daisyUI 的主题体系(语义 CSS 变量 + `data-theme` 属性切换 + 官方主题生成器)原生即为此而生——内置主题零成本,自定义主题=修改变量集,组件零改动。
- 多主题为产品能力(app-shell spec):默认深色,内置亮色/深色/焦糖色等数套,主题选择持久化 localStorage(zustand 管理,经 `core/storage.ts` 出口)。
- **弃**: shadcn/ui(组件精美但每套主题=重调一整套 token,「用户自定义主题」成本高);MUI/AntD(体积大、后台管理系统气质,与「酷炫工具箱」不符)。
- 中文 UI 文案;等宽字体用于代码/输出区(jetbrains-mono 回退链);Framer Motion 轻量动效保留。

### D5: 状态管理 zustand,工具数据不持久化

- 应用级状态:当前主题、最近使用工具(写入 localStorage,作为 P2「本地存储默认 localStorage」的第一个落点)。
- 工具输入输出**不持久化**(无状态转换工具,刷新即清,符合「粘贴即用」心智);历史/收藏是后续 change,届时再经 data-source 抽象(现在不做,P3 接口仅保持「不直写」约定:任何持久化都收敛到 `core/storage.ts` 单一出口)。

### D6: Electron 安全默认(CEO 评审安全姿态落地)

- `contextIsolation: true`、`nodeIntegration: false`、preload 只暴露白名单 API(`contextBridge.exposeInMainWorld('toolkitAPI', …)`)。
- CSP 设置于 index.html;渲染层不加载远程内容。
- 本 change 不引入任何 API 密钥;适配器设计保证未来 AI 密钥只存在 main 进程/OS keychain。

### D7: 测试 = Vitest + golden-file,transform 层为主

- `test/fixtures/<tool>/` 放输入样例与期望输出;`transform` 纯函数逐条断言快照一致。
- 错误态用例:JSON 工具至少覆盖——非法字符(带位置)、截断输入、空对象/数组边界、超深嵌套、超大(1MB+)输入不冻结 UI(性能冒烟)。
- UI 层不强制单测(三态渲染组件薄);后续工具沿用此金字塔。

### D8: CI 双通道从第一天(GitHub Actions)

- `main` push:install→lint→test→`electron-vite build`(renderer 产物即在线版静态产物)→上传 artifact。
- tag `v*`:electron-builder 出 Win(nsis)+ Mac(dmg)安装包,创建 Draft Release。**不签名**(证书后补;README 写明 Windows SmartScreen「仍要运行」与 Mac 右键打开的首次运行指引)。
- 在线版部署通道在 CI 中以 deploy job 骨架存在(目标 Vercel/Netlify/自有 Nginx 三选一,见 Open Questions)。

## Risks / Trade-offs

- [electron-vite 的 renderer 产物隐性依赖 Electron 环境] → 规则化:renderer 禁 import electron;CI 里对产物做「无 electron 引用」静态检查(grep 产物 bundle)+ 纯浏览器 smoke(加载首页无报错)。这是双输出承诺的守门测试。
- [JSON.parse 各引擎错误信息不一致,错误定位难] → 不直接依赖原生错误文案:解析失败时用轻量 tokenizer 定位首个非法位置(V8 的 `position` 可用则直接用),golden 测试锁行为。
- [未签名安装包首次运行被 SmartScreen/公证拦截吓到用户] → README「首次运行」指引(文档化,不伪装);签名证书列入后续 change。
- [daisyUI 升级带来的主题变量命名变化] → 锁定 daisyUI 小版本,升级视为显式变更并回归全部主题场景;自定义主题必须遵循其变量命名约定。
- [注册表编译期数组=加工具要改中央文件] → 这正是设计意图(显式注册=显式契约);数组仅一行,成本可忽略。

## 工程评审定稿(2026-08-24,/plan-eng-review)

七项决策(用户拍板):

| # | 决策 | 选择 |
|---|---|---|
| E1 | 虚拟滚动×语法着色 | **逐行着色**:格式化输出按行切分,每行独立无状态高色函数,虚拟行渲染时现算 |
| E2 | 未签名更新机制 | **检查更新 = GitHub Releases API 版本比对 + 引导浏览器打开 Releases 页**(双平台一致,零签名依赖;electron-updater 等签名后再上) |
| E3 | 双输出 CI 守门 | **Playwright 无头 smoke**:起静态服务→加载首页→断言无 console error、导航渲染工具项(grep 只抓静态引用,抓不到运行时) |
| E4 | CJK 字体 | **系统栈优先**(YaHei UI/PingFang 零体积);MiSans 写栈尾可选,后续要品牌字再子集化 |
| E5 | 1MB 不冻结兑现 | **Web Worker(Comlink)统一传输路径**:transform 保持纯同步函数(golden 测试直跑不变),useLiveTransform 经 worker 调用,大小输入同路径 |
| E6 | 样式栈锁定 | **Tailwind 4 + daisyUI 5**(CSS-first 主题语法与 token 契约同构;所有配置片段按 v4 语义写,锁 minor) |
| E7 | 路由 | **HashRouter**(Electron 生产 file:// 与任意静态托管双端零配置通吃;URL 带 # 为可接受代价) |

外部声音修复(直接采纳):

- mac 构建:CI 设 `CSC_IDENTITY_AUTO_DISCOVERY=false`,electron-builder 默认 ad-hoc 签名(否则 arm64 被 Gatekeeper 直接杀);README 首次运行指引按 ad-hoc 事实重写
- **图标资产任务补上**:icon.ico(Win)/icon.icns(mac)源资产(svg 128→多尺寸),缺则 electron-builder 出默认 Electron 图标
- pnpm+electron-builder:`.npmrc` 加 `node-linker=hoisted`(符号链接破坏原生依赖的日一脚枪)
- 缺失任务补上:主题首帧注入(index.html 内联脚本写 `documentElement.dataset.theme`,先于 app-shell 任务)、检查更新(E2)
- 在线版部署说明:vite `base:'./'` 相对路径 + HashRouter 使任意静态托管零 fallback 配置

小修(zustand persist 的 storage adapter 委托 `core/storage.ts` 单一出口;类型负向测试用 `@ts-expect-error`;1MB golden 加数值断言 transform+格式化 <200ms;CI matrix = ubuntu 跑测试、win/mac 仅构建)已并入 tasks。

**注**:D4 原文「Tailwind + daisyUI」按 E6 锁定为 Tailwind 4 + daisyUI 5,CSS-first 配置(`@theme`/CSS 变量),无 tailwind.config.js。

## Migration Plan

全新仓库,无迁移。实施顺序见 tasks.md;回滚 = git revert(additive-only,无破坏性)。首个里程碑验证点:「同一份 dev server 在浏览器与 Electron 壳中同时打开 JSON 工具且行为一致」——此点不通,停下修,不带病前进。

## Open Questions

- 在线版部署目标(Vercel/Netlify/自有 Nginx):不阻塞本 change(CI 留 deploy 骨架),部署时定。倾向自有服务器(反正要过渡期内在线可用,且到期即下线的定位与免费托管长期存在矛盾——免费托管反而「到期不下线」,可在部署任务时重新权衡)。
- Mac 构建在 CI(GitHub Actions macos runner)与本 change 无阻塞,但若无 Apple 开发者账号,`dmg` 无公证分发体验如何,留到打包任务实测。
