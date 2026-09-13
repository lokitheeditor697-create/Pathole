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
    if provided_path and os.path.exists(provided_path):
        return provided_path
    candidates = [
        "detector/roadguard_yolov8.pt",
        "detector/potbot_yolov8m.pt",
        "detector/pothole_yolov8.pt",
        "detector/rdd2022_multiclass.pt",
        "detector/best.pt"
    ]
    for c in candidates:
        if os.path.exists(c):
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

def is_same_track(coords1, coords2, w, h):
    iou = compute_iou(coords1, coords2)
    if iou > 0.18:
        return True
    cx1 = (coords1[0] + coords1[2]) / 2.0 / w
    cy1 = (coords1[1] + coords1[3]) / 2.0 / h
    cx2 = (coords2[0] + coords2[2]) / 2.0 / w
    cy2 = (coords2[1] + coords2[3]) / 2.0 / h
    dist = ((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2) ** 0.5
    return dist < 0.18

def analyze_video(video_path, model_path=None, conf_thresh=0.35, sample_fps=3.0, mode_name="roadguard"):
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
    
    # 1. Sample Video Frames
    sampled_frames = []
    sampled_times = []
    frame_idx = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_interval == 0:
            current_time = round(frame_idx / fps, 2)
            sampled_frames.append(frame)
            sampled_times.append(current_time)
        frame_idx += 1
    cap.release()

    if not sampled_frames:
        return {
            "video_path": video_path,
            "duration": round(duration, 2),
            "total_frames": frame_idx,
            "unique_defects_count": 0,
            "unique_defects": [],
            "detected_count": 0,
            "moments": []
        }

    # 2. Real Batch Inference directly with Ultralytics PyTorch
    BATCH_SIZE = 16
    all_results = []
    for i in range(0, len(sampled_frames), BATCH_SIZE):
        batch = sampled_frames[i : i + BATCH_SIZE]
        batch_results = model(batch, imgsz=640, conf=conf_thresh, iou=0.40, verbose=False)
        all_results.extend(batch_results)

    # 3. Post-Process with Spatial Deduplication and Track Continuity
    raw_moments = []
    tracked_unique_defects = {}
    next_track_id = 1

    for frame, current_time, r in zip(sampled_frames, sampled_times, all_results):
        h, w, _ = frame.shape
        frame_boxes = []

        if r.boxes is not None:
            for box in r.boxes:
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
                    'conf': conf
                })

        # Intra-frame NMS: Suppress duplicate overlapping boxes on the same defect in this frame
        frame_boxes.sort(key=lambda x: x['conf'], reverse=True)
        deduped_frame_boxes = []
        for candidate in frame_boxes:
            c1 = candidate['coords']
            overlap = False
            for kept in deduped_frame_boxes:
                c2 = kept['coords']
                iou = compute_iou(c1, c2)
                cx1, cy1 = (c1[0] + c1[2]) / 2.0 / w, (c1[1] + c1[3]) / 2.0 / h
                cx2, cy2 = (c2[0] + c2[2]) / 2.0 / w, (c2[1] + c2[3]) / 2.0 / h
                dist = ((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2) ** 0.5
                if iou > 0.20 or dist < 0.14:
                    overlap = True
                    break
            if not overlap:
                deduped_frame_boxes.append(candidate)

        # Correlate across time to maintain stable single track IDs
        for b in deduped_frame_boxes:
            coords = b['coords']
            conf = b['conf']
            cls_name = b['cls_name']

            matched_id = None
            for existing_id, item in tracked_unique_defects.items():
                if current_time - item['last_seen'] <= 1.2:
                    if is_same_track(coords, item['last_coords'], w, h):
                        matched_id = existing_id
                        break
            
            if matched_id is not None:
                t_id = matched_id
            else:
                t_id = next_track_id
                next_track_id += 1

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
                if conf > tracked_unique_defects[t_id]['best_conf']:
                    tracked_unique_defects[t_id]['best_conf'] = conf
                    tracked_unique_defects[t_id]['best_moment'] = moment_obj
            else:
                tracked_unique_defects[t_id] = {
                    'track_id': t_id,
                    'first_seen': current_time,
                    'last_seen': current_time,
                    'last_coords': coords,
                    'best_conf': conf,
                    'sightings': 1,
                    'best_moment': moment_obj,
                    'last_moment': moment_obj
                }

    # Filter out single-frame false alarms (< 2 sightings unless high confidence >= 0.55)
    valid_track_ids = {
        t_id for t_id, v in tracked_unique_defects.items()
        if v['sightings'] >= 2 or v['best_conf'] >= 0.55
    }

    filtered_moments = [m for m in raw_moments if m['track_id'] in valid_track_ids]

    unique_list = []
    for t_id, v in tracked_unique_defects.items():
        if t_id not in valid_track_ids:
            continue
        chosen = dict(v.get('best_moment') or v.get('last_moment'))
        meta = get_defect_meta(chosen.get('class_name', 'pothole'))
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
    c_thresh = float(sys.argv[3]) if len(sys.argv) > 3 else 0.35
    mode_arg = sys.argv[4] if len(sys.argv) > 4 else "roadguard"

    res = analyze_video(v_path, m_path, c_thresh, mode_name=mode_arg)
    print(json.dumps(res))
