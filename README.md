# ToolKit

本地优先的中文开发者工具箱：一套代码，双输出（Electron 桌面 + 静态 Web）。10 个高频工具，粘贴即出结果。

## 开发
pnpm install
pnpm dev        # Electron 壳 + 浏览器 HMR
pnpm dev:web    # 仅浏览器
pnpm test       # Vitest(golden)
pnpm build:web  # 静态产物(out/renderer → dist/web)
pnpm build:desktop  # Win/Mac 安装包(未签名,见「首次运行」)
