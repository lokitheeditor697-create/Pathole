# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Node: build Vite frontend + esbuild server bundle
# Using official Node image guarantees npm is on PATH (fixes exit 127 on Render)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install ALL dependencies (including devDeps like vite, esbuild needed for build)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy all source and build
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Python + Node runtime: run the server
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PORT=10000 \
    NODE_ENV=production \
    YOLO_OFFLINE=True \
    ULTRALYTICS_AUTOINSTALL=0 \
    PIP_ROOT_USER_ACTION=ignore

# Install system deps: Node.js 20 (to run dist/server.cjs) + OpenCV/FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python AI dependencies (CPU-only PyTorch to keep image small)
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir "numpy<2" "opencv-python-headless" ultralytics huggingface_hub requests


# Copy pre-built JS artifacts from the Node builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy runtime files needed by the server at startup
COPY detector/ ./detector/
COPY server/ ./server/
COPY data/ ./data/
COPY public/ ./public/
COPY .env.example ./.env.example

EXPOSE 10000

CMD ["node", "dist/server.cjs"]
