# Tasks: toolbox-foundation

## 1. 仓库初始化与脚手架

- [ ] 1.1 `git init` + `.gitignore`(node_modules/dist/release)+ 初始提交(含 project-docs/ 与 openspec/)
- [ ] 1.2 创建 README.md(项目定位一句话、双输出说明、开发命令)与 LICENSE(MIT)
- [ ] 1.3 用 electron-vite 脚手架初始化工程(main/preload/renderer 三进程结构),Node 20+,pnpm + `.npmrc` 加 `node-linker=hoisted`(electron-builder 原生依赖兼容)并提交 lockfile
- [ ] 1.4 安装基础依赖并锁版本:**Tailwind 4 + daisyUI 5**(CSS-first `@theme` 配置,无 tailwind.config.js)、react、react-dom、react-router-dom、zustand、framer-motion、comlink;dev 侧 vitest、@types/*、playwright
- [ ] 1.5 配置 ESLint + Prettier(含 import 顺序规则),`lint` script 可运行

## 2. ToolDescriptor 契约与注册表

- [ ] 2.1 定义 `src/core/types.ts`:`ToolDescriptor`(id/name/icon/route/component/capability)与 `ToolResult<T>` 判别联合(ok/invalid-input/partial/unsupported)
- [ ] 2.2 创建 `src/tools/register.ts`:导出 `tools: ToolDescriptor[]`(初始为空数组)+ 类型导出
- [ ] 2.3 定义 `Transform<Input, Output>` 纯函数类型,写入 `src/core/transform.ts`
- [ ] 2.4 类型负向测试:`@ts-expect-error` 标注缺 capability 字段的假对象,验证 TS 编译期拒绝
- [ ] 2.5 Web Worker 传输层(Comlink):useLiveTransform 经 worker 调用 transform(统一路径,大输入不冻结 UI);transform 保持纯同步函数,golden 测试直跑不变

## 3. 应用壳(app-shell)

- [ ] 3.1 Tailwind + daisyUI 初始化:配置内置主题(亮色/深色/焦糖色等,daisyUI 内置或主题生成器产出),深色默认,中文字体栈与等宽字体栈
- [ ] 3.2 左侧导航布局:导航项由 `register.ts` 数组生成(图标+中文名),当前路由高亮;主区域为 `<Outlet/>` 容器
- [ ] 3.3 路由生成:由注册表生成 react-router(**HashRouter**,file://与任意静态托管零配置)路由表,工具组件 `React.lazy` 按需加载,空注册表时首页显示引导页
- [ ] 3.4 多主题切换:主题选择器(内置亮/深/焦糖等,`data-theme` 驱动),zustand persist 的 storage adapter 委托 `core/storage.ts` 单一出口,重启保持;index.html 内联首帧脚本读存储写 `documentElement.dataset.theme`(防 FOUC,先于 React);预留自定义主题入口(daisyUI 5 CSS 变量集)
- [ ] 3.5 联网标识:capability 声明 `network` 的工具在导航显示联网徽标(以假数据注入一个临时声明验证后移除)
- [ ] 3.6 首页总览:工具节点图+搜索框(与导航过滤共用索引)+最近使用;应用启动总是落首页(评审 D2)
- [ ] 3.7 设置页:主题色卡单选(黑/纸白/焦糖)+关于/版本;自定义主题入口预留(改 daisyUI 变量集)

## 4. 工具 UX 基建(tool-ux-conventions)

- [ ] 4.1 `useLiveTransform` hook:输入变化→防抖 150ms→transform→ToolResult 状态机
- [ ] 4.2 三态输出组件:EMPTY(占位引导)/ ERROR(按 kind 分渲染:invalid-input 显示 message+position、partial 标注失败项、unsupported 指出结构)/ OK(渲染输出)
- [ ] 4.3 一键复制组件:`navigator.clipboard` + 失败回退,复制成功反馈动效
- [ ] 4.4 输入区组件:粘贴即触发(依赖 useLiveTransform),等宽字体,行号可选

## 5. JSON 解析工具(黄金模板)

- [ ] 5.1 `src/tools/json-parser/transform.ts` 纯函数:parse+格式化(缩进 2/4/Tab 可参数化)+压缩模式;非法输入返回 invalid-input 并携带行/列位置(轻量 tokenizer 定位)
- [ ] 5.2 `src/tools/json-parser/index.tsx` UI:输入区+缩进/压缩切换+三态输出+复制,中文文案
- [ ] 5.3 在 `register.ts` 注册该工具(id: json-parser,route: /tools/json-parser,capability: offline)
- [ ] 5.4 里程碑验证:同一 dev server 在浏览器与 Electron 壳同时打开 JSON 工具,粘贴样例行为一致、HMR 生效——记录验证结果于 tasks 勾选说明

## 6. 测试基建(golden-file)

- [ ] 6.1 Vitest 配置(环境 node,含 TS path alias)
- [ ] 6.2 `test/fixtures/json-parser/` 样例集:嵌套对象/数组、中英文+emoji 字符串、数字边界(大数/精度)、null/true/false、空对象/空数组、截断输入、非法字符(带位置)、1MB 大输入
- [ ] 6.3 golden 测试:逐 fixture 断言 transform 输出与期望一致;错误用例断言 kind 与 position;1MB 用例加数值断言:transform+格式化 <200ms(node 环境)
- [ ] 6.4 `test` script 纳入 CI 前本地全绿

## 7. 双通道构建(dual-output-build)

- [ ] 7.1 renderer 产物环境无关守则落地:ESLint 规则禁 renderer 目录 import electron;CI grep 产物 bundle 无 electron 引用
- [ ] 7.2 `build:web`:renderer 构建为纯静态产物,本地以静态服务器打开验证 JSON 工具可用
- [ ] 7.3 Electron 安全配置:`contextIsolation: true`、`nodeIntegration: false`、preload 白名单 contextBridge、CSP
- [ ] 7.4 electron-builder 配置:Windows nsis + macOS dmg,应用名/版本号;**图标资产任务**:源 svg 出 icon.ico/icon.icns(缺则默认 Electron 图标);CI mac 构建设 `CSC_IDENTITY_AUTO_DISCOVERY=false`(默认 ad-hoc 签名,arm64 不被 Gatekeeper 杀);`build:desktop` 本地出包并在 Win 实机安装验证
- [ ] 7.5 README 增补「首次运行」指引(Windows SmartScreen「仍要运行」、macOS 右键打开)

## 8. CI(GitHub Actions)

- [ ] 8.1 push-main workflow:install→lint→test(**ubuntu**)→build:web→build:desktop(**matrix: windows+macos**),产物上传 artifact
- [ ] 8.2 tag `v*` workflow:构建 Win/Mac 安装包并附加到 Draft Release
- [ ] 8.3 产物守门检查:静态产物无 electron 引用(grep)+ **Playwright 无头 smoke**(起静态服务→加载首页→断言无 console error、导航渲染工具项)
- [ ] 8.5 检查更新功能:GitHub Releases API 版本比对,有新版引导浏览器打开 Releases 页(双平台一致,零签名依赖;electron-updater 等签名后再上)
- [ ] 8.4 在线版 deploy job 骨架(目标托管三选一占位,不阻塞);vite `base:'./'` 相对路径 + HashRouter 保证任意静态托管零 fallback 配置

## 9. 收尾验证

- [ ] 9.1 全量核对五个 spec 的 Scenario 逐条通过(自测清单逐项勾选)
- [ ] 9.2 `openspec validate toolbox-foundation` 通过
- [ ] 9.3 更新 README(架构图:一套代码双输出示意)+ CHANGELOG 初始条目
