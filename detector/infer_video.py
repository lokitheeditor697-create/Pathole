"""
Real-time Video Inference Service
Runs fine-tuned YOLOv8 on actual video frames and outputs real detections as JSON.
"""

import sys
import os
import json
import cv2
from ultralytics import YOLO

def analyze_video(video_path, model_path="detector/pothole_yolov8.pt", conf_thresh=0.35, sample_fps=4):
    if not os.path.exists(video_path):
        return {"error": f"Video not found: {video_path}"}
    if not os.path.exists(model_path):
        return {"error": f"Model not found: {model_path}"}

    model = YOLO(model_path)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": f"Failed to open video: {video_path}"}

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 100
    duration = total_frames / fps

    frame_interval = max(1, int(fps / sample_fps))
    moments = []
    frame_idx = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_interval == 0:
            current_time = round(frame_idx / fps, 2)
            results = model(frame, conf=conf_thresh, verbose=False)
            h, w, _ = frame.shape

            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    cls_name = model.names.get(cls_id, "pothole")
                    conf = float(box.conf[0])
                    coords = box.xyxy[0].tolist() # [x1, y1, x2, y2]

                    # Normalize or get pixel coords
                    bx = int(coords[0])
                    by = int(coords[1])
                    bw = int(coords[2] - coords[0])
                    bh = int(coords[3] - coords[1])

                    # Calculate estimated physical sizes (cm)
                    est_w_cm = round((bw / w) * 180, 1)
                    est_l_cm = round((bh / h) * 120, 1)
                    severity = "Critical" if conf >= 0.75 else "High" if conf >= 0.55 else "Medium"

                    moments.append({
                        "time": current_time,
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

        frame_idx += 1

    cap.release()
    return {
        "video_path": video_path,
        "duration": round(duration, 2),
        "total_frames": frame_idx,
        "detected_count": len(moments),
        "moments": moments
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video provided"}))
        sys.exit(1)

    v_path = sys.argv[1]
    m_path = sys.argv[2] if len(sys.argv) > 2 else "detector/pothole_yolov8.pt"
    c_thresh = float(sys.argv[3]) if len(sys.argv) > 3 else 0.35

    res = analyze_video(v_path, m_path, c_thresh)
    print(json.dumps(res))
