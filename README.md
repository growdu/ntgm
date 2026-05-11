# 逆天改命算命软件

这是一个面向“持续交互演进画像”的命理产品仓库。

项目核心不是一次性算命报告，而是围绕以下闭环展开：

1. 用户提交基础资料、照片、问答和人生事件
2. 系统持续生成和修正用户画像
3. 系统匹配历史人物原型
4. 系统输出可执行建议并接收反馈
5. 所有结果沉淀为可回溯的成长档案

## 文档目录

所有项目文档统一放在 [docs](./docs/) 目录下：

1. [产品需求文档](./docs/product.md)
2. [概要设计文档](./docs/overview-design.md)
3. [详细设计文档](./docs/detailed-design.md)
4. [UI 原型设计与交互流程文档](./docs/ui.md)
5. [模块设计与数据流向文档](./docs/mod.md)
6. [技术架构选型文档](./docs/tech.md)
7. [资源要求文档](./docs/resource.md)
8. [部署文档](./docs/deployment.md)
9. [API 文档](./docs/api.md)
10. [实施路线文档](./docs/roadmap.md)
11. [项目目录结构文档](./docs/project-structure.md)
12. [实现计划文档](./docs/implementation-plan.md)
13. [用户文档](./docs/user-guide.md)
14. [运维文档](./docs/operations.md)

## 推荐阅读顺序

如果你是第一次进入项目，建议按这个顺序阅读：

1. [docs/product.md](./docs/product.md)
2. [docs/ui.md](./docs/ui.md)
3. [docs/overview-design.md](./docs/overview-design.md)
4. [docs/detailed-design.md](./docs/detailed-design.md)
5. [docs/mod.md](./docs/mod.md)
6. [docs/tech.md](./docs/tech.md)
7. [docs/resource.md](./docs/resource.md)
8. [docs/deployment.md](./docs/deployment.md)
9. [docs/api.md](./docs/api.md)
10. [docs/roadmap.md](./docs/roadmap.md)
11. [docs/project-structure.md](./docs/project-structure.md)
12. [docs/implementation-plan.md](./docs/implementation-plan.md)
13. [docs/user-guide.md](./docs/user-guide.md)
14. [docs/operations.md](./docs/operations.md)

## 当前状态

当前仓库已经进入 `Phase 2-3` 过渡阶段，核心后端主链和 Web 演示工作台已经打通最小闭环。

现阶段输出已经覆盖：

1. 产品需求
2. 系统设计
3. UI 原型与交互流程
4. 模块与数据流
5. 技术选型
6. 资源要求
7. 部署文档
8. API 文档
9. 实施路线
10. 项目目录结构
11. 实现计划
12. 用户文档
13. 运维文档
14. Monorepo 工程骨架
15. Web / Mobile / API / Worker 最小入口
16. 建档 / 八字占位 / 画像重算 / 匹配 / 建议的最小 API 链路
17. Web 单页工作台演示入口
18. 画像版本变化记录与成长档案时间线
19. 时间线筛选、版本联动与画像历史查看

## 当前工程结构

当前仓库已建立以下目录：

1. `apps/web`：Next.js Web 工作台原型与演示主流程
2. `apps/mobile`：React Native + Expo 骨架
3. `services/api`：FastAPI API 骨架
4. `services/worker`：Celery Worker 骨架
5. `packages/*`：共享 SDK、领域模型、校验与设计 token
6. `infra/compose`：本地基础设施编排
7. `infra/docker`：基础 Dockerfile

## 快速开始

当前阶段建议先完成本地基础设施启动，再分别接入 Web 与 API 开发。

1. 复制环境变量模板：`.env.example`
2. 启动本地基础设施：`infra/compose/docker-compose.yml`
3. 启动 API：`services/api`
4. 启动 Worker：`services/worker`
5. 启动 Web：`apps/web`
6. 启动移动端：`apps/mobile`

当前不是完整产品，但 Web 端已经可以对接现有 API 演示以下最小主流程：

1. 基础建档
2. 八字占位分析
3. 持续问答与事件录入
4. 画像重算与版本演进
5. 历史人物匹配与建议查看
6. 成长档案时间线、变化记录与版本回看

## 下一步建议

建议后续按以下顺序推进：

1. 把 `profiles/recompute` 切换为真实 Worker 异步任务链
2. 接入图片上传到 MinIO / S3
3. 把时间线节点详情从原始 JSON 提升为结构化展示
4. 落八字分析与画像引擎 V1 的真实规则
5. 接入移动端建档与问答
