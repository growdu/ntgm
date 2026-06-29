<div align="center">

# 逆天改命算命软件

**持续交互演进画像的命理产品仓库**

☯ 一命二运三风水 · 四积阴德五读书 ☯

[快速上手](#快速开始) · [文档中心](https://growdu.github.io/ntgm/) · [GitHub](https://github.com/growdu/ntgm) · [演示](http://localhost:3001)

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](apps/web/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi)](services/api/)
[![Celery](https://img.shields.io/badge/Celery-Worker-37814A?logo=celery)](services/worker/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](infra/docker/)
[![MkDocs](https://img.shields.io/badge/MkDocs-Material-blue)](https://growdu.github.io/ntgm/)

</div>

---

## 📖 项目概述

本仓库是面向「持续交互演进画像」的命理产品源代码实现。**核心不是一次性算命报告**，而是围绕以下闭环展开：

1. **用户提交**：基础资料、照片、问答、人生事件
2. **持续生成**：画像随事件演进，永远不是终态
3. **人物匹配**：从历史原型中找到共鸣
4. **可执行建议**：基于画像的风水/方位/数字/日期
5. **反馈接收**：建议效果进入下次重算
6. **成长档案**：所有结果沉淀为可回溯的时间线

## ✨ 当前能力

| 模块 | 状态 | 端点 |
|------|------|------|
| 用户系统（邮箱/密码） | ✅ 完成 | `POST /auth/*` |
| 八字分析（占位算法） | ✅ 完成 | `POST /bazi/analyze` |
| 画像演进（版本化） | ✅ 完成 | `POST /profiles/recompute` |
| 历史人物匹配 | ✅ 完成 | `POST /match/*` |
| 个性化建议 | ✅ 完成 | `GET /advice/current` |
| 成长档案 | ✅ 完成 | `GET /archive/timeline` |
| 真实人脸提取 | 🚧 计划 | - |

## 🚀 快速开始

### 环境要求

- Docker 24+ 与 Docker Compose v2
- Node.js 22+ 与 pnpm 10+
- Python 3.11+ 与 [uv](https://github.com/astral-sh/uv)
- 至少 4GB 可用内存

### 一键启动（推荐）

```bash
# 克隆仓库
git clone https://github.com/growdu/ntgm.git
cd ntgm

# 启动基础设施（postgres/redis/minio/api/worker）
./start-all.sh up

# 在新终端启动前端
./start-web.sh

# 浏览器访问
open http://localhost:3001
```

### 手动启动（开发者模式）

```bash
# 1) 启动基础设施
cd infra/docker
docker compose up -d postgres redis minio
docker compose up -d minio-init

# 2) 启动 API（端口 8001）
cd ../../services/api
uv sync --frozen
uv run python -m uvicorn app.main:app --reload --port 8001

# 3) 启动 Worker（新终端）
cd services/worker
uv run python -m celery -A app.celery_app worker -l info

# 4) 启动 Web（端口 3001，新终端）
cd apps/web
pnpm install --frozen-lockfile
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api/v1 pnpm dev
```

验证环境就绪：

```bash
curl http://localhost:8001/api/v1/ready
# {"success":true,"data":{"status":"ready","checks":{...}}}
```

## 🏗 架构

```
┌─────────────┐     ┌─────────────┐     ┌──────────┐
│  Web (Next) │────▶│ API (Fast)  │────▶│ Postgres │
│  Mobile RN  │     │             │     └──────────┘
└─────────────┘     └──────┬──────┘     ┌──────────┐
                           ├───────────▶│  Redis   │
                           │            │ (队列)    │
                           ▼            └──────────┘
                  ┌─────────────┐      ┌──────────┐
                  │Worker(Celery)│─────▶│ MinIO(S3)│
                  └─────────────┘      └──────────┘
```

- **apps/web/** — Next.js 15 App Router 前端
- **apps/mobile/** — Expo React Native 移动端
- **services/api/** — FastAPI 后端服务
- **services/worker/** — Celery 异步任务
- **packages/** — 共享 SDK（@ntgm/sdk）
- **infra/docker/** — Docker Compose 编排

## 📚 文档

完整文档托管在 GitHub Pages：[**growdu.github.io/ntgm**](https://growdu.github.io/ntgm/)

包含以下章节：

| 章节 | 内容 |
|------|------|
| 📜 产品需求 | 产品定位、用户画像、Phase 划分 |
| 🜲 概要设计 | 架构图、数据流、模块边界 |
| ⚙ 详细设计 | 模块拆分、算法、接口契约 |
| 🎨 UI 设计 | 交互流程、视觉规范 |
| ⚡ API 参考 | REST 端点、OpenAPI、SDK |
| 🚀 部署指南 | Docker、生产环境、CI/CD |
| 🛡 运维手册 | 监控、备份、故障排查 |
| 📋 实施路线 | 路线图、当前进度 |

## 🧪 测试

```bash
# 后端 pytest
cd services/api && uv run pytest -q
# .................... [100%] 20 passed

# 前端 lint + typecheck + build
cd apps/web
pnpm lint
pnpm typecheck
pnpm build

# 端到端
./start-all.sh status
curl http://localhost:8001/api/v1/ready
```

## 🤝 贡献

我们欢迎各种形式的贡献！详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

- 🐛 报告 Bug：GitHub Issues
- 💡 提出功能：先开 Issue 讨论
- 🔧 提交 PR：遵循 [Conventional Commits](https://www.conventionalcommits.org/)

## 📜 许可证

[MIT License](LICENSE) - 2024-2026 NTGM Contributors

## 🙏 致谢

- [FastAPI](https://fastapi.tiangolo.com/) · 高性能 Python Web 框架
- [Next.js](https://nextjs.org/) · React 全栈框架
- [Celery](https://docs.celeryq.dev/) · 分布式任务队列
- [MinIO](https://min.io/) · 高性能对象存储
- [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) · 现代化文档站
