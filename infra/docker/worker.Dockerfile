FROM python:3.12-slim

WORKDIR /app

# Copy API app (shares services, repos, models with worker)
COPY services/api/app /app/api_app

# Copy Worker app (tasks, celery config)
COPY services/worker/app /app/worker_app

# Install dependencies
COPY services/api/pyproject.toml /app/pyproject.toml
RUN pip install --no-cache-dir \
    fastapi uvicorn[standard] pydantic-settings sqlalchemy psycopg[binary] redis \
    celery[redis] alembic

# Set PYTHONPATH so worker can import from api_app
ENV PYTHONPATH=/app/api_app:/app/worker_app

# Worker entry point - tasks are in worker_app.celery_app
CMD ["celery", "-A", "worker_app.celery_app", "worker", "--loglevel=INFO"]