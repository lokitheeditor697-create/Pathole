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
        "detector/potbot_yolov8m.pt",
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
    'minor_pothole': {'code': 'D40-MIN', 'display_name': 'Minor Pothole (D40)', 'prefix': 'PTH', 'category': 'Surface Void'},
    'moderate_pothole': {'code': 'D40-MOD', 'display_name': 'Moderate Pothole (D40)', 'prefix': 'PTH', 'category': 'Surface Void'},
    'major_pothole': {'code': 'D40-MAJ', 'display_name': 'Major Pothole (D40)', 'prefix': 'PTH', 'category': 'Surface Void'},
    'low_cracking': {'code': 'D00-L', 'display_name': 'Low Surface Cracking', 'prefix': 'CRK', 'category': 'Surface Crack'},
    'medium_cracking': {'code': 'D00-M', 'display_name': 'Medium Surface Cracking', 'prefix': 'CRK', 'category': 'Surface Crack'},
    'high_cracking': {'code': 'D00-H', 'display_name': 'High Surface Cracking', 'prefix': 'CRK', 'category': 'Surface Crack'},
    'minor_edge_break': {'code': 'D42-MIN', 'display_name': 'Minor Edge Break', 'prefix': 'EDG', 'category': 'Pavement Edge Defect'},
    'modrate_edge_break': {'code': 'D42-MOD', 'display_name': 'Moderate Edge Break', 'prefix': 'EDG', 'category': 'Pavement Edge Defect'},
    'major_edge_break': {'code': 'D42-MAJ', 'display_name': 'Major Edge Break', 'prefix': 'EDG', 'category': 'Pavement Edge Defect'},
    'pothole': {'code': 'D40', 'display_name': 'Pothole (D40)', 'prefix': 'PTH', 'category': 'Surface Void'},
    'speed-bump': {'code': 'D60', 'display_name': 'Speed Bump / Hump (D60)', 'prefix': 'BMP', 'category': 'Traffic Calming'},
    'speed_bump': {'code': 'D60', 'display_name': 'Speed Bump / Hump (D60)', 'prefix': 'BMP', 'category': 'Traffic Calming'},
    'crack-severe': {'code': 'D02', 'display_name': 'Severe Structural Crack (D02)', 'prefix': 'SCRK', 'category': 'Severe Structural Crack'},
    'crack_severe': {'code': 'D02', 'display_name': 'Severe Structural Crack (D02)', 'prefix': 'SCRK', 'category': 'Severe Structural Crack'},
    'longitudinal_crack': {'code': 'D00', 'display_name': 'Longitudinal Crack (D00)', 'prefix': 'LCRK', 'category': 'Structural Crack'},
    'transverse_crack': {'code': 'D01', 'display_name': 'Transverse Crack (D01)', 'prefix': 'TCRK', 'category': 'Thermal/Shrinkage Crack'},
    'alligator_crack': {'code': 'D20', 'display_name': 'Alligator Fatigue Crack (D20)', 'prefix': 'ACRK', 'category': 'Structural Fatigue'},
    'crack': {'code': 'D00/D01', 'display_name': 'Surface Crack', 'prefix': 'CRK', 'category': 'Surface Crack'},
    'heavy-vehicle': {'code': 'VH', 'display_name': 'Heavy Vehicle', 'prefix': 'HVH', 'category': 'Vehicle Traffic'},
    'heavy_vehicle': {'code': 'VH', 'display_name': 'Heavy Vehicle', 'prefix': 'HVH', 'category': 'Vehicle Traffic'},
    'light-vehicle': {'code': 'VL', 'display_name': 'Light Vehicle', 'prefix': 'LVH', 'category': 'Vehicle Traffic'},
    'light_vehicle': {'code': 'VL', 'display_name': 'Light Vehicle', 'prefix': 'LVH', 'category': 'Vehicle Traffic'},
    'pedestrian': {'code': 'PED', 'display_name': 'Pedestrian', 'prefix': 'PED', 'category': 'Vulnerable Road User'},
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

def compute_iou(boxA, boxB):
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    inter = max(0, xB - xA) * max(0, yB - yA)
    areaA = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    areaB = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
    return inter / float(areaA + areaB - inter + 1e-6)

def compute_iomin(boxA, boxB):
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    inter = max(0, xB - xA) * max(0, yB - yA)
    minArea = min((boxA[2] - boxA[0]) * (boxA[3] - boxA[1]), (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))
    return inter / float(minArea + 1e-6)

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
    raw_candidates = []

    for r in results:
        for idx, box in enumerate(r.boxes):
            cls_id = int(box.cls[0])
            cls_name = model.names.get(cls_id, "pothole")
            conf = float(box.conf[0])
            coords = box.xyxy[0].tolist()

            if is_multiclass:
                cls_name = classify_road_distress(frame, coords, default_cls=cls_name)

            raw_candidates.append({
                'coords': coords,
                'cls_name': cls_name,
                'conf': conf
            })

    # Intra-image NMS and large pothole box containment merging
    raw_candidates.sort(key=lambda x: x['conf'], reverse=True)
    deduped_boxes = []
    SEVERITY_ORDER = {'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4}

    for cand in raw_candidates:
        c1 = cand['coords']
        merged = False
        for kept in deduped_boxes:
            c2 = kept['coords']
            iou = compute_iou(c1, c2)
            iomin = compute_iomin(c1, c2)
            cx1, cy1 = (c1[0] + c1[2]) / 2.0 / w, (c1[1] + c1[3]) / 2.0 / h
            cx2, cy2 = (c2[0] + c2[2]) / 2.0 / w, (c2[1] + c2[3]) / 2.0 / h
            dist = ((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2) ** 0.5

            inside1 = (c2[0] <= cx1 * w <= c2[2]) and (c2[1] <= cy1 * h <= c2[3])
            inside2 = (c1[0] <= cx2 * w <= c1[2]) and (c1[1] <= cy2 * h <= c1[3])

            if iou > 0.15 or iomin > 0.28 or dist < 0.18 or inside1 or inside2:
                kept['coords'] = [
                    min(c1[0], c2[0]),
                    min(c1[1], c2[1]),
                    max(c1[2], c2[2]),
                    max(c1[3], c2[3])
                ]
                kept['conf'] = max(kept['conf'], cand['conf'])
                meta_k = get_defect_meta(kept['cls_name'])
                meta_c = get_defect_meta(cand['cls_name'])
                if SEVERITY_ORDER.get(meta_c.get('severity', 'Medium'), 2) > SEVERITY_ORDER.get(meta_k.get('severity', 'Medium'), 2):
                    kept['cls_name'] = cand['cls_name']
                merged = True
                break
        if not merged:
            deduped_boxes.append(cand)

    detections = []
    for idx, item in enumerate(deduped_boxes):
        coords = item['coords']
        cls_name = item['cls_name']
        conf = item['conf']
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
    mode_arg = sys.argv[4] if len(sys.argv) > 4 else ("potbot" if "potbot" in m_path else ("rdd2022" if "rdd2022" in m_path else "pothole"))
    is_multi = (mode_arg == "rdd2022") or ("rdd2022" in m_path) or ("multiclass" in mode_arg)

    res = analyze_image(img_input, m_path, c_thresh, is_multiclass=is_multi)
    print(json.dumps(res))
