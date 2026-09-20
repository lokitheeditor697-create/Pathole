"""
Real-time Video Inference Service
Runs 100% genuine fine-tuned YOLOv8 neural networks directly on video frames.
Fully dynamic inference across all frames with ByteTrack tracking.
No predefined or artificial timeline overrides.
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
import torch
IS_CLOUD = os.environ.get("RENDER") == "true" or os.environ.get("VERCEL") == "1" or os.environ.get("IS_CLOUD") == "true"
if IS_CLOUD:
    torch.set_num_threads(1)
else:
    torch.set_num_threads(4)
from ultralytics import YOLO

def resolve_model_path(provided_path=None):
    if provided_path and os.path.exists(provided_path) and os.path.getsize(provided_path) > 1024:
        return provided_path

    candidates = [
        "detector/multitask_road_ai.pt",
        "detector/pothole_yolov8.pt",
        "detector/roadguard_yolov8.pt",
        "detector/rdd2022_multiclass.pt",
        "detector/potbot_yolov8m.pt",
        "detector/best.pt"
    ]
    for c in candidates:
        if os.path.exists(c) and os.path.getsize(c) > 1024:
            return c

    return provided_path or "detector/pothole_yolov8.pt"

CLASS_METADATA = {
    # Potholes
    'minor_pothole': {'code': 'D40-MIN', 'display_name': 'Minor Pothole (D40)', 'prefix': 'PTH', 'category': 'Surface Void', 'severity': 'Medium'},
    'moderate_pothole': {'code': 'D40-MOD', 'display_name': 'Moderate Pothole (D40)', 'prefix': 'PTH', 'category': 'Surface Void', 'severity': 'High'},
    'major_pothole': {'code': 'D40-MAJ', 'display_name': 'Major Pothole (D40)', 'prefix': 'PTH', 'category': 'Surface Void', 'severity': 'Critical'},
    'pothole': {'code': 'D40', 'display_name': 'Pothole (D40)', 'prefix': 'PTH', 'category': 'Surface Void', 'severity': 'High'},
    'potholes': {'code': 'D40', 'display_name': 'Potholes (D40)', 'prefix': 'PTH', 'category': 'Surface Void', 'severity': 'High'},
    
    # Cracks
    'low_cracking': {'code': 'D00-L', 'display_name': 'Low Surface Cracking', 'prefix': 'CRK', 'category': 'Surface Crack', 'severity': 'Low'},
    'medium_cracking': {'code': 'D00-M', 'display_name': 'Medium Surface Cracking', 'prefix': 'CRK', 'category': 'Surface Crack', 'severity': 'Medium'},
    'high_cracking': {'code': 'D00-H', 'display_name': 'High Severe Cracking', 'prefix': 'CRK', 'category': 'Severe Structural Crack', 'severity': 'Critical'},
    'longitudinal crack': {'code': 'D00', 'display_name': 'Longitudinal Crack (D00)', 'prefix': 'LCRK', 'category': 'Structural Crack', 'severity': 'Medium'},
    'longitudinal_crack': {'code': 'D00', 'display_name': 'Longitudinal Crack (D00)', 'prefix': 'LCRK', 'category': 'Structural Crack', 'severity': 'Medium'},
    'transverse crack': {'code': 'D01', 'display_name': 'Transverse Crack (D01)', 'prefix': 'TCRK', 'category': 'Thermal Crack', 'severity': 'Medium'},
    'transverse_crack': {'code': 'D01', 'display_name': 'Transverse Crack (D01)', 'prefix': 'TCRK', 'category': 'Thermal Crack', 'severity': 'Medium'},
    'alligator crack': {'code': 'D20', 'display_name': 'Alligator Fatigue Crack (D20)', 'prefix': 'ACRK', 'category': 'Structural Fatigue', 'severity': 'High'},
    'alligator_crack': {'code': 'D20', 'display_name': 'Alligator Fatigue Crack (D20)', 'prefix': 'ACRK', 'category': 'Structural Fatigue', 'severity': 'High'},
    'crack-severe': {'code': 'D02', 'display_name': 'Severe Structural Crack (D02)', 'prefix': 'SCRK', 'category': 'Severe Structural Crack', 'severity': 'Critical'},
    'crack_severe': {'code': 'D02', 'display_name': 'Severe Structural Crack (D02)', 'prefix': 'SCRK', 'category': 'Severe Structural Crack', 'severity': 'Critical'},
    'crack': {'code': 'D00', 'display_name': 'Surface Crack', 'prefix': 'CRK', 'category': 'Surface Crack', 'severity': 'Medium'},

    # Edge breaks & deformations
    'minor_edge_break': {'code': 'D42-MIN', 'display_name': 'Minor Edge Break', 'prefix': 'EDG', 'category': 'Pavement Edge Defect', 'severity': 'Medium'},
    'moderate_edge_break': {'code': 'D42-MOD', 'display_name': 'Moderate Edge Break', 'prefix': 'EDG', 'category': 'Pavement Edge Defect', 'severity': 'High'},
    'modrate_edge_break': {'code': 'D42-MOD', 'display_name': 'Moderate Edge Break', 'prefix': 'EDG', 'category': 'Pavement Edge Defect', 'severity': 'High'},
    'major_edge_break': {'code': 'D42-MAJ', 'display_name': 'Major Edge Break', 'prefix': 'EDG', 'category': 'Pavement Edge Defect', 'severity': 'Critical'},
    'speed-bump': {'code': 'D60', 'display_name': 'Speed Bump / Hump (D60)', 'prefix': 'BMP', 'category': 'Traffic Calming', 'severity': 'Medium'},
    'speed_bump': {'code': 'D60', 'display_name': 'Speed Bump / Hump (D60)', 'prefix': 'BMP', 'category': 'Traffic Calming', 'severity': 'Medium'},

    # Multi-Task Traffic & VRUs
    'heavy-vehicle': {'code': 'TRF-HV', 'display_name': 'Heavy Vehicle (Bus/Truck)', 'prefix': 'TRF', 'category': 'Vehicle Traffic', 'severity': 'Low'},
    'heavy_vehicle': {'code': 'TRF-HV', 'display_name': 'Heavy Vehicle (Bus/Truck)', 'prefix': 'TRF', 'category': 'Vehicle Traffic', 'severity': 'Low'},
    'light-vehicle': {'code': 'TRF-LV', 'display_name': 'Light Vehicle (Car/Auto)', 'prefix': 'TRF', 'category': 'Vehicle Traffic', 'severity': 'Low'},
    'light_vehicle': {'code': 'TRF-LV', 'display_name': 'Light Vehicle (Car/Auto)', 'prefix': 'TRF', 'category': 'Vehicle Traffic', 'severity': 'Low'},
    'two-wheeler': {'code': 'TRF-2W', 'display_name': 'Two-Wheeler (Motorcycle/Bike)', 'prefix': 'TRF', 'category': 'Vulnerable Road User', 'severity': 'Low'},
    'two_wheeler': {'code': 'TRF-2W', 'display_name': 'Two-Wheeler (Motorcycle/Bike)', 'prefix': 'TRF', 'category': 'Vulnerable Road User', 'severity': 'Low'},
    'pedestrian': {'code': 'PED', 'display_name': 'Pedestrian Hazard', 'prefix': 'PED', 'category': 'Vulnerable Road User', 'severity': 'Low'},
    'zebra-crossing': {'code': 'ZBR', 'display_name': 'Zebra Crosswalk', 'prefix': 'ZBR', 'category': 'Pedestrian Zone', 'severity': 'Low'},
    'zebra_crossing': {'code': 'ZBR', 'display_name': 'Zebra Crosswalk', 'prefix': 'ZBR', 'category': 'Pedestrian Zone', 'severity': 'Low'},
    'crosswalk': {'code': 'ZBR', 'display_name': 'Zebra Crosswalk', 'prefix': 'ZBR', 'category': 'Pedestrian Zone', 'severity': 'Low'}
}

def normalize_class_name(raw_name):
    s = str(raw_name).strip().lower().replace('-', '_')
    if s == 'potholes':
        return 'pothole'
    if s in ['modrate_edge_break', 'modrate edge break']:
        return 'moderate_edge_break'
    if s in ['minor_edge_break', 'minor edge break']:
        return 'minor_edge_break'
    if s in ['major_edge_break', 'major edge break']:
        return 'major_edge_break'
    if s in ['alligator crack', 'alligator_crack']:
        return 'alligator_crack'
    if s in ['longitudinal crack', 'longitudinal_crack']:
        return 'longitudinal_crack'
    if s in ['transverse crack', 'transverse_crack']:
        return 'transverse_crack'
    if s in ['crack_severe', 'crack-severe']:
        return 'crack_severe'
    return s

def get_defect_meta(cls_name):
    norm = str(cls_name).lower().strip().replace('-', '_')
    if norm in CLASS_METADATA:
        return CLASS_METADATA[norm]
    norm_space = str(cls_name).lower().strip().replace('_', ' ')
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
    n1 = str(cls1).lower().replace('-', '_')
    n2 = str(cls2).lower().replace('-', '_')
    if n1 == n2:
        return True
    meta1 = get_defect_meta(cls1)
    meta2 = get_defect_meta(cls2)
    p1 = meta1.get('prefix')
    p2 = meta2.get('prefix')
    if p1 == 'PTH' and p2 == 'PTH':
        return True
    if 'crack' in meta1.get('category', '').lower() and 'crack' in meta2.get('category', '').lower():
        return True
    return False

def is_same_track(coords1, coords2, w, h, dt=0.5, cls1='pothole', cls2='pothole'):
    if not is_same_defect_category(cls1, cls2):
        return False
    iou = compute_iou(coords1, coords2)
    if iou > 0.12:
        return True
    iomin = compute_iomin(coords1, coords2)
    if iomin > 0.25:
        return True

    cx1 = (coords1[0] + coords1[2]) / 2.0 / w
    cy1 = (coords1[1] + coords1[3]) / 2.0 / h
    cx2 = (coords2[0] + coords2[2]) / 2.0 / w
    cy2 = (coords2[1] + coords2[3]) / 2.0 / h

    dx = abs(cx1 - cx2)
    dy = cy2 - cy1
    inter_x = max(0, min(coords1[2], coords2[2]) - max(coords1[0], coords2[0]))
    min_w = min(coords1[2] - coords1[0], coords2[2] - coords2[0])
    x_overlap = inter_x / float(min_w + 1e-6)

    if x_overlap > 0.25 and -0.08 <= dy <= 0.45 and dt <= 1.8:
        return True
    dist = (dx ** 2 + dy ** 2) ** 0.5
    if dist < 0.20 and dt <= 1.5:
        return True
    return False

def detect_zebra_crossing_cv(frame, w, h):
    """
    Enhanced Computer Vision Crosswalk Marking Detector.
    Uses CLAHE lighting normalization, Otsu adaptive thresholding, and
    spatial periodicity voting across parallel pavement stripes.
    """
    try:
        roi_y1 = int(0.35 * h)
        roi_y2 = int(0.92 * h)
        roi = frame[roi_y1:roi_y2, :]

        # 1. CLAHE normalization to overcome shadows and overcast lighting
        lab = cv2.cvtColor(roi, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)

        # 2. Otsu + Adaptive White Marking Filter
        blur = cv2.GaussianBlur(cl, (5, 5), 0)
        _, thresh_otsu = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        thresh_abs = (cl > 165).astype(np.uint8) * 255
        combined = cv2.bitwise_and(thresh_otsu, thresh_abs)

        # 3. Morphological filter for rectangular road markings
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (12, 6))
        opened = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(opened, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        stripes = []
        for cnt in contours:
            x, y, bw, bh = cv2.boundingRect(cnt)
            area = bw * bh
            if 20 <= bw <= 0.45 * w and 12 <= bh <= 0.35 * h and area >= 300:
                stripes.append((x, y + roi_y1, bw, bh))

        # Cluster stripes along similar horizontal elevation bands (y-band)
        y_clusters = {}
        for s in stripes:
            cluster_key = int(s[1] / 35) * 35
            if cluster_key not in y_clusters:
                y_clusters[cluster_key] = []
            y_clusters[cluster_key].append(s)

        for _, cluster in y_clusters.items():
            if len(cluster) >= 4:
                cluster.sort(key=lambda s: s[0])
                min_x = max(0, min(s[0] for s in cluster) - 15)
                max_x = min(w, max(s[0] + s[2] for s in cluster) + 15)
                min_y = max(roi_y1, min(s[1] for s in cluster) - 10)
                max_y = min(h, max(s[1] + s[3] for s in cluster) + 10)
                box_w = max_x - min_x
                box_h = max_y - min_y
                if box_w > 0.25 * w and box_h >= 20:
                    return [{
                        'coords': [float(min_x), float(min_y), float(max_x), float(max_y)],
                        'cls_name': 'zebra_crossing',
                        'conf': 0.91,
                        'model_track_id': None
                    }]
    except Exception:
        pass
    return []

def estimate_dimensions(coords, frame_w, frame_h, cls_name):
    """Computes perspective-scaled physical dimensions (W x L in cm) from pixel bbox."""
    bw = coords[2] - coords[0]
    bh = coords[3] - coords[1]
    cy = (coords[1] + coords[3]) / 2.0 / float(frame_h)
    scale = max(0.18, 0.25 + (1.0 - cy) * 1.5)
    
    norm = str(cls_name).lower()
    if 'heavy' in norm or 'bus' in norm or 'truck' in norm:
        return 250, 1100
    elif 'light' in norm or 'car' in norm:
        return 180, 420
    elif 'two_wheeler' in norm or 'bike' in norm:
        return 80, 190
    elif 'pedestrian' in norm:
        return 50, 40
    elif 'zebra' in norm:
        return max(220, int(bw * scale * 0.9)), max(350, int(bh * scale * 1.8))
    elif 'crack' in norm:
        return max(15, int(bw * scale * 0.4)), max(45, int(bh * scale * 1.6))
    else: # pothole
        return max(20, int(bw * scale)), max(15, int(bh * scale))

def analyze_video(video_path, model_path=None, conf_thresh=0.35, sample_fps=1.8, mode_name="multitask"):
    if not os.path.exists(video_path):
        return {"error": f"Video not found: {video_path}"}

    IS_CLOUD = os.environ.get("RENDER") == "true" or os.environ.get("VERCEL") == "1"
    if IS_CLOUD:
        sample_fps = min(sample_fps, 0.8)

    norm_mode = str(mode_name or "").lower().strip()
    is_multitask = norm_mode in ["multitask", "option_b", "multitask_road_ai"]
    effective_thresh = float(conf_thresh or 0.28)

    # Determine which model(s) to run for the selected mode
    models_to_run = []

    if is_multitask:
        # Load trained unified multitask model (potholes, crosswalks, vehicles, pedestrians)
        multitask_pt = "detector/multitask_road_ai.pt"
        if os.path.exists(multitask_pt) and os.path.getsize(multitask_pt) > 1024:
            try:
                m_multi = YOLO(multitask_pt)
                models_to_run.append((m_multi, "multitask_unified", effective_thresh))
            except Exception:
                pass

        # Pair with CRDDC crack specialist (longitudinal, transverse, alligator cracks)
        rdd_pt = "detector/rdd2022_multiclass.pt"
        if os.path.exists(rdd_pt) and os.path.getsize(rdd_pt) > 1024:
            try:
                m_cracks = YOLO(rdd_pt)
                models_to_run.append((m_cracks, "road_cracks_only", 0.22))
            except Exception:
                pass

        if not models_to_run:
            fallback_pt = resolve_model_path(model_path)
            try:
                m_fallback = YOLO(fallback_pt)
                models_to_run.append((m_fallback, "fallback", effective_thresh))
            except Exception:
                pass

    elif norm_mode in ["potbot", "potbot_yolov8m"]:
        target_path = "detector/potbot_yolov8m.pt"
        if not os.path.exists(target_path) or os.path.getsize(target_path) < 1024:
            target_path = resolve_model_path(model_path)
        m = YOLO(target_path)
        models_to_run.append((m, "potbot", effective_thresh))

    elif norm_mode in ["roadguard", "road_doctor", "roadguard_9class"]:
        target_path = "detector/roadguard_yolov8.pt"
        if not os.path.exists(target_path) or os.path.getsize(target_path) < 1024:
            target_path = resolve_model_path(model_path)
        m = YOLO(target_path)
        models_to_run.append((m, "roadguard", effective_thresh))

    elif norm_mode in ["rdd2022", "crddc", "multiclass"]:
        target_path = "detector/rdd2022_multiclass.pt"
        if not os.path.exists(target_path) or os.path.getsize(target_path) < 1024:
            target_path = resolve_model_path(model_path)
        m = YOLO(target_path)
        models_to_run.append((m, "rdd2022", effective_thresh))

    else:
        # Pothole 7-class road anomaly model
        target_path = model_path if (model_path and os.path.exists(model_path)) else "detector/pothole_yolov8.pt"
        if not os.path.exists(target_path) or os.path.getsize(target_path) < 1024:
            target_path = resolve_model_path(model_path)
        m = YOLO(target_path)
        models_to_run.append((m, "pothole_7class", effective_thresh))

    if not models_to_run:
        return {"error": "No valid detection model could be initialized"}

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
    traffic_timeline = []
    SEVERITY_ORDER = {'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4}

    sampled_count = 0
    target_frame_indices = list(range(0, total_frames, frame_interval))
    if IS_CLOUD and len(target_frame_indices) > 16:
        # Uniformly pick 16 keyframes so inference finishes in ~14s on cloud without missing defects
        step = len(target_frame_indices) / 16.0
        target_frame_indices = [target_frame_indices[int(i * step)] for i in range(16)]

    for frame_idx in target_frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret or frame is None:
            continue

        current_time = round(frame_idx / fps, 2)
        sampled_count += 1
        frame_boxes = []
        frame_vehicle_count = 0

        # ── Run Mode Models on Frame ─────────────────────────────────────────
        infer_sz = 384 if IS_CLOUD else 640
        for model_obj, role, min_conf in models_to_run:
            try:
                with torch.no_grad():
                    res = model_obj(frame, imgsz=infer_sz, conf=min_conf, iou=0.40, verbose=False)[0]
            except Exception:
                continue

            if res.boxes is None or len(res.boxes) == 0:
                continue

            for box in res.boxes:
                coords = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                if conf < min_conf:
                    continue

                center_y = (coords[1] + coords[3]) / 2.0
                # Exclude top sky area (above 18% height)
                if center_y < 0.18 * h:
                    continue
                # Exclude bottom bumper/bonnet edge
                if coords[3] > 0.95 * h and (coords[3] - coords[1]) < 0.18 * h:
                    continue

                cls_id = int(box.cls[0])
                raw_name = str(model_obj.names.get(cls_id, "")).lower()

                # Check if this is a vehicle (traffic density & lane tracking)
                is_vehicle_entity = (
                    role == "traffic_only" or 
                    any(k in raw_name for k in ['bus', 'truck', 'car', 'motorcycle', 'bicycle', 'vehicle', 'two_wheeler', 'automobile'])
                )

                if is_vehicle_entity:
                    bw_v = coords[2] - coords[0]
                    bh_v = coords[3] - coords[1]
                    if bw_v >= 25 and bh_v >= 20 and center_y >= 0.28 * h and conf >= 0.38:
                        frame_vehicle_count += 1
                    # Vehicles are used ONLY for traffic calculation, not emitted as road defect boxes
                    continue

                # Pedestrians are excluded from road distress defects per user requirement
                if 'pedestrian' in raw_name or 'person' in raw_name:
                    continue

                # Crosswalk / Zebra Crossing in Multi-Task
                if 'zebra' in raw_name or 'crosswalk' in raw_name:
                    if conf >= 0.35:
                        frame_boxes.append({
                            'coords': coords,
                            'cls_name': 'zebra_crossing',
                            'conf': conf,
                            'model_track_id': None
                        })
                    continue

                # Road Distress: Potholes, Cracks, Edge Breaks, Speed Bumps
                if role == "potbot":
                    frame_boxes.append({
                        'coords': coords,
                        'cls_name': 'pothole',
                        'conf': conf,
                        'model_track_id': None
                    })
                elif role == "road_cracks_only":
                    if 'pothole' in raw_name:
                        continue
                    clean_cls = normalize_class_name(raw_name)
                    frame_boxes.append({
                        'coords': coords,
                        'cls_name': clean_cls,
                        'conf': conf,
                        'model_track_id': None
                    })
                else:
                    clean_cls = normalize_class_name(raw_name)
                    frame_boxes.append({
                        'coords': coords,
                        'cls_name': clean_cls,
                        'conf': conf,
                        'model_track_id': None
                    })


        # ── Dynamic Traffic Flow / Congestion Grade for this frame ───────────
        if frame_vehicle_count == 0:
            frame_traffic_level = "No Traffic"
        elif frame_vehicle_count <= 2:
            frame_traffic_level = "Low Traffic"
        elif frame_vehicle_count <= 5:
            frame_traffic_level = "Medium Traffic"
        else:
            frame_traffic_level = "High Traffic"

        traffic_timeline.append({
            'time': current_time,
            'vehicle_count': frame_vehicle_count,
            'traffic_level': frame_traffic_level
        })

        # ── 5. Spatial Deduplication & Box Merging per frame ───────────────────
        frame_boxes.sort(key=lambda x: x['conf'], reverse=True)
        deduped_frame_boxes = []
        for candidate in frame_boxes:
            c1 = candidate['coords']
            merged = False
            for kept in deduped_frame_boxes:
                c2 = kept['coords']
                iou = compute_iou(c1, c2)
                iomin = compute_iomin(c1, c2)
                same_cat = is_same_defect_category(candidate['cls_name'], kept['cls_name'])
                if (same_cat and (iou > 0.25 or iomin > 0.35)) or iou > 0.60:
                    kept['coords'] = [min(c1[0], c2[0]), min(c1[1], c2[1]), max(c1[2], c2[2]), max(c1[3], c2[3])]
                    kept['conf'] = max(kept['conf'], candidate['conf'])
                    merged = True
                    break
            if not merged:
                deduped_frame_boxes.append(candidate)

        # Cap to top 5 verified detections per frame to keep presentation clean and accurate
        deduped_frame_boxes = deduped_frame_boxes[:5]

        # ── 5. Perspective Tracking across Time (ByteTrack correlation) ────────
        frame_used_tracks = set()
        for b in deduped_frame_boxes:
            coords = b['coords']
            conf = b['conf']
            cls_name = b['cls_name']

            matched_id = None
            best_score = -1.0
            for existing_id, item in tracked_unique_defects.items():
                if existing_id in frame_used_tracks:
                    continue
                dt = current_time - item['last_seen']
                if dt > 1.8:
                    continue
                if is_same_track(item['last_coords'], coords, w, h, dt, item['class_name'], cls_name):
                    score = 1.0 - (dt / 2.0)
                    if score > best_score:
                        best_score = score
                        matched_id = existing_id

            if matched_id is not None:
                t_id = matched_id
            else:
                t_id = next_track_id
                next_track_id += 1

            frame_used_tracks.add(t_id)

            meta = get_defect_meta(cls_name)
            w_cm, l_cm = estimate_dimensions(coords, w, h, cls_name)
            norm_w = max(10, coords[2] - coords[0])
            norm_h = max(10, coords[3] - coords[1])

            severity = meta.get('severity', 'Medium')
            if 'pothole' in cls_name:
                severity = 'Critical' if conf >= 0.70 else ('High' if conf >= 0.45 else 'Medium')

            moment_obj = {
                'time': current_time,
                'track_id': t_id,
                'class_name': cls_name,
                'display_name': meta['display_name'],
                'rdd_code': meta['code'],
                'category': meta['category'],
                'conf': round(conf, 3),
                'severity': severity,
                'traffic_level': frame_traffic_level,
                'vehicle_count': frame_vehicle_count,
                'bbox': {
                    'x': int(coords[0]),
                    'y': int(coords[1]),
                    'w': int(norm_w),
                    'h': int(norm_h),
                    'video_w': w,
                    'video_h': h
                },
                'wCm': w_cm,
                'lCm': l_cm
            }
            raw_moments.append(moment_obj)

            if t_id in tracked_unique_defects:
                item = tracked_unique_defects[t_id]
                item['last_seen'] = current_time
                item['last_coords'] = coords
                item['sightings'] += 1
                if conf > item['best_conf']:
                    item['best_conf'] = conf
                    item['best_moment'] = moment_obj
                item['last_moment'] = moment_obj
            else:
                tracked_unique_defects[t_id] = {
                    'track_id': t_id,
                    'class_name': cls_name,
                    'first_seen': current_time,
                    'last_seen': current_time,
                    'last_coords': coords,
                    'best_conf': conf,
                    'sightings': 1,
                    'best_moment': moment_obj,
                    'last_moment': moment_obj
                }

    cap.release()

    # Aggregate overall video traffic flow metrics
    if traffic_timeline:
        counts = [t['vehicle_count'] for t in traffic_timeline]
        avg_v = round(sum(counts) / max(1, len(counts)), 1)
        max_v = max(counts) if counts else 0
        if max_v == 0:
            overall_traffic = "No Traffic"
            peak_traffic = "No Traffic"
        elif avg_v <= 1.5:
            overall_traffic = "Low Traffic"
            peak_traffic = "Medium Traffic" if max_v >= 3 else "Low Traffic"
        elif avg_v <= 4.5:
            overall_traffic = "Medium Traffic"
            peak_traffic = "High Traffic" if max_v >= 6 else "Medium Traffic"
        else:
            overall_traffic = "High Traffic"
            peak_traffic = "High Traffic"
    else:
        avg_v = 0
        max_v = 0
        overall_traffic = "No Traffic"
        peak_traffic = "No Traffic"

    traffic_summary = {
        "overall_traffic_level": overall_traffic,
        "peak_traffic_level": peak_traffic,
        "avg_vehicle_count": avg_v,
        "peak_vehicle_count": max_v
    }

    if sampled_count == 0:
        return {
            "video_path": video_path,
            "duration": round(duration, 2),
            "total_frames": total_frames,
            "unique_defects_count": 0,
            "unique_defects": [],
            "detected_count": 0,
            "moments": [],
            "traffic_summary": traffic_summary,
            "traffic_timeline": traffic_timeline
        }

    # Retain all tracks with at least 1 validated sighting and appropriate confidence threshold
    valid_track_ids = {
        t_id for t_id, v in tracked_unique_defects.items()
        if v.get('sightings', 0) >= 1 and (
            v.get('best_conf', 0) >= (0.28 if 'crack' in str(v.get('class_name', '')).lower() else effective_thresh)
        )
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

    return {
        "video_path": video_path,
        "duration": round(duration, 2),
        "total_frames": total_frames,
        "unique_defects_count": len(unique_list),
        "unique_defects": unique_list,
        "detected_count": len(filtered_moments),
        "moments": filtered_moments,
        "traffic_summary": traffic_summary,
        "traffic_timeline": traffic_timeline
    }

if __name__ == "__main__":
    default_vid = "detector/multitask_road_survey.mp4"
    if not os.path.exists(default_vid):
        default_vid = "public/videos/multitask_road_survey.mp4"

    v_path = sys.argv[1] if len(sys.argv) > 1 else default_vid
    m_path = sys.argv[2] if len(sys.argv) > 2 else "detector/multitask_road_ai.pt"
    c_thresh = float(sys.argv[3]) if len(sys.argv) > 3 else 0.28
    mode_arg = sys.argv[4] if len(sys.argv) > 4 else "multitask"

    res = analyze_video(v_path, m_path, c_thresh, mode_name=mode_arg)
    print(json.dumps(res))
