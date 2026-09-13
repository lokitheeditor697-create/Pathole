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

# 🛣️ AI Road Anomaly & Pothole Detection (YOLOv8 Medium & Small)

> **Updated Version**: Upgraded to 7-Class YOLOv8 Medium (yolov8m) + 4-Class CRDDC YOLOv8 Small (yolov8s).

This repository provides production-ready weights for automated road distress detection and intelligent driver assistance.

---

## 📦 Model Files in this Repository

| Filename | Architecture | Size | Purpose | Classes |
| :--- | :--- | :--- | :--- | :--- |
| **pothole_yolov8.pt** | **YOLOv8m** | **49.6 MB** | **Primary Road Hazard & Safety Detector** | 7 Classes: Pothole, Crack, Crack-Severe, Speed-Bump, Heavy-Vehicle, Light-Vehicle, Pedestrian |
| **
dd2022_multiclass.pt** | **YOLOv8s** | **85.4 MB** | **Specialized Pavement Distress** | 4 Classes: Longitudinal Crack, Transverse Crack, Alligator Crack, Potholes |
| **pothole_yolov8.onnx** | **ONNX** | **98.8 MB** | **Universal Edge & Mobile Runtime** | Exported for Android, iOS, Raspberry Pi & C++ engines |

---

## 🎯 Benchmark Performance

- **Trained on:** 30,685 diverse road images (RAD, Indian Roads, Humps/Bumps/Potholes, HighRPD).
- **Precision:** 0.736
- **Recall:** 0.740
- **mAP@50:** **74.5%**
- **Inference Speed:** ~12.0 ms per image

---

## 💻 Quickstart (Python / Ultralytics)

`python
from ultralytics import YOLO

# 1. Load the 7-class YOLOv8 Medium model
model = YOLO('pothole_yolov8.pt')

# 2. Run inference on a dashcam video or camera stream
results = model.predict(source='your_dashcam.mp4', conf=0.35, show=True)
`
