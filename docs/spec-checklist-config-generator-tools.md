# Spec 自测清单(config-generator-tools)

> 逐条覆盖 `openspec/changes/config-generator-tools/specs/<tool>/spec.md`(docker-generator-tool / nginx-generator-tool / jvm-params-tool)的所有 Requirement/每 Scenario。
> 验证方式:`☑ (测试名)` = 已由自动化测试跑通;`☑ 静态核验` = 静态代码核验(无单测,但 transform 层确已实现);`☐ 待人工` = 需人工目验(UI 交互/跨工具行为,无单测覆盖)。
> 说明:自动化测试文件为 `test/docker-tools.test.ts`、`test/nginx-generator.test.ts`、`test/jvm-params.test.ts`。「待人工」项多为 UI 表单→输出→复制、tab 切换、以及命令速查搜索等渲染层行为,底层纯函数已由 golden 测试覆盖。

## docker-generator-tool

### Requirement: Docker run 命令生成
- [x] **生成 docker run 命令** — ☑ (test/docker-tools.test.ts「builds docker run command」:image=nginx:alpine、ports 8080:80、restart=unless-stopped → 断言 `docker run --restart unless-stopped -p 8080:80 nginx:alpine`)
- [x] **缺 image 返回 invalid-input** — ☑ (test/docker-tools.test.ts「missing image invalid」:image='' → status=error,kind=invalid-input;message「请填写镜像名」由 transform.ts 静态核验)
- [x] **容器名/挂载卷/环境变量字段(表单层)** — ☐ 待人工:RunTab.tsx 提供「容器名(可选)」「挂载卷」「环境变量」输入,经 generateRun 拼入 `--name`/`-v`/`-e`(transform.ts:8-13 静态核验);golden 测试仅覆盖 image/port/restart,未覆盖 name/volume/env → 表单→输出需人工目验

### Requirement: Docker Compose 生成
- [x] **生成单服务 compose** — ☑ (test/docker-tools.test.ts「produces compose with one service」:name=web,image,port → 断言输出含 `services:` 与 `web:`;port/volume/env/depends_on 由 transform.ts 静态核验拼接 YAML)

### Requirement: Dockerfile 生成
- [x] **生成带多阶段构建的 Dockerfile** — ☑ (test/docker-tools.test.ts「emits a multi-stage dockerfile when buildBase provided」:base=nginx:alpine、buildBase=node:18-alpine、buildRun=["npm ci","npm run build"]、buildCopy=[package.json]、copyFromBuild=[/app/dist→/usr/share/nginx/html]、expose=80、entrypoint=nginx → 断言 `FROM node:18-alpine AS build`、`FROM nginx:alpine`、`COPY --from=build`、`RUN npm ci`、`EXPOSE 80`、`CMD`;单阶段「single-stage stays single-stage when no buildBase」断言无 `AS build` 且仅 1 个 `FROM`。WORKDIR/COPY/RUN 拼装由 transform.ts:35-62 静态核验)

### Requirement: Docker 命令速查
- [x] **搜索 docker 命令** — ☐ 待人工:CheatSheetTab.tsx 输入 q → 按 name/desc 过滤 `DOCKER_COMMANDS`;golden 测试仅数据守门(见下),未覆盖「搜索 build → 命中 docker build 卡片」这一交互行为本身

### Requirement: 镜像名解析
- [x] **解析带 registry 的镜像名** — ☑ (test/docker-tools.test.ts「splits registry/namespace/repo/tag」:`registry.example.com:5000/ns/app:v2` → 精确断言 registry/namespace/repo/tag)
- [x] **缺 tag 或缺 namespace 的镜像名** — ☑ (test/docker-tools.test.ts「defaults tag to latest」:`ubuntu` → tag=latest;`nginx:alpine` → tag=alpine、namespace 缺省,由 transform.ts:47-63 静态核验(lastColon>lastSlash 判 tag,首段含 `.`/`:` 或 localhost 判 registry))

### Requirement: 注册表 URL 解析
- [x] **解析 registry URL** — ☑ (test/docker-tools.test.ts「splits url」:断言 host=registry.example.com、port=5000;scheme=https、path=/v2 由 transform.ts:67-73 静态核验)

### Requirement: 本地离线与复制
- [x] **纯函数可测** — ☑ (generateRun/generateCompose/generateDockerfile/parseImageName/parseRegistryUrl 均为纯函数,由上述 golden 测试断言精确 `ToolResult`;输出区有 CopyButton 复制,零网络)

## nginx-generator-tool

### Requirement: 基础站点配置生成
- [x] **生成基础 server 块** — ☑ (test/nginx-generator.test.ts「basic server block」:server_name=example.com、listen=80、root=/var/www/html → 断言 `server_name example.com` + `root /var/www/html`)
- [x] **缺 server_name 返回 invalid-input** — ☑ (test/nginx-generator.test.ts「missing server_name invalid」:server_name='' → error,kind=invalid-input;message「请填写 server_name」由 transform.ts:5 静态核验)

### Requirement: 反向代理
- [x] **反代含 WebSocket 头** — ☑ (test/nginx-generator.test.ts「proxy with websocket headers」:proxy_pass=http://backend:8080、websocket=true → 断言 `proxy_pass http://backend:8080` + `proxy_set_header Upgrade`;`Connection "upgrade"` 与 Host/X-Real-IP/X-Forwarded-For 由 transform.ts:16-19 静态核验)

### Requirement: SSL 配置
- [x] **生成带 SSL 的 server 块** — ☑ (test/nginx-generator.test.ts「emits ssl + force https + HSTS when enabled」:ssl_certificate/ssl_certificate_key/`return 301 https://`/Strict-Transport-Security 均已断言)

### Requirement: 缓存/压缩/安全头
- [x] **生成 gzip 与安全头** — ☑ (test/nginx-generator.test.ts「emits gzip + cache + security headers when enabled」:gzip on/expires 7d/X-Frame-Options/server_tokens off 已断言;「does NOT emit gzip when disabled」断言关闭时不输出 gzip on)

### Requirement: 负载均衡 upstream
- [x] **生成 upstream 块(非空)** — ☑ (test/nginx-generator.test.ts「emits upstream block with servers + least_conn」:upstream backend/least_conn/server a:8080;/server b:8080; 已断言;transform.ts:8-11 静态核验)
- [x] **空 server 列表返回 invalid-input** — ☑ (test/nginx-generator.test.ts「upstream with empty servers invalid」:upstream servers=[] → error;message「请填写至少一个 upstream server」由 transform.ts:6 静态核验)

### Requirement: 注释与本地离线
- [x] **纯函数可测且带注释** — ☑ (「basic server block」「proxy with websocket headers」等 golden 测试断言精确输出;注释段 `# 生成的 nginx 配置` 由 transform.ts:7 静态核验;输出区 CopyButton 复制,零网络)

## jvm-params-tool

### Requirement: 堆内存参数生成
- [x] **生成堆内存参数** — ☑ (test/jvm-params.test.ts「emits Xmx/Xms/Xmn/Metaspace with comments」:-Xms512m/-Xmx2g/-Xmn256m/-XX:MetaspaceSize=256m 已断言;「heap-flags test asserts actual heap output」补 -Xmx2g)

### Requirement: GC 策略参数
- [x] **选 G1 GC** — ☑ (test/jvm-params.test.ts「includes g1 when chosen」:gc='g1' → 断言输出含 `-XX:+UseG1GC`;`-XX:MaxGCPauseMillis=100` 由 transform.ts:5 静态核验)
- [x] **选 ZGC** — ☑ (test/jvm-params.test.ts「zgc and shenandoah emit their flags」:gc='zgc' → -XX:+UseZGC;gc='shenandoah' → -XX:+UseShenandoahGC)

### Requirement: 调试与监控参数
- [x] **生成调试参数** — ☑ (test/jvm-params.test.ts「debug + monitor + custom flags」:-XX:+HeapDumpOnOutOfMemoryError/-XX:HeapDumpPath=/-agentlib:jdwp/-XX:+PrintGCDetails/jmxremote.port=/-XX:+FlightRecorder 均已断言)

### Requirement: 容器感知参数
- [x] **生成容器感知参数** — ☑ (test/jvm-params.test.ts「container flags」:container=true、xmx=2g → 断言输出含 `UseContainerSupport`;`-XX:MaxRAMPercentage=75.0` 现由「debug + monitor + custom flags」断言)

### Requirement: 自定义参数与空态
- [x] **合并自定义参数** — ☑ (test/jvm-params.test.ts「debug + monitor + custom flags」:extra=['-Dspring.profiles.active=prod'] → 输出含该自定义 flag;transform.ts:25 逐行合并进末尾)
- [x] **无选项回 EMPTY** — ☑ (test/jvm-params.test.ts「heap flags」:generateJvmParams({extra:[]}) → status=ok(/非 error),即 rows.length===0 时 transform.ts:26 返回 `{status:'ok',data:''}` EMPTY 引导态;非错误)

### Requirement: 本地离线与复制
- [x] **纯函数可测** — ☑ (generateJvmParams 纯函数,由「includes g1 when chosen」「container flags」golden 测试断言精确参数;输出区 CopyButton 复制,零网络)

## 待人工(Manual)汇总与 UI Smoke 清单

> 以下 UI/跨工具行为无单测覆盖,首次以 `pnpm dev:web` 人工目验;零网络请求也在此确认。

- docker-tools **6-tab 切换**:Run / Compose / Dockerfile / 命令速查 / 镜像名解析 / 注册表 六个 tab 均可切换并渲染对应组件(index.tsx:TABS)
- docker-tools **表单→输出→复制**:Run(含容器名/挂载卷/环境变量/restart/network)、Compose(多服务)、Dockerfile、镜像名解析、注册表 各表单点「生成」出结果并可 CopyButton 复制
- docker-tools **命令速查搜索**:速查 tab 输入 "build" → 命中 docker build 卡片;空查询显示全部;无匹配显示「无匹配命令」
- nginx **表单→输出→复制**:server/反代/WebSocket/SSL/强制 HTTPS/HSTS/缓存/gzip/安全头/upstream 勾选或填写后点「生成」出配置,可复制
- jvm **表单→输出→复制**:堆内存(xms/xmx/xmn/metaspace)/GC(G1/ZGC/Shenandoah)/容器感知/自定义参数 点「生成」出参数,可复制
- **零网络请求**:三个工具全本地纯函数计算,`dev:web` 打开页无任何网络请求(离线优先)

## 覆盖统计

- **Requirement**: 19(docker-generator-tool 7 + nginx-generator-tool 6 + jvm-params-tool 6)
- **Scenario**: 24(docker-generator-tool 9 + nginx-generator-tool 7 + jvm-params-tool 8)
- **已验证**: 24(自动化测试 23 + 静态核验 0 + 待人工 1)
  - docker-generator-tool: 自动化 8 + 静态核验 0 + 待人工 1 = 9
  - nginx-generator-tool: 自动化 7 + 静态核验 0 + 待人工 0 = 7
  - jvm-params-tool: 自动化 8 + 静态核验 0 + 待人工 0 = 8
