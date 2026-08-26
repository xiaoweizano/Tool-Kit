---
name: ToolKit
description: 本地优先的中文开发者工具箱——10 个高频工具,粘贴即出,一套代码双输出
colors:
  surface-flat: "#0A0A0A"
  surface-raised: "#111214"
  surface-line: "#2A2C30"
  bone-text: "#F4F1EA"
  bone-primary: "#F4F1EA"
  signal-red: "#E30613"
  signal-amber: "#FFB300"
  signal-green: "#00A651"
  steel-muted: "#8A8D93"
  syntax-key: "#7FA8C9"
  paper-surface: "#F4F1EA"
  paper-ink: "#1A1917"
  caramel-surface: "#2B1F14"
  caramel-text: "#F2E6D4"
typography:
  display:
    fontFamily: "MiSans, HarmonyOS Sans SC, Microsoft YaHei UI, PingFang SC, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "MiSans, HarmonyOS Sans SC, Microsoft YaHei UI, PingFang SC, sans-serif"
    fontWeight: 400
  mono-data:
    fontFamily: "JetBrains Mono, Cascadia Code, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
  mono-example:
    fontFamily: "JetBrains Mono, Cascadia Code, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
  label:
    fontFamily: "JetBrains Mono, Cascadia Code, Consolas, monospace"
    fontSize: "11px"
    letterSpacing: "0.3em"
rounded:
  sm: "8px"
spacing:
  sm: "8px"
  md: "16px"
components:
  button-primary:
    backgroundColor: "{colors.bone-primary}"
    textColor: "{colors.surface-flat}"
    padding: "4px 16px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.bone-text}"
    padding: "4px 16px"
  input-tool:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.bone-text}"
    rounded: "{rounded.sm}"
  node-card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.bone-text}"
    rounded: "0px"
  nav-node:
    backgroundColor: "transparent"
    textColor: "{colors.steel-muted}"
---

# Design System: ToolKit — The Circuit Workbench

## Overview

**Creative North Star: "The Circuit Workbench"**

ToolKit 是一块带电的开发者工作台:10 个工具像线路板上的节点,电流流过即点亮。界面克制、精密、面向工程实感——主操作区是深色平黑,工具以节点形式进入,信号色不是装饰而是语义(红=错误、琥珀=处理中、绿=通过)。一切向"粘贴即出、复制即用"的工作流让路:高密度、低戏剧、等宽标注承载元信息。

质感以平坦为底,深度靠 base-100/200/300 的色调分层表达;唯一的发光(primary 阴影)严格保留给"电流到达节点"的瞬间——激活的导航项与其下方的亮线。用户已确认方向:在平坦底上为卡片 hover 增加轻微提拉感,但仍无环境阴影。

**Key Characteristics:**
- 线路图节点导航:每个工具是 2px 见方的节点点,激活=填满+发光+下延亮线
- 信号色三态语义:error/warning/success 永远表示 错误/处理中/通过
- 等宽标注体系:所有元信息(id、分区标签、统计)用 font-mono 11px + 0.3em 字距 + 中性灰
- 平坦为主、发光留白:阴影只属于"电流"
- 双输出同一代码:在线版与桌面版视觉完全一致

## Colors

三套 daisyUI 主题,同一语义角色在不同氛围下换值;配色情绪:暗=平黑工作台、亮=纸白、暖=焦糖。信号三色是跨主题最稳定的锚。

### Primary
- **Bone White / 骨白** (#F4F1EA):默认主题的 primary。用于激活状态(激活节点、亮线)、primary 按钮、首页 hover 边框。平黑底上近乎发光的暖白。
- **Ink / 墨** (#1A1917):纸白主题的 primary,亮主题下的对偶。

### Neutral
- **Flat Black / 平黑** (#0A0A0A):主表面 base-100。工作台底色,默认主题。
- **Raised Surface / 微抬面** (#111214):base-200,卡片/面板浮层。
- **Line / 线路灰** (#2A2C30):base-300,边框与网格线。
- **Steel Muted / 钢灰** (#8A8D93):neutral,等宽标注与次要文字。
- **Syntax Key / 键蓝** (#7FA8C9):JSON 逐行着色中"键"的专属色(`.tk-k`);字符串/数字/字面量复用信号绿/琥珀/钢灰,唯键用此蓝,是体系里唯一的冷色。
- **Caramel Surface / 焦糖面** (#2B1F14)+ **Warm Cream / 暖奶油** (#F2E6D4):第三主题的底色与文字。

### Signal（语义色,非装饰）
- **Alert Red / 告警红** (#E30613):ERROR。错误态输出、错误徽标、出错定位。纸白主题用更深 #C50A10,焦糖用 #E8353D。
- **Current Amber / 电流琥珀** (#FFB300):WARNING/处理中。running 状态、JSON 数字着色、进度指示。纸白主题用深琥珀 #B07500。
- **Pass Green / 通过绿** (#00A651):OK。成功态、VALID 徽标、JSON 字符串着色。纸白 #007A3D、焦糖 #2FBF71。

### Named Rules
**The Signal-Color Rule.** error/warning/success 是语义槽,永远表示 错误/处理中/通过。它们只在状态相关处出现,绝不做装饰配色。

**The Current-Flow Rule.** 发光(primary 阴影)只属于"电流到达节点"——激活导航项的节点、其下延亮线、首页 hover 边框。其余任何表面不发光。

## Typography

**Display/Body Font:** MiSans / HarmonyOS Sans SC / Microsoft YaHei UI / PingFang SC(sans-serif)
**Label/Mono Font:** JetBrains Mono / Cascadia Code / Consolas(monospace)

**Character:** 中文界面无衬线为主,朴素工程感;等宽体承载一切"数据性"文字(工具 id、分区标签、统计、代码/JSON 输出),靠字距与体积制造层次而不是靠装饰。

### Hierarchy
- **Title** (700, 20px/1.25, 无):工具页主标题 `text-2xl font-bold`,页面唯一视觉主角。
- **Body** (400, 14px/1.5, 无):说明、选项描述、一般内容。
- **Mono Data** (400, 13px/1.6, mono):工具输入/输出数据区(textarea、格式输入、代码/JSON 展示)的等宽数据文字——输入输出是同字号的连续数据流。
- **Label** (400, 11px, 0.3em 字距):分区标签与元信息,一律 `font-mono text-[11px] tracking-[0.3em] text-neutral`——这是全系统的标注语法。

### Named Rules
**The Mono-Annotation Rule.** 元信息(id、分区标签、统计、快捷键说明)永远用 mono 11px + 0.3em 字距 + 中性灰。它们不抢正文,但永不缺席。正文与标题不用 mono。

## Layout

应用壳为固定双栏:左 15rem 导航栏(节点列表,`max-lg` 折叠为 3.5rem 图标窄栏),右主区铺 `circuit-grid` 网格底纹。工具页内容 `mx-auto max-w-4xl p-6`,输入面板在上、三态输出在下;有选项的工具在输入与输出之间放一行 `toolbar`(缩进切换/生成按钮)。首页为节点图:搜索框 + RECENT 行 + `grid-cols-2 md:grid-cols-3` 工具卡片。节奏以 8px 为基(space-y/px 的 sm/md/lg),面板间距 16-24px。

## Elevation & Depth

平坦为主。深度通过 base-100→200→300 色调分层:主表面 100,浮层面板 200,边框/网格 300。**默认无环境阴影**;发光保留给电流语义(见 Current-Flow Rule)。用户已确认:卡片 hover 增加**轻微提拉感**——一个低强度、低扩散的阴影(`hover` 时约 `0 4px 12px rgba(0,0,0,0.35)`)让可点卡片有可感知的浮起,但仍克制、不扩散到其他表面。

### Named Rules
**The Flat-By-Default Rule.** 表面静止时是平的。阴影只出现在:电流语义(节点/亮线发光)、卡片 hover 的微提拉。没有常态卡片阴影。

## Shapes

形体语言近乎方形:节点点是 2px×2px 的方块(非圆点),卡片面板直角 + 1px `base-300` 边框,工具分区用 `border border-base-300 bg-base-200/40` 带浮动的 mono 标签。daisyUI 控件(按钮/输入框)保留其默认小圆角(≈8px)。没有大圆角、没有裁剪/异形。视觉张力来自线路(网格线、亮线)而非圆角。

## Components

### Navigation（导航节点）
- **Style:** 线路图节点列表。每项 = 2px 方形节点点 + 工具名 + 可选 NET 徽标。
- **Default:** 节点空心(`border-neutral bg-base-100`),文字 `text-neutral`,hover 转 `text-base-content`。
- **Active:** 节点填满 primary + 发光(`shadow-[0_0_8px_var(--color-primary)]`),名称 `text-base-content`,节点下方一根 2px 宽 primary 亮线垂直下延(发光同源)。窄栏折叠时隐藏文字与徽标,仅留节点点。

### Buttons（按钮）
- **Shape:** daisyUI 默认小圆角;`btn-primary` 骨白底黑字(或主题 primary 对偶),`btn-outline` 描边透明底,`btn-ghost` 用于工具栏缩进切换。
- **Sizes:** `btn-sm`(工具栏/生成)、`btn-xs`(分区内小操作如"一键默认值"、"复制"用 `btn-success` 与 `btn-outline`)。
- **Hover:** daisyUI 默认态变深;无发光。

### Cards / Node Cards（节点卡）
- **Corner Style:** 直角。
- **Background:** `bg-base-200/60`(半透明抬面),叠在 `circuit-grid` 网格上。
- **Border:** 1px `base-300`;hover 转 `border-primary`。
- **Shadow:** 默认无;hover 微提拉(见 Elevation)。
- **Internal Padding:** `p-4`。

### Inputs（输入框）
- **Style:** `input input-bordered w-full font-mono text-sm`。工具输入恒等宽字体——这是"粘贴即用"的输入通道,与输出同字体,视觉上输入/输出是一体的数据流。
- **Focus:** daisyUI 默认 focus 描边。
- **Area variant:** 大输入用无框 `textarea`(`border-0 bg-transparent p-4 font-mono`)嵌在分区面板内。

### Panels / Section Labels（分区面板）
- **Structure:** `border border-base-300 bg-base-200/40`,左上角浮出 mono 标签(`-mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral`)如 `INPUT · 输入`、`SQL(每条一行)`。
- 工具页 = 若干分区面板纵向堆叠,中间夹 toolbar。

### Status / Tri-State（三态输出）
- **OK:** 文本 + `text-success`;**ERROR:** 面板 `border-error/60` + `text-error` 标题(`✕ ERROR · 输入无效`)+ 定位说明;**RUNNING:** `text-warning` 转圈(`◐ 处理中…`);**EMPTY:** 中性灰引导文案。
- 输出区虚拟滚动 + 逐行 JSON 着色(`.tk-k` 键 / `.tk-s` 字符串 / `.tk-n` 数字 / `.tk-p` 字面量)。

### Badge / NET（联网徽标）
- `badge badge-xs badge-outline font-mono text-[11px]`,仅联网增强工具显示。描边而非填充——避免与信号色语义冲突。

### Tabs / Toolbar（方向页签与工具条）
- **Tabs:** `tabs tabs-boxed`,`tab-active` 高亮当前方向(md↔Word、Excel↔md 的双向切换)。
- **Toolbar:** 输入与输出之间一行 `flex items-center gap-2`,左侧信号线(`bg-success/error/warning` 按状态变色)+ 中部操作按钮 + 右侧次要按钮。

## Do's and Don'ts

### Do:
- **Do** 用 mono 11px + 0.3em 字距 + 中性灰作所有分区标签与元信息——这是全系统统一的标注语法。
- **Do** 让工具输入与输出同为等宽字体——输入/输出是一条连续数据流。
- **Do** 把 error/warning/success 留给 错误/处理中/通过 三态语义。
- **Do** 用 `circuit-grid` 作为表面底纹(导航栏、主区、节点卡),传递"线路板"身份。
- **Do** 给可点卡片 hover 一个低强度微提拉阴影(约 `0 4px 12px rgba(0,0,0,0.35)`)制造可感知的浮起。

### Don't:
- **Don't** 把信号三色(红/琥珀/绿)当装饰色用——它们是语义槽。
- **Don't** 给静态卡片常态阴影——表面默认是平的,发光只属于电流、提拉只属于 hover。
- **Don't** 用正文 sans 字体承载元信息(统计、id、标签)——mono 才是标注体。
- **Don't** 在标题上叠加字距或大写装饰——标题是 `text-2xl font-bold` 的朴素主角,层次靠 mono 标注制造。
- **Don't** 引入大圆角、异形裁剪或渐变背景——形体语言是直角 + 线路。
