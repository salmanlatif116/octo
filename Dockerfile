# ---- Stage 1: build the Next.js frontend into static files (frontend/out) ----
FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Empty = the browser calls the API on the same origin it loaded the page from.
ENV NEXT_PUBLIC_API_BASE_URL=""
RUN npm run build

# ---- Stage 2: FastAPI serves the API *and* the built frontend ----
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    STATIC_DIR=/app/static \
    DATA_DIR=/data
WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY --from=frontend /frontend/out ./static

# SQLite database + uploaded screenshots live here; mount a volume to keep them.
RUN mkdir -p /data
VOLUME /data

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
