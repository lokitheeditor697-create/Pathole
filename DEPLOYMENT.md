# Deployment Guide: Free Cloud Hosting for Smart City Road Defect Detector

This repository is containerized with a production-ready **multi-stage Dockerfile** that builds the React frontend and packages the FastAPI backend + YOLOv8 detector into a single self-contained application.

---

## Option 1: Hugging Face Spaces (Recommended — 100% Free, 16 GB RAM)

Hugging Face Spaces provides a **free cloud container with 2 vCPUs and 16 GB RAM**, which is ideal for PyTorch and YOLOv8 computer vision models (most free tiers only give 512MB RAM, which causes out-of-memory crashes).

### Step 1: Create a Free Space
1. Sign up or log in at [huggingface.co](https://huggingface.co).
2. Go to [huggingface.co/new-space](https://huggingface.co/new-space).
3. Fill in:
   * **Space name**: `smart-road-defect-detector`
   * **License**: `mit` (or choose any)
   * **Select the Space SDK**: Choose **Docker** -> **Blank**
   * **Space hardware**: Select **CPU basic • 2 vCPU • 16 GB RAM • Free**
4. Click **"Create Space"**.

### Step 2: Push Your Code
Hugging Face will give you a Git clone URL. Run in PowerShell / Git Bash:

```bash
git clone https://huggingface.co/spaces/YOUR_USERNAME/smart-road-defect-detector hf-space
```

Copy the project files into the cloned folder:
* `Dockerfile`
* `requirements.txt`
* `.dockerignore`
* `backend/`
* `detector/`
* `frontend/`
* `demo_4bus.py`

Then commit and push:
```bash
cd hf-space
git add .
git commit -m "Deploy Smart City Road Defect Detector"
git push
```

### Step 3: Access Your Live App
Hugging Face will automatically build the Dockerfile and launch your app.
Your public URL will be:
```
https://YOUR_USERNAME-smart-road-defect-detector.hf.space
```

---

## Option 2: Render (Free Web Service with Docker)

1. Create a free account at [render.com](https://render.com).
2. Click **"New +"** -> **"Web Service"**.
3. Connect your GitHub repository containing this project.
4. Settings:
   * **Runtime**: `Docker`
   * **Instance Type**: `Free`
5. Click **"Create Web Service"**.
6. Render builds the Dockerfile and assigns a live HTTPS URL:
   ```
   https://smart-road-defect.onrender.com
   ```

---

## Option 3: Local Docker (If Docker Desktop is installed)

To run the container locally:

```bash
docker compose up --build
```

Then open [http://localhost:7860](http://localhost:7860) in your browser.

---

## Architecture of the Docker Image
* **Stage 1 (Node.js 20)**: Installs frontend dependencies and runs `npm run build` to create `dist/`.
* **Stage 2 (Python 3.11-slim)**: Installs system graphics libraries (`libgl1`, `libglib2.0-0`), installs PyTorch and YOLOv8 dependencies, copies the built frontend into `frontend/dist/`, and launches FastAPI with Uvicorn.
* **Unified Port**: Both the REST API endpoints (`/events`, `/stats`, `/bus_positions`, `/video_feed`) and the full React dashboard SPA are served from the **single exposed port** (`7860` or `$PORT`), completely eliminating CORS and multi-port proxy issues.
