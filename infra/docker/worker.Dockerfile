FROM python:3.12-slim

WORKDIR /app

# Install OpenCV + MediaPipe system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Copy project files
COPY services/api/pyproject.toml /app/api_pyproject.toml
COPY services/api/app /app/api_app
COPY services/worker/app /app/worker_app

# Install API deps (SQLAlchemy, httpx, redis, etc.) via uv sync --frozen
# This creates a venv at /app/.venv
RUN uv sync --frozen \
    --python python3.12 \
    --index-url https://pypi.tuna.tsinghua.edu.cn/simple \
    --no-dev \
    -p /app/api_pyproject.toml

# Overlay worker-specific deps on top of the venv via pip.
# /app/.venv is where uv sync created the environment.
RUN /app/.venv/bin/python -m pip install --no-cache-dir \
    "mediapipe" \
    "minio" \
    "opencv-python-headless"

ENV PYTHONPATH=/app/api_app:/app/worker_app

CMD ["celery", "-A", "worker_app.celery_app", "worker", "--loglevel=INFO"]
