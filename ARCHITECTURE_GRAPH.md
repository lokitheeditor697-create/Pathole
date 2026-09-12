# 🌐 Interactive Codebase Structure & Knowledge Graph (Graphify)

Generated at: `2026-09-12T16:30:24.266Z`
Total Modules / Nodes: **31** | Relationships / Links: **41**

---

## 🏛️ System Architecture Graph (End-to-End Dataflow)

```mermaid
graph TD
  subgraph Frontend ["🖥️ Frontend Layer (React 19 + Vite 8)"]
    APP["src/App.jsx<br/>(Master Router & Telemetry State)"]
    HDR["src/components/Header.jsx<br/>(System Pulse, Alerts, DB Reset)"]
    LIVE["src/components/LiveMonitoringView.jsx<br/>(Live Feed & Telemetry Hub)"]
    MAP["src/components/LeafletRoadHealthMap.jsx<br/>(OSM Corridor Health Engine)"]
    INV["src/components/DefectInventoryView.jsx<br/>(Registry & Repair Orders)"]
    FLEET["src/components/PatrolFleetView.jsx<br/>(Fleet Telemetry Grid)"]
    PERF["src/components/AIPerformanceView.jsx<br/>(Model Governance & Confusion Matrix)"]
    
    VID["src/components/RoadVideoInspectionPlayer.jsx<br/>(Persistent PTH-#XX ByteTrack Player)"]
    CAM["src/components/WebcamPotholeDetector.jsx<br/>(Mobile Rear-Cam + Device GPS)"]
    ALERTS["src/components/AlertTestModal.jsx<br/>(Telegram / Gmail Dispatcher)"]

    APP --> HDR
    APP --> LIVE
    APP --> MAP
    APP --> INV
    APP --> FLEET
    APP --> PERF
    HDR --> ALERTS
    LIVE --> VID
    LIVE --> CAM
  end

  subgraph Backend ["⚡ Backend API & Telemetry Engine (Express + TypeScript)"]
    SERVER["server.ts<br/>(Express 4.21 REST Server + Telemetry Sim)"]
    DB["server/db.ts<br/>(ACID File-Backed Municipal DB Engine)"]
    REG["data/municipal_pavement_registry.json<br/>(Persistent Road & Defect Registry)"]
    CACHE["data/precomputed_scans.json<br/>(YOLOv8 ByteTrack Cloud Scans)"]

    SERVER --> DB
    DB --> REG
    SERVER --> CACHE
  end

  subgraph EdgeAI ["🧠 Computer Vision & Edge AI Pipeline"]
    INFER["detector/infer_video.py<br/>(Ultralytics YOLOv8 + ByteTrack)"]
    MODEL["detector/pothole_yolov8.pt<br/>(Trained 7-Class Pavement Model)"]
    CAPTURE["edge/camera/edge_capture.py<br/>(Dashcam RTSP / USB Streamer)"]

    INFER --> MODEL
    SERVER -.->|Exec Localhost| INFER
  end

  subgraph External ["🚨 Notification & Cloud Gateways"]
    TG["Telegram Bot Hook<br/>(api.telegram.org)"]
    GMAIL["Municipal Gmail SMTP<br/>(Road Dispatch Ticket)"]
    RENDER["Render.com Web Service<br/>(Dynamic PORT + SSL)"]

    SERVER --> TG
    SERVER --> GMAIL
    RENDER --> SERVER
  end

  VID -->|POST /api/detect/video-scan| SERVER
  CAM -->|POST /api/detect/frame| SERVER
  HDR -->|POST /api/alerts/test| SERVER
```

---

## 📂 Codebase File Index & Module Taxonomy

| Category | File | Description |
| :--- | :--- | :--- |
| **Server & Config** | `server.ts` | Core REST server, GIS math, transit simulation, alert dispatcher. |
| **Database** | `server/db.ts` | ACID file-backed storage, health scoring, work orders. |
| **UI Router** | `src/App.jsx` | Navigation bar, global polling, tab router, live counters. |
| **Component** | `src/components/Header.jsx` | Subsystem status lights, live toggle, CSV/DB backup, DB reset. |
| **Component** | `src/components/LiveMonitoringView.jsx` | Edge dashcam stream, video switcher, live ingestion sidebar. |
| **Component** | `src/components/RoadVideoInspectionPlayer.jsx` | ByteTrack player, locked %, out-of-range finalizer, PTH-#XX tags. |
| **Component** | `src/components/WebcamPotholeDetector.jsx` | Real phone back-camera, hardware torch, mobile GPS tracker. |
| **Component** | `src/components/LeafletRoadHealthMap.jsx` | OpenStreetMap vector corridor renderer, health grades, bus pins. |
| **Component** | `src/components/DefectInventoryView.jsx` | Defect registry table and municipal repair work order manager. |
| **Component** | `src/components/PatrolFleetView.jsx` | Real-time vehicle cards, hardware specs, speeds, headings. |
| **Component** | `src/components/AIPerformanceView.jsx` | mAP, precision, recall, 7x7 confusion matrix. |
| **Component** | `src/components/AlertTestModal.jsx` | Telegram & Gmail setup, 4 criteria rules, test alert trigger. |
| **AI Detector** | `detector/infer_video.py` | YOLOv8 ByteTrack Python video inference engine. |
| **AI Model** | `detector/pothole_yolov8.pt` | Trained PyTorch weights for 7 pavement defect classes. |
| **Cloud Deploy** | `render.yaml` | Blueprint for zero-config Render Node deployment. |

---

✅ Generated successfully via Graphify.