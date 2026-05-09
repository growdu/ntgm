FROM python:3.12-slim

WORKDIR /app

COPY services/worker/pyproject.toml /app/pyproject.toml
RUN pip install --no-cache-dir celery[redis] redis

COPY services/worker/app /app/app

CMD ["celery", "-A", "app.celery_app.celery_app", "worker", "--loglevel=INFO"]

