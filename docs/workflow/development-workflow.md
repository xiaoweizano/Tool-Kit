# ToolKit Development Workflow Documentation

## Project Overview

**ToolKit** is a local-first developer toolbox containing 21 high-frequency development tools. It follows a "one codebase, two outputs" architecture:
- **Electron desktop app** (the product)
- **Static web build** (transitional online edition)

The project is registry-driven, where adding a tool requires:
1. Creating `src/renderer/src/tools/<id>/` directory
2. Adding one line to `register.ts`
3. Adding one line to `transform.worker.ts`

## Development Workflow

### 1. Initial Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd Tool-Kit
pnpm install

# Quick start options
pnpm dev:web      # Browser only (fastest)
pnpm dev          # Electron desktop shell + HMR
```

### 2. Local Development

**Browser Development:**
```bash
pnpm dev:web
# Opens http://localhost:5173/
# Environment: Development, Auto-refresh enabled
```

**Desktop Development:**
```bash
pnpm dev
# Opens Electron app with HMR
# Native OS integration available
```

### 3. Build Processes

#### Web Build (Static Output)
```bash
pnpm build:web
# Output: dist/web/
# Purpose: Online transitional edition (GitHub Pages/Static hosting)
# Command: electron-vite build + copy-static.mjs + copy-web.mjs
```

#### Desktop Build
```bash
pnpm build:desktop
# Output: release/ (Windows .exe, macOS .dmg)
# Purpose: Production desktop application
# Command: electron-vite build + copy-static.mjs + electron-builder
```

#### Artifact Locations
- **Windows**: `release/ToolKit-0.1.0-setup.exe`
- **macOS (Apple Silicon)**: `release/ToolKit-0.1.0-arm64.dmg`
- **macOS (Intel)**: `release/ToolKit-0.1.0-x64.dmg`

### 4. Testing Workflow

```bash
# Run all quality checks
pnpm lint         # ESLint code style
pnpm typecheck    # TypeScript type checking
pnpm test         # Vitest unit tests (golden-file transform tests)
```

**Test Architecture:**
- Each tool uses golden-file tests for conversion fidelity
- Tests run in Web Worker to prevent UI blocking
- Transform functions are pure: input string → `ToolResult` output

### 5. GitHub CI/CD Workflow

#### CI Pipeline (`.github/workflows/ci.yml`)

**Jobs Overview:**
1. **test**: Code quality validation (lint, typecheck, tests)
2. **desktop-win**: Windows desktop build
3. **desktop-mac**: macOS desktop build
4. **deploy-pages**: Deploy web build to GitHub Pages

**Key CI Steps:**
- Version auto-bump from Git tags
- Node.js 22 setup with pnpm caching
- Electron mirror for China-friendly builds
- Platform-specific icon regeneration
- Web purity checking (`check-web-purity.mjs`)

#### Release Pipeline (`.github/workflows/release.yml`)

**Automated Release on Tags:**
- Triggers on `v*` tag pushes
- Builds Windows and macOS artifacts in parallel
- Publishes to GitHub Releases (draft mode)
- Uses China-friendly Electron mirror

#### Deployments

**GitHub Pages Deployment:**
- Triggers on `main` branch pushes
- Deploys `dist/web` to GitHub Pages
- Zero-configuration static hosting
- HashRouter + relative paths for client-side routing

## 6. Docker Deployment

### Production Web Deployment

**Docker Compose Setup (`deploy/docker-compose.yml`):**
```yaml
services:
  toolkit-web:
    image: nginx:alpine
    container_name: toolkit-web
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      # 首次部署前先在仓库根目录执行 pnpm build:web 生成 dist/web
      - ../dist/web:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

**Deployment Steps:**
1. Build web static files:
   ```bash
   pnpm build:web
   ```

2. Deploy with Docker:
   ```bash
   cd deploy && docker compose up -d
   ```

3. Access at `http://<server-ip>:8080`

**Nginx Configuration (`deploy/nginx.conf`):**
- Gzip compression enabled
- Long-cache assets (5+ years)
- No-cache entry for client-side routing
- Read-only mount for security

### Coexistence with GitHub Pages
- **GitHub Pages**: Free, long-lived static mirror
- **Docker**: Self-controlled transitional tier
- Zero fallback configuration required

## 7. Tool Development Workflow

### Adding a New Tool

**Required Files Structure:**
```
src/renderer/src/tools/<tool-id>/
├── index.tsx              # React component
├── transform.ts          # Core transform logic
└── types.ts              # Type definitions (optional)
```

**Registry Updates (`src/renderer/src/register.ts`):**
```typescript
export const tools = [
  // ... existing tools
  {
    id: 'json-parser',
    name: 'JSON 解析',
    icon: JsonIcon,
    route: '/tools/json-parser',
    component: lazy(() => import('./tools/json-parser')),
    capability: { offline: true }
  }
]
```

**Worker Integration (`src/renderer/src/core/transform.worker.ts`):**
```typescript
// Add tool to worker registry
const transformRegistry = {
  // ... existing tools
  'json-parser': jsonParserTransform
}
```

### Tool Capabilities

**Tool Types:**
- **Offline tools**: Pure frontend computation, no network required
- **Network tools**: Optional network access (`'search'`, `'ai'`, `'translate'`)
- **Async tools**: Promise-based transformations
- **Sync tools**: Regular function transformations

### Transform Result Structure

```typescript
export type ToolResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'error'; kind: 'invalid-input'; message: string; position?: number }
  | { status: 'error'; kind: 'partial'; message: string; failedItems?: number[] }
  | { status: 'error'; kind: 'unsupported'; structure: string; message: string }
  | { status: 'error'; kind: 'engine'; message: string }
```

## 8. Development Conventions

### Code Organization

**Source Structure:**
```
src/renderer/
├── src/
│   ├── components/        # Reusable UI components
│   ├── core/             # Core runtime (transforms, workers, stores)
│   ├── tools/            # Individual tool implementations
│   └── app/              # Main application shell
└── types/                # Shared type definitions
```

**Build Separations:**
- **Environment-agnostic**: `src/renderer/` (works for both Electron and web)
- **Desktop-specific**: `src/electron/` (if needed)
- **Web-specific**: `src/web/` (if needed)

### Styling and Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite 6 for development/build
- Tailwind CSS 4 with daisyUI 5
- Electron 33 for desktop
- Zustand 5 for state management
- Comlink 4 for Web Worker communication

**Design System:**
- **Themes**: 深色工作台 (dark workbench) / 纸白 (paper) / 焦糖 (caramel)
- **Components**: daisyUI-based, customizable
- **Icons**: SVG-based, automatically generated for platforms

### Project Scripts

**Package.json Scripts:**
```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "dev:web": "vite --config vite.web.config.ts",
    "lint": "eslint .",
    "test": "vitest run",
    "build:web": "electron-vite build && node scripts/copy-static.mjs && node scripts/copy-web.mjs",
    "build:desktop": "electron-vite build && node scripts/copy-static.mjs && electron-builder --config electron-builder.yml",
    "typecheck": "tsc --noEmit",
    "icons": "node scripts/gen-icons.mjs"
  }
}
```

## 9. Maintenance and Troubleshooting

### Common Issues and Solutions

**First Run Warnings:**
- **Windows SmartScreen**: Accept installer with "More info → Run anyway"
- **macOS Gatekeeper**: Right-click `ToolKit → Open → Open` in Finder

**Build Failures:**
- **Missing dependencies**: Run `pnpm install --frozen-lockfile`
- **TypeScript errors**: Fix with `pnpm typecheck`
- **ESLint errors**: Fix with `pnpm lint`

**Deployment Issues:**
- **Docker volume permissions**: Ensure `../dist/web` is writable
- **Nginx configuration**: Check `deploy/nginx.conf` syntax
- **GitHub Pages vs Docker**: Ensure both point to same source

### Environment Variables

**Desktop Build:**
```bash
# macOS signing (if needed)
APPLE_ID=your-email
APPLE_APP_SPECIFIC_PASSWORD=your-password
```

**CI/CD:**
- `CSC_IDENTITY_AUTO_DISCOVERY: 'false'` (Windows/macOS builds)
- `ELECTRON_MIRROR: https://npmmirror.com/mirrors/electron/` (China-friendly)

### Monitoring and Debugging

**Development:**
- HMR for instant feedback
- Console logging in tools
- Error boundaries in UI components
- Browser devtools integration

**Production:**
- Error logging with tri-state results (OK / ERROR / EMPTY)
- No silent failures policy
- Network error detection for online tools

## 10. Migration and Upgrade Guide

### Version Upgrades

**Semantic Versioning:**
- `MAJOR` version: Breaking changes
- `MINOR` version: New features, backward compatible
- `PATCH` version: Bug fixes, security updates

**Upgrade Commands:**
```bash
# Update dependencies
pnpm update

# Check for breaking changes in changelog
# Follow migration notes in CHANGELOG.md

# Test upgrade
pnpm test
pnpm typecheck
```

### Tool Migration (v2 Enhancements)

Current tools support v2 enhancements with:
- Improved error handling
- Better type safety
- Enhanced UI components
- Golden-file test coverage

**Migration Path:**
1. Review `CHANGELOG.md` for specific tool updates
2. Update tool configurations if needed
3. Run existing tests to verify compatibility
4. Add new test cases for v2 features

## 11. Project Standards

### Commit Conventions

**Commit Message Format:**
```
<type>(<scope>): <description>

类型:
- feat: 新功能
- fix: 修复 bug
- docs: 文档
- style: 代码格式
- refactor: 重构
- test: 测试
- chore: 辅助
```

**Examples:**
- `feat(password-tools): redesign strength check panel`
- `fix(json-parser): tolerant of log-escaped and double-encoded input`

### Coding Standards

**TypeScript:**
- Strict mode enabled
- No implicit any
- Interface over type aliases
- Discriminated unions for error types

**React:**
- Functional components with hooks
- TypeScript props interfaces
- Lazy loading for route components
- Error boundaries for graceful error handling

**Architecture:**
- Pure functions for transforms
- Single responsibility principle
- Dependency injection where needed
- Immutable data structures where appropriate
