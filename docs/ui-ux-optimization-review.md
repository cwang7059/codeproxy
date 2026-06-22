# CliRelay 管理端 UI/UX 优化评审

更新时间：2026-06-19  
适用范围：`codeProxy` 管理面板（Web + Electron 壳）  
相关分支：`feature/electron-management-shell`（主线）、`feature/add-external-relay-ccswitch`（worktree）

---

## 0. 执行进度

| 编号 | 项 | 状态 | 备注 |
|------|----|------|------|
| §2.1 | 统一空状态 + 引导操作 | ✅ 已完成 | Proxies / CC Switch / 图片生成 |
| §2.2 | 合入 Identity Fingerprint 优化 | ✅ 已完成 | 提交 `0f61f99` |
| §2.3 | i18n 补漏 | ✅ 已完成 | Providers Tab、主题切换、指纹 Tab、curl 示例；`ru` 仅同步 key |
| §2.4 | 统一页面顶部工具栏 | ✅ 已完成 | 全站主页面已接入 `PageToolbar`（含 Config、Auth Files） |
| §2.5 | 请求日志筛选区拆分 | ✅ 已完成 | `RequestLogsFilters.tsx`；`RequestLogsPage` 约 688 行 |
| §4.3 | 首次部署引导（精简版） | ✅ 已完成 | `SetupChecklistSection` 于 Dashboard |
| §3.4 | 配置页 Visual Editor 可检索 | ✅ 已完成 | 章节导航 + 搜索 + 折叠面板 |
| §4.1 | 信息架构精简 | ✅ 已完成 | Monitor 子 Tab、CC Switch 并入 API Keys、System 移出侧栏 |
| §4.4 | 小屏布局适配 | ✅ 已完成 | `useCompactViewport`；Models 归属抽屉、Channel Groups 紧凑表 |
| §4.2 | 设计 token 收敛 | ✅ 已完成 | `surface-card` / `page-stack` / `section-header` |
| §5 | 技术债清理 | ✅ 已完成 | 删除未用 OAuthPage、UsagePage、遗留 SCSS |
|
**当前下一步：** UI/UX 评审文档主项已收尾；`electron-viewport.spec.ts` 提供 1080×700 浏览器级 E2E 回归（`bun run e2e -- e2e/electron-viewport.spec.ts`）。

---

## 1. 总体判断

界面基础已经不错：分组侧边栏、暗色模式、懒加载路由、`VirtualTable` + `EmptyState` 等组件齐全。

**主要问题不是「缺功能」，而是：**

| 类别 | 说明 |
|------|------|
| 页面体量过大 | `ModelsPage.tsx` ~1900 行、`RoutingConfigEditor.tsx` ~1500 行、`ProvidersPage.tsx` ~1100 行 |
| 风格不统一 | 各页工具栏、空状态、标题区实现方式不一致 |
| i18n 不完整 | 部分 Tab 名、aria 标签、示例文案硬编码英文或中文 |
| 分支未合并 | worktree 中 Identity Fingerprint、Request Logs 筛选等优化尚未合入主线 |

### 技术栈与关键路径

| 项 | 路径 |
|----|------|
| 路由 | `src/app/AppRouter.tsx` |
| 导航壳 | `src/modules/ui/AppShell.tsx` |
| 共享区块 | `src/modules/monitor/MonitorPagePieces.tsx` |
| 空状态 | `src/modules/ui/EmptyState.tsx` |
| 主题 | `src/modules/ui/ThemeProvider.tsx` |
| 全局样式 | `src/styles/index.css`（Tailwind v4） |

---

## 2. 快速见效（建议优先做）

预估：每项 0.5–1 天，可并行推进。

### 2.1 统一空状态 + 引导操作

**状态：✅ 已完成（2026-06-18）**

**现状：** Api Keys、Models、Channel Groups 已使用 `EmptyState`（说明 + 主操作按钮）；以下页面仅有表格 `emptyText`：

| 页面 | 文件 | 现状 |
|------|------|------|
| 代理池 | `src/modules/proxies/ProxiesPage.tsx` | 仅 `emptyText` |
| CC Switch 导入 | `src/modules/ccswitch/CcSwitchImportSettingsPage.tsx` | 仅 `emptyText` |
| 图片生成 | `src/modules/image-generation/ImageGenerationPage.tsx` | 无图时无引导 |

**建议：**

- 统一改用 `EmptyState` 组件
- 为每页补充明确 CTA：「新建」「导入」「去配置」等
- 文案走 i18n，与 Api Keys 页对齐

**验收：** 三页在无数据时均显示图标、说明、主按钮，点击可触发对应创建流程。

---

### 2.2 合入 Identity Fingerprint 优化

**状态：✅ 已完成（2026-06-18，提交 `0f61f99`）**

**来源：** `_worktrees/codeProxy-add-external-relay`（已提交至 `feature/add-external-relay-ccswitch`）

**worktree 相对主线的改进：**

- 顶部统一工具栏（`ProviderToolbar`）
- 高级选项可折叠（`CollapsiblePanel`）
- 右侧预览区 sticky，以 `Header: value` 格式展示（`PreviewPanel` / `HeaderPreviewBlock`）
- Tab 上显示启用状态点

**建议：** cherry-pick 到主线 `feature/electron-management-shell`，保留主线分组导航与 Electron 壳，不要整分支合并。

**验收：** 身份指纹页测试通过（`IdentityFingerprintPage.test.tsx`），高级字段默认折叠、预览区固定可见。

---

### 2.3 i18n 补漏

**状态：✅ 已完成（2026-06-18）**

**仍硬编码或未接入 `t()` 的位置：**

| 位置 | 文件 | 示例 |
|------|------|------|
| AI Providers Tab | `src/modules/providers/ProvidersPage.tsx` | `Gemini`、`Codex`、`Claude` |
| Identity Fingerprint Tab | `src/modules/identity-fingerprint/IdentityFingerprintPage.tsx` | 提供商名（合入 2.2 时一并处理） |
| 主题切换 | `src/modules/ui/ThemeProvider.tsx` | `"Switch to light"` / `"Switch to dark"` |
| 图片生成 API 示例 | `src/modules/image-generation/ImageGenerationPage.tsx` | curl 中的中文占位符 |

**俄语 locale 决策：**

- `src/i18n/locales/ru.json` 存在且可被加载
- `LanguageSelector` 仅暴露 `zh-CN` / `en`
- **二选一：** 开放俄语选项，或从 loader 移除 `ru.json` 避免双轨维护
- **当前决策：** 语言选择器仍仅 `zh-CN` / `en`；`ru.json` 随 en/zh 同步新增 key，避免漂移

**验收：** 切换中英文后上述位置无残留硬编码；俄语策略有明确文档说明。

---

### 2.4 统一页面顶部工具栏 ✅

**现状各页风格：**

| 页面 | 当前模式 |
|------|----------|
| Monitor | 自定义 `h2` + 图标行 |
| Api Keys / Models | `MonitorSectionHeader` |
| Providers | 独立 `h-8` 按钮行 |
| Config | Tab 内操作 + 底部 `FloatingSaveBar` |

**建议：** 抽取共享 `PageToolbar` 组件：

```
┌─────────────────────────────────────────────┐
│ [可选标题]              [主操作] [次要操作] │
├─────────────────────────────────────────────┤
│ [filter 插槽：搜索、筛选、日期范围等]        │
└─────────────────────────────────────────────┘
```

**首批统一页面：** Monitor、Providers、Models

**已扩展（2026-06-19）：** Dashboard、Api Keys、Channel Groups、Proxies、Api Key Permissions、Identity Fingerprint、System、Image Generation、Logs、Config、Auth Files

**验收：** 三页顶部结构一致，主操作按钮位置固定于右侧。

**已完成（2026-06-18）：** 新增 `src/modules/ui/PageToolbar.tsx`；Monitor 工具栏、Providers 概览区、Models 页顶已接入。

---

### 2.5 请求日志筛选区拆分 ✅

**现状：** 主线 `RequestLogsPage.tsx` 内联筛选逻辑约 700 行。  
**worktree 参考：** `RequestLogsFilters.tsx`（多选版）；主线合入时保留现有单选筛选与统计卡片布局。

**建议：** 将筛选 UI 提取为 `RequestLogsFilters`，页面只保留数据加载与表格。

**验收：** `RequestLogsPage.tsx` 行数显著下降；`RequestLogsPage.test.tsx` 通过。

**已完成（2026-06-18）：** 新增 `src/modules/monitor/RequestLogsFilters.tsx`（单选 + 活跃筛选 chips）；`RequestLogsPage` 由约 755 行降至约 688 行；测试 5/5 通过。

---

## 3. 中等投入（1–3 天/项）

### 3.1 拆分「巨型页面」 ✅

不一定改交互，主要是拆文件，降低维护成本与 UI 漂移风险。

| 文件 | 约行数 | 拆分建议 | 进度 |
|------|--------|----------|------|
| `ModelsPage.tsx` | ~1866 → **~760** | 模型库 / 归属方 / OpenRouter 同步 | ✅ 库 Tab + Modal + 表格已拆 |
| `RoutingConfigEditor.tsx` | ~1492 → **~607** | 分组列表 + 路由编辑（左右栏） | ✅ `ChannelGroupListPanel` / `ChannelGroupEditorModal` |
| `ProvidersPage.tsx` | ~1061 → **~718** | 每个 Provider Tab 独立 panel | ✅ `ProvidersTabPanels` 等 |
| `AuthFilesFilesTab.tsx` | ~1044 → **~307** | 筛选 / 表格·卡片 / KPI / 批量操作 | ✅ 见下方 2026-06-19 条目 |
| `IdentityFingerprintPage.tsx` | ~1128 → **~366** | constants / utils / UI 片段 / Provider Tab panels | ✅ |
| `ImageGenerationPage.tsx` | ~1066 → **~140** | types / constants / utils / 测试弹窗 / 调用文档 | ✅ |
| `ApiKeysPage.tsx` | ~839 → **~653** | utils / Keys Tab 概览·筛选·表格 | ✅ |
| `DashboardPage.tsx` | ~614 → **~165** | constants / chart utils / KPI 卡 / 业务区 / 吞吐图 | ✅ 见下方 2026-06-19 条目 |

**已完成（2026-06-18）：**
- `models-page-helpers.tsx`：类型、API、VendorIcon、OpenRouter 归一化等
- `ProvidersTabPanels` / `ProviderSimpleKeyTabPanel` / `ProvidersBatchActionsBar` / `ProvidersImportPreviewModal` / `providers-page-types.ts`

**已完成（2026-06-19）：**
- `ModelOwnerSidebar.tsx` — 归属方侧栏
- `OpenRouterSyncSection.tsx` — OpenRouter 同步区
- `ModelsLibraryTab.tsx` — 库 Tab 布局编排
- `ModelsActiveTab.tsx` / `ModelsFilterToolbar.tsx` / `ModelsDataTable.tsx` — Active Tab 与共享表格
- `ModelConfigModal.tsx` / `ModelOwnerPresetModal.tsx` — 编辑弹窗
- `ModelsOverviewSection.tsx` — KPI 概览区
- `routing-config-editor-utils.ts` / `routing-config-editor-types.ts` — 工具与类型
- `ChannelGroupListPanel.tsx` — 分组列表 + KPI + 筛选
- `ChannelGroupEditorModal.tsx` — 分组编辑弹窗（basic / models Tab）
- `AuthFilesOverviewStats.tsx` — KPI 概览区
- `AuthFilesFiltersCard.tsx` — 筛选 / 排序 / 工具栏
- `AuthFilesFilesContent.tsx` — 表格 / 卡片视图切换与列表
- `AuthFilesFileCard.tsx` — 单文件卡片
- `AuthFilesFilesFooter.tsx` — 批量操作 + 分页
- `AuthFilesModelOwnerGroupModal.tsx` — 归属方分组弹窗
- `AuthFilesFilesTab.tsx` — 编排层（状态与 hooks 仍留 `AuthFilesPage`）
- `identity-fingerprint-constants.ts` / `identity-fingerprint-utils.ts` — 常量与解析工具
- `IdentityFingerprintPagePieces.tsx` — ProviderToolbar、PreviewPanel、Field 等 UI 片段
- `IdentityFingerprintPage.tsx` — 编排层（~366 行）
- `IdentityFingerprintTabPanels.tsx` — Codex / Claude / Gemini / Kimi Tab 面板
- `image-generation-types.ts` / `image-generation-constants.ts` / `image-generation-utils.ts`
- `ImageGenerationEndpointCallDoc.tsx` — 端点调用文档区
- `ImageGenerationTestModal.tsx` — 图片生成测试弹窗
- `ImageGenerationPage.tsx` — 编排层（~140 行）
- `ApiKeysKeysTab.tsx` — Keys Tab 概览 / 筛选 / 表格
- `api-keys-page-utils.ts` — 扩展：`resolveApiKeysPageTab`、`copyTextToClipboard`、`appendRoutePath`、`computeTableViewportHeight`
- `dashboard-constants.ts` / `dashboard-chart-utils.ts` — 时间范围常量与 ECharts 配置
- `DashboardKpiCard.tsx` / `DashboardBusinessSection.tsx` / `ThroughputTrendChart.tsx`
- `DashboardPage.tsx` — 编排层（~165 行）
- `ElectronViewportRegression.test.ts` — Electron 1080×700 静态视口回归
- `e2e/electron-viewport.spec.ts` — 8 个关键页面 1080×700 横向溢出 Playwright E2E

参考规范：`docs/internal-review/frontend-maintenance-spec.md`（单文件目标 400–600 行，超 800 行须拆分）。

---

### 3.2 认证文件页（Auth Files）减负 ✅

认知负担最重的页面之一：配额、OAuth、标签、详情弹窗、8+ hooks 交织。

**已落地（2026-06-19）：**

- 默认视图保留：搜索、类型筛选、上传 / 刷新、文件列表
- **「增加 OAuth 登录」** 改为带文案的主按钮，入口更显眼
- 账号类型筛选、排序、归属方分组、配额自动刷新与更新时间 → **「高级筛选」折叠区**（默认收起；选中具体 Provider 或非默认筛选时自动展开）
- 分组概览仍保留在「更多操作」菜单

**相关文件：** `AuthFilesFiltersCard.tsx`、`authFilesPageUtils.ts`（`advancedFiltersExpanded` 持久化）

---

### 3.3 API Key 权限编辑弹窗 ✅

`ApiKeyPermissionsPage` 编辑 modal 字段过多（限额、多选、system prompt），单屏信息密度过高。

**已落地（2026-06-19）：**

- 抽出 `ApiKeyPermissionProfileForm.tsx` + `apiKeyPermissionProfileUtils.ts`
- Modal 内分四组：**基础信息**（常显）、**限额** / **权限范围** / **高级**（可折叠）
- 新建配置默认只展开「限额」；编辑时按已有数据自动展开相关分组

---

### 3.4 配置页 Visual Editor 可检索 ✅

- YAML 页：已有搜索  
- Visual 页：长滚动表单，无章节导航

**建议：** Visual 页增加左侧章节导航 + 折叠面板，体验与 YAML 搜索对齐。

**相关文件：** `src/modules/config/ConfigPage.tsx`、`VisualConfigEditor.tsx`、`RuntimeConfigPanel.tsx`

**已落地（2026-06-19）：**

- `visual-config-sections.ts` — 13 个章节定义 + 搜索匹配
- `VisualConfigSectionNav.tsx` — 左侧 sticky 章节导航（`lg+` 显示）
- `VisualConfigSearchBar.tsx` — 章节/配置键搜索，Enter 跳转下一匹配
- `VisualConfigCollapsibleSection.tsx` — 可折叠章节面板（默认仅展开「基础信息」）
- `VisualConfigEditor.tsx` — 接入导航、搜索、折叠；Payload 编辑器支持 `embedded` 模式
- `PayloadRuleEditors.tsx` — `embedded` 避免双层 Card

**验收：** Visual 页可通过左侧导航或搜索快速定位章节；`VisualConfigEditor.test.tsx` 8/8 通过。

---

## 4. 较大改动（按产品方向选做）

### 4.1 信息架构精简 ✅

侧边栏分组后仍有 **17 个入口**，对新用户偏多。

| 建议 | 说明 |
|------|------|
| Monitor + Request Logs | 合并为子 Tab，而非两个顶级菜单 |
| CC Switch 导入 | 并入 API Keys 页（同属客户端对接场景） |
| System vs Dashboard | 梳理重叠信息，避免重复展示 |

**已落地（2026-06-19）：**

- `MonitorHubPage.tsx` — Monitor 页顶子 Tab（概览 / 请求日志）；侧栏仅保留「Monitor」入口
- `/monitor/request-logs` 路由保留，由 Hub 统一渲染
- `ApiKeysPage` — 新增「API Keys / CC Switch 导入」子 Tab；`CcSwitchImportSettingsPanel` 可嵌入
- `/ccswitch-import-settings` → 重定向 `/api-keys?tab=ccswitch-import`
- `System` 移出侧栏；`/system` 路由保留，由 Dashboard `SystemMonitorSection` 链入

侧栏入口由 16 项减至 **13 项**。

---

### 4.2 设计 token 收敛 ✅

大量重复样式散落在各页，例如：

```text
rounded-2xl border border-black/[0.06] dark:border-white/[0.08] ...
```

**建议：** 在 `src/styles/index.css` 抽取 utility class：

- `surface-card` — 卡片容器  
- `page-stack` — 页面垂直间距  
- `section-header` — 区块标题  

**已落地（2026-06-19）：**

- `src/styles/index.css` — `@layer components` 新增 `surface-card`、`surface-card-interactive`、`page-stack`、`section-header`（及 `section-header-wrap` / `section-header-desc`）
- `Card.tsx`、`MonitorPagePieces`（`MonitorSectionHeader` / KPI / 图表面板）已接入
- 主页面壳：`ApiKeysPage`、`ModelsPage`、`ChannelGroupsPage`、`MonitorPage`、`RequestLogsPage` 使用 `page-stack` + `surface-card`
- Auth Files 别名/排除 Tab、`CcSwitchImportCardList` 同步迁移
- 其余主页面统一 `page-stack`：Logs、Proxies、Api Key Permissions、Auth Files、Config、Dashboard、Providers、Image Generation、System、Identity Fingerprint

---

### 4.3 首次部署引导（Onboarding）

**状态：✅ 精简版已完成（2026-06-18）** — `src/modules/dashboard/SetupChecklistSection.tsx`

结合部署场景常见问题（如 `your-api-key-1` 与 Codex `local-dev-key` 不一致）：

| 能力 | 说明 |
|------|------|
| 首次登录检测 | 无 API Key / 无 auth 文件时，Dashboard 顶部显示配置清单 |
| 连接 Codex | 一键复制 `config.toml` 片段 + 自动创建 `local-dev-key` |
| 完成状态 | 清单项可勾选，全部完成后收起 |

比仅修改打包脚本 `api-keys` 默认值更贴近用户实际路径。

---

### 4.4 移动端 / 小屏适配 ✅

Electron 默认窗口已调整为 1080×700，但以下布局在小屏仍会挤：

- Channel Groups 左右分栏（`RoutingConfigEditor.tsx`）
- Models 侧边 owner 面板（`ModelsPage.tsx`）

**建议：** 视口 `< 1024px` 时改为上下堆叠或抽屉式编辑面板。

**已落地（2026-06-19）：**

- `hooks/useCompactViewport.ts` — `(max-width: 1023px)` 与 Tailwind `lg` 对齐
- `ModelsLibraryTab.tsx` — 小屏下归属方侧栏改为可折叠抽屉，主内容区优先展示
- `ModelOwnerSidebar.tsx` — `compact` 模式限制高度并内部滚动
- `RoutingConfigEditor.tsx` / `ChannelGroupListPanel.tsx` — 小屏强制紧凑表格 + 横向滚动
- `ChannelGroupEditorModal.tsx` — 小屏全宽弹窗、基础字段单列堆叠、模型表更矮

---

## 5. 技术债（顺手清理）✅

**已落地（2026-06-19）：**

| 项 | 处理 |
|----|------|
| `OAuthPage.tsx` | 已删除（OAuth 仅通过 Auth Files 弹窗 `OAuthLoginDialog`） |
| `UsagePage.tsx` | 已删除（`/usage` 路由直接 redirect 至 `/monitor`） |
| 遗留 SCSS | 已删除 `src/styles/*.scss` 及 Vite SCSS 预处理器配置；样式统一由 Tailwind v4 `index.css` 承担 |

---

## 6. 推荐执行顺序

```mermaid
flowchart LR
  A[空状态统一] --> B[Identity Fingerprint 合入]
  B --> C[i18n 补漏]
  C --> D[PageToolbar 统一]
  D --> E[首次部署引导]
  E --> F[巨型页面拆分]
```

### 6.1 1–2 天快速打磨包（最小可行）

若时间有限，建议按此顺序交付：

1. 合入 Identity Fingerprint 优化（§2.2）  
2. Proxies / CC Switch / 图片生成补 `EmptyState`（§2.1）  
3. Providers Tab + 主题切换 i18n（§2.3）  
4. Dashboard 加「首次配置检查清单」（§4.3 精简版）

### 6.2 里程碑拆分建议

| 里程碑 | 内容 | 预估 |
|--------|------|------|
| M1 | §2.1 + §2.2 + §2.3 | 1–2 天 |
| M2 | §2.4 + §2.5 | 1–2 天 |
| M3 | §3.1 Models / Providers 拆分 | 2–3 天 |
| M4 | §3.2 Auth Files 减负 | 2–3 天 |
| M5 | §4.3 Onboarding | 1–2 天 |

---

## 7. 验证清单

每项 UI 改动合并前建议确认：

- [x] `bun run build` 无报错  
- [x] `bun run test` 相关页面测试通过（dashboard / identity-fingerprint / image-generation / ElectronViewportRegression）  
- [ ] 中英文切换无硬编码残留（全站 spot-check，非阻塞）  
- [ ] 暗色模式下空状态、工具栏、预览区可读（手测，非阻塞）  
- [x] Electron 1080×700 窗口下关键页面无横向溢出（`ElectronViewportRegression.test.ts` 静态回归 + `e2e/electron-viewport.spec.ts` Playwright E2E）

---

## 8. 相关文档

- [可维护性优化计划](./optimization-plan.md) — 通用优化条目模板  
- [前端维护规范](./internal-review/frontend-maintenance-spec.md) — 文件行数与模块结构约定  
- [演进记录](./evolution.md) — 已落地的结构性变更
