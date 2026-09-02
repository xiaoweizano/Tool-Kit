# docker-generator-tool Specification

## ADDED Requirements

### Requirement: Docker run 命令生成
`generateRun(options)` MUST 生成 `docker run ...` 命令字符串:输入 image/name/port 映射/volume/env/restart 策略/network。返回 `ToolResult<string>`。缺 image(必填)→ `invalid-input`。

#### Scenario: 生成 docker run 命令
- **WHEN** 用户填 image=nginx:alpine、port 80→8080、restart=unless-stopped
- **THEN** 输出含 `-p 8080:80`、`--restart unless-stopped` 的 docker run 命令

#### Scenario: 缺 image 返回 invalid-input
- **WHEN** 未填 image 即生成
- **THEN** 返回 `{status:'error', kind:'invalid-input', message:'请填写镜像名'}`

### Requirement: Docker Compose 生成
`generateCompose(services)` MUST 生成 docker-compose.yml:每服务含 image/port/volume/env/depends_on。输出合法 YAML。无服务→ `invalid-input`。

#### Scenario: 生成单服务 compose
- **WHEN** 用户填一个服务(名称 web、image、port)
- **THEN** 输出含 `services:` 下 `web:` 的合法 docker-compose.yml

### Requirement: Dockerfile 生成
`generateDockerfile(options)` MUST 生成 Dockerfile(multi-stage 最佳实践):base image/工作目录/复制/安装/暴露端口/入口命令。返回 `ToolResult<string>`。缺 base image→ `invalid-input`。当 `buildBase` 提供时,输出含 `FROM <buildBase> AS build` 与 `COPY --from=build` 的多阶段 Dockerfile;未提供 `buildBase` 时输出单阶段 Dockerfile。

#### Scenario: 生成带多阶段构建的 Dockerfile
- **WHEN** 用户填构建阶段(buildBase/buildRun/buildCopy/copyFromBuild)与运行阶段(base/expose/entrypoint)
- **THEN** 输出含 `FROM <buildBase> AS build`、`COPY --from=build` 与 `CMD` 的多阶段 Dockerfile

### Requirement: Docker 命令速查
命令速查数据 MUST ≥50 条,支持按分类浏览/搜索命令名与说明。数据含 flag/说明/示例。

#### Scenario: 搜索 docker 命令
- **WHEN** 用户搜索 "build"
- **THEN** 返回含 docker build 的匹配结果卡

### Requirement: 镜像名解析
`parseImageName(image)` MUST 拆解镜像全名:registry/namespace/repo/tag。返回 `ToolResult<{registry, namespace, repo, tag}>`。

#### Scenario: 解析带 registry 的镜像名
- **WHEN** 输入 "registry.example.com:5000/ns/app:v2"
- **THEN** 输出 registry=registry.example.com:5000、namespace=ns、repo=app、tag=v2

#### Scenario: 缺 tag 或缺 namespace 的镜像名
- **WHEN** 输入 "nginx:alpine" 或 "ubuntu"
- **THEN** 分别解析出 tag=alpine / 无 tag 时 tag 默认 latest

### Requirement: 注册表 URL 解析
`parseRegistryUrl(url)` MUST 拆解注册表地址:scheme/host/port/path。返回 `ToolResult<{scheme, host, port, path}>`。

#### Scenario: 解析 registry URL
- **WHEN** 输入 "https://registry.example.com:5000/v2"
- **THEN** 输出 scheme=https、host=registry.example.com、port=5000、path=/v2

### Requirement: 本地离线与复制
生成与解析 MUST 全本地纯前端,零网络;结果可一键复制;核心为纯函数可 golden 测试。

#### Scenario: 纯函数可测
- **WHEN** 直接调用各生成/解析函数
- **THEN** 返回确定的 `ToolResult`,由 golden test 断言精确输出
