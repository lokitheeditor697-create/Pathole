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
    print(f"Staging static space bundle in: {staging_dir}")

    space_readme = """---
title: Road Defect AI Intelligence Platform
emoji: 🛣️
colorFrom: blue
colorTo: indigo
sdk: static
pinned: false
---

# Road Defect & Pothole AI Intelligence Platform
Real-Time AI Pavement Condition Intelligence, GIS 100m Road Segmentation & Automated Distress Analysis.
"""
    with open(os.path.join(staging_dir, "README.md"), "w", encoding="utf-8") as f:
        f.write(space_readme)

    gitattributes = """*.mp4 filter=lfs diff=lfs merge=lfs -text
*.webm filter=lfs diff=lfs merge=lfs -text
*.mov filter=lfs diff=lfs merge=lfs -text
"""
    with open(os.path.join(staging_dir, ".gitattributes"), "w", encoding="utf-8") as f:
        f.write(gitattributes)

    dist_dir = os.path.abspath("dist")
    for item in os.listdir(dist_dir):
        if item.startswith("server.cjs"):
            continue
        s = os.path.join(dist_dir, item)
        d = os.path.join(staging_dir, item)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)

    print("Staged items:", os.listdir(staging_dir))

    print(f"\nUploading to Hugging Face Space: {repo_id}...")
    commit_info = api.upload_folder(
        folder_path=staging_dir,
        repo_id=repo_id,
        repo_type="space",
        commit_message="feat(ui): update executive header, unclip video controls, and add autonomous cases fallback",
        delete_patterns=["assets/*"]
    )
    print(f"Successfully uploaded! Commit: {commit_info}")

    shutil.rmtree(staging_dir, ignore_errors=True)

    runtime = api.get_space_runtime(repo_id)
    print(f"\nSpace Runtime Stage: {runtime.stage}")
    print(f"Live Space URL: https://huggingface.co/spaces/{repo_id}")
    print(f"Direct App URL: https://logesshhh-road-defect-ai.hf.space")

if __name__ == "__main__":
    deploy()
