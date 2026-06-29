# NTGM 部署指南

## 当前部署状态（混合部署）

### ✅ 运行中的服务（实际状态）

| 服务 | 类型 | 端口 | URL | 状态 |
|------|------|------|-----|------|
| Next.js Web (前端) | 宿主机 pnpm | 3001 | http://localhost:3001 | ✅ HTTP 200 (18KB HTML) |
| FastAPI | Docker | 8001 | http://localhost:8001 | ✅ health OK |
| PostgreSQL | Docker | 5433 | postgres://ntgm@localhost:5433 | ✅ healthy |
| Redis | Docker | 6380 | redis://localhost:6380 | ✅ healthy |
| Celery Worker | Docker | (无) | - | ✅ 4 tasks registered |

### 已验证的端到端流程
- ✅ Web UI 渲染中文 zh-CN Next.js 页面
- ✅ API health endpoint: `{"success":true,"data":{"status":"ok"}}`
- ✅ 任务提交: `POST /api/v1/bazi/analyze` → `{"jobId":"bc1d6d94-...","status":"queued"}`
- ✅ Worker 处理: queued → completed in <10s
- ✅ 2 个 bazi_analyze 任务全部完成

## 用户访问入口

### 1. 终端用户 (Web UI)
```
http://localhost:3001  ← Next.js 前端 (面向用户)
```

### 2. API 文档 (开发者)
```
http://localhost:8001/docs  ← Swagger UI 自动生成
```

### 3. API 调用 (移动 App / 第三方)
```bash
curl http://localhost:8001/api/v1/health
curl -X POST http://localhost:8001/api/v1/bazi/analyze \
  -H "Content-Type: application/json" \
  -d '{"userId":"..."}'
```

## 部署结构

```
宿主
├── apps/web (Next.js)        → :3001    [pnpm start]
├── docker compose
│   ├── postgres:16 (daocloud) → :5433
│   ├── redis:6-alpine         → :6380
│   ├── api (FastAPI)          → :8001
│   └── worker (Celery)        → (后台)
└── 共享网络: docker_default
```

## 启动命令

```bash
# 1. Docker 后端 4 服务
cd /work/ai/ntgm/infra/docker
docker compose up -d postgres redis
docker compose build api
docker compose up -d api
docker compose build worker
docker compose up -d worker

# 2. 初始化 docker postgres schema (首次)
cd /work/ai/ntgm/services/api
APP_ENV=test python -c "
import sys
sys.path.insert(0, '.')
from app.db import engine, Base
import app.models  # noqa
Base.metadata.create_all(bind=engine)
print('Tables created:', len(Base.metadata.tables))
"

# 3. 前端 (宿主机)
cd /work/ai/ntgm/apps/web
PORT=3001 nohup pnpm start > /tmp/web.log 2>&1 &
```

## 关键技术决策

### 为什么前端不用 Docker?
- 容器内 `npm ci` 因 package-lock.json 与 npm 不兼容（monorepo 实际用 pnpm）
- npm install 受网络限制频繁失败
- .next 已预构建，宿主启动只需 715ms

### 为什么后端 4 服务都用 Docker?
- 环境一致性（开发/测试/生产）
- 端口隔离避免冲突（5433/6380/8001）
- 一键启停

## 已知问题

1. **Docker Hub 网络受限** → 用 CN 镜像 (daocloud)
2. **package-lock 不兼容** → web 改用宿主机启动
3. **worker CMD 必须用 `python -m celery`** → 直接 `celery` 不解析 PYTHONPATH

## 测试覆盖
- **pytest: 20 passed, 0 skipped**
- test_push_backend 已启用（test_health_task test_push_backend_noop）

## 生产环境升级路径

如需对外服务:
1. 加 nginx/Caddy 反向代理 (80/443 + TLS)
2. 域名 + DNS 解析
3. 移除 postgres/redis 端口映射（不暴露公网）
4. 改 NEXT_PUBLIC_API_BASE_URL 为公网域名
5. JWT 鉴权（当前 API 无鉴权）
6. minio 接入（当前为占位符）
7. 日志聚合 + 监控 (Prometheus + Grafana)