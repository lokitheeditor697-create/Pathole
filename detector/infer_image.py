"""
Real-time Image & Frame Inference Service
Runs fine-tuned YOLOv8 on image files or base64 frames and returns real detections.
"""

import sys
import os
import json
import base64
import cv2
import numpy as np
from ultralytics import YOLO

def resolve_model_path(provided_path=None):
    if provided_path and os.path.exists(provided_path):
        return provided_path
    candidates = [
        "detector/best.pt",
        "best.pt",
        "detector/pothole_yolov8.pt",
        "pothole_yolov8.pt"
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return provided_path or "detector/pothole_yolov8.pt"

def analyze_image(image_input, model_path=None, conf_thresh=0.30):
    actual_model = resolve_model_path(model_path)
    if not os.path.exists(actual_model):
        return {"error": f"Model not found: {actual_model}"}

    model = YOLO(actual_model)

    # image_input can be a file path, base64 data url, or raw base64
    if os.path.exists(image_input):
        frame = cv2.imread(image_input)
    elif image_input.startswith("data:image"):
        encoded_data = image_input.split(",", 1)[1]
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    else:
        try:
            nparr = np.frombuffer(base64.b64decode(image_input), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception:
            return {"error": f"Invalid image input or file not found: {image_input}"}

    if frame is None:
        return {"error": "Failed to decode image"}

    h, w, _ = frame.shape
    results = model(frame, conf=conf_thresh, verbose=False)
    detections = []

    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            cls_name = model.names.get(cls_id, "pothole")
            conf = float(box.conf[0])
            coords = box.xyxy[0].tolist()

            bx = int(coords[0])
            by = int(coords[1])
            bw = int(coords[2] - coords[0])
            bh = int(coords[3] - coords[1])

            est_w_cm = round((bw / w) * 180, 1)
            est_l_cm = round((bh / h) * 120, 1)
            severity = "Critical" if conf >= 0.75 else "High" if conf >= 0.55 else "Medium"

            detections.append({
                "class_name": cls_name,
                "conf": round(conf, 2),
                "severity": severity,
                "wCm": est_w_cm,
                "lCm": est_l_cm,
                "bbox": {
                    "x": bx,
                    "y": by,
                    "w": bw,
                    "h": bh,
                    "video_w": w,
                    "video_h": h
                }
            })

    return {
        "width": w,
        "height": h,
        "total_detections": len(detections),
        "detections": detections
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image input provided"}))
        sys.exit(1)

    img_input = sys.argv[1]
    m_path = sys.argv[2] if len(sys.argv) > 2 else "detector/pothole_yolov8.pt"
    c_thresh = float(sys.argv[3]) if len(sys.argv) > 3 else 0.30

    res = analyze_image(img_input, m_path, c_thresh)
    print(json.dumps(res))
