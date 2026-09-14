import os
import shutil
import tempfile
from huggingface_hub import HfApi

def deploy():
    repo_id = "Logesshhh/road-defect-ai"
    api = HfApi()

    print(f"Connecting to Hugging Face Space: {repo_id}...")
    user = api.whoami()
    print(f"Authenticated as: {user['name']}")

    staging_dir = tempfile.mkdtemp(prefix="hf_space_staging_")
    print(f"Staging full Docker space bundle in: {staging_dir}")

    space_readme = """---
title: Road Defect AI Intelligence Platform
emoji: 🛣️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Road Defect & Pothole AI Intelligence Platform
Real-Time AI Pavement Condition Intelligence, GIS 100m Road Segmentation & Automated Distress Analysis powered by PyTorch YOLOv8.
"""
    with open(os.path.join(staging_dir, "README.md"), "w", encoding="utf-8") as f:
        f.write(space_readme)

    gitattributes = """*.pt filter=lfs diff=lfs merge=lfs -text
*.onnx filter=lfs diff=lfs merge=lfs -text
*.mp4 filter=lfs diff=lfs merge=lfs -text
*.webm filter=lfs diff=lfs merge=lfs -text
*.mov filter=lfs diff=lfs merge=lfs -text
"""
    with open(os.path.join(staging_dir, ".gitattributes"), "w", encoding="utf-8") as f:
        f.write(gitattributes)

    # Copy core root files
    root_files = ["Dockerfile", ".dockerignore", "package.json", "package-lock.json", "server.ts", "vite.config.js", "index.html"]
    for rf in root_files:
        src_path = os.path.abspath(rf)
        if os.path.exists(src_path):
            shutil.copy2(src_path, os.path.join(staging_dir, rf))

    # Copy directories
    dirs_to_copy = ["src", "server", "public", "detector", "data"]
    for d in dirs_to_copy:
        src_d = os.path.abspath(d)
        if os.path.exists(src_d):
            dest_d = os.path.join(staging_dir, d)
            shutil.copytree(src_d, dest_d, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "potbot_yolov8m.pt", "*_backup.pt"))

    print("Staged root items:", os.listdir(staging_dir))

    print(f"\nUploading to Hugging Face Docker Space: {repo_id}...")
    commit_info = api.upload_folder(
        folder_path=staging_dir,
        repo_id=repo_id,
        repo_type="space",
        commit_message="feat(deploy): deploy full Node.js + Python YOLOv8 backend on Hugging Face Docker Space",
        delete_patterns=["assets/*", "dist/*", "style.css"]
    )
    print(f"Successfully uploaded! Commit: {commit_info}")

    shutil.rmtree(staging_dir, ignore_errors=True)

    runtime = api.get_space_runtime(repo_id)
    print(f"\nSpace Runtime Stage: {runtime.stage}")
    print(f"Live Space URL: https://huggingface.co/spaces/{repo_id}")
    print(f"Direct App URL: https://logesshhh-road-defect-ai.hf.space")

if __name__ == "__main__":
    deploy()

