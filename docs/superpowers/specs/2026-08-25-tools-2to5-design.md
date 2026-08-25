# ToolKit 工具 2-5 实现设计（date-converter / sql-placeholder / id-generator / sql-builder）

> 阶段:tools 批量扩展第一波。沿用已验证的 JSON 黄金模板(src/tools/json-parser/)复制 4 个纯字符串/格式处理工具,证明「每个新工具 = src/tools/<id>/ 目录 + register.ts 一行 + transform.worker.ts 一行」的扩展效率。
> md↔Word、Excel↔md、正则生成、测试数据生成、Linux 命令大全 5 个复杂工具**本次不做**。

## Goal

为 ToolKit 增加 4 个高附、纯本地、可离线、中文 UI 的工具:时间戳互转、SQL 占位符替换、ID 生成、租户 SQL 组装,全部仿 JSON 黄金模板落地并通过 golden 单测。

## Tech Stack（沿用基座,无新增依赖）

React 18 + TS 5 + zustand + Comlink Worker + Vitest;Tailwind 4 + daisyUI 5（已有主题）;无新增 runtime 依赖（SQL 格式化/解析自研轻量实现,不引库）。

## 全局约束（沿用 toolbox-foundation plan 的 Global Constraints）

- renderer 目录禁止 `import electron`;HashRouter;三态 OK/ERROR/EMPTY 无静默失败;中文 UI;等宽标注最小 11px
- 工具核心为**纯函数 transform**,无 DOM/网络,可脱离 UI 直接测试；golden 化
- 每个工具 TDD（先红后绿）;每个工具结束 `git commit`
- **不改动** `core/` 基座与 worker 通道签名(`run(id, input, opts)` 的 input 为 `unknown`,多输入工具把输入封装为对象传入)

## 共享架构

每个工具落 `src/tools/<id>/`:

| 文件 | 职责 |
|------|------|
| `transform.ts` | 导出纯函数 transform + 选项类型 + 辅助函数,无副作用 |
| `index.tsx` | 页面(组合 InputZone/TriStateOutput 等);`register.ts` 的 lazy 目标 |
| `icon.tsx` | 节点图标(与壳层节点风格一致) |
| `register.ts` 追加 1 行 | ToolDescriptor 注册(路由 /tools/<id>,capability offline: true) |
| `transform.worker.ts` 追加 1 行 | worker 注册表 registry.set(id, transform) |

多输入工具(占位符/租户 SQL)把输入封装为对象:`Transform<InputObj, string, Opts>`,经 `useLiveTransform<InputObj, string>` 传入。

**关键差异**:id-generator 是按钮触发型(无"粘贴即出"),**不经 useLiveTransform / worker 通道**,页面直接本地调用纯函数生成。

## 工具 2:`date-converter` 时间戳互转

- **输入**:单输入区,自动识别 unix 秒/毫秒/微秒,或日期串(ISO / 常见日期格式)
- **纯函数** `convertTimestamp(input: string): ToolResult<TimestampView>`
  - `TimestampView = { iso: string; local: string; utc: string; unixSeconds: number; unixMillis: number; unit: 's'|'ms'|'us'|'date'|'unknown' }`
  - 检测逻辑:纯数字→按位数判秒(10 位)/毫秒(13 位)/微秒(16 位);含字母→按日期串解析
  - 无法识别→ `{ status:'error', kind:'invalid-input', message, position }`
- **输出**:四视图(ISO 8601 / 本地可读 / UTC / unix 秒·毫秒)+ 检测精度徽标;提供互转(buildUtcToLocal / dateStrToTimestamp 等纯函数)
- 走标准 `useLiveTransform<string, TimestampView>` 通道

## 工具 3:`sql-placeholder` SQL 占位符

- **输入**:上方 SQL(含 `?`),下方参数区;`{ sql, params }` 对象
- **纯函数** `fillPlaceholders(input: { sql: string; params: string[] }): ToolResult<string>`
  - `?` 按序替换为参数;字符串值自动引号转义(单引号翻倍),数字/bool/null 原样;参数不足时保留 `?` 并标注缺位
  - **自动生成默认值**:`autoFillDefaults(sql, mode): { params: string[] }` 一键用默认值填满所有 `?`(字符串 `'p_1'`…、数字递增 1、bool `true`/`false`、null),用户可手动改
- **反向** `unfillLiterals(sql): ToolResult<string>`:把字符串字面值/数字换回 `?`
- **格式化** `formatSql(sql): ToolResult<string>`:轻量缩进(关键字换行+缩进 +多空格压单空格)。替换后的 SQL 可一键格式化
- 走 `useLiveTransform<{sql, params}, string>` 通道

## 工具 4:`id-generator` ID 生成（按钮触发）

- **交互**:类型下拉(UUID v4 / 真雪花 / 数字序列 / 随机字母数字短码)+ 批量数量 + 可选前缀/分隔符 + 「生成」按钮 + 一键复制全部
- **纯函数**:
  - `uuidV4(): string`(RFC 4122,自研,基于 crypto.getRandomValues)
  - `snowflake(): string`(真 64 位雪花:41bit 时间戳 + 10bit worker + 12bit 序列,进程内序列自增,16 进制/十进制输出,可测)
  - `sequence(start?, step?, count): string[]`
  - `shortCode(count, len): string[]`(字母数字混排)
  - `generateIds(type, count, opts): ToolResult<{ ids: string[]; preview: string }>` — preview 为前几行文本用于输出渲染
- **输出**:TriStateOutput 展示批量结果(文本拼接),一键复制全部
- **不走 useLiveTransform**:页面本地调用 generateIds(无输入防抖语义),仅 count/type/opts 变化时 regenerate

## 工具 5:`sql-builder` 租户 SQL 组装

- **输入**:`{ tenants: string[]; sqls: string[] }`(tenants = 数据库名,如 lsd/zqkj;sqls = 一组任意 SQL)
- **纯函数** `assembleTenantSql(input: { tenants: string[], sqls: string[] }): ToolResult<string>`
  - **每条 SQL × 每个租户** 笛卡尔积,**按租户分组**
  - 输出形态:
    ```
    -- ====================================================================
    -- [租户名] lsd
    -- ====================================================================
    <tenant.sql 该租户的全部 SQL,每条以 ; 结尾>
    
    -- ====================================================================
    -- [租户名] zqkj
    -- ====================================================================
    ...
    ```
  - 空租户/空 SQL → EMPTY 引导;SQL 缺 `;` 自动补
- **输出**:TriStateOutput 展示完整字符串,一键复制/导出
- 走 `useLiveTransform<{tenants, sqls}, string>` 通道

## 错误处理（统一,无静默失败）

- 输入为空 → OK 之外的 EMPTY 引导态(复用 TriStateOutput emptyHint)
- 非法输入 → `invalid-input` + 定位
- 其余内部异常 → `unsupported` 带说明
- 全部符合 `ToolResult<T>` 判别联合(core/types.ts)

## 测试

每个工具一个 `test/<tool>.test.ts`,覆盖:
- **合法输入 golden**:代表性样例断言精确输出(锚定行为)
- **非法/边界**:错误定位、空输入、参数不足、乱序
- **纯函数性**:直接调 transform,无 DOM/网络
- 每工具归属 v0.1 的 `docs/spec-checklist.md` 新增条目化验证

## 里程碑（复用 JSON 模板验证法）

`pnpm dev:web && pnpm dev` 双端同屏,逐工具走一遍：
- date-converter 粘 1706504 秒→四视图即时;粘日期串反转
- sql-placeholder 粘 `SELECT * FROM t WHERE a=? AND b=?` + 参数→替换;一键默认值填充;反向
- id-generator 选雪花生成 10 条复制
- sql-builder 填 lsd,zqkj + 两条 SQL→按租户分组输出

---

## Self-Review

1. **占位符扫描**：无 TBD/TODO;所有工具给出纯函数签名与输出形态。
2. **内部一致性**：4 个工具均复用黄金模板文件结构;id-generator 明确排除 worker 通道(交互形态不同);worker input 对象封装与现有 `run(id, input, opts)` 签名兼容(JSON 用 string 输入,多输入工具用对象,无需改桥)。
3. **范围**：聚焦 4 个简单工具,复杂 5 个明确排除,单 plan 可承载。
4. **歧义**：sql-placeholder 默认值/反向/格式化、sql-builder 分组形态均已在上文与用户确认。