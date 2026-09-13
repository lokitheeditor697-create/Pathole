---
title: Road Defect AI Intelligence Platform
emoji: 🛣️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Smart City Road-Defect & Traffic Detection Prototype

An end-to-end prototype designed for smart city hackathons. Autonomous transit buses equipped with dashcams and GPS run real-time YOLOv8 road-defect detection at the edge. A FastAPI backend performs spatial-temporal deduplication (15-meter radius and 10-minute window) to merge multiple bus observations into verified road defects. A modern React + Leaflet frontend provides a live situational map with severity pins, side panel list, and analytical defect charts.

---

## 📁 Repository Structure

```
e:\Pathole detection\
├── .venv/                         # Python virtual environment
├── detector/                      # Edge detection & GPS simulation
│   ├── detect.py                  # Main YOLOv8 + OpenCV edge detection script
│   ├── generate_sample_video.py   # Utility to create test road footage
│   ├── sample_road.mp4            # Generated test video with potholes
│   └── requirements.txt           # Edge dependencies
├── backend/                       # Central ingestion & deduplication server
│   ├── main.py                    # FastAPI application with CORS & endpoints
│   ├── database.py                # SQLite database and Haversine deduplication
│   ├── test_backend.py            # Automated tests for spatial-temporal merging
│   ├── road_defects.db            # SQLite database file
│   └── requirements.txt           # Backend dependencies
└── frontend/                      # React + Leaflet map dashboard
    ├── src/
    │   ├── components/
    │   │   ├── Header.jsx         # KPI metric tiles & live polling status
    │   │   ├── MapComponent.jsx   # Leaflet map with colored severity pins & popups
    │   │   ├── DefectsSidePanel.jsx # Recent verified defects with click-to-center
    │   │   └── DefectBarChart.jsx # Bar chart of defect counts by type & severity
    │   ├── App.jsx                # Main dashboard application
    │   └── index.css              # Custom pin styling & dark theme
    ├── package.json
    └── vite.config.js
```

---

## 🚀 Quick Start Guide

### 1. Activate Python Environment

```powershell
# In PowerShell:
.\.venv\Scripts\Activate.ps1
```

---

### 2. Edge Detector (`/detector`)

#### Run Standalone (Console Only)
Prints formatted JSON events for all detections with confidence $\ge 0.6$ without sending HTTP requests:
```powershell
python detector/detect.py --video detector/sample_road.mp4 --bus-id BUS_01 --standalone
```

#### Run with Live Video Window Preview
```powershell
python detector/detect.py --video detector/sample_road.mp4 --bus-id BUS_01 --display --standalone
```

#### Simulate Multiple Buses Reporting to Backend
Run multiple terminals with different `--bus-id` values:

```powershell
# Bus 101 traversing route
python detector/detect.py --video detector/sample_road.mp4 --bus-id BUS_101 --backend-url http://localhost:8000/events

# Bus 102 traversing the same or overlapping segment
python detector/detect.py --video detector/sample_road.mp4 --bus-id BUS_102 --backend-url http://localhost:8000/events
```

#### Using Custom Videos & Models
```powershell
python detector/detect.py --video path/to/dashcam.mp4 --model path/to/pothole_model.pt --bus-id BUS_50 --backend-url http://localhost:8000/events
```

#### CLI Parameters:
- `--video`: Path to input video or webcam index (default: `detector/real_dashcam.mp4` or `detector/sample_road.mp4`).
- `--model`: Path or name of YOLO weights (default: `detector/pothole_yolov8.pt` fine-tuned pothole model).
- `--bus-id`: Identifier for the bus (e.g. `BUS_01`, `BUS_02`).
- `--start-lat`, `--start-lon`: Origin GPS coordinates.
- `--end-lat`, `--end-lon`: Destination GPS coordinates.
- `--conf`: Confidence threshold for detections (default: `0.50`).
- `--conf-high`: Threshold for High severity classification (default: `0.70`).
- `--conf-med`: Threshold for Medium severity classification (default: `0.55`).
- `--backend-url`: Target endpoint (e.g. `http://localhost:8000/events`).
- `--standalone`: Force console output only.
- `--display`: Display real-time OpenCV window with bounding boxes.

> **Empirical Model Calibration**:
> Across 200 frames and 3,100+ raw pothole detections on real dashcam footage, the fine-tuned model has a mean confidence of **0.589** (clustering between 0.45 and 0.85). Thresholds have been calibrated:
> - **High Severity (Red)**: Confidence $\ge 0.70$
> - **Medium Severity (Orange)**: Confidence $0.55 - 0.69$
> - **Low Severity (Green)**: Confidence $< 0.55$ (minimum $\ge 0.50$ by default)

---

### 3. Backend Server (`/backend`)

The backend is built with FastAPI and SQLite.

#### Start Backend
```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Run Deduplication Verification Test
```powershell
python -m backend.test_backend
```

#### API Endpoints:
- `POST /events`: Ingests an event. Deduplicates within 15 meters and 10 minutes; merges duplicates into a "verified defect" record with incremented bus count and averaged confidence.
- `GET /events`: Returns all verified defects.
- `GET /stats`: Returns summary counts for charts and KPIs.
- `DELETE /events`: Clears database records for fresh demo runs.

---

### 4. Frontend Dashboard (`/frontend`)

The dashboard runs React with Leaflet.js and polls the backend every 3 seconds.

#### Start Frontend
```powershell
cd frontend
npm run dev
```
Open **http://localhost:5173** in your browser.

#### Features:
- **Leaflet Map**: Severity-colored pins (Red for High $\ge 0.85$, Orange for Medium $0.70-0.84$, Green for Low $0.60-0.69$). Pins show `2x`, `3x` badges when multiple buses verify the defect.
- **Interactive Popups**: Displays defect type, average confidence, reporting buses list, coordinates, and timestamp.
- **Side Panel**: Chronological list of recent verified defects with severity filters. Clicking any defect smoothly pans and zooms the map to that pin.
- **Bar Chart**: Visual breakdown of detection counts by defect type and severity distribution.
- **KPI Tiles**: Live metrics for Total Defects, Multi-Bus Verified Defects, High Severity, and Active Buses.
