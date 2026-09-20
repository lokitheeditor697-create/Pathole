import os
import shutil
import tempfile
from huggingface_hub import HfApi

def deploy():
    api = HfApi()
    user = api.whoami()
    username = user['name']
    repo_id = f"{username}/road-defect-ai"

    print(f"Connecting to Hugging Face Space: {repo_id}...")
    print(f"Authenticated as: {username}")

    staging_dir = tempfile.mkdtemp(prefix="hf_space_staging_")
    print(f"Staging full Docker space bundle in: {staging_dir}")

    space_readme = """---
title: Road Defect AI Intelligence Platform
emoji: 🛣️
colorFrom: blue
colorTo: indigo
sdk: static
app_file: index.html
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

    print(f"\nUploading to Hugging Face Static Space: {repo_id}...")
    commit_info = api.upload_folder(
        folder_path=staging_dir,
        repo_id=repo_id,
        repo_type="space",
        commit_message="feat(deploy): deploy 100% free static space with zero CPU quota consumption",
        delete_patterns=["assets/*", "style.css", "detector/*", "server/*"]
    )
    print(f"Successfully uploaded! Commit: {commit_info}")

    shutil.rmtree(staging_dir, ignore_errors=True)

    runtime = api.get_space_runtime(repo_id)
    print(f"\nSpace Runtime Stage: {runtime.stage}")
    print(f"Live Space URL: https://huggingface.co/spaces/{repo_id}")
    print(f"Direct App URL: https://{username.lower().replace('_', '-')}-road-defect-ai.static.hf.space")

if __name__ == "__main__":
    deploy()

