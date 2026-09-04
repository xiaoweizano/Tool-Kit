# Proposal: config-generator-tools

## Why

ToolKit 已覆盖 13 个本地优先工具,但缺少**配置/命令生成器**整类高频场景。开发者要部署服务时,反复手写 `docker run` 参数、`docker-compose.yml`、`Dockerfile`、nginx 反代配置、JVM 启动参数;这些配置项多、易拼错、须遵循最佳实践(如 multi-stage 构建、ssl 走向、GC 策略)。现状是翻项目里现成配置改 + 查官方文档,复制粘贴易出错。

本 change 收拢三个生成器,把「选参数 → 得规范配置/命令」收拢为表单,本地纯前端、即选即得,与 ToolKit 现有体验一致。

## What Changes

新增 3 个工具,完全遵循现有 ToolDescriptor + 纯函数模板模式,无后端:

- **Docker 生成器**(tool 19):多 tab。Docker run 命令、docker-compose.yml、Dockerfile、Docker 命令速查、镜像名解析、注册表 URL 解析。
- **nginx 配置生成器**(tool 20):勾选功能(反代/SSL/缓存/压缩/安全头/负载均衡)生成规范 nginx.conf(带注释)。
- **JVM 参数生成器**(tool 22):按堆内存/GC 策略/调试/监控/容器感知/自定义参数生成 JVM 启动参数(带行注释)。

不在本 change(后续 v2):配置模板库保存、导出 YAML/conf 下载、多服务 compose 编排向导。

## Capabilities

### New Capabilities

- `docker-generator-tool`: Docker 生成器工具——run/compose/Dockerfile/命令速查/镜像名解析/注册表 URL 解析(6 tab)。
- `nginx-generator-tool`: nginx 配置生成器工具——反代/SSL/缓存/压缩/安全/负载均衡功能开关,生成规范 conf。
- `jvm-params-tool`: JVM 参数生成器工具——按分类生成 JVM 启动参数带行注释。

### Modified Capabilities

(无——新增独立工具,不改动既有 13 工具行为)

## Impact

- **代码**:新增 `src/renderer/src/tools/docker-tools/`、`src/renderer/src/tools/nginx-generator/`、`src/renderer/src/tools/jvm-params/`;`register.ts` 各加 1 行;三个工具均 local(按钮触发),不注册 worker
- **依赖**:无新增运行时依赖(全部模板字符串拼接)
- **系统/服务**:无后端;core 纯函数本地运算
- **风险对齐**:生成器输出须遵循规范最佳实践(Dockerfile multi-stage、Compsoe 默认值、nginx 安全头、JVM 容器感知参数);模板输出为纯字符串,可 golden 测试断言精确内容
