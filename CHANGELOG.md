# 变更日志 (Changelog)

本项目所有显著变更都记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 计划中
- 用户提醒推送端到端验证（push 后端单测已通过，链路未跑通）

### 已完成
- **测试覆盖补完**：services/api 单测从 ~30% 升至 **100% 行覆盖**（14 个 service 文件 971/971 stmts,260 个测试,2.85s 跑完）。新增 9 个测试文件:test_bazi_service / test_profile_services / test_advice_service / test_match_service / test_push_service / test_support_services / test_questionnaire_service / test_archive_service / test_profile_workflow_service + test_coverage_boost 集中补 forwarder / 边界 / 助手段

## [0.4.0] - 2026-06-30

### UI 道家化（太极主题）
- **重构** 首页/登录/注册全套道家文言化文案 + 视觉
- **重构** 导航条与用户菜单道家术语化
- **重构** 12 个内页（advice/analysis/archive/create/forgot/home/match/
  onboarding/profile/questionnaire/reset/verify）统一太极主题
- **新增** `DaoElements` 太极/卦象装饰组件
- **修复** pricing 页套餐命名错乱（Pro/Pro 重复"觉境" → Pro 觉境/Master 通境）

### 后端真实算法实装
- **实装** 八字四柱真实计算：年柱（公历纪年）、月柱（24 节气表）、
  日柱（儒略日 + 60 甲子循环）、时柱（时支地支 + 五子遁起时干）
- **实装** 五行旺衰分析 + 十神关系映射 + 日主强弱判定
- **实装** MediaPipe FaceMesh 人脸特征提取异步任务
  - 468 个 3D 关键点 → 脸型/眼型/眉型/鼻型/唇形分类
  - 表情代理（嘴脸比 + 眉高）+ 置信度计算
  - 从 MinIO 下载图片 → cv2 解析 → 写回 `image_assets.metadata_json`

## [0.3.0] - 2026-06-29

### 部署与基础设施
- **新增** Docker Compose 全栈编排（postgres/redis/minio/api/worker）
- **新增** MinIO 对象存储（替代本地文件系统）
- **新增** 一键管理脚本 `start-all.sh` / `start-web.sh`
- **新增** 部署文档 `DEPLOY.md` / 验证报告 `DEPLOY_VERIFICATION.md`

### 前端优化
- **新增** StatusPill - 实时 API 健康指示器
- **新增** Skeleton 加载骨架屏组件
- **新增** PageTransition 页面切换淡入动画
- **改进** 注册/登录页两栏布局 + 价值展示
- **改进** 套餐卡 padding/字号/FAQ 系统化

### 后端
- **修复** Celery 启动方式（`python -m celery` 解决 venv 路径问题）
- **新增** `/api/v1/ready` 就绪端点（db/redis/s3 健康检查）

## [0.2.0] - 2026-05-16

### 文档体系
- **新增** 14 篇核心设计文档（产品/概要/详细/UI/模块/技术等）
- **新增** 详细 API 文档 `docs/api.md`
- **新增** 部署文档 `docs/deployment.md`
- **新增** 运维文档 `docs/operations.md`

### 核心功能
- 八字分析（占位算法）
- 持续画像演进（Profile Version）
- 历史人物匹配
- 个性化建议（每日/每周/风水利好日）
- 成长档案时间线

## [0.1.0] - 2026-04-01

### 初始版本
- Monorepo 项目结构（apps/web、apps/mobile、services/api、services/worker）
- 基础用户系统（邮箱/密码）
- 移动端 React Native + Expo
- Web 端 Next.js 15 + App Router
- 14 篇基础设计文档
