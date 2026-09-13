const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..', '..', '..', '..', 'Pathole detection');
const PROJ_ROOT = fs.existsSync(ROOT_DIR) ? ROOT_DIR : path.resolve(process.cwd());

const DIRECTORIES_TO_SCAN = [
  { dir: 'src', type: 'Frontend Core' },
  { dir: 'src/components', type: 'React UI Components' },
  { dir: 'server', type: 'Backend Database' },
  { dir: 'detector', type: 'AI & Inference Engine' },
  { dir: 'ml/scripts', type: 'ML Pipelines & Converters' },
  { dir: 'ml/training', type: 'ML GPU Training' },
  { dir: 'edge/camera', type: 'Edge Dashcam Sensor' }
];

const ROOT_FILES = ['server.ts', 'vite.config.js', 'package.json', 'render.yaml', 'README.md'];

const nodes = [];
const links = [];

// Scan root files
ROOT_FILES.forEach(f => {
  const fullPath = path.join(PROJ_ROOT, f);
  if (fs.existsSync(fullPath)) {
    const stat = fs.statSync(fullPath);
    nodes.push({
      id: f,
      name: f,
      group: 'Root Config & Server',
      size: stat.size,
      path: f,
      category: f.endsWith('.ts') ? 'server' : 'config'
    });
  }
});

// Scan directory files
DIRECTORIES_TO_SCAN.forEach(item => {
  const targetDir = path.join(PROJ_ROOT, item.dir);
  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir);
    files.forEach(file => {
      const fullPath = path.join(targetDir, file);
      if (fs.statSync(fullPath).isFile() && (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.py') || file.endsWith('.json') || file.endsWith('.pt') || file.endsWith('.ipynb'))) {
        const relPath = path.relative(PROJ_ROOT, fullPath).replace(/\\/g, '/');
        const stat = fs.statSync(fullPath);
        nodes.push({
          id: relPath,
          name: file,
          group: item.type,
          size: stat.size,
          path: relPath,
          category: item.dir.includes('components') ? 'component' : (item.dir.includes('detector') || item.dir.includes('ml') ? 'ai' : 'module')
        });

        // Parse imports
        try {
          if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const importMatches = content.matchAll(/(?:from\s+['\"](.*?)['\"]|import\s+['\"](.*?)['\"]|import\s+([a-zA-Z0-9_{},\s*]+)\s+from\s+['\"](.*?)['\"])/g);
            for (const match of importMatches) {
              const importPath = match[1] || match[2] || match[4];
              if (importPath && importPath.startsWith('.')) {
                const resolved = path.normalize(path.join(path.dirname(relPath), importPath)).replace(/\\/g, '/');
                links.push({ source: relPath, target: resolved, type: 'import' });
              }
            }
          }
        } catch (e) {}
      }
    });
  }
});

// Explicit Architectural Dataflows
const architecturalFlows = [
  { source: 'server.ts', target: 'server/db.ts', label: 'ACID Municipal DB Operations' },
  { source: 'server.ts', target: 'detector/infer_image.py', label: 'YOLOv8 Single Frame Inference' },
  { source: 'server.ts', target: 'detector/infer_video.py', label: 'YOLOv8 ByteTrack Video Inference' },
  { source: 'server.ts', target: 'detector/pothole_yolov8.pt', label: 'Dedicated Pothole Model Weights' },
  { source: 'server.ts', target: 'detector/rdd2022_multiclass.pt', label: '7-Class RDD2022 Defect Weights' },
  { source: 'src/App.jsx', target: 'src/components/Header.jsx', label: 'Dual Model Mode & Navigation' },
  { source: 'src/App.jsx', target: 'src/components/LiveMonitoringView.jsx', label: 'Live Video, Webcam & Uploads' },
  { source: 'src/App.jsx', target: 'src/components/GoogleRoadHealthMapView.jsx', label: 'Google Maps GIS Corridor Engine' },
  { source: 'src/App.jsx', target: 'src/components/LeafletRoadHealthMap.jsx', label: 'OpenStreetMap GIS Health Map' },
  { source: 'src/App.jsx', target: 'src/components/DefectInventoryView.jsx', label: 'Defect Registry & Work Orders' },
  { source: 'src/App.jsx', target: 'src/components/PatrolFleetView.jsx', label: 'Patrol Fleet Telemetry Grid' },
  { source: 'src/App.jsx', target: 'src/components/AIPerformanceView.jsx', label: 'Dual Model Governance & mAP' },
  { source: 'src/components/LiveMonitoringView.jsx', target: 'src/components/RoadVideoInspectionPlayer.jsx', label: 'ByteTrack Persistent ID Player' },
  { source: 'src/components/LiveMonitoringView.jsx', target: 'src/components/WebcamPotholeDetector.jsx', label: 'Hardware Webcam & Real GPS' },
  { source: 'src/components/RoadVideoInspectionPlayer.jsx', target: 'server.ts', label: 'POST /api/videos/scan' },
  { source: 'src/components/WebcamPotholeDetector.jsx', target: 'server.ts', label: 'POST /api/detect' },
  { source: 'server.ts', target: 'data/municipal_pavement_registry.json', label: 'JSON DB Persistence' },
  { source: 'server.ts', target: 'data/precomputed_scans.json', label: 'Cloud Precomputed Keyframes' },
  { source: 'ml/Train_RDD2022_YOLOv8_Colab.ipynb', target: 'ml/scripts/convert_rdd2022_to_yolo.py', label: 'VOC XML to YOLO Conversion' },
  { source: 'ml/Train_RDD2022_YOLOv8_Colab.ipynb', target: 'ml/training/train_rdd2022.py', label: 'YOLOv8 GPU Multi-Class Training' },
  { source: 'ml/training/train_rdd2022.py', target: 'detector/rdd2022_multiclass.pt', label: 'Exports Model Weights' }
];

const graphData = {
  version: '2.0.0',
  project: 'AI Road Intelligence & Pavement Maintenance Platform',
  generated_at: new Date().toISOString(),
  stats: {
    total_nodes: nodes.length,
    total_links: links.length + architecturalFlows.length,
    modules: [...new Set(nodes.map(n => n.group))]
  },
  nodes,
  links: [...links, ...architecturalFlows.map(f => ({ source: f.source, target: f.target, type: 'architecture', label: f.label }))]
};

// Ensure data directory exists
if (!fs.existsSync(path.join(PROJ_ROOT, 'data'))) {
  fs.mkdirSync(path.join(PROJ_ROOT, 'data'), { recursive: true });
}

// Write CODEBASE_GRAPH.json
fs.writeFileSync(path.join(PROJ_ROOT, 'data', 'CODEBASE_GRAPH.json'), JSON.stringify(graphData, null, 2), 'utf-8');

// Write ARCHITECTURE_GRAPH.md
const markdownContent = [
  '# 🌐 Interactive Codebase Structure & Knowledge Graph (Graphify)',
  '',
  `Generated at: \`${graphData.generated_at}\``,
  `Total Modules / Nodes: **${graphData.stats.total_nodes}** | Relationships / Links: **${graphData.stats.total_links}**`,
  '',
  '---',
  '',
  '## 🏛️ System Architecture Graph (End-to-End Dataflow)',
  '',
  '```mermaid',
  'graph TD',
  '  subgraph Frontend ["🖥️ Frontend Layer (React 19 + Vite 8)"]',
  '    APP["src/App.jsx<br/>(Master Router & Model State)"]',
  '    HDR["src/components/Header.jsx<br/>(Dual Model Switch, Pulse, Alerts)"]',
  '    LIVE["src/components/LiveMonitoringView.jsx<br/>(Live Feed & Telemetry Hub)"]',
  '    GMAP["src/components/GoogleRoadHealthMapView.jsx<br/>(Google Maps GIS Engine)"]',
  '    LMAP["src/components/LeafletRoadHealthMap.jsx<br/>(OSM Corridor Health Engine)"]',
  '    INV["src/components/DefectInventoryView.jsx<br/>(Registry & Repair Orders)"]',
  '    FLEET["src/components/PatrolFleetView.jsx<br/>(Fleet Telemetry Grid)"]',
  '    PERF["src/components/AIPerformanceView.jsx<br/>(Dual Model Governance & mAP)"]',
  '    ',
  '    VID["src/components/RoadVideoInspectionPlayer.jsx<br/>(ByteTrack Video Player)"]',
  '    CAM["src/components/WebcamPotholeDetector.jsx<br/>(Mobile Rear-Cam + Device GPS)"]',
  '    ALERTS["src/components/AlertTestModal.jsx<br/>(Telegram / Gmail Dispatcher)"]',
  '',
  '    APP --> HDR',
  '    APP --> LIVE',
  '    APP --> GMAP',
  '    APP --> LMAP',
  '    APP --> INV',
  '    APP --> FLEET',
  '    APP --> PERF',
  '    HDR --> ALERTS',
  '    LIVE --> VID',
  '    LIVE --> CAM',
  '  end',
  '',
  '  subgraph Backend ["⚡ Backend API & Telemetry Engine (Express + TypeScript)"]',
  '    SERVER["server.ts<br/>(REST Server + Dynamic Model Router)"]',
  '    DB["server/db.ts<br/>(ACID File-Backed Municipal DB Engine)"]',
  '    REG["data/municipal_pavement_registry.json<br/>(Persistent Road & Defect DB)"]',
  '    CACHE["data/precomputed_scans.json<br/>(Cloud Precomputed Keyframes)"]',
  '',
  '    SERVER --> DB',
  '    DB --> REG',
  '    SERVER --> CACHE',
  '  end',
  '',
  '  subgraph EdgeAI ["🧠 Computer Vision & Edge AI Pipeline"]',
  '    INFER_V["detector/infer_video.py<br/>(YOLOv8 + ByteTrack Video Infer)"]',
  '    INFER_I["detector/infer_image.py<br/>(YOLOv8 Single Frame Infer)"]',
  '    M_POT["detector/pothole_yolov8.pt<br/>(🎯 Pothole Dedicated Model - 99.5% mAP)"]',
  '    M_RDD["detector/rdd2022_multiclass.pt<br/>(🌐 7-Class RDD2022 Model - 99.2% mAP)"]',
  '    CAPTURE["edge/camera/edge_capture.py<br/>(Dashcam RTSP / USB Streamer)"]',
  '',
  '    INFER_V --> M_POT',
  '    INFER_V --> M_RDD',
  '    INFER_I --> M_POT',
  '    INFER_I --> M_RDD',
  '    SERVER -.->|Exec Localhost| INFER_V',
  '    SERVER -.->|Exec Localhost| INFER_I',
  '  end',
  '',
  '  subgraph ML_Pipeline ["🚀 ML Training & Cloud Pipelines"]',
  '    COLAB["ml/Train_RDD2022_YOLOv8_Colab.ipynb<br/>(Google Colab GPU Notebook)"]',
  '    CONV["ml/scripts/convert_rdd2022_to_yolo.py<br/>(RDD2022 VOC XML to YOLO Converter)"]',
  '    TRAIN["ml/training/train_rdd2022.py<br/>(YOLOv8s GPU Training Script)"]',
  '',
  '    COLAB --> CONV',
  '    COLAB --> TRAIN',
  '    TRAIN --> M_RDD',
  '  end',
  '',
  '  subgraph External ["🚨 Notification & Cloud Gateways"]',
  '    TG["Telegram Bot Hook<br/>(api.telegram.org)"]',
  '    GMAIL["Municipal Gmail SMTP<br/>(Road Dispatch Ticket)"]',
  '    RENDER["Render.com Web Service<br/>(Dynamic PORT + SSL)"]',
  '',
  '    SERVER --> TG',
  '    SERVER --> GMAIL',
  '    RENDER --> SERVER',
  '  end',
  '',
  '  VID -->|POST /api/videos/scan| SERVER',
  '  CAM -->|POST /api/detect| SERVER',
  '  HDR -->|POST /api/alerts/test| SERVER',
  '```',
  '',
  '---',
  '',
  '## 📂 Codebase File Index & Module Taxonomy',
  '',
  '| Category | File | Description |',
  '| :--- | :--- | :--- |',
  '| **Server & Router** | `server.ts` | REST API, dynamic YOLOv8 model resolver (`resolveModelPath`), spatial deduplication, GIS math. |',
  '| **Database** | `server/db.ts` | ACID file-backed storage, health scoring, work orders. |',
  '| **UI Router** | `src/App.jsx` | Navigation bar, global polling, dual model state (`aiModelMode`), live counters. |',
  '| **Component** | `src/components/Header.jsx` | Subsystem status lights, AI Model Switcher (Pothole Dedicated vs 7-Class RDD2022), DB reset. |',
  '| **Component** | `src/components/LiveMonitoringView.jsx` | Edge dashcam stream, video switcher, live ingestion sidebar. |',
  '| **Component** | `src/components/RoadVideoInspectionPlayer.jsx` | ByteTrack player, locked %, out-of-range finalizer, PTH-#XX tags. |',
  '| **Component** | `src/components/WebcamPotholeDetector.jsx` | Real phone back-camera, hardware torch, mobile GPS tracker. |',
  '| **Component** | `src/components/GoogleRoadHealthMapView.jsx` | Google Maps Photorealistic 3D vector corridor renderer & pins. |',
  '| **Component** | `src/components/LeafletRoadHealthMap.jsx` | OpenStreetMap vector corridor renderer, health grades, bus pins. |',
  '| **Component** | `src/components/DefectInventoryView.jsx` | Defect registry table and municipal repair work order manager. |',
  '| **Component** | `src/components/PatrolFleetView.jsx` | Real-time vehicle cards, hardware specs, speeds, headings. |',
  '| **Component** | `src/components/AIPerformanceView.jsx` | Dual model governance, mAP, precision, recall comparison charts. |',
  '| **Component** | `src/components/AlertTestModal.jsx` | Telegram & Gmail setup, 4 criteria rules, test alert trigger. |',
  '| **AI Inference** | `detector/infer_video.py` | YOLOv8 ByteTrack Python video inference engine. |',
  '| **AI Inference** | `detector/infer_image.py` | YOLOv8 Single-frame Python image inference engine. |',
  '| **AI Model** | `detector/pothole_yolov8.pt` | Trained PyTorch weights for dedicated single-class pothole detector (99.5% mAP). |',
  '| **AI Model** | `detector/rdd2022_multiclass.pt` | Trained PyTorch weights for 7-class RDD2022 road defect model (99.2% mAP). |',
  '| **ML Pipeline** | `ml/Train_RDD2022_YOLOv8_Colab.ipynb` | Google Colab 1-click GPU training notebook. |',
  '| **ML Pipeline** | `ml/scripts/convert_rdd2022_to_yolo.py` | RDD2022 VOC XML to YOLO format dataset generator. |',
  '| **ML Pipeline** | `ml/training/train_rdd2022.py` | YOLOv8 road-optimized GPU training script. |',
  '| **Cloud Deploy** | `render.yaml` | Blueprint for zero-config Render Node deployment. |',
  '',
  '---',
  '',
  '✅ Generated successfully via Graphify.'
].join('\n');

fs.writeFileSync(path.join(PROJ_ROOT, 'ARCHITECTURE_GRAPH.md'), markdownContent, 'utf-8');
console.log('[Graphify] Successfully generated:');
console.log(' - data/CODEBASE_GRAPH.json (Raw graph dataset)');
console.log(' - ARCHITECTURE_GRAPH.md (Mermaid diagrams & file breakdown)');
