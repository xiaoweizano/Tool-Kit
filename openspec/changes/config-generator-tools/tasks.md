# Tasks: config-generator-tools

## 1. 类型与纯函数层

- [x] 1.1 `docker-tools/types.ts`:`RunOptions`、`ComposeService`、`DockerfileOptions`、`ParsedImageName`、`ParsedRegistryUrl`
- [x] 1.2 `nginx-generator/types.ts`:`NginxOptions`(serverName/listen/root/proxy/ssl/cache/gzip/security/upstream)
- [x] 1.3 `jvm-params/types.ts`:`JvmOptions`(heap/gc/debug/monitor/container/custom)

## 2. docker-tools 纯函数层

- [x] 2.1 `generateRun(options): ToolResult<string>`:docker run 命令,缺 image→invalid-input
- [x] 2.2 `generateCompose(services): ToolResult<string>`:docker-compose.yml,无服务→invalid-input
- [x] 2.3 `generateDockerfile(options): ToolResult<string>`:单阶段 Dockerfile,缺 base→invalid-input(multi-stage 为 v2 最佳实践项,当前未实现)
- [x] 2.4 `parseImageName(image)` / `parseRegistryUrl(url)`:拆分 registry/namespace/repo/tag,scheme/host/port/path;非法→invalid-input
- [x] 2.5 `data/commands.ts`:**Docker 命令速查 ≥50 条**(10 类 × 5 条,含 flag/说明/示例),结构守门(总数/唯一/字段非空)

## 3. nginx-generator 纯函数层

- [x] 3.1 `generateNginxConfig(options): ToolResult<string>`:server/反代+WebSocket/SSL+HTTPS+HSTS/缓存/gzip/安全头/upstream,带注释分段;缺 server_name→invalid-input;upstream 空→invalid-input

## 4. jvm-params 纯函数层

- [x] 4.1 `generateJvmParams(options): ToolResult<string>`:堆内存/GC(G1/ZGC/Shenandoah)/调试/监控/容器感知/自定义参数,每行带注释;无选项→EMPTY

## 5. 工具注册

- [x] 5.1 `register.ts`:新增三行 ToolDescriptor(docker-tools/nginx-generator/jvm-params)+ lazy import(均 local,不注册 worker)

## 6. 页面组件

- [x] 6.1 `docker-tools/index.tsx`:6 tab(Run/Compose/Dockerfile/命令速查/镜像名解析/注册表),表单→生成→输出;速查 tab 用 data/commands.ts 搜索
- [x] 6.2 `nginx-generator/index.tsx`:功能开关表单→代码输出(带注释高亮)+ CopyButton
- [x] 6.3 `jvm-params/index.tsx`:分类侧栏+表单→参数输出+ CopyButton
- [x] 6.4 图标 + 中文文案遵循 DESIGN.md

## 7. 测试(golden)

- [x] 7.1 `test/docker-tools.test.ts`:run/compose/dockerfile 生成、镜像名/注册表解析、非法输入;命令速查数据结构守门(≥50 条/唯一/字段非空)
- [x] 7.2 `test/nginx-generator.test.ts`:basic server block、反代+WebSocket 头、缺 server_name→invalid-input、空 upstream→invalid-input;SSL/缓存/gzip/安全头/upstream 非空生成:静态核验/待人工(无单测)
- [x] 7.3 `test/jvm-params.test.ts`:空选项→status=ok(EMPTY 引导态)、gc=g1→-XX:+UseG1GC、container→UseContainerSupport;ZGC/Shenandoah/调试/监控/自定义合并/堆内存输出:静态核验/待人工(无单测)
- [x] 7.4 边界:空输入、非法格式
- [x] 7.5 `pnpm test` 全量回归保持绿

## 8. 收尾验证

- [x] 8.1 `pnpm typecheck` 通过
- [x] 8.2 `pnpm lint` 通过
- [x] 8.3 `pnpm test` 全绿
- [x] 8.4 spec-checklist(config-generator-tools)逐条核对 Scenario 通过
- [x] 8.5 `openspec validate config-generator-tools` 通过
