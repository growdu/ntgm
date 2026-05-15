# 产品完善计划：原型迁移至正式产品

**日期**: 2026-05-15
**状态**: 设计中
**范围**: 将 `web_test` 原型迁移至 `apps/web`，替换现有工作台，以原型为最终实现目标

---

## 1. 背景

`web_test/` 已完成完整的 8 页面原型（Home、Onboarding、Analysis、Questionnaire、Profile、Match、Advice、Archive），包含精细的 UI 交互模式和响应式设计。

`apps/web/` 目前是一个单页工作台（`workbench.tsx`），覆盖了数据操作层（建档、事件录入、问卷提交、画像展示），但缺少原型中的 UI 交互体验。

**目标**：以原型为最终实现目标，直接迁移至 `apps/web`，替换现有工作台。将 mock 数据替换为通过 `@ntgm/sdk` 调用真实 API。

---

## 2. 技术方案

### 2.1 技术栈

- **框架**: Next.js 15 + React 19（复用 `apps/web` 现有技术栈）
- **路由**: Next.js App Router，`app/` 目录下多页面路由
- **样式**: CSS Modules（从 `web_test` 迁移）+ 全局 CSS 变量（复用现有 globals.css）
- **图表**: 纯 SVG 实现雷达图（原型已实现）
- **数据**: `@ntgm/sdk` 调用后端 API，替换 `web_test` 中的 mock 数据
- **组件**: 直接迁移 `web_test` 的共享组件（Navigation、Toast）

### 2.2 迁移策略

1. **整体替换** — 不保留 `apps/web` 现有工作台（`workbench.tsx`），以原型代码直接覆盖
2. **复用 SDK** — `@ntgm/sdk` 已在 `apps/web` 中使用，直接 import 替换 mock 数据
3. **样式迁移** — 将 `web_test` 的 CSS Modules 和 globals.css 变量迁移至 `apps/web`
4. **组件迁移** — 将 `Navigation`、`Toast` 等共享组件迁移至 `apps/web`

### 2.3 迁移顺序（按建档主流程）

```
1. Onboarding (建档页)
2. Analysis (初始分析页)
3. Questionnaire (持续问答页)
4. Profile (动态画像页)
5. Match (历史人物匹配页)
6. Advice (改命建议页)
7. Archive (成长档案页)
8. Home (首页)
```

理由：还原完整用户主流程，建档完成后其他页面才有真实数据可用。MVP 体验在链路打通后算完整。

---

## 3. 页面详情

### 3.1 首页 (`/`)

组件:
- `HeroSection`: 主标语 + CTA 按钮
- `ProfileSummaryCard`: 当前画像摘要（V4）
- `HistoricalMatchCard`: 最像的历史人物（曹操 82%）
- `TodayAdviceCard`: 今日建议
- `RecentEvolution`: 最近演进（V3 -> V4）

API 依赖:
- `profileApi.getCurrent()` — 当前画像摘要
- `matchApi.getTopMatch()` — 最匹配人物
- `adviceApi.getToday()` — 今日建议

### 3.2 建档页 (`/onboarding`)

组件:
- `ProgressStepper`: 建档进度（步骤 1-5）
- `BasicInfoForm`: 姓名、性别、出生日期、时辰、出生地
- `TimeUncertaintyNotice`: 时辰不确定说明
- `NextImpactPreview`: 本轮提交后将更新的内容

API 依赖:
- `userApi.create()` — 创建用户档案
- `intakeApi.submit()` — 提交基础信息

### 3.3 初始分析页 (`/analysis`)

组件:
- `ProfileV1Header`: 版本号 + 置信度
- `BaziSummaryCard`: 命盘摘要（四柱 + 五行）
- `InitialInferCard`: 初步推断列表
- `UncertaintyCard`: 当前不确定项列表
- `ContinueCTA`: 继续校准按钮

API 依赖:
- `profileApi.getByVersion(1)` — 获取 V1 画像
- `baziApi.getAnalysis()` — 八字分析结果

### 3.4 持续问答页 (`/questionnaire`)

组件:
- `QuestionProgress`: 当前题号 + 总题数
- `QuestionCard`: 问题文本 + 影响说明
- `AnswerOptions`: 单选/多选选项
- `ReasoningInput`: 补充说明输入框
- `ImpactPreview`: 回答后系统将如何调整

API 依赖:
- `questionnaireApi.getQuestions()` — 获取问题列表
- `questionnaireApi.submit()` — 提交回答
- `localStorage` — 进度持久化（本轮刷新不丢失）

### 3.5 动态画像页 (`/profile`)

组件:
- `ProfileHeader`: 版本号 + 综合评分 + 关键词
- `PersonalityMatrix`: 性格维度列表
- `AbilityRadarChart`: 能力雷达图（SVG）
- `ChangeCard`: 本次变化说明
- `EvidenceTabs`: 证据来源（八字/问答/事件/面相/手相）
- `VersionCompare`: 版本对比视图

API 依赖:
- `profileApi.getCurrent()` — 当前画像
- `profileApi.getByVersion(n)` — 特定版本画像
- `profileApi.getEvolution()` — 版本演进历史

### 3.6 历史人物匹配页 (`/match`)

组件:
- `TopMatchCard`: 最匹配人物主卡
- `SimilaritySection`: 相似的地方
- `DifferenceSection`: 不同的地方
- `LifeStageSection`: 更像他的人生阶段
- `CandidateList`: Top 3 候选列表

API 依赖:
- `matchApi.getMatches()` — 人物匹配结果

### 3.7 改命建议页 (`/advice`)

组件:
- `AdviceHeader`: 版本号
- `TodayAdviceCard`: 今日建议列表
- `WeeklyPlanCard`: 7日计划
- `LuckyDaysCard`: 吉日提醒
- `FeedbackButton`: 标记已执行 / 填写效果反馈

API 依赖:
- `adviceApi.getToday()` — 今日建议
- `adviceApi.getWeekly()` — 7日计划
- `adviceApi.getLuckyDays()` — 吉日提醒
- `adviceApi.submitFeedback()` — 提交反馈

### 3.8 成长档案页 (`/archive`)

组件:
- `TimelinePanel`: 版本时间线
- `VersionListCard`: 画像版本列表
- `FigureHistoryCard`: 历史人物变化轨迹
- `ExportButtons`: 导出 PDF / 生成分享海报

API 依赖:
- `profileApi.getEvolution()` — 版本演进历史
- `matchApi.getHistory()` — 历史人物变化轨迹

---

## 4. 共享组件

| 组件 | 说明 | 迁移自 |
|------|------|--------|
| `Navigation` | 响应式导航（含移动端 hamburger） | `web_test/components/Navigation` |
| `AppShell` | 页面布局包装（header + main + footer） | `web_test/components/Navigation` |
| `Toast` | 通知提示组件 | `web_test/components/Toast` |
| `RadarChart` | SVG 雷达图 | `web_test/profile/RadarChart` |
| `globals.css` | 全局 CSS 变量 | `web_test/app/globals.css` 变量迁移 |

---

## 5. API 对应关系

| 页面 | Prototype 数据来源 | Production API (@ntgm/sdk) |
|------|-------------------|---------------------------|
| Home | `mockData.profileV4` | `profileApi.getCurrent()` |
| Onboarding | `mockData` 表单 | `userApi.create()`, `intakeApi.submit()` |
| Analysis | `mockData.profileV1` | `profileApi.getByVersion(1)`, `baziApi.getAnalysis()` |
| Questionnaire | `mockData.questionnaireData` | `questionnaireApi.getQuestions()`, `questionnaireApi.submit()` |
| Profile | `mockData.profileV1-V4` | `profileApi.getCurrent()`, `profileApi.getByVersion(n)` |
| Match | `mockData.matchResults` | `matchApi.getMatches()` |
| Advice | `mockData.todayAdvice` | `adviceApi.getToday()`, `adviceApi.getWeekly()` |
| Archive | `mockData.evolutionHistory` | `profileApi.getEvolution()` |

---

## 6. 迁移步骤

### Phase 1: 基础设施迁移
1. 将 `web_test/app/globals.css` 中的 CSS 变量合并到 `apps/web/app/globals.css`
2. 迁移 `Navigation` 和 `Toast` 共享组件
3. 配置 Next.js 路由（删除旧 `workbench.tsx`，创建 8 个页面路由）

### Phase 2: 建档链路迁移
4. 迁移 `Onboarding` 页面
5. 迁移 `Analysis` 页面
6. 迁移 `Questionnaire` 页面

### Phase 3: 画像链路迁移
7. 迁移 `Profile` 页面
8. 迁移 `Match` 页面
9. 迁移 `Advice` 页面
10. 迁移 `Archive` 页面

### Phase 4: 首页迁移
11. 迁移 `Home` 页面
12. 端到端测试

---

## 7. 验收标准

- [ ] 8 个页面全部可访问且路由正常
- [ ] 视觉风格统一（深墨色 + 古金）
- [ ] 雷达图正常渲染
- [ ] localStorage 问卷进度持久化正常
- [ ] Toast 通知正常弹出
- [ ] 移动端响应式导航正常
- [ ] 所有 mock 数据替换为真实 API 调用
- [ ] Build 通过
- [ ] 端到端用户流程（建档 → 画像 → 匹配 → 建议）完整可用