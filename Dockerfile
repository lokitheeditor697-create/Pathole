FROM python:3.11-slim

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PORT=10000 \
    NODE_ENV=production \
    YOLO_OFFLINE=True \
    ULTRALYTICS_AUTOINSTALL=0 \
    PIP_ROOT_USER_ACTION=ignore

# Install system dependencies including Node.js 20 & OpenCV / FFmpeg libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    build-essential \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip and install pre-built CPU PyTorch and Ultralytics
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir "numpy<2" "opencv-python-headless" ultralytics huggingface_hub

# Copy package files and install npm dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build Vite frontend and server bundle
RUN npm run build

EXPOSE 10000 7860 3000

CMD ["node", "dist/server.cjs"]
