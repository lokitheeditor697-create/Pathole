"""
Real-time Video Inference Service
Runs fine-tuned YOLOv8 on actual video frames and outputs real detections as JSON.
"""

import os
os.environ["YOLO_OFFLINE"] = "True"
os.environ["ULTRALYTICS_AUTOINSTALL"] = "0"

import sys
import json
import logging
logging.getLogger("ultralytics").setLevel(logging.ERROR)

import cv2
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
    if iou > 0.15:
        return True
    cx1 = (coords1[0] + coords1[2]) / 2.0 / w
    cy1 = (coords1[1] + coords1[3]) / 2.0 / h
    cx2 = (coords2[0] + coords2[2]) / 2.0 / w
    cy2 = (coords2[1] + coords2[3]) / 2.0 / h
    dist = ((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2) ** 0.5
    return dist < 0.14

def analyze_video(video_path, model_path=None, conf_thresh=0.28, sample_fps=2.5):
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
    
    # 1. Fast Batch Sampling of Video Frames
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

    # 2. Lightning Fast Batch Inference (PyTorch Batching)
    BATCH_SIZE = 16
    all_results = []
    for i in range(0, len(sampled_frames), BATCH_SIZE):
        batch = sampled_frames[i : i + BATCH_SIZE]
        batch_results = model(batch, imgsz=480, conf=conf_thresh, iou=0.45, verbose=False)
        all_results.extend(batch_results)

    # 3. Post-Process & Multi-Defect Spatial Correlation
    moments = []
    tracked_unique_defects = {}
    next_fallback_track_id = 1

    for frame, current_time, r in zip(sampled_frames, sampled_times, all_results):
        h, w, _ = frame.shape
        frame_boxes = []

        for box in r.boxes:
            coords = box.xyxy[0].tolist() # [x1, y1, x2, y2]
            
            # Refined road surface filter: Exclude only extreme top sky (center above 18% height)
            center_y = (coords[1] + coords[3]) / 2.0
            if center_y < 0.18 * h:
                continue

            cls_id = int(box.cls[0])
            cls_name = model.names.get(cls_id, "pothole")
            conf = float(box.conf[0])

            frame_boxes.append({
                'coords': coords,
                'cls_name': cls_name,
                'conf': conf,
                'track_id': None
            })

        # Intra-frame NMS: Suppress duplicate overlapping boxes on the same defect in this frame
        frame_boxes.sort(key=lambda x: x['conf'], reverse=True)
        deduped_frame_boxes = []
        for candidate in frame_boxes:
            overlap = False
            for kept in deduped_frame_boxes:
                if compute_iou(candidate['coords'], kept['coords']) > 0.35:
                    overlap = True
                    break
            if not overlap:
                deduped_frame_boxes.append(candidate)

        # Assign / correlate unique defects across time
        for b in deduped_frame_boxes:
            coords = b['coords']
            conf = b['conf']
            cls_name = b['cls_name']
            t_id = b['track_id']

            if t_id is None:
                matched = None
                for existing_id, item in tracked_unique_defects.items():
                    if current_time - item['last_seen'] <= 1.8:
                        if is_same_track(coords, item['last_coords'], w, h):
                            matched = existing_id
                            break
                if matched is not None:
                    t_id = matched
                else:
                    t_id = next_fallback_track_id
                    next_fallback_track_id += 1

            meta = get_defect_meta(cls_name)
            formatted_pothole_id = f"{meta['prefix']}-#{int(t_id):02d}"

            bx = int(coords[0])
            by = int(coords[1])
            bw = int(coords[2] - coords[0])
            bh = int(coords[3] - coords[1])
            est_w_cm = round((bw / w) * 180, 1)
            est_l_cm = round((bh / h) * 120, 1)
            severity = "Critical" if conf >= 0.70 or est_w_cm >= 40 else "High" if conf >= 0.45 or est_w_cm >= 25 else "Medium"

            moment_obj = {
                "pothole_id": formatted_pothole_id,
                "track_id": t_id,
                "time": current_time,
                "class_name": cls_name,
                "display_name": meta['display_name'],
                "rdd_code": meta['code'],
                "category": meta['category'],
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
            }
            moments.append(moment_obj)

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

    # Extract unique defect summary
    unique_list = []
    for t_id, v in tracked_unique_defects.items():
        chosen = dict(v.get('last_moment') or v.get('best_moment'))
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
        "detected_count": len(unique_list),
        "moments": moments
    }

    # Save to disk cache for instantaneous future loads
    try:
        cache_file = os.path.join("data", "precomputed_scans.json")
        scans_data = {}
        if os.path.exists(cache_file):
            with open(cache_file, "r") as f:
                scans_data = json.load(f)
        video_key = os.path.basename(video_path)
        model_tag = "rdd2022" if "rdd2022" in str(actual_model) else "pothole"
        scans_data[f"{video_key}_{model_tag}"] = result_payload
        if model_tag == "pothole":
            scans_data[video_key] = result_payload
        with open(cache_file, "w") as f:
            json.dump(scans_data, f, indent=2)
    except Exception as e:
        pass

    return result_payload

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video provided"}))
        sys.exit(1)

    v_path = sys.argv[1]
    m_path = sys.argv[2] if len(sys.argv) > 2 else "detector/pothole_yolov8.pt"
    c_thresh = float(sys.argv[3]) if len(sys.argv) > 3 else 0.28

    res = analyze_video(v_path, m_path, c_thresh)
    print(json.dumps(res))
