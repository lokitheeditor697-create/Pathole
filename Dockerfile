# ==============================================================================
# Multi-stage Dockerfile: Smart City Road Defect & Transit Verification System
# Compatible with: Hugging Face Spaces (Free 16GB RAM), Render, Railway, AWS, Local Docker
# ==============================================================================

# Stage 1: Build the React + Vite Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /build

# Copy frontend package definitions and install
COPY frontend/package*.json ./
RUN npm ci --prefer-offline --no-audit

# Copy frontend source files and compile production bundle
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Python Runtime Environment
# ==============================================================================
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860

# Install required system libraries for OpenCV and PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend, detector, demo files, and model weights
COPY backend/ ./backend/
COPY detector/ ./detector/
COPY demo_4bus.py .

# Copy built frontend from Stage 1 into frontend/dist (FastAPI serves this automatically)
COPY --from=frontend-builder /build/dist ./frontend/dist

# Expose the default port (Hugging Face Spaces uses 7860, Render uses $PORT)
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:${PORT}/stats || exit 1

# Launch FastAPI application (serves both REST API and React frontend SPA)
CMD ["sh", "-c", "python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
