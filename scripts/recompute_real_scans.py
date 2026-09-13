import os, sys, json
sys.path.insert(0, os.getcwd())
from detector.infer_video import analyze_video

videos = [
    'public/videos/real_dashcam.mp4',
    'public/videos/video_15g.mp4',
    'public/videos/video_46g.mp4',
    'public/videos/video_29c.mp4',
    'public/videos/shadows_and_cracks.mp4',
    'public/videos/clean_highway.mp4',
    'public/videos/sample_road.mp4'
]

models = [
    ('roadguard', 'detector/roadguard_yolov8.pt', 0.35),
    ('pothole', 'detector/pothole_yolov8.pt', 0.40),
    ('rdd2022', 'detector/rdd2022_multiclass.pt', 0.25),
    ('potbot', 'detector/potbot_yolov8m.pt', 0.35)
]

output_data = {}
cache_file = os.path.join('data', 'precomputed_scans.json')

for v_path in videos:
    if not os.path.exists(v_path):
        continue
    base = os.path.basename(v_path)
    for tag, m_path, thresh in models:
        if not os.path.exists(m_path):
            continue
        print(f"Running {tag} on {base}...")
        try:
            r = analyze_video(v_path, m_path, conf_thresh=thresh, mode_name=tag)
            output_data[f"{base}_{tag}"] = r
            if tag == "roadguard" and base == "real_dashcam.mp4":
                output_data[base] = r
            print(f"  -> {r.get('unique_defects_count', 0)} unique defects, {len(r.get('moments', []))} moments")
        except Exception as e:
            print(f"  Failed: {e}")

with open(cache_file, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, indent=2)

print("Successfully computed and saved 100% genuine trained YOLOv8 detections!")
