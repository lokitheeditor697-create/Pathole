"""
Real-time Image & Frame Inference Service
Runs fine-tuned YOLOv8 on image files or base64 frames and returns real detections.
"""

import os
os.environ["YOLO_OFFLINE"] = "True"
os.environ["ULTRALYTICS_AUTOINSTALL"] = "0"

import sys
import json
import logging
logging.getLogger("ultralytics").setLevel(logging.ERROR)

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

CLASS_METADATA = {
    'pothole': {'code': 'D40', 'display_name': 'Pothole (D40)', 'prefix': 'PTH', 'category': 'Surface Void'},
    'longitudinal_crack': {'code': 'D00', 'display_name': 'Longitudinal Crack (D00)', 'prefix': 'LCRK', 'category': 'Structural Crack'},
    'transverse_crack': {'code': 'D01', 'display_name': 'Transverse Crack (D01)', 'prefix': 'TCRK', 'category': 'Thermal/Shrinkage Crack'},
    'alligator_crack': {'code': 'D20', 'display_name': 'Alligator Fatigue Crack (D20)', 'prefix': 'ACRK', 'category': 'Structural Fatigue'},
    'crack': {'code': 'D00/D01', 'display_name': 'Surface Crack', 'prefix': 'CRK', 'category': 'Surface Crack'},
    'road_patch': {'code': 'D44', 'display_name': 'Road Patch / Deterioration (D44)', 'prefix': 'PTCH', 'category': 'Pavement Patch'},
    'rutting': {'code': 'D30', 'display_name': 'Rutting / Wheel Depression (D30)', 'prefix': 'RUT', 'category': 'Deformation'},
    'waterlogging': {'code': 'D50', 'display_name': 'Waterlogging / Drainage Ponding (D50)', 'prefix': 'WLOG', 'category': 'Drainage Hazard'},
}

def get_defect_meta(cls_name):
    norm = str(cls_name).lower().strip()
    return CLASS_METADATA.get(norm, {
        'code': 'DST',
        'display_name': norm.replace('_', ' ').title(),
        'prefix': 'DST',
        'category': 'Road Distress'
    })

def classify_road_distress(frame, coords, default_cls='pothole'):
    h_img, w_img, _ = frame.shape
    bx1, by1 = max(0, int(coords[0])), max(0, int(coords[1]))
    bx2, by2 = min(w_img, int(coords[2])), min(h_img, int(coords[3]))
    bw, bh = max(1, bx2 - bx1), max(1, by2 - by1)
    aspect = bw / float(bh)
    
    roi = frame[by1:by2, bx1:bx2]
    if roi.size == 0:
        return default_cls
    
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    mean_luma = float(gray.mean())
    var_luma = float(gray.var())
    
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    edge_density = float(np.mean(np.abs(sobelx) + np.abs(sobely)))
    
    if mean_luma > 135 and var_luma < 750:
        return 'waterlogging'
    elif aspect > 2.6 and edge_density < 48:
        return 'transverse_crack'
    elif aspect < 0.5:
        return 'longitudinal_crack'
    elif edge_density > 50 and 0.6 < aspect < 1.9:
        return 'alligator_crack'
    elif (bw * bh) > 0.10 * (w_img * h_img):
        return 'road_patch'
    elif 0.45 <= aspect <= 0.85 and by1 > 0.45 * h_img:
        return 'rutting'
    return 'pothole'

def analyze_image(image_input, model_path=None, conf_thresh=0.30, is_multiclass=False):
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
        for idx, box in enumerate(r.boxes):
            cls_id = int(box.cls[0])
            cls_name = model.names.get(cls_id, "pothole")
            conf = float(box.conf[0])
            coords = box.xyxy[0].tolist()

            if is_multiclass:
                cls_name = classify_road_distress(frame, coords, default_cls=cls_name)

            meta = get_defect_meta(cls_name)

            bx = int(coords[0])
            by = int(coords[1])
            bw = int(coords[2] - coords[0])
            bh = int(coords[3] - coords[1])

            est_w_cm = round((bw / w) * 180, 1)
            est_l_cm = round((bh / h) * 120, 1)
            severity = "Critical" if conf >= 0.75 else "High" if conf >= 0.55 else "Medium"

            detections.append({
                "pothole_id": f"{meta['prefix']}-#{idx + 1:02d}",
                "class_name": cls_name,
                "display_name": meta['display_name'],
                "rdd_code": meta['code'],
                "category": meta['category'],
                "confidence": round(conf, 2),
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
    mode_arg = sys.argv[4] if len(sys.argv) > 4 else ("rdd2022" if "rdd2022" in m_path else "pothole")
    is_multi = (mode_arg == "rdd2022") or ("rdd2022" in m_path) or ("multiclass" in mode_arg)

    res = analyze_image(img_input, m_path, c_thresh, is_multiclass=is_multi)
    print(json.dumps(res))
