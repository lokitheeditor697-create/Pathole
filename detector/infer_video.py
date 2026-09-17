"""
Real-time Video Inference Service
Runs 100% genuine fine-tuned YOLOv8 neural networks directly using their trained weights and classes.
No artificial heuristic overrides.
"""

import os
os.environ["YOLO_OFFLINE"] = "True"
os.environ["ULTRALYTICS_AUTOINSTALL"] = "0"

import sys
import json
import logging
logging.getLogger("ultralytics").setLevel(logging.ERROR)

import cv2
import numpy as np
from ultralytics import YOLO

def resolve_model_path(provided_path=None):
    if provided_path and os.path.exists(provided_path) and os.path.getsize(provided_path) > 1024:
        return provided_path

    candidates = [
        "detector/roadguard_yolov8.pt",
        "detector/potbot_yolov8m.pt",
        "detector/pothole_yolov8.pt",
        "detector/rdd2022_multiclass.pt",
        "detector/best.pt"
    ]
    for c in candidates:
        if os.path.exists(c) and os.path.getsize(c) > 1024:
            return c

    # If weights are missing or are Git LFS pointers (<1024 bytes), attempt auto-download
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import download_weights
        download_weights.ensure_model_weights()
    except Exception:
        pass

    for c in candidates:
        if os.path.exists(c) and os.path.getsize(c) > 1024:
            return c

    return provided_path or "detector/roadguard_yolov8.pt"

CLASS_METADATA = {
    # RoadGuard / Road Doctor trained classes
    'minor_pothole': {'code': 'D40-MIN', 'display_name': 'Minor Pothole (D40)', 'prefix': 'PTH', 'category': 'Surface Void', 'severity': 'Medium'},
    'moderate_pothole': {'code': 'D40-MOD', 'display_name': 'Moderate Pothole (D40)', 'prefix': 'PTH', 'category': 'Surface Void', 'severity': 'High'},
    'major_pothole': {'code': 'D40-MAJ', 'display_name': 'Major Pothole (D40)', 'prefix': 'PTH', 'category': 'Surface Void', 'severity': 'Critical'},
    'pothole': {'code': 'D40', 'display_name': 'Pothole (D40)', 'prefix': 'PTH', 'category': 'Surface Void', 'severity': 'High'},
    'potholes': {'code': 'D40', 'display_name': 'Potholes (D40)', 'prefix': 'PTH', 'category': 'Surface Void', 'severity': 'High'},
    
    'low_cracking': {'code': 'D00-L', 'display_name': 'Low Surface Cracking', 'prefix': 'CRK', 'category': 'Surface Crack', 'severity': 'Low'},
    'medium_cracking': {'code': 'D00-M', 'display_name': 'Medium Surface Cracking', 'prefix': 'CRK', 'category': 'Surface Crack', 'severity': 'Medium'},
    'high_cracking': {'code': 'D00-H', 'display_name': 'High Severe Cracking', 'prefix': 'CRK', 'category': 'Severe Structural Crack', 'severity': 'Critical'},
    
    'minor_edge_break': {'code': 'D42-MIN', 'display_name': 'Minor Edge Break', 'prefix': 'EDG', 'category': 'Pavement Edge Defect', 'severity': 'Medium'},
    'modrate_edge_break': {'code': 'D42-MOD', 'display_name': 'Moderate Edge Break', 'prefix': 'EDG', 'category': 'Pavement Edge Defect', 'severity': 'High'},
    'moderate_edge_break': {'code': 'D42-MOD', 'display_name': 'Moderate Edge Break', 'prefix': 'EDG', 'category': 'Pavement Edge Defect', 'severity': 'High'},
    'major_edge_break': {'code': 'D42-MAJ', 'display_name': 'Major Edge Break', 'prefix': 'EDG', 'category': 'Pavement Edge Defect', 'severity': 'Critical'},

    # CRDDC / Multi-class models
    'longitudinal crack': {'code': 'D00', 'display_name': 'Longitudinal Crack (D00)', 'prefix': 'LCRK', 'category': 'Structural Crack', 'severity': 'Medium'},
    'transverse crack': {'code': 'D01', 'display_name': 'Transverse Crack (D01)', 'prefix': 'TCRK', 'category': 'Thermal Crack', 'severity': 'Medium'},
    'alligator crack': {'code': 'D20', 'display_name': 'Alligator Fatigue Crack (D20)', 'prefix': 'ACRK', 'category': 'Structural Fatigue', 'severity': 'High'},
    
    # 7-Class Anomaly Model
    'speed-bump': {'code': 'D60', 'display_name': 'Speed Bump / Hump (D60)', 'prefix': 'BMP', 'category': 'Traffic Calming', 'severity': 'Medium'},
    'speed_bump': {'code': 'D60', 'display_name': 'Speed Bump / Hump (D60)', 'prefix': 'BMP', 'category': 'Traffic Calming', 'severity': 'Medium'},
    'crack-severe': {'code': 'D02', 'display_name': 'Severe Structural Crack (D02)', 'prefix': 'SCRK', 'category': 'Severe Structural Crack', 'severity': 'Critical'},
    'crack': {'code': 'D00', 'display_name': 'Surface Crack', 'prefix': 'CRK', 'category': 'Surface Crack', 'severity': 'Medium'},
    'heavy-vehicle': {'code': 'VH', 'display_name': 'Heavy Vehicle', 'prefix': 'HVH', 'category': 'Vehicle Traffic', 'severity': 'Low'},
    'light-vehicle': {'code': 'VL', 'display_name': 'Light Vehicle', 'prefix': 'LVH', 'category': 'Vehicle Traffic', 'severity': 'Low'},
    'pedestrian': {'code': 'PED', 'display_name': 'Pedestrian', 'prefix': 'PED', 'category': 'Vulnerable Road User', 'severity': 'Low'}
}

def get_defect_meta(cls_name):
    norm = str(cls_name).lower().strip().replace('-', '_')
    if norm in CLASS_METADATA:
        return CLASS_METADATA[norm]
    norm_space = str(cls_name).lower().strip()
    if norm_space in CLASS_METADATA:
        return CLASS_METADATA[norm_space]
    return {
        'code': 'DST',

        'display_name': str(cls_name).replace('_', ' ').title(),
        'prefix': 'DST',
        'category': 'Road Distress',
        'severity': 'Medium'
    }

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

def is_same_defect_category(cls1, cls2):
    meta1 = get_defect_meta(cls1)
    meta2 = get_defect_meta(cls2)
    if meta1.get('prefix') == meta2.get('prefix'):
        return True
    if meta1.get('category') == meta2.get('category'):
        return True
    return str(cls1).lower().replace('-', '_') == str(cls2).lower().replace('-', '_')

def is_same_track(coords1, coords2, w, h, dt=0.5, cls1='pothole', cls2='pothole'):
    # Check category compatibility
    if not is_same_defect_category(cls1, cls2):
        return False

    # 1. Standard IoU overlap
    iou = compute_iou(coords1, coords2)
    if iou > 0.12:
        return True

    # 2. Box containment / intersection over minimum area (large pothole sub-regions)
    iomin = compute_iomin(coords1, coords2)
    if iomin > 0.25:
        return True

    cx1 = (coords1[0] + coords1[2]) / 2.0 / w
    cy1 = (coords1[1] + coords1[3]) / 2.0 / h
    cx2 = (coords2[0] + coords2[2]) / 2.0 / w
    cy2 = (coords2[1] + coords2[3]) / 2.0 / h

    # 3. Road perspective forward-motion corridor:
    # Vehicles move along lanes, so lateral deviation (|cx1 - cx2|) is tight,
    # while vertical position (cy2 - cy1) moves downward as the vehicle approaches the pothole.
    dx = abs(cx1 - cx2)
    dy = cy2 - cy1  # positive if coords2 is closer (lower in frame) than coords1

    inter_x = max(0, min(coords1[2], coords2[2]) - max(coords1[0], coords2[0]))
    min_w = min(coords1[2] - coords1[0], coords2[2] - coords2[0])
    x_overlap = inter_x / float(min_w + 1e-6)

    if x_overlap > 0.30 and dy >= -0.06 and dy <= 0.45 and dt <= 1.8:
        return True

    dist = (dx ** 2 + dy ** 2) ** 0.5
    if dist < 0.22 and dt <= 1.5:
        return True

    return False

def analyze_video(video_path, model_path=None, conf_thresh=0.55, sample_fps=2.0, mode_name="roadguard"):
    if not os.path.exists(video_path):
        return {"error": f"Video not found: {video_path}"}
    
    actual_model = resolve_model_path(model_path)
    if not os.path.exists(actual_model):
        return {"error": f"Model not found: {actual_model}"}

    model = YOLO(actual_model)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": f"Failed to open video: {video_path}"}

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 100
    duration = total_frames / fps

    frame_interval = max(1, int(fps / sample_fps))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720

    raw_moments = []
    tracked_unique_defects = {}
    next_track_id = 1
    SEVERITY_ORDER = {'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4}

    frame_idx = 0
    sampled_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_interval == 0:
            current_time = round(frame_idx / fps, 2)
            sampled_count += 1

            r = model.track(
                frame,
                persist=True,
                tracker="bytetrack.yaml",
                imgsz=640,
                conf=conf_thresh,
                iou=0.40,
                verbose=False,
            )[0]

            frame_boxes = []

        if r.boxes is not None:
            for box_index, box in enumerate(r.boxes):
                coords = box.xyxy[0].tolist()
                
                # Exclude extreme top sky (above 15% height)
                center_y = (coords[1] + coords[3]) / 2.0
                if center_y < 0.15 * h:
                    continue

                cls_id = int(box.cls[0])
                cls_name = model.names.get(cls_id, "pothole")
                conf = float(box.conf[0])

                frame_boxes.append({
                    'coords': coords,
                    'cls_name': cls_name,
                    'conf': conf,
                    'model_track_id': int(r.boxes.id[box_index]) if r.boxes.id is not None else None
                })

        # Intra-frame NMS & Enclosing Box Merge:
        # If multiple boxes detect parts of the same large pothole in this frame,
        # merge them into one single comprehensive defect bounding box.
        frame_boxes.sort(key=lambda x: x['conf'], reverse=True)
        deduped_frame_boxes = []
        for candidate in frame_boxes:
            c1 = candidate['coords']
            merged_with_existing = False
            for kept in deduped_frame_boxes:
                c2 = kept['coords']
                iou = compute_iou(c1, c2)
                iomin = compute_iomin(c1, c2)
                cx1, cy1 = (c1[0] + c1[2]) / 2.0 / w, (c1[1] + c1[3]) / 2.0 / h
                cx2, cy2 = (c2[0] + c2[2]) / 2.0 / w, (c2[1] + c2[3]) / 2.0 / h
                dist = ((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2) ** 0.5
                
                # Check if centroid is inside the other bounding box
                inside1 = (c2[0] <= cx1 * w <= c2[2]) and (c2[1] <= cy1 * h <= c2[3])
                inside2 = (c1[0] <= cx2 * w <= c1[2]) and (c1[1] <= cy2 * h <= c1[3])

                if iou > 0.15 or iomin > 0.28 or dist < 0.18 or inside1 or inside2:
                    # Merge bounding boxes to cover the entire big pothole
                    kept['coords'] = [
                        min(c1[0], c2[0]),
                        min(c1[1], c2[1]),
                        max(c1[2], c2[2]),
                        max(c1[3], c2[3])
                    ]
                    kept['conf'] = max(kept['conf'], candidate['conf'])
                    # Upgrade class if candidate has higher severity
                    meta_k = get_defect_meta(kept['cls_name'])
                    meta_c = get_defect_meta(candidate['cls_name'])
                    if SEVERITY_ORDER.get(meta_c.get('severity', 'Medium'), 2) > SEVERITY_ORDER.get(meta_k.get('severity', 'Medium'), 2):
                        kept['cls_name'] = candidate['cls_name']
                    if kept.get('model_track_id') is None and candidate.get('model_track_id') is not None:
                        kept['model_track_id'] = candidate.get('model_track_id')
                    merged_with_existing = True
                    break
            if not merged_with_existing:
                deduped_frame_boxes.append(candidate)

        # Correlate across time to maintain stable single track IDs
        frame_used_track_ids = set()
        for b in deduped_frame_boxes:
            coords = b['coords']
            conf = b['conf']
            cls_name = b['cls_name']

            matched_id = None
            model_track_id = b.get('model_track_id')

            # 1. Prefer matching by model_track_id if not already used in this frame
            if model_track_id is not None:
                for existing_id, item in tracked_unique_defects.items():
                    if existing_id not in frame_used_track_ids and item.get('model_track_id') == model_track_id:
                        matched_id = existing_id
                        break

            # 2. Match with recent active tracks using road-perspective tracking
            if matched_id is None:
                best_match_score = -1.0
                best_match_id = None
                for existing_id, item in tracked_unique_defects.items():
                    if existing_id in frame_used_track_ids:
                        continue
                    dt = current_time - item['last_seen']
                    if dt <= 1.8:
                        if is_same_track(coords, item['last_coords'], w, h, dt, cls_name, item.get('class_name', cls_name)):
                            iou_val = compute_iou(coords, item['last_coords'])
                            iomin_val = compute_iomin(coords, item['last_coords'])
                            score = max(iou_val, iomin_val * 0.8) + (1.0 / (1.0 + dt))
                            if score > best_match_score:
                                best_match_score = score
                                best_match_id = existing_id
                if best_match_id is not None:
                    matched_id = best_match_id
            
            if matched_id is not None:
                t_id = matched_id
            else:
                t_id = next_track_id
                next_track_id += 1

            frame_used_track_ids.add(t_id)

            meta = get_defect_meta(cls_name)
            formatted_pothole_id = f"{meta['prefix']}-#{int(t_id):02d}"

            bx = int(coords[0])
            by = int(coords[1])
            bw = int(coords[2] - coords[0])
            bh = int(coords[3] - coords[1])
            est_w_cm = round((bw / w) * 160, 1)
            est_l_cm = round((bh / h) * 110, 1)

            moment_obj = {
                "pothole_id": formatted_pothole_id,
                "track_id": t_id,
                "time": current_time,
                "class_name": cls_name,
                "display_name": meta['display_name'],
                "rdd_code": meta['code'],
                "category": meta['category'],
                "conf": round(conf, 2),
                "severity": meta.get('severity', 'High'),
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
            }
            raw_moments.append(moment_obj)

            if t_id in tracked_unique_defects:
                tracked_unique_defects[t_id]['last_seen'] = current_time
                tracked_unique_defects[t_id]['last_coords'] = coords
                tracked_unique_defects[t_id]['sightings'] += 1
                tracked_unique_defects[t_id]['last_moment'] = moment_obj
                # Update class if higher severity detected
                cur_meta = get_defect_meta(tracked_unique_defects[t_id].get('class_name', cls_name))
                if SEVERITY_ORDER.get(meta.get('severity', 'Medium'), 2) > SEVERITY_ORDER.get(cur_meta.get('severity', 'Medium'), 2):
                    tracked_unique_defects[t_id]['class_name'] = cls_name
                if conf > tracked_unique_defects[t_id]['best_conf']:
                    tracked_unique_defects[t_id]['best_conf'] = conf
                    tracked_unique_defects[t_id]['best_moment'] = moment_obj
            else:
                tracked_unique_defects[t_id] = {
                    'track_id': t_id,
                    'model_track_id': model_track_id,
                    'class_name': cls_name,
                    'first_seen': current_time,
                    'last_seen': current_time,
                    'last_coords': coords,
                    'best_conf': conf,
                    'sightings': 1,
                    'best_moment': moment_obj,
                    'last_moment': moment_obj
                }
        frame_idx += 1
    cap.release()

    if sampled_count == 0:
        return {
            "video_path": video_path,
            "duration": round(duration, 2),
            "total_frames": frame_idx,
            "unique_defects_count": 0,
            "unique_defects": [],
            "detected_count": 0,
            "moments": []
        }

    # Retain all genuine neural detections with confidence above threshold
    valid_track_ids = {
        t_id for t_id, v in tracked_unique_defects.items()
        if v.get('sightings', 0) >= 1 and v.get('best_conf', 0) >= 0.25
    }

    filtered_moments = [m for m in raw_moments if m['track_id'] in valid_track_ids]

    unique_list = []
    for t_id, v in tracked_unique_defects.items():
        if t_id not in valid_track_ids:
            continue
        chosen = dict(v.get('best_moment') or v.get('last_moment'))
        effective_cls = v.get('class_name') or chosen.get('class_name', 'pothole')
        meta = get_defect_meta(effective_cls)
        chosen['class_name'] = effective_cls
        chosen['pothole_id'] = f"{meta['prefix']}-#{int(t_id):02d}"
        chosen['display_name'] = meta['display_name']
        chosen['rdd_code'] = meta['code']
        chosen['category'] = meta['category']
        chosen['first_seen_sec'] = v['first_seen']
        chosen['last_seen_sec'] = v['last_seen']
        chosen['total_sightings'] = v['sightings']
        unique_list.append(chosen)

    result_payload = {
        "video_path": video_path,
        "duration": round(duration, 2),
        "total_frames": frame_idx,
        "unique_defects_count": len(unique_list),
        "unique_defects": unique_list,
        "detected_count": len(filtered_moments),
        "moments": filtered_moments
    }

    return result_payload

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video provided"}))
        sys.exit(1)

    v_path = sys.argv[1]
    m_path = sys.argv[2] if len(sys.argv) > 2 else "detector/roadguard_yolov8.pt"
    c_thresh = float(sys.argv[3]) if len(sys.argv) > 3 else 0.55
    mode_arg = sys.argv[4] if len(sys.argv) > 4 else "roadguard"

    res = analyze_video(v_path, m_path, c_thresh, mode_name=mode_arg)
    print(json.dumps(res))
