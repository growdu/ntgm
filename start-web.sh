#!/bin/bash
# 启动 NTGM Next.js 前端 (含端口冲突重试 + 健康检查)
set -e
cd /work/ai/ntgm/apps/web

PORT=3001
export PORT
export NEXT_PUBLIC_API_BASE_URL="http://localhost:8001/api/v1"

# 如果端口被占用，先杀掉
if lsof -i :$PORT >/dev/null 2>&1; then
  echo "端口 $PORT 被占用，尝试释放..."
  lsof -t -i :$PORT | xargs -r kill -9 2>/dev/null || true
  sleep 2
fi

# 启动
nohup pnpm start > /tmp/web.log 2>&1 &
echo "Next.js PID: $!"

# 健康检查
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  if curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:$PORT/ 2>/dev/null | grep -q 200; then
    echo "✓ Web 在 $PORT 端口已就绪"
    exit 0
  fi
  echo "  等待 $i..."
done

echo "✗ 启动超时，查看日志: tail -20 /tmp/web.log"
tail -20 /tmp/web.log
exit 1
