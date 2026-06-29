# 贡献指南

感谢你考虑为本项目做出贡献！

## 行为准则

本项目采用 [Contributor Covenant](./CODE_OF_CONDUCT.md) 行为准则。参与即表示你同意遵守其条款。

## 如何贡献

### 报告 Bug

提交 Issue 前请：

1. 搜索现有 Issue 避免重复
2. 提供最小复现代码或步骤
3. 包含环境信息（OS、Node 版本、Python 版本）
4. 附上相关日志

### 提出新功能

1. 先在 Issue 中讨论，确认方向
2. 说明用户故事和使用场景
3. 等待维护者确认后开始实现

### 提交 Pull Request

1. Fork 仓库，从 `main` 创建特性分支
2. 提交前确保：
   - `pnpm lint` 通过
   - `pnpm typecheck` 通过
   - `pnpm test` 通过
   - 遵循现有代码风格
3. 提交信息使用 [约定式提交](https://www.conventionalcommits.org/zh-hans/)
4. PR 标题清晰描述变更
5. 关联相关 Issue

## 开发设置

### 环境要求

- Node.js 22+
- pnpm 10+
- Python 3.11+
- uv (Python 包管理)
- Docker + Docker Compose

### 初始化

```bash
# 安装依赖
pnpm install

# 启动基础设施（postgres/redis/minio）
./start-all.sh up

# 启动 API（端口 8001）
cd services/api && uv run python -m uvicorn app.main:app --reload --port 8001

# 启动 Worker
cd services/worker && uv run python -m celery -A app.celery_app worker -l info

# 启动 Web（端口 3001）
./start-web.sh
```

### 代码规范

- TypeScript：使用 ESLint + Prettier 配置
- Python：使用 ruff + black
- 提交前运行 `pnpm exec prettier --write .`

### 测试

```bash
# Web
pnpm --dir apps/web test
pnpm --dir apps/web typecheck

# API
cd services/api && uv run pytest

# 端到端
./start-all.sh status
curl http://localhost:8001/api/v1/ready
```

## 项目结构

```
.
├── apps/
│   ├── web/        # Next.js 前端
│   └── mobile/     # React Native 移动端
├── services/
│   ├── api/        # FastAPI 后端
│   └── worker/     # Celery 异步任务
├── packages/       # 共享 SDK (@ntgm/sdk)
├── infra/
│   └── docker/     # Docker Compose 编排
├── docs/           # 设计文档
└── scripts/        # 工具脚本
```

## 联系方式

- Issue 跟踪：GitHub Issues
- 邮件：dev@ntgm.app
- 讨论：GitHub Discussions
