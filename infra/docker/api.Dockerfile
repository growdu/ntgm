FROM python:3.12-slim

WORKDIR /app

# Install uv
RUN pip install uv

COPY services/api/pyproject.toml /app/pyproject.toml
RUN uv sync --frozen --index-url https://pypi.tuna.tsinghua.edu.cn/simple --python python3.12

COPY services/api/app /app/app

ENV PYTHONPATH=/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
