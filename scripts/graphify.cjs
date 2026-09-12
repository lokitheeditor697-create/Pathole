const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const DIRECTORIES_TO_SCAN = [
  { dir: 'src', type: 'Frontend / UI' },
  { dir: 'src/components', type: 'React Components' },
  { dir: 'server', type: 'Backend / DB' },
  { dir: 'detector', type: 'AI & Computer Vision' },
  { dir: 'edge/camera', type: 'Edge Dashcam' }
];

const ROOT_FILES = ['server.ts', 'vite.config.js', 'package.json', 'render.yaml'];

const nodes = [];
const links = [];

// Scan key files
ROOT_FILES.forEach(f => {
  const fullPath = path.join(ROOT_DIR, f);
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

DIRECTORIES_TO_SCAN.forEach(item => {
  const targetDir = path.join(ROOT_DIR, item.dir);
  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir);
    files.forEach(file => {
      const fullPath = path.join(targetDir, file);
      if (fs.statSync(fullPath).isFile() && (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.py') || file.endsWith('.json'))) {
        const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
        const stat = fs.statSync(fullPath);
        nodes.push({
          id: relPath,
          name: file,
          group: item.type,
          size: stat.size,
          path: relPath,
          category: item.dir.includes('components') ? 'component' : (item.dir.includes('detector') ? 'ai' : 'module')
        });

        // Parse basic imports
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const importMatches = content.matchAll(/(?:from\s+['\"](.*?)['\"]|import\s+['\"](.*?)['\"]|import\s+([a-zA-Z0-9_{},\s*]+)\s+from\s+['\"](.*?)['\"])/g);
          for (const match of importMatches) {
            const importPath = match[1] || match[2] || match[4];
            if (importPath && importPath.startsWith('.')) {
              const resolved = path.normalize(path.join(path.dirname(relPath), importPath)).replace(/\\/g, '/');
              links.push({ source: relPath, target: resolved, type: 'import' });
            }
          }
        } catch (e) {}
      }
    });
  }
});

// Explicit Architectural Dataflows
const architecturalFlows = [
  { source: 'server.ts', target: 'server/db.ts', label: 'ACID DB Operations' },
  { source: 'server.ts', target: 'detector/infer_video.py', label: 'YOLOv8 ByteTrack Inference' },
  { source: 'src/App.jsx', target: 'src/components/Header.jsx', label: 'Navigation & Alert Dispatch' },
  { source: 'src/App.jsx', target: 'src/components/LiveMonitoringView.jsx', label: 'Live Video & Patrol Feed' },
  { source: 'src/App.jsx', target: 'src/components/LeafletRoadHealthMap.jsx', label: 'OpenStreetMap GIS Health' },
  { source: 'src/App.jsx', target: 'src/components/DefectInventoryView.jsx', label: 'Defect Registry & Work Orders' },
  { source: 'src/App.jsx', target: 'src/components/PatrolFleetView.jsx', label: 'Fleet Telemetry Grid' },
  { source: 'src/App.jsx', target: 'src/components/AIPerformanceView.jsx', label: 'Model Governance & mAP' },
  { source: 'src/components/LiveMonitoringView.jsx', target: 'src/components/RoadVideoInspectionPlayer.jsx', label: 'Persistent Pothole ID Tracking' },
  { source: 'src/components/LiveMonitoringView.jsx', target: 'src/components/WebcamPotholeDetector.jsx', label: 'Mobile GPS & Rear Cam Live AI' },
  { source: 'src/components/RoadVideoInspectionPlayer.jsx', target: 'server.ts', label: 'POST /api/detect/video-scan' },
  { source: 'src/components/WebcamPotholeDetector.jsx', target: 'server.ts', label: 'POST /api/detect/frame' },
  { source: 'server.ts', target: 'data/municipal_pavement_registry.json', label: 'JSON DB Persistence' },
  { source: 'server.ts', target: 'data/precomputed_scans.json', label: 'Cloud Keyframe Fallback' }
];

const graphData = {
  version: '1.0.0',
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

// Write CODEBASE_GRAPH.json
fs.writeFileSync(path.join(ROOT_DIR, 'data', 'CODEBASE_GRAPH.json'), JSON.stringify(graphData, null, 2), 'utf-8');

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
  '    APP["src/App.jsx<br/>(Master Router & Telemetry State)"]',
  '    HDR["src/components/Header.jsx<br/>(System Pulse, Alerts, DB Reset)"]',
  '    LIVE["src/components/LiveMonitoringView.jsx<br/>(Live Feed & Telemetry Hub)"]',
  '    MAP["src/components/LeafletRoadHealthMap.jsx<br/>(OSM Corridor Health Engine)"]',
  '    INV["src/components/DefectInventoryView.jsx<br/>(Registry & Repair Orders)"]',
  '    FLEET["src/components/PatrolFleetView.jsx<br/>(Fleet Telemetry Grid)"]',
  '    PERF["src/components/AIPerformanceView.jsx<br/>(Model Governance & Confusion Matrix)"]',
  '    ',
  '    VID["src/components/RoadVideoInspectionPlayer.jsx<br/>(Persistent PTH-#XX ByteTrack Player)"]',
  '    CAM["src/components/WebcamPotholeDetector.jsx<br/>(Mobile Rear-Cam + Device GPS)"]',
  '    ALERTS["src/components/AlertTestModal.jsx<br/>(Telegram / Gmail Dispatcher)"]',
  '',
  '    APP --> HDR',
  '    APP --> LIVE',
  '    APP --> MAP',
  '    APP --> INV',
  '    APP --> FLEET',
  '    APP --> PERF',
  '    HDR --> ALERTS',
  '    LIVE --> VID',
  '    LIVE --> CAM',
  '  end',
  '',
  '  subgraph Backend ["⚡ Backend API & Telemetry Engine (Express + TypeScript)"]',
  '    SERVER["server.ts<br/>(Express 4.21 REST Server + Telemetry Sim)"]',
  '    DB["server/db.ts<br/>(ACID File-Backed Municipal DB Engine)"]',
  '    REG["data/municipal_pavement_registry.json<br/>(Persistent Road & Defect Registry)"]',
  '    CACHE["data/precomputed_scans.json<br/>(YOLOv8 ByteTrack Cloud Scans)"]',
  '',
  '    SERVER --> DB',
  '    DB --> REG',
  '    SERVER --> CACHE',
  '  end',
  '',
  '  subgraph EdgeAI ["🧠 Computer Vision & Edge AI Pipeline"]',
  '    INFER["detector/infer_video.py<br/>(Ultralytics YOLOv8 + ByteTrack)"]',
  '    MODEL["detector/pothole_yolov8.pt<br/>(Trained 7-Class Pavement Model)"]',
  '    CAPTURE["edge/camera/edge_capture.py<br/>(Dashcam RTSP / USB Streamer)"]',
  '',
  '    INFER --> MODEL',
  '    SERVER -.->|Exec Localhost| INFER',
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
  '  VID -->|POST /api/detect/video-scan| SERVER',
  '  CAM -->|POST /api/detect/frame| SERVER',
  '  HDR -->|POST /api/alerts/test| SERVER',
  '```',
  '',
  '---',
  '',
  '## 📂 Codebase File Index & Module Taxonomy',
  '',
  '| Category | File | Description |',
  '| :--- | :--- | :--- |',
  '| **Server & Config** | `server.ts` | Core REST server, GIS math, transit simulation, alert dispatcher. |',
  '| **Database** | `server/db.ts` | ACID file-backed storage, health scoring, work orders. |',
  '| **UI Router** | `src/App.jsx` | Navigation bar, global polling, tab router, live counters. |',
  '| **Component** | `src/components/Header.jsx` | Subsystem status lights, live toggle, CSV/DB backup, DB reset. |',
  '| **Component** | `src/components/LiveMonitoringView.jsx` | Edge dashcam stream, video switcher, live ingestion sidebar. |',
  '| **Component** | `src/components/RoadVideoInspectionPlayer.jsx` | ByteTrack player, locked %, out-of-range finalizer, PTH-#XX tags. |',
  '| **Component** | `src/components/WebcamPotholeDetector.jsx` | Real phone back-camera, hardware torch, mobile GPS tracker. |',
  '| **Component** | `src/components/LeafletRoadHealthMap.jsx` | OpenStreetMap vector corridor renderer, health grades, bus pins. |',
  '| **Component** | `src/components/DefectInventoryView.jsx` | Defect registry table and municipal repair work order manager. |',
  '| **Component** | `src/components/PatrolFleetView.jsx` | Real-time vehicle cards, hardware specs, speeds, headings. |',
  '| **Component** | `src/components/AIPerformanceView.jsx` | mAP, precision, recall, 7x7 confusion matrix. |',
  '| **Component** | `src/components/AlertTestModal.jsx` | Telegram & Gmail setup, 4 criteria rules, test alert trigger. |',
  '| **AI Detector** | `detector/infer_video.py` | YOLOv8 ByteTrack Python video inference engine. |',
  '| **AI Model** | `detector/pothole_yolov8.pt` | Trained PyTorch weights for 7 pavement defect classes. |',
  '| **Cloud Deploy** | `render.yaml` | Blueprint for zero-config Render Node deployment. |',
  '',
  '---',
  '',
  '✅ Generated successfully via Graphify.'
].join('\n');

fs.writeFileSync(path.join(ROOT_DIR, 'ARCHITECTURE_GRAPH.md'), markdownContent, 'utf-8');
console.log('[Graphify] Successfully generated:');
console.log(' - data/CODEBASE_GRAPH.json (Raw graph dataset)');
console.log(' - ARCHITECTURE_GRAPH.md (Mermaid diagrams & file breakdown)');
