# dual-output-build Specification

## ADDED Requirements

### Requirement: 单源码双输出
同一源码树 MUST 产出两个可分发产物:`vite build` 的 renderer 静态产物(在线版,任意静态托管可部署)与 electron-builder 的桌面安装包(Windows nsis `.exe` 与 macOS `.dmg`)。renderer 代码 MUST NOT 直接引用 Electron 模块;桌面专属能力 MUST 经 preload 注入的 `window.toolkitAPI` 适配器访问,Web 环境下该适配器为 null 且应用正常降级。

#### Scenario: 同一 dev 源双通道同时开发
- **WHEN** 开发者运行 dev 命令
- **THEN** 浏览器与 Electron 壳同时打开应用,同一工具行为一致,HMR 生效

#### Scenario: renderer 产物无 Electron 引用
- **WHEN** CI 对 renderer 构建产物执行静态检查
- **THEN** 产物 bundle 中不存在对 electron 模块的引用,纯浏览器加载首页无报错

### Requirement: Electron 安全默认
桌面壳 MUST 启用 `contextIsolation: true` 与 `nodeIntegration: false`;preload 仅通过 `contextBridge` 暴露白名单 API;窗口内容 MUST NOT 加载远程 URL。

#### Scenario: 渲染层无法访问 Node API
- **WHEN** 在桌面版渲染进程执行 `typeof require`
- **THEN** 返回 undefined,Node API 不可达

### Requirement: CI 双通道构建
GitHub Actions MUST 在 push 到 main 时执行 lint、test 与双通道构建(静态产物 + 桌面安装包 artifact);打 `v*` tag 时 SHALL 创建包含 Win/Mac 安装包的 Draft Release。安装包未签名阶段,README MUST 提供首次运行指引(Windows SmartScreen「仍要运行」、macOS 右键打开)。

#### Scenario: tag 触发桌面 Release
- **WHEN** 推送 `v0.1.0` tag
- **THEN** CI 产出 Windows `.exe` 与 macOS `.dmg` 并附加到 Draft Release

#### Scenario: 在线版静态产物可部署
- **WHEN** CI 构建完成
- **THEN** 静态产物 artifact 可直接部署到任意静态托管并以浏览器访问
