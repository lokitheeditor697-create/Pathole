FROM python:3.10-slim

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    NODE_ENV=production \
    YOLO_OFFLINE=True \
    ULTRALYTICS_AUTOINSTALL=0

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

# Create non-root user with UID 1000 for Hugging Face Spaces compatibility
RUN useradd -m -u 1000 user
WORKDIR /app

# Install CPU PyTorch, torchvision, and Ultralytics dependencies
RUN pip install --no-cache-dir \
    torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir \
    ultralytics \
    opencv-python-headless \
    numpy

# Copy package files and install npm dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build Vite frontend and server bundle
RUN npm run build

# Ensure Hugging Face non-root user has full access to app directory
RUN chown -R user:user /app && chmod -R 777 /app

USER user

EXPOSE 7860

CMD ["node", "dist/server.cjs"]
