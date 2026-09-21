# REST 客户端整体改版：Apifox 式上下结构 + 可折叠

> 阶段：对已落地的 `rest-api-client-tool` 做整体版式改版。纯版式/交互容器改版，不新增功能，不改数据结构。
> 用户裁决（2026-09-21，逐项确认 5 条）：
> 1. 皮肤仍走 ToolKit / `DESIGN.md`（平黑、骨白、mono 标注），**不引入** Apifox 的亮色 + 紫 accent；只学它的结构。
> 2. 请求区四块（Params / Headers / Body / cURL）改为**页签**，不用手风琴。
> 3. 响应区折叠后**保留状态摘要条**（状态码/耗时/体积常驻可见）。
> 4. 左栏改为「**集合 / 历史**」页签式；环境选择常驻顶部，导入导出收成图标按钮。
> 5. 顶部只把**已有的 dirty 状态显性化**（`● 未保存`），不加「保存回写当前集合节点」——那是行为变更，另起一个 change。

## Goal

把 REST 客户端从「左右并排三栏 + 五块纵向堆叠」改为 Apifox 式的**上下分栏 + 页签分组 + 可折叠响应区**，解决三个具体问题：

| 问题 | 现状 | 改版后 |
|---|---|---|
| 编辑区高度被摊薄 | 四块面板纵向堆叠，Body 写死 `h-32`；粘一大坨转义 JSON 时视野只有 8 行 | 页签化，Body 独享「主区高度 − 头部三行 − 响应区」 |
| 响应区挤在右窄栏 | `w-2/5` 固定宽度，长 URL / 长 JSON 大量折行 | 占满整宽，高度可拖、可折叠 |
| 左栏塞满、互相抢高度 | 五段纵向堆叠，集合树与历史各占 `flex-1` 平分下半段 | 「集合 / 历史」页签切换，各自独享整段 |

**保持不变**：全部数据流、存储层、解析层（`store.ts` / `http-client.ts` / `curl-parse.ts` / `curl-build.ts` / `env-resolve.ts` / `query-params.ts` / `deep-link.ts`）一行不改。所有 `data-testid` 保留。

## 非目标（YAGNI）

- **不加「保存回写当前集合节点」**。用户明确选择只显性化 dirty 状态；保存语义（含 `[保存 ▾]`、另存为副本收进 `⋯`）需要新 store 方法 + 新测试，按项目惯例单独走一个 OpenSpec change。
- **不做请求多标签页**（Apifox 顶部那排浏览器式 tab）。当前工具是「载入一个请求改一个」，多标签会连带引入未保存草稿的生命周期问题，超出本次范围。
- **不引入拖拽库**。分隔条用原生 pointer 事件 + `setPointerCapture`，不新增依赖（web purity 约束）。
- **不改存储 schema**：`toolkit.rest-client` 的 `partialize` 白名单与 `BUNDLE_VERSION = 1` 的 bundle 结构都不动。
- **不改视觉体系**：不新增颜色 token，不加圆角/阴影/渐变。页签激活态复用现有 primary 下划线语汇（`border-bottom: 2px primary`），与节点导航的「亮线」同源。

## 1. 布局骨架

```
┌────────────┬──────────────────────────────────────────┐
│ 左栏 200px │ 请求区  flex-1（内部自管滚动）            │
│ （自管滚动）│  标题行 / URL 行 / 页签行 / 编辑区         │
│            ├──── 分隔条 3px（仅展开态存在，可拖）───────┤
│            │ 响应区 折叠=仅头部一行 / 展开=记忆高度      │
└────────────┴──────────────────────────────────────────┘
```

**关键改动**：`index.tsx:175` 现在用 `flex min-w-0 flex-1 gap-3 overflow-auto p-4` 包住两个面板。那个 `overflow-auto` 会让**整页滚动**，与固定上下分栏直接冲突（拖动分隔条时整页会跟着弹）。改版后：

- 外层容器去掉 `gap-3`、`p-4`、`overflow-auto`，改为 `flex min-h-0 flex-1 flex-col`；分栏贴边（工作台语汇，不留内边距）。
- 滚动下移到**两处内容区内部**：请求区编辑区、响应区 body 预览。
- 左栏继续自管滚动，宽度 200px（现为 `w-56` = 224px，收 24px 给主区）。

## 2. 请求区

三行头部 + 内容区：

| 行 | 内容 |
|---|---|
| 标题行 | 请求名称输入框（**仍是 `<input>`**，`aria-label="请求名称"` 保留；仅去掉 `input-bordered` 外观改为无框标题样式，聚焦时才显边框）· `● 未保存`（仅 dirty 时出现）· 右端 `另存为副本` |
| URL 行 | METHOD ▾ / URL 输入 / 超时 ▾ / `发送` |
| 页签行 | `Params` `Headers 2` `Body` `cURL`（计数为 0 时不显示数字） |

- **页签内容 = 现有四块原样迁移**，只换容器，不重写逻辑。特别是 `RequestPanel.tsx:30-56` 那套「本地 `params` state + `syncedUrlRef` 防回解析覆盖、按 key 名复用 id 防止重挂载打断中文输入法」的机制必须原样保留——它是已有测试（`rest-client-ui.test.tsx` 第 4 条）守着的坑。
- **cURL 页签自带的动作随内容一起搬**：`导出 cURL`、`解析导入`、粘贴 `textarea` 都留在 cURL 页签内部，不提到头部——它们是该页签的局部动作，不是全局动作。
- **`格式化 JSON` 留在 Body 页签内容内**，不提到页签行右端。它与自己的报错文案 `formatMsg`（「body 不是合法 JSON，无法格式化」）必须相邻，否则点完按钮的反馈会被甩到几百像素之外——这是不静默原则在细节上的落地。
- **一次只渲染激活页签的内容**，不再四块同屏。
- **页签计数**：Params 用 query 参数条数、Headers 用 `headers.length`；为 0 时不显示数字（避免 `Params 0` 的噪声）。计数的意义是「未激活的页签里有没有东西」，折叠/切走后仍看得见。
- Body 编辑区高度改为 `flex-1` 吃满剩余空间，去掉写死的 `h-32`。
- URL 行下方的变量提示（未定义变量徽标 / `→ 解析预览`）保留在 URL 行与页签行之间。
- 标题行的 `● 未保存` 直接消费已有变量 `dirty`（`index.tsx:42` `JSON.stringify(draft) !== JSON.stringify(baseline)`），不新增状态；`另存为副本` 成功后 `baseline` 被重置，标记自然消失。

## 3. 响应区

### 单一头部（重要约束）

展开态与折叠态**共用同一个头部组件，只渲染一次**。头部恒含：折叠箭头、`返回响应`、状态徽标、耗时、体积、右端动作（`复制` / 深链按钮）。

不做「折叠态一套摘要条 + 展开态一套头部」——那会让 `200 OK` 在 DOM 里出现两处，`findByText(/200/)` 这类查询会因多匹配而抛错，也会让「状态到底在哪看」变成两套实现。

| 形态 | 渲染 |
|---|---|
| 折叠 | 仅头部一行。**内容区不渲染** |
| 展开 | 头部 + `HEADERS · N` 折叠行 + body 预览 + 底部深链按钮行 |

折叠时**不渲染**内容区是刻意的：超过 1MB 的截断预览、大 JSON 树（`JsonView`）在折叠状态下不该继续占 CPU 与内存。

### 拖拽与记忆

- 分隔条 3px，pointer 拖拽改高度，使用 `setPointerCapture` 保证拖出窗口也不丢事件。
- 高度 clamp：**min 120px**，**max = 主区高度 − 160px**（保证请求区永远留得住头部 + 至少几行编辑区）。
- 双击分隔条复位到默认 **320px**。
- 键盘可达：分隔条 `tabIndex=0`，`role="separator"`，`aria-orientation="horizontal"`（分隔条本身是横线，夹的是「上/下」两个面板），`aria-valuenow`/`aria-valuemin`，`aria-valuemax` 仅在容器高度可测时给出（不可测时省略该属性，避免 `now > max` 的非法取值）；`↑/↓` 按 16px 步进调整。折叠切换按钮 `aria-expanded`。
- 记忆：高度 + 折叠状态写入**独立 localStorage key** `toolkit.rest-client.layout`。

**为什么布局状态不进 zustand store**：`store.ts:191` 的 `partialize` 与 `store.ts:218` 的 `exportBundle` 都是**显式列字段**的。布局是会话级 UI 顺位，放进去就多了一条「会不会混进 bundle schema」的路径要守；放独立 key 则完全无交集。

**读写必须走 `@core/storage`**：`core/storage.ts` 开头写明「一切持久化的单一出口（renderer 内禁止直接调 localStorage）」，用 `storageGet` / `storageSet`，不要直接碰 `localStorage`。

**已知且刻意的降级**：布局读/写失败（隐私模式、配额）时静默回落到默认值，**不触发**顶部「本地存储写入失败」横幅。这不是新开的例外——`storageGet`/`storageSet` 本身就是按「静默、不影响功能」实现的既有约定；而且这条数据和用户数据无关、也没有可采取的动作，store 那条横幅守的是集合/环境/历史，不该被无关噪声点亮。写测试时按「读失败回落默认、不抛错、不点亮横幅」断言。

### 发送后不自动展开

用户折起响应区写 JSON 时，发完请求**不**把布局拽走；摘要条从 `◐ 进行中` 变为结果色即可，状态始终可见（见 §5）。

### 失败时自动展开（成功与失败的唯一不对称）

**错误出现即展开响应区**——请求失败与 cURL 导入失败都算。

理由是折叠态只能显示标题：「✕ 请求失败」亮着，但**为什么**失败藏在折叠区里，这就是隐瞒。而 cURL 导入的报错本来就渲染在响应区，用户刚在 cURL 页签点完「解析导入」，反馈不能被折叠吃掉。

一句话概括这条规则：**成功不抢布局，失败一定让你看见。**

## 4. 左栏

自上而下：

1. `+ 新建请求`（常驻）
2. **ENV 行**：`ENV` 标签 + 环境选择器常驻一行（每次请求都要看）
3. `▸ 变量(N)` 可折叠块——**默认展开**。这是 `{{var}}` 的唯一入口，默认折起等于给每次改环境变量加一次点击。
4. **页签行**：`集合` | `历史`（默认 `集合`）；右端 `⬆ 导出` `⬇ 导入` 两个图标按钮 + 导入结果提示行
5. 页签内容：
   - 集合：`+ 分组` `+ 请求` 工具行 + 现有 `TreeNode` 树（原样，含 `parentId` 校验与「绝不静默丢弃」逻辑）
   - 历史：满高列表（现有条目原样，含「已截断」徽标）

页签切换只渲染激活项。

## 5. 状态与不静默

改版不能引入新的静默口子。逐条对应：

| 状态 | 表现 |
|---|---|
| 未发送 | 头部显示 `返回响应 · 填好请求，点发送或 Ctrl+Enter`（中性灰） |
| 进行中 | 头部徽标 `◐ 请求进行中…` + `取消` 按钮（琥珀） |
| 失败 | 头部徽标 `✕ 请求失败` + 原因（告警红）；**折叠态同样可见** |
| 成功 | 状态徽标（2xx 绿 / 4xx5xx 红，沿用 `statusColor`）+ 耗时 + 体积 |
| 存储写失败 | 顶部横幅保留（`index.tsx:159`） |
| 响应 > 1MB | 截断提示行保留，明示「复制/深链使用全量」 |
| 未替换变量 | 提示行保留（响应头部下方） |

**核心不变式**：折叠不等于隐瞒。折叠态头部必须仍带状态徽标/耗时/体积，且进行中与失败在折叠态同样亮色可辨；错误出现时自动展开响应区（§3），保证失败原因不被折叠吃掉。

## 6. 文件与测试影响

### 改动

| 文件 | 改动 |
|---|---|
| `src/renderer/src/tools/rest-api-client/index.tsx` | 骨架改上下分栏；消费布局 hook；`dirty` 传入标题行 |
| `.../components/RequestPanel.tsx` | 四块改页签化；编辑区吃满高度；标题行加脏标记 |
| `.../components/ResponsePanel.tsx` | 抽出单一头部；加折叠；body 区吃剩余高度 |
| `.../components/Sidebar.tsx` | ENV 常驻 + 变量可折叠；集合/历史页签化；导入导出收图标 |
| `test/rest-client-sidebar.test.tsx` | 第 15 条：先点 `历史` 页签再断言（断言语义不变） |
| `test/rest-client-ui.test.tsx` | 第 1 条：用例标题「渲染三栏关键控件」过时 → 改标题（断言只用 testid，不改） |

### 新增

| 文件 | 职责 |
|---|---|
| `.../split-layout.ts` | 纯逻辑：`MIN_RESPONSE_H` / `MAX_RESERVE` / `DEFAULT_RESPONSE_H` / `RESIZE_STEP` 常量、`maxResponseHeight` / `clampResponseHeight` / `normalizeLayout` / `readLayout` / `writeLayout`。无可测容器高度时只保底不加编造的上界 |
| `.../use-rest-layout.ts` | 布局记忆 hook：`{ height, collapsed, setHeight, toggle, expand, reset }`，经 `@core/storage` 读写 `toolkit.rest-client.layout` |
| `.../components/Splitter.tsx` | 分隔条：pointer 拖拽（window 级 pointermove/up）+ 键盘步进 + clamp + 双击复位 + ARIA |

### 新增 data-testid

`layout-splitter`、`response-panel`、`response-toggle`、`response-body`（展开态才存在的 body 容器，供「折叠后内容不在 DOM」断言）、`request-tab-params|headers|body|curl`、`sidebar-tab-collections|history`、`dirty-marker`。

### 新增测试覆盖

1. 折叠/展开切换：折叠后内容区不在 DOM（`queryByTestId` 为 null），头部状态文本仍在。
2. 拖拽 clamp：模拟 pointer 序列，断言不超过 `max = 主区高 − 160`、不低于 120。
3. 双击复位到 320。
4. 页签只渲染激活项：切到 Headers 后 Body 的 textarea 不在 DOM。
5. `● 未保存` 出现/消失：改 URL 后出现；`另存为副本` 后消失。
6. 布局记忆：读失败（mock `localStorage.getItem` 抛错）→ 回落默认值、不抛、不点亮写失败横幅。
7. 折叠态失败可见：mock 请求失败，折叠后头部仍有 `✕ 请求失败`。
8. 失败自动展开：先折叠，再触发一次失败请求 → 响应区变为展开态（`aria-expanded="true"`、`response-body` 回到 DOM）。

### 现有测试兼容性核查

- `rest-client-sidebar.test.tsx` 第 1–14 条：全部只用 `data-testid`，且目标控件在**集合页签 / ENV 常驻区**内，默认可见 → 不破。
- 第 6 条依赖 `env-var-key` 存在 → 变量块**默认展开**保证不破（这也是 §4 默认展开的第二个理由）。
- `rest-client-ui.test.tsx` 第 3 条 `await screen.findByText(/200/)` → 依赖 §3「单一头部」约束（`200 OK` 在 DOM 中只出现一次）。
- `test/rest-client-{curl,deeplink,env,http,query,store,export}.test.*`：纯逻辑层，不受版式影响 → 不破。

### 与已有 OpenSpec 需求的一致性

`openspec/changes/rest-api-client-tool/specs/rest-api-client/spec.md` 的需求逐条核对后**无冲突、无需 spec 变更**：

- L15 `RequestPanel` SHALL 提供 method 下拉 / URL / headers 编辑器 / body 编辑器（带格式化）→ 全部保留，仅换容器为页签。
- L118 `ResponsePanel` SHALL 展示状态码（2xx 绿 / 4xx5xx 红）、耗时、字节、最终 URL、响应 headers、body；JSON 复用 `JsonView`；`CopyButton`；>1MB 截断提示 → 全部保留。**最终 URL 行必须在展开态保留**。
- L144 响应区 SHALL 提供「用 JSON 解析打开」/「用 JWT 解析打开」→ 保留在展开态底部动作行。

改版只动「这些控件摆在哪个容器里」，不动「存在什么控件、提供什么行为」，故不产生 requirement delta。

## 验收

- `pnpm test` 全绿（含上述新增 7 项覆盖）。
- `pnpm typecheck` / `pnpm lint` 通过。
- 手工在应用内走通：粘 cURL 导入 → 切页签 → 发请求 → 拖分隔条 → 折叠/展开 → 切左栏页签 → 载入集合请求（dirty 弹确认）→ 折叠状态下发一个失败请求（状态仍可见）。
- 三种主题（深色/纸白/焦糖）下结构一致、仅换色；`DESIGN.md` 无新增 token。
