import os
from huggingface_hub import HfApi, create_repo

def main():
    repo_id = "Logesshhh/road-anomaly-pothole-yolov8m"
    api = HfApi()

    print(f"Creating Hugging Face repository {repo_id}...")
    create_repo(repo_id=repo_id, repo_type="model", exist_ok=True)

    model_card = """---
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

# Road Anomaly & Pothole Detection (YOLOv8 Medium & Small)

Trained YOLOv8 models for real-time automated detection of road anomalies including potholes, structural road cracks, and speed bumps across diverse driving conditions.

## 🎯 Model Overview & Classes

### 1. Primary Model: `pothole_yolov8.pt` / `pothole_yolov8.onnx`
- **Architecture:** YOLOv8 Medium (`yolov8m`, 25.8M parameters)
- **Training Duration:** 120 epochs on RTX 3060 GPU
- **Dataset:** ~30,685 balanced road anomaly images across diverse road environments (Indian roads, international benchmarks, highways).
- **Evaluation Metrics:**
  - Precision: 0.736
  - Recall: 0.740
  - mAP@0.5: 0.745
  - Inference Speed: ~12.0 ms per frame
- **Detected Classes:**
  - `0: Heavy-Vehicle`
  - `1: Light-Vehicle`
  - `2: Pedestrian`
  - `3: Crack`
  - `4: Crack-Severe`
  - `5: Pothole`
  - `6: Speed-Bump`

### 2. Supplementary Model: `collabdoor_yolov8s_crddc.pt`
- **Architecture:** YOLOv8 Small (`yolov8s`) trained on the CRDDC2022 dataset
- **Classes:** `Longitudinal Crack`, `Transverse Crack`, `Alligator Crack`, `Potholes`

---

## 🚀 Quick Start with Ultralytics

```python
from ultralytics import YOLO

# Load model weights
model = YOLO("pothole_yolov8.pt")

# Run inference on video or dashcam feed
results = model.predict(source="road_dashcam.mp4", conf=0.35, show=True)
```

## ⚡ ONNX Runtime (Cross-Platform / Embedded Devices)

```python
import onnxruntime as ort
import numpy as np

# Load the optimized ONNX model
session = ort.InferenceSession("pothole_yolov8.onnx")
input_name = session.get_inputs()[0].name
```
"""

    card_path = os.path.join("detector", "HF_MODEL_CARD.md")
    with open(card_path, "w", encoding="utf-8") as f:
        f.write(model_card)

    print("Uploading README.md / Model Card...")
    api.upload_file(
        path_or_fileobj=card_path,
        path_in_repo="README.md",
        repo_id=repo_id,
        repo_type="model"
    )

    pt_path = os.path.join("detector", "pothole_yolov8.pt")
    print(f"Uploading {pt_path} (~52 MB)...")
    api.upload_file(
        path_or_fileobj=pt_path,
        path_in_repo="pothole_yolov8.pt",
        repo_id=repo_id,
        repo_type="model"
    )

    onnx_path = os.path.join("detector", "pothole_yolov8.onnx")
    if os.path.exists(onnx_path):
        print(f"Uploading {onnx_path} (~98 MB)...")
        api.upload_file(
            path_or_fileobj=onnx_path,
            path_in_repo="pothole_yolov8.onnx",
            repo_id=repo_id,
            repo_type="model"
        )

    crddc_path = os.path.join("detector", "collabdoor_yolov8s_crddc.pt")
    if os.path.exists(crddc_path):
        print(f"Uploading {crddc_path} (~89 MB)...")
        api.upload_file(
            path_or_fileobj=crddc_path,
            path_in_repo="collabdoor_yolov8s_crddc.pt",
            repo_id=repo_id,
            repo_type="model"
        )

    print("\nAll models uploaded successfully!")
    print(f"Repository URL: https://huggingface.co/{repo_id}")

if __name__ == "__main__":
    main()
