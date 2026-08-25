# ToolKit 工具 6-7 实现设计（regex-generator / testdata-gen）

> 阶段:tools 批量扩展第二波(简单工具收官)。沿用黄金模板,落地 2 个纯本地工具。md↔Word、Excel↔md、Linux 命令大全 3 个复杂工具后续单独规划(用户已裁决:md↔Word v0.1 用纯前端库、v0.2 再上 pandoc)。

## Goal

新增「正则生成/测试」与「测试数据生成」2 个纯本地、中文 UI、golden 化的工具,完成 10 工具清单中的简单工具部分。

## Tech Stack（无新增依赖）

沿用基座:React 18 + TS + Comlink Worker + Vitest。正则匹配用 JS 原生 RegExp;SQL 建表解析自研正则;无 runtime 依赖。

## 全局约束（沿用上批次）

- transform 纯函数,无 DOM/网络,直接单测;输出统一 `ToolResult<string>`(TriStateOutput 契约)
- 不改 `core/` 基座签名;共享文件 append-only;TDD;每工具 commit
- renderer 禁 electron;中文 UI;三态无静默失败

## 工具 6:`regex-generator` 正则生成/测试

**多输入工具**(正则 + 测试文本),走 `useMultiFieldTransform`。

**纯函数**(`src/tools/regex-generator/transform.ts`):
- `matchRegex(input: { pattern: string; flags: string; text: string }): ToolResult<string>` — 非法正则 → invalid-input(含位置);0 匹配 → ok + "无匹配"文本;有匹配 → 列表文本(`第 N 个:`内容+位置),首行匹配计数
- `highlightSegments(pattern: string, flags: string, text: string): { segments: { text: string; matched: boolean }[] }` — 页面高亮渲染数据源;非法正则返回整段 unmatched
- `REGEX_LIBRARY: { id, name, pattern, flags, desc, example }[]` — 模板库数据源(**约 20 个**,见下)

**模板库内容**(模块级常量,中文解释):
1. 邮箱 2. 中国手机号 3. IPv4 4. IPv6 5. URL 6. 日期(yyyy-MM-dd) 7. 时间(HH:mm:ss) 8. 日期时间 9. 整数 10. 小数 11. 身份证(18位) 12. 汉字 13. UUID 14. 十六进制颜色 15. 邮编 16. QQ号 17. 微信号 18. 车牌号 19. 银行卡号(Luhn 长度校验仅格式) 20. MAC 地址 21. 端口号(1-65535) 22. 用户名(字母数字下划线) 23. 空白行

**页面**:
- 左栏模板列表(名称,点选 → 填入正则+flags+示例文本)
- 上方正则输入 + flags 输入(g/i/m 复选或文本)
- 中部测试文本 textarea
- 输出:匹配统计 + 高亮渲染(matched=success 底色/unmatched=原色)+ 逐匹配列表;选中模板时显示解释文案

**注册**:route `/tools/regex-generator`,capability `{ offline: true }`;worker 注册 `matchRegex` 适配(对象输入)。

## 工具 7:`testdata-gen` 测试数据生成

**混合交互**:建表 SQL 输入 → 实时解析反馈(走 `useMultiFieldTransform`);点「生成」→ 本地调用 genInserts 出数据(按钮触发,因造数随机不宜输入联动重跑)。

**纯函数**(`src/tools/testdata-gen/transform.ts`):
- `parseCreateTable(sql: string): ToolResult<string>` — 解析 CREATE TABLE:表名、列名、类型;输出解析摘要文本(表名 + N 列清单:`name type`);非法 → invalid-input 定位
- `parseColumns(sql: string): { table: string; columns: { name: string; type: string }[] } | null` — 内部导出供 genInserts 用(也可测试)
- `genInserts(opts: { sql: string; rows: number; nullRate: number }): ToolResult<string>` — 生成 N 条 INSERT;rows 1-1000;nullRate 0-0.5
- **类型造数映射**:
  - INT/BIGINT/SMALLINT → 随机整数(1-100000)
  - VARCHAR(n)/CHAR(n) → 随机字母数字串,长度 min(n, 12)
  - TEXT → 随机中文句子(本地短语字典拼接)
  - DATE → 随机日期(2020-2026)
  - DATETIME/TIMESTAMP → 随机时间戳字符串
  - FLOAT/DOUBLE/DECIMAL → 随机小数(2 位)
  - BOOLEAN/BOOL/TINYINT(1) → true/false
  - ENUM('a','b') → 枚举随机取值
  - 未知类型 → 随机字符串
- **特殊列名智能造数**(列名含关键词,本地映射,用户已确认要):
  - email → 随机邮箱(user+n@example.com 等)
  - phone/mobile → 13/15/18 开头 11 位
  - name/user_name → 姓氏+名字(本地中文名字典)
  - id(且整型) → 递增整数;id(且字符型) → UUID
  - url/link → https://example.com/path-n
  - address → 本地地址片段拼接
  - status/type → 小枚举数字
  - created_at/updated_at(时间型) → 近期时间
- NULL 处理:nullRate>0 时每列按概率置 NULL

**页面**:
- 上方建表 SQL textarea(InputZone)
- 实时解析反馈区(走 useMultiFieldTransform:输入即显示解析出的表名+列清单,非法即错)
- 工具栏:行数 input(默认 10)+ null 比例(0-50%,默认 0)+「生成」按钮
- 输出:TriStateOutput 展示 INSERT 语句(每行一条)

**注册**:route `/tools/testdata-gen`,capability `{ offline: true }`;worker 注册 `parseCreateTable`(实时解析用);genInserts 本地按钮调用不经 worker。

## 错误处理

统一 ToolResult 判别联合;空输入 EMPTY 引导;非法输入 invalid-input 定位;rows/nullRate 越界 invalid-input。

## 测试

- `test/regex-generator.test.ts`:matchRegex 合法/0匹配/多匹配/非法定位;highlightSegments 分段正确;REGEX_LIBRARY 每条 pattern 可编译且与 example 匹配(golden 守门,防模板库手误)
- `test/testdata-gen.test.ts`:parseCreateTable 标准建表/含反引号/含 IF NOT EXISTS/非法;genInserts 类型映射各造数正确格式/行数/null 概率/智能列名(email/phone/name/id)

## 里程碑

`pnpm dev:web` 双工具手测走通;`pnpm test` 全量绿;spec-checklist 追加 2 工具条目。

---

## Self-Review

1. 无占位符;模板库 23 条、智能造数映射均具体列出。
2. 一致性:与上批次同构(transform 纯函数/string 输出/useMultiFieldTransform/worker 适配/按钮触发不经 worker 的先例=id-generator)。
3. 范围:2 工具单 plan 可承载;复杂 3 工具明确排除。
4. 歧义已消:testdata-gen 混合交互(解析实时+生成按钮)有 id-generator 按钮先例;模板库规模用户已确认"多一些"。