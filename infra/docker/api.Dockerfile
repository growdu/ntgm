# Use locally cached debian:bookworm-slim as base (network unreliable for python:3.12-slim)
FROM docker.m.daocloud.io/library/debian:bookworm-slim

WORKDIR /app

# Install Python 3.12 + system deps (uv handles python install if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-venv python3-pip \
    libpq5 curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.11 /usr/bin/python3

# Install uv (fast Python package manager)
RUN curl -fsSL --max-time 30 https://astral.sh/uv/install.sh | sh || \
    pip3 install --break-system-packages uv
ENV PATH="/root/.local/bin:${PATH}"

# Copy API code
COPY services/api /app/api_src

# Install deps with uv (uses pyproject.toml)
WORKDIR /app/api_src
RUN uv sync --no-dev --index-url https://pypi.tuna.tsinghua.edu.cn/simple

# Run as non-root
RUN useradd -m -u 1000 ntgm && chown -R ntgm:ntgm /app
USER ntgm

ENV PYTHONPATH=/app/api_src
ENV PATH="/app/api_src/.venv/bin:${PATH}"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
