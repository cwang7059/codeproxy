# CliRelay 管理端 UI/UX 优化评审

更新时间：2026-06-18  
适用范围：`codeProxy` 管理面板（Web + Electron 壳）  
相关分支：`feature/electron-management-shell`（主线）、`feature/add-external-relay-ccswitch`（worktree）

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

**验收：** 切换中英文后上述位置无残留硬编码；俄语策略有明确文档说明。

---

### 2.4 统一页面顶部工具栏

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

**验收：** 三页顶部结构一致，主操作按钮位置固定于右侧。

---

### 2.5 请求日志筛选区拆分

**现状：** 主线 `RequestLogsPage.tsx` 内联筛选逻辑约 700 行。  
**worktree 已有：** `src/modules/monitor/RequestLogsFilters.tsx`（已提取）

**建议：** 将 worktree 中的 `RequestLogsFilters.tsx` 合入主线，页面只保留数据加载与表格。

**验收：** `RequestLogsPage.tsx` 行数显著下降；`RequestLogsPage.test.tsx` 通过。

---

## 3. 中等投入（1–3 天/项）

### 3.1 拆分「巨型页面」

不一定改交互，主要是拆文件，降低维护成本与 UI 漂移风险。

| 文件 | 约行数 | 拆分建议 |
|------|--------|----------|
| `ModelsPage.tsx` | ~1866 | 模型库 / 归属方 / OpenRouter 同步 |
| `RoutingConfigEditor.tsx` | ~1492 | 分组列表 + 路由编辑（左右栏） |
| `ProvidersPage.tsx` | ~1064 | 每个 Provider Tab 独立 panel |
| `AuthFilesFilesTab.tsx` | ~1044 | 筛选 / 表格 / 详情 modal |

参考规范：`docs/internal-review/frontend-maintenance-spec.md`（单文件目标 400–600 行，超 800 行须拆分）。

---

### 3.2 认证文件页（Auth Files）减负

认知负担最重的页面之一：配额、OAuth、标签、详情弹窗、8+ hooks 交织。

**建议：**

- 默认视图：文件列表 + 基础操作（上传、删除、启用/禁用）
- 配额 / OAuth / 高级筛选：折叠区或侧滑面板
- OAuth 入口保持显眼：加强「+ 添加账号」引导（解决「没有注册按钮」类困惑）

**相关文件：** `src/modules/auth-files/AuthFilesPage.tsx` 及 `hooks/`、`components/` 子目录

---

### 3.3 API Key 权限编辑弹窗

`ApiKeyPermissionsPage` 编辑 modal 字段过多（限额、多选、system prompt），单屏信息密度过高。

**建议：** 分组或分步

1. 基础信息  
2. 限额（日限、总量、RPM/TPM 等）  
3. 权限范围（渠道、模型）  
4. 高级（system prompt 等）

或采用 modal 内左侧锚点导航。

---

### 3.4 配置页 Visual Editor 可检索

- YAML 页：已有搜索  
- Visual 页：长滚动表单，无章节导航

**建议：** Visual 页增加左侧章节导航 + 折叠面板，体验与 YAML 搜索对齐。

**相关文件：** `src/modules/config/ConfigPage.tsx`、`VisualConfigEditor.tsx`、`RuntimeConfigPanel.tsx`

---

## 4. 较大改动（按产品方向选做）

### 4.1 信息架构精简

侧边栏分组后仍有 **17 个入口**，对新用户偏多。

| 建议 | 说明 |
|------|------|
| Monitor + Request Logs | 合并为子 Tab，而非两个顶级菜单 |
| CC Switch 导入 | 并入 API Keys 页（同属客户端对接场景） |
| System vs Dashboard | 梳理重叠信息，避免重复展示 |

---

### 4.2 设计 token 收敛

大量重复样式散落在各页，例如：

```text
rounded-2xl border border-black/[0.06] dark:border-white/[0.08] ...
```

**建议：** 在 `src/styles/index.css` 抽取 utility class：

- `surface-card` — 卡片容器  
- `page-stack` — 页面垂直间距  
- `section-header` — 区块标题  

---

### 4.3 首次部署引导（Onboarding）

结合部署场景常见问题（如 `your-api-key-1` 与 Codex `local-dev-key` 不一致）：

| 能力 | 说明 |
|------|------|
| 首次登录检测 | 无 API Key / 无 auth 文件时，Dashboard 顶部显示配置清单 |
| 连接 Codex | 一键复制 `config.toml` 片段 + 自动创建 `local-dev-key` |
| 完成状态 | 清单项可勾选，全部完成后收起 |

比仅修改打包脚本 `api-keys` 默认值更贴近用户实际路径。

---

### 4.4 移动端 / 小屏适配

Electron 默认窗口已调整为 1080×700，但以下布局在小屏仍会挤：

- Channel Groups 左右分栏（`RoutingConfigEditor.tsx`）
- Models 侧边 owner 面板（`ModelsPage.tsx`）

**建议：** 视口 `< 1024px` 时改为上下堆叠或抽屉式编辑面板。

---

## 5. 技术债（顺手清理）

| 项 | 路径 | 说明 |
|----|------|------|
| `OAuthPage.tsx` | `src/modules/oauth/OAuthPage.tsx` | 有模块但未挂路由；OAuth 仅在 Auth Files 弹窗 |
| 遗留 SCSS | `src/styles/*.scss` | 存在但未在 `main.tsx` 引用；实际使用 Tailwind v4 |
| `UsagePage` | `src/modules/usage/UsagePage.tsx` | 仅 redirect 到 Monitor；可删或保留别名 |
| worktree vs 主线 | 见 §2.2、§2.5 | cherry-pick 特定优化，避免整分支合并导致导航/Electron 壳回退 |

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

- [ ] `bun run test` 相关页面测试通过  
- [ ] `bun run build` 无报错  
- [ ] 中英文切换无硬编码残留  
- [ ] 暗色模式下空状态、工具栏、预览区可读  
- [ ] Electron 1080×700 窗口下关键页面无横向溢出  

---

## 8. 相关文档

- [可维护性优化计划](./optimization-plan.md) — 通用优化条目模板  
- [前端维护规范](./internal-review/frontend-maintenance-spec.md) — 文件行数与模块结构约定  
- [演进记录](./evolution.md) — 已落地的结构性变更
