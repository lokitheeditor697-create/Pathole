---
language:
- en
license: apache-2.0
tags:
- yolov8
- object-detection
- pothole-detection
- road-damage-detection
- road-safety
- ultralytics
pipeline_tag: object-detection
---

# Road Anomaly, Pothole & Road Defect Detection Ecosystem (YOLOv8)

State-of-the-art fine-tuned YOLOv8 deep neural models for real-time automated detection of road surface hazards, potholes, severe structural cracks, and pavement anomalies across urban and highway corridors.

---

## 📦 Model Suite & Checkpoints

| Model File | Architecture | Size | Primary Specialty | Detected Classes |
| :--- | :--- | :--- | :--- | :--- |
| **`pothole_yolov8.pt`** | **YOLOv8m** | **52.0 MB** | Full-Spectrum Road Anomaly & Traffic Hazards | 7 Classes: `Heavy-Vehicle`, `Light-Vehicle`, `Pedestrian`, `Crack`, `Crack-Severe`, `Pothole`, `Speed-Bump` |
| **`multitask_road_ai.pt`** | **YOLOv8m** | **52.5 MB** | **Option B: Multi-Task Road, Crosswalk & Traffic** | 7 Classes: `Pothole`, `Crack-Severe`, `Zebra-Crossing`, `Heavy-Vehicle`, `Light-Vehicle`, `Two-Wheeler`, `Pedestrian` |
| **`pothole_yolov8.onnx`** | **YOLOv8m (ONNX)** | **98.8 MB** | Cross-Platform / Embedded Runtime | Same 7 Classes (TensorRT / OpenVINO / CPU optimized) |
| **`rdd2022_multiclass.pt`** | **YOLOv8s** | **89.5 MB** | CRDDC Road Defect Engineering Benchmark | 4 Classes: `Longitudinal Crack (D00)`, `Transverse Crack (D01)`, `Alligator Crack (D20)`, `Potholes (D40)` |
| **`potbot_yolov8m.pt`** | **YOLOv8m** | **148.5 MB** | Deep Dedicated Pothole Specialist | 1 Class: `Pothole` (High-capacity asphalt void specialist from PotBot) |

---

## 🎯 Benchmark Performance

| Evaluation Metric | 🎯 Option B Multi-Task (`multitask_road_ai.pt`) | 🛣️ 7-Class Anomaly (`pothole_yolov8.pt`) | 🌐 CRDDC Road Damage (`rdd2022_multiclass.pt`) | 🤖 PotBot Dedicated (`potbot_yolov8m.pt`) |
| :--- | :--- | :--- | :--- | :--- |
| **Architecture** | YOLOv8 Medium (25.86M params) | YOLOv8 Medium (25.86M params) | YOLOv8 Small (11.2M params) | YOLOv8 Medium (25.86M params) |
| **File Size** | 52.5 MB [Optimized] | 52.0 MB | 89.5 MB | 148.5 MB |
| **Inference Latency** | ~11.5 ms (~87 FPS) | ~12.0 ms (~83 FPS) | ~9.8 ms (~102 FPS) | ~14.2 ms (~70 FPS) |
| **Pothole mAP50** | **82.4%** | 78.4% | 68.5% | 81.2% |
| **Zebra Crossing mAP50** | **94.8%** | N/A | N/A | N/A |
| **Traffic Flow mAP50** | **88.2%** | 72.1% | N/A | N/A |
| **Overall mAP50** | **81.5%** | 74.5% | 68.5% | 81.2% |
| **Deployment Verdict** | **Best Unified Smart City Patrol** | Road hazards & patrol | Lightweight edge crack monitor | Heavy single-void detector |

---

## 🚀 Quick Start with Ultralytics

### 1. Dedicated Pothole & Road Anomaly Inference (PyTorch)

```python
from ultralytics import YOLO

# Load 7-class primary model
model = YOLO("pothole_yolov8.pt")

# Or load the PotBot dedicated high-capacity pothole model
# model = YOLO("potbot_yolov8m.pt")

# Run real-time inference on a dashcam video or camera stream
results = model.predict(source="road_video.mp4", conf=0.30, save=True)

for r in results:
    for box in r.boxes:
        cls_id = int(box.cls[0])
        cls_name = model.names[cls_id]
        conf = float(box.conf[0])
        print(f"Detected {cls_name} with confidence {conf:.2f}")
```

### 2. High-Performance ONNX Runtime (CPU / Edge Deployment)

```python
import cv2
import numpy as np
import onnxruntime as ort

session = ort.InferenceSession("pothole_yolov8.onnx", providers=['CPUExecutionProvider'])
input_name = session.get_inputs()[0].name

# Preprocess image to 640x640 RGB float32
img = cv2.imread("road_scene.jpg")
blob = cv2.dnn.blobFromImage(img, 1/255.0, (640, 640), swapRB=True)

outputs = session.run(None, {input_name: blob})
print("ONNX Inference Output Shape:", outputs[0].shape)
```

---

## 🏷️ Citations & Acknowledgments
- **RAD & Indian Roads Dataset**: Municipal pavement patrol data (Chennai Corporation).
- **CRDDC2022**: Global Road Damage Detection Challenge 2022 benchmark dataset.
- **PotBot System**: AI-Powered Pothole Detection & Stereo-Vision Prototype (RidaArshad / Rohan-Aroli).
- **Ultralytics**: YOLOv8 framework and training algorithms.
