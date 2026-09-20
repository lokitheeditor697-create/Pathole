"""
Multi-Task Road AI: Standalone Google Colab End-to-End Training Script
1-Click Automated Training for all 7 Classes (Zebra Crossing, Pothole, Crack, Traffic)
"""

import os, glob, shutil, random, cv2, numpy as np, torch
from ultralytics import YOLO
from ultralytics.utils.downloads import download

print("=" * 65)
print("  MULTI-TASK ROAD AI: HIGH-ACCURACY TRAINING (YOLOv8m)")
print("=" * 65)

DATASET_DIR = '/content/multitask_dataset' if os.path.exists('/content') else os.path.join(os.getcwd(), 'multitask_dataset')
for split in ['train', 'val', 'test']:
    os.makedirs(f'{DATASET_DIR}/images/{split}', exist_ok=True)
    os.makedirs(f'{DATASET_DIR}/labels/{split}', exist_ok=True)

# 1. Write YAML
yaml_path = '/content/multitask_road_ai.yaml' if os.path.exists('/content') else 'multitask_road_ai.yaml'
yaml_content = f"""
path: {DATASET_DIR}
train: images/train
val: images/val
test: images/test
nc: 7
names:
  0: Pothole
  1: Crack-Severe
  2: Zebra-Crossing
  3: Heavy-Vehicle
  4: Light-Vehicle
  5: Two-Wheeler
  6: Pedestrian
"""
with open(yaml_path, 'w') as f:
    f.write(yaml_content.strip())
print(f'[Step 1/4] Config written to {yaml_path}')

# 2. Ingest Datasets
print('[Step 2/4] Building Multi-Task Dataset (1,000+ Images across 7 classes)...')
try:
    download('https://github.com/ultralytics/assets/releases/download/v0.0.0/coco128.zip', dir='/content' if os.path.exists('/content') else '.')
    coco_map = {0: 6, 1: 5, 2: 4, 3: 5, 5: 3, 7: 3}
    coco_imgs = glob.glob('**/coco128/images/train2017/*.*', recursive=True)
    for img_p in coco_imgs:
        base = os.path.splitext(os.path.basename(img_p))[0]
        lbl_p = img_p.replace('images', 'labels').replace(os.path.basename(img_p), f'{base}.txt')
        new_lbls = []
        if os.path.exists(lbl_p):
            with open(lbl_p, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if parts and int(parts[0]) in coco_map:
                        new_lbls.append(f'{coco_map[int(parts[0])]} ' + ' '.join(parts[1:]))
        if new_lbls:
            split = 'train' if random.random() < 0.85 else 'val'
            shutil.copy(img_p, f'{DATASET_DIR}/images/{split}/trf_{base}.jpg')
            with open(f'{DATASET_DIR}/labels/{split}/trf_{base}.txt', 'w') as out_f:
                out_f.write('\n'.join(new_lbls) + '\n')
except Exception as e:
    print('  -> COCO Notice:', e)

# 400 Crosswalks
for i in range(400):
    img = np.full((640, 640, 3), random.randint(35, 110), dtype=np.uint8)
    noise = np.random.randint(-20, 20, (640, 640, 3), dtype=np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    y_start = random.randint(280, 420)
    bar_h = random.randint(30, 80)
    bar_w = random.randint(28, 65)
    gap = random.randint(20, 45)
    start_x = random.randint(30, 110)
    num_bars = random.randint(5, 10)
    min_x = start_x
    max_x = min(620, start_x + num_bars * (bar_w + gap))
    stripe_val = random.randint(200, 255)
    for b in range(num_bars):
        bx = start_x + b * (bar_w + gap)
        if bx + bar_w >= 630: break
        tilt = random.randint(-12, 18)
        pts = np.array([[bx, y_start], [bx + bar_w, y_start], [bx + bar_w + tilt, min(630, y_start + bar_h)], [bx + tilt, min(630, y_start + bar_h)]], np.int32)
        cv2.fillPoly(img, [pts], (stripe_val, stripe_val, stripe_val))
    cx = ((min_x + max_x) / 2.0) / 640.0
    cy = ((y_start + y_start + bar_h) / 2.0) / 640.0
    bw = (max_x - min_x) / 640.0
    bh = bar_h / 640.0
    split = 'train' if i < 340 else 'val'
    cv2.imwrite(f'{DATASET_DIR}/images/{split}/zbr_{i:04d}.jpg', img)
    with open(f'{DATASET_DIR}/labels/{split}/zbr_{i:04d}.txt', 'w') as f:
        f.write(f'2 {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}\n')

# 500 Potholes & Cracks
for i in range(500):
    img = np.full((640, 640, 3), random.randint(45, 100), dtype=np.uint8)
    noise = np.random.randint(-18, 18, (640, 640, 3), dtype=np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    labels = []
    if i % 2 == 0:
        cx_px, cy_px = random.randint(140, 500), random.randint(200, 520)
        rx, ry = random.randint(25, 90), random.randint(18, 70)
        cv2.ellipse(img, (cx_px, cy_px), (rx, ry), random.randint(-25, 25), 0, 360, (20, 20, 20), -1)
        cv2.ellipse(img, (cx_px, cy_px), (rx+5, ry+5), random.randint(-25, 25), 0, 360, (110, 110, 110), 2)
        labels.append(f'0 {cx_px/640.0:.6f} {cy_px/640.0:.6f} {(rx*2.2)/640.0:.6f} {(ry*2.2)/640.0:.6f}')
    else:
        x0, y0 = random.randint(100, 320), random.randint(160, 340)
        pts = [(x0, y0)]
        cur_x, cur_y = x0, y0
        for _ in range(random.randint(5, 12)):
            cur_x += random.randint(-30, 50)
            cur_y += random.randint(20, 50)
            pts.append((cur_x, cur_y))
        pts = np.array(pts, np.int32)
        cv2.polylines(img, [pts], False, (22, 22, 22), random.randint(2, 6))
        bx, by, bw_p, bh_p = cv2.boundingRect(pts)
        labels.append(f'1 {(bx + bw_p/2.0)/640.0:.6f} {(by + bh_p/2.0)/640.0:.6f} {(bw_p+12)/640.0:.6f} {(bh_p+12)/640.0:.6f}')
    split = 'train' if i < 425 else 'val'
    cv2.imwrite(f'{DATASET_DIR}/images/{split}/defect_{i:04d}.jpg', img)
    with open(f'{DATASET_DIR}/labels/{split}/defect_{i:04d}.txt', 'w') as f:
        f.write('\n'.join(labels) + '\n')

train_cnt = len(glob.glob(f'{DATASET_DIR}/images/train/*.*'))
val_cnt = len(glob.glob(f'{DATASET_DIR}/images/val/*.*'))
print(f'✅ DATASET READY: {train_cnt} train images, {val_cnt} val images!')

# 3. Train YOLOv8m
print('[Step 3/4] Launching YOLOv8m Multi-Task Training...')
device = 0 if torch.cuda.is_available() else 'cpu'
model = YOLO('yolov8m.pt')
model.train(
    data=yaml_path,
    epochs=50,
    batch=16,
    imgsz=640,
    device=device,
    project='runs/detect',
    name='multitask_road_ai',
    exist_ok=True,
    optimizer='AdamW',
    lr0=0.001,
    lrf=0.01,
    mosaic=1.0,
    mixup=0.15,
    save=True,
    plots=True
)

# 4. Evaluation & Download
print('[Step 4/4] Evaluating and Downloading Best Model...')
metrics = model.val(data=yaml_path)
print(f'Overall mAP@50: {metrics.box.map50:.4f}, Precision: {metrics.box.mp:.4f}, Recall: {metrics.box.mr:.4f}')

try:
    from google.colab import files
    best_weights = glob.glob('/content/runs/detect/**/weights/best.pt', recursive=True)[0]
    print(f'Downloading {best_weights}...')
    files.download(best_weights)
except Exception as e:
    print('Weights saved locally in runs/detect/multitask_road_ai/weights/best.pt')
