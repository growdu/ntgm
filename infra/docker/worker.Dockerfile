FROM python:3.12-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy both API app and Worker app
COPY services/api/pyproject.toml /app/api_pyproject.toml
COPY services/api/app /app/api_app
COPY services/worker/app /app/worker_app

# Install API deps (needed for push_service etc.) + celery for the worker itself
RUN uv sync --frozen --python python3.12 \
    --index-url https://pypi.tuna.tsinghua.edu.cn/simple \
    --no-dev \
    -p /app/api_pyproject.toml \
    2>/dev/null || \
    pip install --no-cache-dir \
    fastapi uvicorn[standard] pydantic-settings sqlalchemy \
    psycopg[binary] redis celery[redis] httpx

ENV PYTHONPATH=/app/api_app:/app/worker_app

CMD ["celery", "-A", "worker_app.celery_app", "worker", "--loglevel=INFO"]
