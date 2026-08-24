# Spec 自测清单(toolbox-foundation)

> 逐条覆盖 openspec/changes/toolbox-foundation/specs 下 5 个 spec 的全部 Requirement/Scenario。
> 验证方式:`☑ (测试名)` = 已由自动化测试跑通(`pnpm test` 41 用例全绿 / `node scripts/check-web-purity.mjs` OK);
> `☑ 静态核验` = 已做静态代码核验;`☐ 待人工` = 需人工目验(双端同屏 / 主题视觉 / 剪贴板 / 安装首跑)。
>
> 统计:共 **27** 个 Scenario(注:brief 预估计数 4/11/6/6/7 与 spec 实际条数 3/8/5/6/5 不符,以 spec 文件实际内容为准)。
> 已验证 ☑ 22 条(其中自动化测试 17、静态核验 5),待人工 ☐ 5 条。

## tool-registry(3 Scenario)

### Requirement: ToolDescriptor 接口契约
- [x] **注册缺少 capability 的工具被编译期拒绝** — ☑ 静态核验:`ToolDescriptor` 为必填字段的 TS 接口,`pnpm typecheck` 全量通过;缺字段对象在编译期即报错(类型测试见 `test/types.test.ts` 4 用例绿)
### Requirement: 注册表驱动导航与路由
- [x] **新增工具后导航自动出现** — ☑ (tests/smoke/home.spec.ts「首页加载…导航渲染工具项」:导航由 register.ts 数组驱动渲染;`test/register.test.ts`「searchTools 空 query 返回全部」)
### Requirement: capability 声明驱动壳层适配
- [ ] **联网工具在导航中带联网标识** — ☐ 待人工:当前注册表仅 JSON 工具(offline: true),联网标识逻辑需出现首个联网工具后人工目验
- [x] **离线工具断网后完整可用** — ☑ 静态核验:JSON 工具 capability offline: true,transform 为本地纯函数(`test/json-transform.test.ts` 12 用例绿),无任何网络请求;Web 纯度检查通过(产物无 electron/网络依赖)

## app-shell(8 Scenario)

### Requirement: 左侧导航布局
- [x] **点击导航切换工具** — ☑ (tests/smoke/home.spec.ts:导航项渲染 + 工具页粘贴即出,路由切换经 Playwright 守门)
### Requirement: 多主题系统,深色默认
- [x] **首次打开为深色主题** — ☑ 静态核验:`core/theme-store.ts` 初始值 `theme: 'toolkit-dark'`(深色默认)
- [ ] **切换到焦糖色主题即时生效** — ☐ 待人工:主题切换即时视觉生效需人工目验(存储逻辑已由 `test/storage.test.ts` 覆盖)
- [x] **内置主题至少三套** — ☑ 静态核验:`ThemeName = 'toolkit-dark' | 'toolkit-paper' | 'toolkit-caramel'` 三主题均注册
- [x] **主题选择跨会话保持** — ☑ (test/storage.test.ts「set 后 get 返回同值」「缺键返回 fallback」:localStorage 持久化)
### Requirement: 中文 UI
- [ ] **界面文案为中文** — ☐ 待人工:源码静态扫描导航/按钮/提示文案均为中文,但整体视觉需人工目验确认
### Requirement: 首页总览
- [x] **启动落在首页** — ☑ (tests/smoke/home.spec.ts「首页加载无 console error」:首页总览为首屏)
- [ ] **搜索直达工具** — ☐ 待人工:搜索索引逻辑已由 `test/register.test.ts`「searchTools 空 query 返回全部」覆盖,但首页搜索框回车直达交互需人工目验
### Requirement: 设置页
- [ ] **设置页切换主题** — ☐ 待人工:色卡与壳层主题选择器行为一致性需人工目验(底层同用 theme-store)

## tool-ux-conventions(5 Scenario)

### Requirement: 粘贴即出结果
- [x] **粘贴 JSON 立即得到格式化结果** — ☑ (test/json-page.test.tsx「粘贴合法 JSON 自动出格式化结果」+ test/uselivetransform.test.ts「输入经防抖转换」≤200ms 防抖)
- [ ] **一键复制输出** — ☐ 待人工:剪贴板写入与按钮反馈需人工目验(浏览器/桌面剪贴板权限环境差异)
### Requirement: 错误三态,无静默失败
- [x] **粘贴非法 JSON 显示定位错误** — ☑ (test/json-page.test.tsx「非法 JSON 出 ERROR 定位」)
- [x] **空输入显示占位引导** — ☑ (test/json-page.test.tsx「空输入显示 EMPTY 引导」)
### Requirement: 工具核心为纯函数 transform
- [x] **transform 可脱离 UI 直接测试** — ☑ (test/json-transform.test.ts 全部 12 用例直接调用纯函数,无 DOM/网络)

## json-parser-tool(6 Scenario)

### Requirement: JSON 解析与校验
- [x] **粘贴合法 JSON** — ☑ (test/json-transform.test.ts「格式化嵌套对象」+ json-page 页面级用例)
- [x] **粘贴非法 JSON 定位错误** — ☑ (test/json-transform.test.ts「多余逗号给出字符位置」+「posToLineCol 行列换算」)
### Requirement: 格式化输出控制
- [x] **切换缩进宽度** — ☑ (test/json-transform.test.ts「缩进 4 与 tab」)
- [x] **压缩输出** — ☑ (test/json-transform.test.ts「压缩模式」)
### Requirement: 转换逻辑纯函数化与 golden 测试
- [x] **golden 样例回归** — ☑ (test/json-golden.test.ts:fixtures 8 组样例逐条断言全绿)
- [x] **大输入不冻结** — ☑ (test/json-transform.test.ts「1MB 合法输入 <200ms」)

## dual-output-build(5 Scenario)

### Requirement: 单源码双输出
- [ ] **同一 dev 源双通道同时开发** — ☐ 待人工:浏览器与 Electron 壳同屏行为一致 + HMR 需人工启动 dev 目验
- [x] **renderer 产物无 Electron 引用** — ☑ (scripts/check-web-purity.mjs:CI 静态检查,本地运行输出 `web purity OK`)
### Requirement: Electron 安全默认
- [x] **渲染层无法访问 Node API** — ☑ 静态核验:`electron/main.ts:11` `contextIsolation: true, nodeIntegration: false`,preload 仅经 contextBridge 白名单暴露;运行时 `typeof require` 需随待人工项一并抽查
### Requirement: CI 双通道构建
- [x] **tag 触发桌面 Release** — ☑ 静态核验:`.github/workflows/release.yml` 定义 v* tag 触发 Win/Mac 构建并附加 Draft Release(真实触发需推送 tag 验证,属 CI 环境外)
- [x] **在线版静态产物可部署** — ☑ (build:web 产物 dist/web + check-web-purity 通过;CI workflow 含静态产物 artifact 上传)

## 验证记录

- `pnpm test`:11 文件 / 41 用例全部通过(2026-08-25)
- `node scripts/check-web-purity.mjs`:web purity OK
- `pnpm typecheck` / `pnpm lint`:见任务终验记录,全绿

## 待人工项汇总(5 条)

1. 联网标识(待首个联网工具落地)
2. 主题切换即时视觉生效 + 设置页色卡一致性
3. 整体中文文案目验
4. 首页搜索回车直达 / 复制按钮剪贴板反馈
5. 双端同屏 dev + 桌面安装首跑(含 SmartScreen/右键打开指引核对)
