import os
import json
import cv2
from ultralytics import YOLO

model = YOLO('detector/pothole_yolov8.pt')

videos = [
    'real_dashcam.mp4',
    'sample_road.mp4',
    'shadows_and_cracks.mp4',
    'clean_highway.mp4',
    'video_15g.mp4',
    'video_46g.mp4',
    'video_29c.mp4'
]

results = {}

for v in videos:
    v_path = os.path.join('public', 'videos', v)
    if not os.path.exists(v_path):
        continue
    
    cap = cv2.VideoCapture(v_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280
    video_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720
    cap.release()

    step_fps = 5.0
    frame_step = max(1, int(fps / step_fps))

    print(f'Tracking {v}...')
    track_results = model.track(source=v_path, conf=0.30, persist=True, tracker='bytetrack.yaml', vid_stride=frame_step, verbose=False)

    moments = []
    tracks_seen = {}

    frame_idx = 0
    for r in track_results:
        t_sec = round((frame_idx * frame_step) / fps, 2)
        frame_idx += 1

        if r.boxes is None or len(r.boxes) == 0:
            continue

        boxes = r.boxes.xyxy.cpu().numpy()
        confs = r.boxes.conf.cpu().numpy()
        clses = r.boxes.cls.cpu().numpy()
        track_ids = r.boxes.id.int().cpu().numpy() if r.boxes.id is not None else [None] * len(boxes)

        for box, conf, cls_id, t_id in zip(boxes, confs, clses, track_ids):
            x1, y1, x2, y2 = box
            w = int(x2 - x1)
            h = int(y2 - y1)
            cx = int(x1)
            cy = int(y1)
            class_name = model.names[int(cls_id)] if int(cls_id) in model.names else 'pothole'
            sev = 'Critical' if conf >= 0.75 else ('High' if conf >= 0.55 else 'Medium')
            w_cm = round((w / video_w) * 180.0, 1)
            l_cm = round((h / video_h) * 120.0, 1)

            t_val = int(t_id) if t_id is not None else None
            pothole_id = f'PTH-#{t_val:02d}' if t_val is not None else f'PTH-#{len(tracks_seen)+1:02d}'

            moment = {
                'pothole_id': pothole_id,
                'track_id': t_val,
                'time': t_sec,
                'class_name': class_name,
                'conf': round(float(conf), 2),
                'severity': sev,
                'wCm': w_cm,
                'lCm': l_cm,
                'bbox': {
                    'x': cx,
                    'y': cy,
                    'w': w,
                    'h': h,
                    'video_w': video_w,
                    'video_h': video_h
                }
            }
            moments.append(moment)

            if t_val is not None:
                if t_val not in tracks_seen:
                    tracks_seen[t_val] = {
                        'pothole_id': pothole_id,
                        'track_id': t_val,
                        'class_name': class_name,
                        'first_seen': t_sec,
                        'last_seen': t_sec,
                        'max_conf': round(float(conf), 2),
                        'severity': sev,
                        'first_moment': moment,
                        'last_moment': moment
                    }
                else:
                    tr = tracks_seen[t_val]
                    tr['last_seen'] = t_sec
                    tr['last_moment'] = moment
                    if float(conf) > tr['max_conf']:
                        tr['max_conf'] = round(float(conf), 2)
                        tr['severity'] = sev

    unique_defects = []
    for t_id, tr in tracks_seen.items():
        chosen = tr['last_moment']
        unique_defects.append(chosen)

    results[v] = {
        'total_defects': len(unique_defects),
        'unique_defects': unique_defects,
        'moments': moments
    }
    print(f'Done {v}: {len(unique_defects)} unique defects, {len(moments)} moments')

os.makedirs('data', exist_ok=True)
with open('data/precomputed_scans.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)
print('SUCCESS! Wrote data/precomputed_scans.json')
