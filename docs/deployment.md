# 逆天改命算命软件部署文档

## 1. 文档说明

本文档用于说明项目的部署方式、环境准备、组件启动顺序、配置要求和发布流程。

当前文档基于现有技术架构方案编写，适用于项目从开发环境到测试、预发布和生产环境的标准部署。

---

## 2. 部署目标

系统部署需要满足以下目标：

1. 支持 Web、API、异步任务和对象存储协同运行
2. 支持 Android / iOS 统一后端接入
3. 支持后续图像分析与通知能力扩展
4. 支持测试、预发布、生产多环境切换

---

## 3. 部署架构

当前推荐部署组件如下：

1. `Nginx / Gateway`
2. `Next.js Web`
3. `FastAPI API`
4. `Celery Worker`
5. `Celery Beat`
6. `PostgreSQL`
7. `Redis`
8. `MinIO / S3`

逻辑结构：

```text
Client(Web / Android / iOS / Desktop)
    |
    v
Nginx / Gateway
    |
    +----------------> Next.js Web
    |
    +----------------> FastAPI API
                               |
          +--------------------+--------------------+
          |                    |                    |
          v                    v                    v
     PostgreSQL             Redis             MinIO / S3
                                   |
                                   v
                           Celery Worker / Beat
```

---

## 4. 环境要求

## 4.1 基础环境

部署机器建议具备：

1. Linux 64 位系统
2. Docker
3. Docker Compose
4. 可访问数据库、Redis、对象存储
5. 可配置 HTTPS 和域名

## 4.2 域名要求

建议准备：

1. 主站域名
2. API 子域名
3. 预发布域名

示例：

1. `app.example.com`
2. `api.example.com`
3. `staging.example.com`

## 4.3 HTTPS 要求

必须启用 HTTPS，原因：

1. 用户会上传敏感图片
2. 用户会提交个人出生信息和行为记录
3. 登录与令牌传输必须加密

---

## 5. 环境变量要求

部署前至少准备以下配置：

1. `APP_ENV`
2. `APP_HOST`
3. `APP_PORT`
4. `WEB_BASE_URL`
5. `API_BASE_URL`
6. `DATABASE_URL`
7. `REDIS_URL`
8. `CELERY_BROKER_URL`
9. `CELERY_RESULT_BACKEND`
10. `S3_ENDPOINT`
11. `S3_BUCKET`
12. `S3_ACCESS_KEY`
13. `S3_SECRET_KEY`
14. `JWT_SECRET`
15. `OPENAI_API_KEY` 或等价模型服务密钥
16. `PUSH_NOTIFICATION_CONFIG`
17. `IMAGE_ANALYSIS_ENABLED`

建议做法：

1. 开发环境使用 `.env.local`
2. 测试和预发布使用 CI/CD 密钥管理
3. 生产环境使用安全配置中心或部署平台密钥管理

---

## 6. 组件部署说明

## 6.1 PostgreSQL

职责：

1. 存储用户资料
2. 存储输入证据
3. 存储画像版本
4. 存储匹配结果
5. 存储建议与反馈

部署建议：

1. 开发环境可容器部署
2. 生产环境建议独立实例或托管服务

部署后检查：

1. 数据库可连接
2. 用户权限正确
3. 扩展与字符集符合要求
4. 迁移工具可执行

## 6.2 Redis

职责：

1. Celery Broker
2. 缓存
3. 幂等控制

部署后检查：

1. Redis 可连接
2. 内存策略已设置
3. 队列命名空间已规划

## 6.3 MinIO / S3

职责：

1. 存储图片
2. 存储导出报告
3. 存储分享文件

部署建议：

1. 开发环境用 MinIO
2. 生产环境用云对象存储

部署后检查：

1. Bucket 已创建
2. 访问权限正确
3. 上传和下载签名 URL 可用

## 6.4 FastAPI API

职责：

1. 提供统一业务 API
2. 接收用户输入
3. 提供画像、匹配、建议查询

部署后检查：

1. 健康检查接口可访问
2. 数据库连接正常
3. Redis 连接正常
4. 对象存储配置正常

## 6.5 Celery Worker

职责：

1. 执行八字分析
2. 执行图像分析
3. 执行画像重算
4. 执行匹配与建议生成

部署后检查：

1. Worker 已订阅目标队列
2. 能处理测试任务
3. 日志正常输出

## 6.6 Celery Beat

职责：

1. 定时提醒任务
2. 清理临时文件
3. 触发周期性任务

部署后检查：

1. 定时任务已注册
2. 计划任务能正常触发

## 6.7 Next.js Web

职责：

1. 提供 Web 前端页面
2. 提供分享页、导出页、用户主界面

部署后检查：

1. 页面可访问
2. API 地址配置正确
3. 静态资源加载正常

## 6.8 Nginx / Gateway

职责：

1. HTTPS 终止
2. 路由转发
3. 静态资源代理
4. 基础限流与安全头

部署后检查：

1. 域名解析正确
2. HTTPS 证书可用
3. Web 与 API 路由正常

---

## 7. 部署顺序

建议按以下顺序部署：

1. PostgreSQL
2. Redis
3. MinIO / S3
4. FastAPI API
5. Celery Worker
6. Celery Beat
7. Next.js Web
8. Nginx / Gateway

原因：

1. API 依赖数据库、Redis、对象存储
2. Worker 依赖 API 共用配置与队列
3. Web 依赖 API 地址
4. Gateway 最后统一暴露入口

---

## 8. 数据库迁移流程

部署 API 前，必须先执行数据库迁移。

建议流程：

1. 在测试环境执行迁移
2. 验证迁移结果
3. 在预发布环境演练
4. 生产环境备份后执行迁移

发布原则：

1. 迁移脚本必须版本化
2. 迁移前必须有备份
3. 高风险迁移要有回滚方案

---

## 9. 开发环境部署建议

开发环境推荐使用容器化本地启动。

建议组件：

1. PostgreSQL
2. Redis
3. MinIO
4. FastAPI
5. Celery Worker
6. Next.js

开发环境目标：

1. 开发者可独立跑通最小闭环
2. 支持本地联调
3. 支持图片上传和任务触发

---

## 10. 测试环境部署建议

测试环境建议：

1. 与开发环境配置分离
2. 使用独立数据库
3. 使用独立对象存储桶
4. 开启完整日志

必须验证：

1. 建档流程
2. 八字分析链路
3. 问答校准链路
4. 画像重算链路
5. 匹配与建议生成链路

---

## 11. 预发布环境部署建议

预发布环境应尽量接近生产环境。

建议：

1. 使用接近生产的网络结构
2. 使用独立域名
3. 验证数据库迁移
4. 验证发布脚本
5. 验证回滚策略

---

## 12. 生产环境部署建议

生产环境建议：

1. 数据库与应用分离
2. Worker 独立运行
3. 重要数据自动备份
4. 监控与告警完整
5. HTTPS 全面启用

生产环境必须具备：

1. 备份策略
2. 恢复流程
3. 日志采集
4. 任务监控
5. 发布回滚机制

---

## 13. 发布流程

标准发布建议：

1. 合并代码
2. 自动化测试
3. 构建产物
4. 发布测试环境
5. 发布预发布环境
6. 迁移演练
7. 发布生产环境
8. 发布后验证

发布后重点验证：

1. 用户建档可用
2. API 可用
3. Worker 正常消费
4. 图片上传正常
5. 画像重算正常
6. 人物匹配正常
7. 建议生成正常

---

## 14. 回滚策略

若发布失败，建议按以下顺序处理：

1. 回滚 Web 版本
2. 回滚 API 版本
3. 暂停高风险 Worker 任务
4. 检查数据库迁移影响

注意：

1. 数据库迁移回滚必须谨慎
2. 不可逆迁移应先做备份

---

## 15. 移动端交付补充

由于系统支持 Android 和 iOS，部署还包括移动端发布链路。

需要准备：

1. Expo/EAS 构建配置
2. Android 签名
3. iOS 证书和描述文件
4. 推送配置
5. 分环境 API 注入

建议流程：

1. 测试环境接入测试 API
2. 预发布版本接入预发布 API
3. 生产版本接入正式 API

---

## 16. 部署验收清单

部署完成后，至少检查：

1. Web 页面可访问
2. API 健康检查正常
3. 数据库连接正常
4. Redis 连接正常
5. Worker 在线
6. 图片上传成功
7. 八字分析任务成功
8. 画像重算成功
9. 匹配结果可生成
10. 建议结果可生成

---

## 17. 已完成补充（2026-06）

1. Docker Compose 完整示例 — 见 `infra/compose/docker-compose.yml`
2. CI/CD 配置说明 — 见 `.github/workflows/ci.yml`
3. 健康检查接口定义 — `GET /api/v1/health`（基础）+ `GET /api/v1/ready`（含 DB/Redis/MinIO 实际探测）
4. Sentry 监控接入 — `main.py` 中 `_init_sentry()`，配置 `SENTRY_DSN` 环境变量即生效
5. Structured JSON logging — `python-json-logger`，所有日志 JSON 格式化

## 18. Docker 快速启动命令

```bash
# 克隆项目
git clone https://github.com/<org>/ntgm.git
cd ntgm

# 启动全套本地开发环境（postgres + redis + minio + api + worker + web）
docker compose -f infra/compose/docker-compose.yml up -d

# 查看服务状态
docker compose -f infra/compose/docker-compose.yml ps

# 查看 API 日志
docker compose -f infra/compose/docker-compose.yml logs -f api

# 查看 Worker 日志
docker compose -f infra/compose/docker-compose.yml logs -f worker

# 运行数据库迁移（首次启动后）
docker compose -f infra/compose/docker-compose.yml exec api \\
  python -c "from app.db import engine; from alembic import command; from alembic.config import Config; \\
  cfg = Config('alembic.ini'); command.upgrade(cfg, 'head')"

# 触发初始数据（创建测试用户等）
docker compose -f infra/compose/docker-compose.yml exec api \\
  python scripts/seed_dev_data.py

# 停止所有服务
docker compose -f infra/compose/docker-compose.yml down

# 清理数据（慎用）
docker compose -f infra/compose/docker-compose.yml down -v
```

## 19. 生产发布检查清单

发布前必查：

```bash
# 1. 运行完整测试
cd services/api && uv run pytest -q

# 2. 构建所有镜像
docker build -f infra/docker/api.Dockerfile -t ntgm-api:latest .
docker build -f infra/docker/worker.Dockerfile -t ntgm-worker:latest .
docker build -f infra/docker/web.Dockerfile -t ntgm-web:latest .

# 3. 健康检查
curl http://localhost:8000/api/v1/health
curl http://localhost:8000/api/v1/ready

# 4. 数据库备份（生产）
pg_dump -h $PROD_HOST -U ntgm ntgm > backup_$(date +%Y%m%d).sql

# 5. 执行迁移
alembic upgrade head
```

## 20. 环境变量参考

| 变量 | 说明 | 示例 |
|------|------|------|
| `APP_ENV` | 运行环境 | `production` |
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql+psycopg://...` |
| `REDIS_URL` | Redis 连接串 | `redis://localhost:6379/0` |
| `S3_ENDPOINT` | MinIO/S3 端点 | `http://localhost:9000` |
| `S3_BUCKET` | 对象存储桶名 | `ntgm-prod` |
| `SENTRY_DSN` | Sentry DSN（留空禁用） | `https://...@sentry.io/...` |
| `JWT_SECRET` | JWT 签名密钥 | `openssl rand -hex 32` |
| `EXPO_ACCESS_TOKEN` | Expo Push 密钥 | （从 Expo 平台获取） |
| `PUSH_DRY_RUN` | 是否真发推送 | `false`（生产） |

