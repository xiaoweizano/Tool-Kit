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

## 架构:一套代码,双输出

┌─────────────── src/renderer(环境无关,禁 electron)───────────────┐
│ app 壳 · 首页总览 · 设置 · 工具页(注册表驱动) · core(类型/存储/Worker) │
└───────────────┬──────────────────────────────┬─────────────────────┘
               │ vite 静态构建                 │ electron-vite + Electron 壳
       ┌───────▼────────┐             ┌───────▼────────┐
       │ GitHub Pages    │             │ Win nsis / Mac dmg│
       │ 在线版(过渡)    │             │ 桌面版(本体)      │
       └────────────────┘             └────────────────┘
加一个工具 = src/tools/<id>/ 目录 + register.ts 一行 + transform.worker.ts 一行

## 服务器部署(Docker Compose)

在线版是纯静态产物(`dist/web`),HashRouter + 相对路径,任意静态服务器零回退配置。服务器上用 docker compose:

```bash
# 本机构建(或 CI 构建后上传 dist/web)
pnpm build:web

# 上传 dist/web 与 deploy/ 到服务器后:
cd deploy && docker compose up -d
# 访问 http://<服务器IP>:8080
```

要点:
- `deploy/docker-compose.yml`:nginx:alpine 挂载 `../dist/web` 只读 + `deploy/nginx.conf`(gzip、assets 长缓存、入口 no-cache)
- 更新版本 = 重新 `pnpm build:web` → 覆盖服务器 `dist/web` → `docker compose restart`;或由 CI 构建 artifact 后 scp/rsync
- 端口默认 8080,反代域名时把 ports 改为 `127.0.0.1:8080:80` 并在宿主 Nginx/Caddy 接管 TLS
- 与 GitHub Pages 并存不冲突:Pages 是免费不到期的长期在线版,自有服务器是过渡期的自控部署

