import os
import json
import subprocess

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
    if os.path.exists(v_path):
        cmd = [r'.\.venv\Scripts\python.exe', 'detector/infer_video.py', v_path, 'detector/pothole_yolov8.pt', '0.35']
        p = subprocess.run(cmd, capture_output=True, text=True)
        if p.returncode == 0 and p.stdout:
            try:
                data = json.loads(p.stdout.strip())
                results[v] = data
                u_len = len(data.get("unique_defects", []))
                m_len = len(data.get("moments", []))
                print(f"Processed {v}: {u_len} defects, {m_len} moments")
            except Exception as e:
                print(f"Error parsing {v}:", e)
        else:
            print(f"Error running for {v}:", p.stderr)

os.makedirs('data', exist_ok=True)
with open('data/precomputed_scans.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)
print('Saved precomputed scans to data/precomputed_scans.json')
