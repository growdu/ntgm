# Use locally cached debian:bookworm-slim as base (network unreliable for python:3.12-slim)
FROM docker.m.daocloud.io/library/debian:bookworm-slim

WORKDIR /app

# Install Python 3.11 + OpenCV system deps + libgl
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-venv python3-pip \
    libgl1-mesa-glx libglib2.0-0 libsm6 libxrender1 libxext6 \
    libpq5 curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.11 /usr/bin/python3

# Install uv
RUN curl -fsSL --max-time 30 https://astral.sh/uv/install.sh | sh || \
    pip3 install --break-system-packages uv
ENV PATH="/root/.local/bin:${PATH}"

# Copy API code (worker imports from API)
COPY services/api /app/api_app

# Copy worker code
COPY services/worker /app/worker_app

# Install worker deps with uv
WORKDIR /app/worker_app
RUN uv sync --no-dev --index-url https://pypi.tuna.tsinghua.edu.cn/simple

# Run as non-root
RUN useradd -m -u 1000 ntgm && chown -R ntgm:ntgm /app
USER ntgm

ENV PYTHONPATH=/app/api_app:/app/worker_app
ENV API_APP_PATH=/app/api_app
ENV PATH="/app/worker_app/.venv/bin:${PATH}"
# celery uses import_from_cwd which doesn't see PYTHONPATH from workdir —
# explicitly pass it so app.celery_app resolves from /app/worker_app/app/celery_app.py
ENV C_FORCE_ROOT=1

CMD ["sh", "-c", "cd /app/worker_app && exec python -m celery -A app.celery_app worker --loglevel=INFO -Q celery"]  # WORKDIR=/app/worker_app + PYTHONPATH
