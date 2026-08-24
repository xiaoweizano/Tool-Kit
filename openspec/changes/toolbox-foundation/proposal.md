# Proposal: toolbox-foundation

## Why

A-Tool-Kit 的完整设计(见 `project-docs/design.md`,经 office-hours 产出 + CEO 评审加固)承诺:**一套代码双输出**(在线静态版 + Electron 桌面版)、**本地优先**(服务器到期后桌面完整可用)、**可扩展**(加工具=加目录+注册一行)。这些承诺在写完 10 个工具之前必须先被证明成立——如果「一套代码双输出」的骨架跑不通,后面每个工具都是返工。本 change 落地这个骨架,并用一个工具(JSON 解析)走通完整闭环作为后续 9 个工具的黄金模板。

## What Changes

- 初始化仓库(git + README + LICENSE)与 React + TypeScript + Vite 工程脚手架
- 接入 Electron 壳(electron-builder),实现 dev 双通道:浏览器 HMR 与桌面壳同时可跑
- 定义 **ToolDescriptor 接口契约**(id/name/icon/route + input/output/error schema + capability 离线/联网声明)与 `src/tools/register.ts` 注册表
- 应用壳:左侧导航(按注册表自动生成)、**多主题系统(daisyUI:亮色/深色/焦糖色等默认主题+用户自定义 UI 样式)**、中文 UI
- **工具 UX 约定**:粘贴即出结果(自动识别+即时转换)、OK/ERROR/EMPTY 三态错误展示(无静默失败)、一键复制
- 实现第一个工具 **JSON 解析/校验/格式化** 作为黄金模板(完整走通:目录→注册→渲染→本地运算→错误态→复制)
- 双输出构建验证:`vite build` 产出静态在线版;electron-builder 产出 Win/Mac 安装包;GitHub Actions 从第一天起建 CI(构建+Release 通道,签名/公证可后补)
- golden-file 测试基建(Vitest),JSON 工具作为首个被测工具(含错误态用例)

不在本 change 内(后续 change):工具 2-10、pandoc 高保真转换(v0.2)、AI/同步增强、代码签名证书采购。

## Capabilities

### New Capabilities

- `tool-registry`: ToolDescriptor 接口契约与注册表——每个工具声明 id/name/icon/route、input/output/error schema、capability(离线/联网/异步);注册表驱动导航与壳层能力适配
- `app-shell`: 应用布局骨架——左侧导航、多主题系统(daisyUI,亮/深/焦糖等默认主题+自定义样式)、中文 UI、工具页容器
- `tool-ux-conventions`: 工具交互约定——粘贴即出结果(自动识别+即时转换)、OK/ERROR/EMPTY 三态(输入无效定位/部分失败标注/不支持提示/空输入占位)、一键复制
- `json-parser-tool`: JSON 解析/校验/格式化工具——粘贴自动识别、错误定位到非法字符、格式化输出、压缩/展开、复制
- `dual-output-build`: 一套代码双输出——同一源码构建为静态在线版与 Electron 桌面版(Win/Mac),CI 从第一天构建双通道产物

### Modified Capabilities

(无——全新仓库,不存在既有 spec)

## Impact

- **代码**:全新仓库 `D:\a-tool-kit`(当前仅有 project-docs/ 与 openspec/);新增 package.json、src/(app/core/tools)、electron/、.github/workflows/、测试目录
- **依赖**:react、react-dom、typescript、vite、electron、electron-builder、vitest、tailwindcss、zustand;JSON 工具零额外依赖(原生 JSON API)
- **系统/服务**:无后端;CI 依赖 GitHub Actions;静态托管(Vercel/Netlify/自有 Nginx)部署在线版
- **风险对齐**:CEO 评审已确认的边界——本 change 全部工具逻辑纯前端本地运算,不引入任何后端依赖;联网 capability 仅作为接口声明存在(Linux 命令大全工具在后续 change 实现时才使用)
