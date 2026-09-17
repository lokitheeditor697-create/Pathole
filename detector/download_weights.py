"""
AI Model Weight Verification & Auto-Downloader
Ensures all YOLOv8 model weights in the detector directory are genuine binary weights.
When Git LFS pointer files (~130 bytes) are present (e.g. during standard Docker / Git clone on Render),
this script automatically pulls the full 52MB+ weights from GitHub Media storage.
On localhost, where full weights (>50MB) are already present, this verifies instantly without re-downloading.
"""

import os
import sys
import urllib.request

MODELS = [
    "roadguard_yolov8.pt",
    "pothole_yolov8.pt",
    "rdd2022_multiclass.pt",
    "best.pt",
]

REPO_MEDIA_BASE = "https://media.githubusercontent.com/media/lokitheeditor697-create/Pathole/main/detector"

def ensure_model_weights(target_dir=None):
    if target_dir is None:
        target_dir = os.path.dirname(os.path.abspath(__file__))

    os.makedirs(target_dir, exist_ok=True)
    all_ok = True

    for model_name in MODELS:
        file_path = os.path.join(target_dir, model_name)
        needs_download = False

        if not os.path.exists(file_path):
            needs_download = True
        else:
            size = os.path.getsize(file_path)
            # Git LFS pointer files are ~130 bytes; genuine weights are > 50MB
            if size < 1024:
                needs_download = True

        if needs_download:
            url = f"{REPO_MEDIA_BASE}/{model_name}"
            print(f"[Model Weights] Downloading genuine binary checkpoint for {model_name} from GitHub LFS media...")
            try:
                # Use a custom user-agent in case CDN requires it
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "RoadGuard-Deployment/1.0"}
                )
                with urllib.request.urlopen(req) as response, open(file_path, "wb") as out_file:
                    chunk_size = 1024 * 1024  # 1MB chunks
                    while True:
                        chunk = response.read(chunk_size)
                        if not chunk:
                            break
                        out_file.write(chunk)
                print(f"[Model Weights] Successfully installed {model_name} ({os.path.getsize(file_path):,} bytes).")
            except Exception as e:
                print(f"[Model Weights] Failed to download {model_name}: {e}", file=sys.stderr)
                all_ok = False
        else:
            size_mb = os.path.getsize(file_path) / (1024 * 1024)
            print(f"[Model Weights] Genuine checkpoint verified: {model_name} ({size_mb:.1f} MB)")

    return all_ok

if __name__ == "__main__":
    success = ensure_model_weights()
    sys.exit(0 if success else 1)
