FROM python:3.12-slim

WORKDIR /app

COPY services/api/pyproject.toml /app/pyproject.toml
RUN pip install --no-cache-dir fastapi uvicorn[standard] pydantic-settings sqlalchemy psycopg[binary] redis

COPY services/api/app /app/app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

