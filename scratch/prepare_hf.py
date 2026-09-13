import os
import shutil

os.makedirs('deploy_hf', exist_ok=True)
for item in ['assets', 'favicon.svg', 'icons.svg', 'videos']:
    src = os.path.join('dist', item)
    dst = os.path.join('deploy_hf', item)
    if os.path.isdir(src):
        if os.path.exists(dst):
            shutil.rmtree(dst)
        shutil.copytree(src, dst)
    elif os.path.isfile(src):
        shutil.copy2(src, dst)

with open('dist/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('href="/favicon', 'href="./favicon')
html = html.replace('src="/assets', 'src="./assets')
html = html.replace('href="/assets', 'href="./assets')

with open('deploy_hf/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

readme = """---
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

with open('deploy_hf/README.md', 'w', encoding='utf-8') as f:
    f.write(readme)

print("Successfully prepared deploy_hf directory:", os.listdir('deploy_hf'))
