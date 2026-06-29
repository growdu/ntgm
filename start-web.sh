#!/bin/bash
# 启动 NTGM Next.js 前端
# 含: 端口冲突重试 · 旧进程清理 · HTML+CSS 健康检查
set -e
cd /work/ai/ntgm/apps/web

PORT=3001
export PORT
export NEXT_PUBLIC_API_BASE_URL="http://localhost:8001/api/v1"

# 1. 清理所有 next-server 旧进程 (避免旧 build CSS 残留)
pkill -9 -f "next-server" 2>/dev/null || true
# 清理可能占用端口的进程
if command -v lsof >/dev/null 2>&1; then
  lsof -t -i :$PORT 2>/dev/null | xargs -r kill -9 2>/dev/null || true
elif command -v fuser >/dev/null 2>&1; then
  fuser -k -n tcp $PORT 2>/dev/null || true
fi
sleep 2

# 2. 启动
nohup pnpm start > /tmp/web.log 2>&1 &
NEXT_PID=$!
echo "Next.js PID: $NEXT_PID"

# 3. 健康检查 (HTML + CSS 双验证)
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  sleep 1
  if ! kill -0 $NEXT_PID 2>/dev/null; then
    echo "✗ Next.js 进程已退出，查看日志:"
    tail -20 /tmp/web.log
    exit 1
  fi

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:$PORT/ 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    # 验证 CSS 文件也是真 CSS (非 404 HTML)
    CSS_FILE=$(curl -s http://localhost:$PORT/ 2>/dev/null | grep -oE '/_next/static/css/[a-f0-9]+\.css' | head -1 || true)
    if [ -n "$CSS_FILE" ]; then
      CSS_HEAD=$(curl -s --max-time 2 "http://localhost:$PORT$CSS_FILE" 2>/dev/null | head -c 30)
      if echo "$CSS_HEAD" | grep -qE "(:root|\.[a-zA-Z])"; then
        echo "✓ Web 在 $PORT 端口已就绪 (HTML + CSS 已验证)"
        exit 0
      fi
    fi
  fi
  echo "  等待 $i... (HTTP=$HTTP_CODE)"
done

echo "✗ 启动超时，查看日志:"
tail -20 /tmp/web.log
exit 1
