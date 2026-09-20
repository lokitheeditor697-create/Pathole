"""
AI Model Weight Verification & Auto-Downloader
Ensures all YOLOv8 model weights in the detector directory are genuine binary weights.

Sources:
  - GitHub LFS media (for models committed via git lfs): roadguard, pothole, rdd2022, best
  - HuggingFace Hub (for large/new models not in git LFS): multitask_road_ai, potbot
  - Direct URL fallback

On localhost where full weights (>50MB) are already present, verification is instant.
"""

import os
import sys
import urllib.request

# Models stored in GitHub LFS (committed to repo via Git LFS)
GITHUB_LFS_MODELS = [
    "multitask_road_ai.pt",
    "roadguard_yolov8.pt",
    "pothole_yolov8.pt",
    "rdd2022_multiclass.pt",
    "best.pt",
]

# Models optionally downloaded from HuggingFace Hub (e.g. potbot)
HF_REPO = os.environ.get("HF_MODEL_REPO", "Logesshhh/road-anomaly-pothole-yolov8m")
HF_TOKEN = os.environ.get("HUGGINGFACE_TOKEN", None)  # Optional – for private repos

HF_MODELS = [
    "potbot_yolov8m.pt",
]

REPO_MEDIA_BASE = "https://media.githubusercontent.com/media/lokitheeditor697-create/Pathole/main/detector"
MIN_WEIGHT_SIZE = 1024  # bytes — LFS pointer files are ~130 bytes, real weights are >50MB


def is_genuine(path: str) -> bool:
    """Return True if the file exists and is larger than MIN_WEIGHT_SIZE (not a LFS pointer)."""
    return os.path.exists(path) and os.path.getsize(path) > MIN_WEIGHT_SIZE


def download_from_url(url: str, dest: str, label: str) -> bool:
    """Download a file from a direct URL. Returns True on success."""
    print(f"[Weights] Downloading {label} from {url} ...")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "RoadGuard-Deployment/2.0"})
        with urllib.request.urlopen(req, timeout=300) as response, open(dest, "wb") as out:
            chunk_size = 1024 * 1024  # 1 MB chunks
            downloaded = 0
            while True:
                chunk = response.read(chunk_size)
                if not chunk:
                    break
                out.write(chunk)
                downloaded += len(chunk)
        final_size = os.path.getsize(dest)
        if final_size < MIN_WEIGHT_SIZE:
            print(f"[Weights] WARNING: Downloaded file is only {final_size} bytes — may be a pointer or error page.", file=sys.stderr)
            return False
        print(f"[Weights] OK: {label} ({final_size / 1024 / 1024:.1f} MB)")
        return True
    except Exception as e:
        print(f"[Weights] FAILED to download {label}: {e}", file=sys.stderr)
        return False


def download_from_hf(filename: str, dest: str) -> bool:
    """Download a model from HuggingFace Hub using huggingface_hub."""
    try:
        from huggingface_hub import hf_hub_download
        print(f"[Weights] Downloading {filename} from HuggingFace Hub ({HF_REPO}) ...")
        local_path = hf_hub_download(
            repo_id=HF_REPO,
            filename=filename,
            token=HF_TOKEN,
            local_dir=os.path.dirname(dest),
            local_dir_use_symlinks=False,
        )
        # hf_hub_download may write to a cache subfolder — copy to our target path
        if local_path != dest and os.path.exists(local_path):
            import shutil
            shutil.copy2(local_path, dest)
        if is_genuine(dest):
            size_mb = os.path.getsize(dest) / 1024 / 1024
            print(f"[Weights] OK: {filename} from HuggingFace Hub ({size_mb:.1f} MB)")
            return True
        else:
            print(f"[Weights] HuggingFace download produced invalid file for {filename}", file=sys.stderr)
            return False
    except Exception as e:
        print(f"[Weights] HuggingFace Hub download failed for {filename}: {e}", file=sys.stderr)
        return False


def ensure_model_weights(target_dir=None):
    if target_dir is None:
        target_dir = os.path.dirname(os.path.abspath(__file__))

    os.makedirs(target_dir, exist_ok=True)
    all_ok = True

    # ── GitHub LFS models ────────────────────────────────────────────────────
    for model_name in GITHUB_LFS_MODELS:
        file_path = os.path.join(target_dir, model_name)
        if is_genuine(file_path):
            size_mb = os.path.getsize(file_path) / 1024 / 1024
            print(f"[Weights] Verified (local): {model_name} ({size_mb:.1f} MB)")
            continue

        # Try GitHub LFS media URL
        url = f"{REPO_MEDIA_BASE}/{model_name}"
        ok = download_from_url(url, file_path, model_name)
        if not ok:
            print(f"[Weights] WARNING: Could not obtain {model_name}. Inference may fall back to next available model.", file=sys.stderr)
            all_ok = False

    # ── HuggingFace Hub models ───────────────────────────────────────────────
    for model_name in HF_MODELS:
        file_path = os.path.join(target_dir, model_name)
        if is_genuine(file_path):
            size_mb = os.path.getsize(file_path) / 1024 / 1024
            print(f"[Weights] Verified (local): {model_name} ({size_mb:.1f} MB)")
            continue

        # Try HuggingFace Hub first
        ok = download_from_hf(model_name, file_path)
        if not ok:
            # Fallback: try GitHub LFS URL as well
            url = f"{REPO_MEDIA_BASE}/{model_name}"
            ok = download_from_url(url, file_path, model_name)
        if not ok:
            if model_name == "multitask_road_ai.pt":
                print(
                    f"[Weights] CRITICAL: multitask_road_ai.pt could not be downloaded. "
                    f"Upload it to HuggingFace Hub repo '{HF_REPO}' and set HF_MODEL_REPO env var. "
                    f"Inference will fall back to pothole_yolov8.pt.",
                    file=sys.stderr
                )
            else:
                print(f"[Weights] WARNING: {model_name} unavailable — not critical for core operation.", file=sys.stderr)
            all_ok = False

    return all_ok


if __name__ == "__main__":
    success = ensure_model_weights()
    # Always exit 0 so Docker build continues even if optional models fail
    # (potbot is optional; multitask will fall back to pothole model at runtime)
    sys.exit(0)
