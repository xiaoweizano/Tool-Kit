# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Electron 桌面壳(Win/Mac)+ 静态 Web 在线版,均为 Web 技术渲染,设计语言按 web 处理;桌面是产品本体,在线版是服务器到期前的过渡形态。

## Stack

React + TypeScript + Vite + Electron;样式 Tailwind CSS + **daisyUI**(主题系统,2026-08-24 由 shadcn/ui 方案调整而来);状态 zustand;测试 Vitest。(全新仓库,用户明确选定)

## Users

- 主用户:自己与团队的开发者(自用优先,兼容未来对外开放)
- 场景:日常开发高频「苦力活」——拼批量 SQL、解析 JSON、时间戳互转、md/Excel 格式转换、查 Linux 命令等,输入常来自日志/控制台复制
- 工具习惯:粘贴即用、期望离线可用、中文界面

## Product Purpose

ToolKit 是一个开发者工具箱:把 10 类高频开发苦力活(租户 SQL 组装、JSON 解析、ID 生成、时间戳互转、md↔Word、SQL 占位符、正则生成、Linux 命令大全、Excel↔md、测试数据生成)集中到一处,粘贴即出结果。成功 = 用户日常真的用它替代散落的小工具,且离线/服务器到期后依旧完整可用。

## Positioning

本地优先:全部工具纯前端本地运算,「服务器到期后桌面照样完整可用」是散落的在线小工具给不了的承诺。一套代码双输出 + ToolDescriptor 注册表扩展(加工具=加目录+注册一行)。

## Operating Context

- 使用节奏:从日志/控制台复制 → 粘贴 → 即时结果 → 一键复制回 IDE/终端
- 运行环境:Windows/macOS 桌面(Electron)或浏览器(在线版);无网络时除联网增强外全部可用
- 界面语言:中文
- 主题:内置多套主题(亮色/深色/焦糖色等,基于 daisyUI 主题系统),用户可自定义 UI 样式

## Capabilities and Constraints

已确认能力(v0.1):

- 10 个工具全部进 v0.1(完整工具箱首发)
- 粘贴即出结果:自动识别+即时转换(防抖≤200ms),无需点「转换」按钮
- 错误三态 OK/ERROR/EMPTY,无静默失败(输入无效定位/部分失败标注/不支持提示)
- 一键复制输出
- 多主题系统(daisyUI):亮色/深色/焦糖色等默认主题 + 用户自定义样式
- 可扩展:ToolDescriptor 契约 + 注册表,导航/路由由注册表驱动

硬约束:

- 本地优先:纯前端本地运算,不依赖后端;未来同步/AI 仅为可选增强层(桌面密钥入 OS keychain,在线版不放任何密钥)
- 一套代码双输出:renderer 环境无关,Electron 能力经 preload 适配器注入;在线版=同源静态构建
- md↔Word 保真策略:v0.1 用前端库(在线/桌面同精度),v0.2 桌面版内嵌 pandoc 提精度(约 +150MB)
- CI/分发从第一天(GitHub Actions 双通道构建,Win/Mac 安装包;代码签名后补)
- golden-file 测试锁定转换保真(工具核心为纯函数 transform)

明确不在范围(本阶段):AI 增强、跨设备同步、代码签名证书、工具 2-10 之外的新工具。

## Brand Commitments

- 产品名:**ToolKit**(正式名,2026-08-24 确认)
- 界面语言:中文
- UI 样式体系:daisyUI 主题系统,内置亮色/深色/焦糖色等默认主题,支持用户自定义样式
- 视觉气质:酷炫、现代化(用户原始需求明确;具体视觉世界由后续设计工作定义)

## Evidence on Hand

- 设计文档:`project-docs/design.md`(office-hours 产出 + CEO 评审加固)
- 实施方案:`openspec/changes/toolbox-foundation/`(proposal/design/specs/tasks)
- 无代码实现(全新仓库,未 git init)
- 无真实用户内容、评价、数据——后续工作不得虚构

## Product Principles

1. 本地优先,离线完整——桌面版永远是本体,任何增强不得破坏离线可用
2. 粘贴即出结果——输入到结果的路径上不设按钮
3. 无静默失败——每个错误都被看见并被定位
4. 一套代码双输出——在线与桌面永远同源同精度(显式声明的 pandoc 增强除外)
5. 可扩展是契约——加工具=实现 ToolDescriptor+注册一行

## Accessibility & Inclusion

- 键盘可达:核心操作不依赖鼠标(CEO 评审确认方向)
- 中文为第一界面语言
