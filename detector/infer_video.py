"""
Real-time Video Inference Service
Runs fine-tuned YOLOv8 on actual video frames and outputs real detections as JSON.
"""

import sys
import os
import json
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

def compute_iou(boxA, boxB):
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    inter = max(0, xB - xA) * max(0, yB - yA)
    areaA = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    areaB = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
    return inter / float(areaA + areaB - inter + 1e-6)

def analyze_video(video_path, model_path=None, conf_thresh=0.38, sample_fps=4):
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
    moments = []
    tracked_unique_defects = {}
    next_fallback_track_id = 1
    frame_idx = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_interval == 0:
            current_time = round(frame_idx / fps, 2)
            h, w, _ = frame.shape
            
            # Use ByteTrack tracking if available
            try:
                results = model.track(frame, persist=True, tracker="bytetrack.yaml", conf=conf_thresh, iou=0.45, verbose=False)
            except Exception:
                results = model(frame, conf=conf_thresh, iou=0.45, verbose=False)

            frame_boxes = []
            for r in results:
                for box in r.boxes:
                    coords = box.xyxy[0].tolist() # [x1, y1, x2, y2]
                    # Filter out non-road objects (sky/horizon/trees/billboards above road surface)
                    if coords[3] < 0.48 * h or coords[1] < 0.25 * h:
                        continue
                    
                    cls_id = int(box.cls[0])
                    cls_name = model.names.get(cls_id, "pothole")
                    conf = float(box.conf[0])
                    
                    # Track ID from tracker if present
                    track_id = int(box.id[0]) if (hasattr(box, 'id') and box.id is not None) else None
                    
                    frame_boxes.append({
                        'coords': coords,
                        'cls_name': cls_name,
                        'conf': conf,
                        'track_id': track_id
                    })

            # Intra-frame NMS: Suppress duplicate overlapping boxes on the same pothole in this frame
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
                        if current_time - item['last_seen'] <= 1.2:
                            if compute_iou(coords, item['last_coords']) > 0.20:
                                matched = existing_id
                                break
                    if matched is not None:
                        t_id = matched
                    else:
                        t_id = next_fallback_track_id
                        next_fallback_track_id += 1

                bx = int(coords[0])
                by = int(coords[1])
                bw = int(coords[2] - coords[0])
                bh = int(coords[3] - coords[1])
                est_w_cm = round((bw / w) * 180, 1)
                est_l_cm = round((bh / h) * 120, 1)
                severity = "Critical" if conf >= 0.75 else "High" if conf >= 0.55 else "Medium"

                moment_obj = {
                    "track_id": t_id,
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
                }
                moments.append(moment_obj)

                if t_id in tracked_unique_defects:
                    tracked_unique_defects[t_id]['last_seen'] = current_time
                    tracked_unique_defects[t_id]['last_coords'] = coords
                    tracked_unique_defects[t_id]['sightings'] += 1
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
                        'best_moment': moment_obj
                    }

        frame_idx += 1

    cap.release()

    unique_list = [v['best_moment'] for v in tracked_unique_defects.values()]
    return {
        "video_path": video_path,
        "duration": round(duration, 2),
        "total_frames": frame_idx,
        "unique_defects_count": len(unique_list),
        "unique_defects": unique_list,
        "detected_count": len(unique_list),
        "moments": moments
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video provided"}))
        sys.exit(1)

    v_path = sys.argv[1]
    m_path = sys.argv[2] if len(sys.argv) > 2 else "detector/pothole_yolov8.pt"
    c_thresh = float(sys.argv[3]) if len(sys.argv) > 3 else 0.42

    res = analyze_video(v_path, m_path, c_thresh)
    print(json.dumps(res))
