# ToolKit

本地优先的中文开发者工具箱：一套代码，双输出（Electron 桌面 + 静态 Web）。10 个高频工具，粘贴即出结果。

## 开发
pnpm install
pnpm dev        # Electron 壳 + 浏览器 HMR
pnpm dev:web    # 仅浏览器
pnpm test       # Vitest(golden)
pnpm build:web  # 静态产物(out/renderer → dist/web)
pnpm build:desktop  # Win/Mac 安装包(未签名,见「首次运行」)

## 首次运行(未签名阶段)

- **Windows**:双击安装包时 SmartScreen 可能拦截——点「更多信息」→「仍要运行」。
- **macOS**:dmg 安装后首次打开若被 Gatekeeper 拦截——在「访达」中对 ToolKit **右键→打开**→再点「打开」(Apple Silicon 需 ad-hoc 签名,构建已含)。
