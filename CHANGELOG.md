# Changelog
## 0.2.0-tools-14to22(未发布)
- 密码加密组:#15 密码生成(随机/AES-GCM/RSA-OAEP/BCrypt)、#16 密码强度分析、#18 JWT 解析(HS 全算法)
- 数据文本组:#14 文本对比(line/word/char 高亮+XSS 转义)、#17 进制转换(BigInt)、#21 日志分析(9 维分析+异常聚类+50MB 截断)
- 配置生成组:#19 Docker 生成(run/compose/multi-stage Dockerfile/速查/镜像名/注册表解析)、#20 nginx 配置生成、#22 JVM 参数生成
- 新依赖(bcryptjs、jose、diff),均浏览器安全、按工具 lazy 加载
- 加密正确性为硬门槛:AES-GCM(随机盐)/RSA-OAEP/BCrypt 往返一致、JWT 安全不变量(alg:none/过期/篡改)均有 golden 测试

## 0.1.0-foundation(未发布)
- 基座:应用壳/三主题/注册表/Worker 转换通道/Ctrl+K
- 工具:JSON 解析(黄金模板)
- 构建:双通道 + CI + Playwright 守门 + Releases 检查更新
