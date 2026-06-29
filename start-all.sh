#!/bin/bash
# NTGM 一键启动脚本 (混合部署: Docker + 宿主)
# 使用: ./start-all.sh [up|down|status|restart]

set -e

PROJECT_ROOT="/work/ai/ntgm"
INFRA_DIR="$PROJECT_ROOT/infra/docker"
WEB_DIR="$PROJECT_ROOT/apps/web"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cmd="${1:-up}"

case "$cmd" in
    up)
        echo -e "${YELLOW}=== NTGM 启动中 ===${NC}"

        # 1. Docker 后端 4 服务
        echo -e "\n${GREEN}[1/4]${NC} 启动 Docker 后端 (postgres, redis, api, worker)..."
        cd "$INFRA_DIR"
        docker compose up -d postgres redis
        echo "  等待数据库就绪..."
        sleep 8
        docker compose up -d api worker 2>&1 | tail -3 || {
            echo -e "${RED}API/Worker 启动失败，尝试构建镜像...${NC}"
            docker compose build api
            docker compose up -d api
            docker compose build worker
            docker compose up -d worker
        }

        # 2. 初始化数据库 schema (如果需要)
        echo -e "\n${GREEN}[2/4]${NC} 初始化数据库 schema (如果需要)..."
        cd "$PROJECT_ROOT/services/api"
        APP_ENV=test "$PROJECT_ROOT/services/api/.venv/bin/python" -c "
import sys
sys.path.insert(0, '.')
for k in list(sys.modules.keys()):
    if k == 'app' or k.startswith('app.'):
        del sys.modules[k]
import os
os.environ.setdefault('DATABASE_URL', 'postgresql+psycopg://ntgm:ntgm@localhost:5433/ntgm')
from app.db import engine
from app.models.base import Base
import app.models  # noqa — register all models
Base.metadata.create_all(bind=engine)
print('  Schema OK:', len(Base.metadata.tables), 'tables')
" 2>&1 | tail -3

        # 3. Next.js 前端 (宿主)
        echo -e "\n${GREEN}[3/4]${NC} 启动 Next.js 前端 (宿主机 :3001)..."
        # 杀掉占用 3001 端口的进程
        pkill -f "next start" 2>/dev/null || pkill -f "pnpm.*start" 2>/dev/null || true
        sleep 2
        cd "$WEB_DIR"
        nohup env PORT=3001 pnpm start > /tmp/ntgm-web.log 2>&1 &
        echo "  PID: $!"
        sleep 5

        # 4. 验证
        echo -e "\n${GREEN}[4/4]${NC} 验证服务..."
        sleep 3
        if curl -sf --max-time 5 http://localhost:8001/api/v1/health > /dev/null; then
            echo -e "  ${GREEN}✓${NC} API  : http://localhost:8001"
        else
            echo -e "  ${RED}✗${NC} API  未响应"
        fi
        if curl -sf --max-time 5 http://localhost:3001/ > /dev/null; then
            echo -e "  ${GREEN}✓${NC} Web  : http://localhost:3001"
        else
            echo -e "  ${RED}✗${NC} Web  未响应"
        fi

        echo -e "\n${GREEN}=== 启动完成 ===${NC}"
        echo "API 文档: http://localhost:8001/docs"
        echo "前端 UI: http://localhost:3001"
        echo "日志:   tail -f /tmp/ntgm-web.log"
        ;;

    down)
        echo -e "${YELLOW}=== NTGM 停止中 ===${NC}"
        echo -n "停止 Next.js... "
        pkill -f "next start" 2>/dev/null && echo "OK" || echo "未运行"
        echo -n "停止 Docker 服务... "
        cd "$INFRA_DIR" && docker compose down 2>&1 | tail -3
        echo -e "${GREEN}=== 停止完成 ===${NC}"
        ;;

    status)
        echo -e "${YELLOW}=== NTGM 状态 ===${NC}"
        echo -e "\n${GREEN}Docker 容器:${NC}"
        cd "$INFRA_DIR" && docker compose ps 2>&1 | head -20
        echo -e "\n${GREEN}Next.js 进程:${NC}"
        ps -ef | grep -E "(next start|pnpm.*start)" | grep -v grep | head -5 || echo "  未运行"
        echo -e "\n${GREEN}健康检查:${NC}"
        for url in "http://localhost:8001/api/v1/health" "http://localhost:3001/"; do
            code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$url" 2>&1)
            if [ "$code" = "200" ]; then
                echo -e "  ${GREEN}✓${NC} $url (HTTP $code)"
            else
                echo -e "  ${RED}✗${NC} $url (HTTP $code)"
            fi
        done
        ;;

    restart)
        $0 down
        sleep 3
        $0 up
        ;;

    *)
        echo "用法: $0 [up|down|status|restart]"
        exit 1
        ;;
esac