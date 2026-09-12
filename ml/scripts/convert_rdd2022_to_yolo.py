import os
import sys
import glob
import random
import shutil
import zipfile
import tarfile
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

CLASS_MAPPING = {
    'D40': 0,  # pothole
    'D00': 1,  # longitudinal_crack
    'D10': 1,  # longitudinal_crack (joint)
    'D01': 2,  # transverse_crack
    'D20': 3,  # alligator_crack
    'D44': 4,  # road_patch
    'D43': None # crosswalk blur
}

CLASS_NAMES = [
    'pothole',
    'longitudinal_crack',
    'transverse_crack',
    'alligator_crack',
    'road_patch',
    'rutting',
    'waterlogging'
]

def auto_find_and_extract_archives():
    """Finds any RDD or dataset zip/tar files in /content or project dir and unpacks them."""
    search_dirs = [
        '.',
        '..',
        '/content',
        '/content/Pathole',
        'ml/raw',
        'ml/datasets'
    ]
    for d in search_dirs:
        if not os.path.exists(d):
            continue
        for z in glob.glob(os.path.join(d, '*.zip')) + glob.glob(os.path.join(d, '*.tar.gz')) + glob.glob(os.path.join(d, '*.tgz')):
            if 'sample_data' in z or 'node_modules' in z:
                continue
            print(f"[INFO] Found archive {z}. Extracting into ml/raw/RDD2022...")
            target_raw = os.path.abspath('ml/raw/RDD2022')
            os.makedirs(target_raw, exist_ok=True)
            try:
                if z.endswith('.zip'):
                    with zipfile.ZipFile(z, 'r') as zip_ref:
                        zip_ref.extractall(target_raw)
                else:
                    with tarfile.open(z, 'r:*') as tar_ref:
                        tar_ref.extractall(target_raw)
                print(f"[SUCCESS] Extracted {z}")
            except Exception as e:
                print(f"[WARN] Failed extracting {z}: {e}")

def convert_voc_xml_to_yolo(xml_path, img_width, img_height):
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
    except Exception:
        return []
    
    size = root.find('size')
    if size is not None:
        w_node = size.find('width')
        h_node = size.find('height')
        if w_node is not None and int(w_node.text) > 0:
            img_width = int(w_node.text)
        if h_node is not None and int(h_node.text) > 0:
            img_height = int(h_node.text)

    yolo_lines = []
    for obj in root.findall('object'):
        name = obj.find('name')
        if name is None:
            continue
        label = name.text.strip()
        if label not in CLASS_MAPPING or CLASS_MAPPING[label] is None:
            continue
        
        class_id = CLASS_MAPPING[label]
        bndbox = obj.find('bndbox')
        if bndbox is None:
            continue
            
        try:
            xmin = float(bndbox.find('xmin').text)
            ymin = float(bndbox.find('ymin').text)
            xmax = float(bndbox.find('xmax').text)
            ymax = float(bndbox.find('ymax').text)
        except (AttributeError, ValueError):
            continue

        xmin = max(0.0, min(xmin, float(img_width)))
        xmax = max(0.0, min(xmax, float(img_width)))
        ymin = max(0.0, min(ymin, float(img_height)))
        ymax = max(0.0, min(ymax, float(img_height)))

        if xmax <= xmin or ymax <= ymin:
            continue

        x_center = ((xmin + xmax) / 2.0) / img_width
        y_center = ((ymin + ymax) / 2.0) / img_height
        box_w = (xmax - xmin) / img_width
        box_h = (ymax - ymin) / img_height

        yolo_lines.append(f"{class_id} {x_center:.6f} {y_center:.6f} {box_w:.6f} {box_h:.6f}")
        
    return yolo_lines

def create_synthetic_road_dataset(output_dir):
    """Creates a starter dataset if no external dataset is uploaded yet."""
    import cv2
    import numpy as np
    
    print("[INFO] Creating starter multi-class road defect dataset (50 samples)...")
    for split, count in [('train', 35), ('val', 10), ('test', 5)]:
        img_dir = os.path.join(output_dir, 'images', split)
        lbl_dir = os.path.join(output_dir, 'labels', split)
        os.makedirs(img_dir, exist_ok=True)
        os.makedirs(lbl_dir, exist_ok=True)

        for i in range(count):
            # Generate asphalt background
            img = np.random.randint(50, 90, (640, 640, 3), dtype=np.uint8)
            # Add road lane lines
            cv2.line(img, (100, 640), (280, 200), (200, 200, 200), 4)
            cv2.line(img, (540, 640), (360, 200), (200, 200, 200), 4)

            labels = []
            # Draw synthetic pothole (class 0)
            px, py, prx, pry = 320 + random.randint(-80, 80), 450 + random.randint(-50, 50), random.randint(25, 45), random.randint(15, 30)
            cv2.ellipse(img, (px, py), (prx, pry), 0, 0, 360, (20, 20, 20), -1)
            cv2.ellipse(img, (px, py), (prx, pry), 0, 0, 360, (40, 35, 35), 2)
            labels.append(f"0 {px/640:.6f} {py/640:.6f} {(prx*2)/640:.6f} {(pry*2)/640:.6f}")

            # Draw crack (class 1 or 2)
            cx, cy = 200 + random.randint(0, 100), 380 + random.randint(0, 80)
            cv2.line(img, (cx, cy), (cx + 60, cy + 40), (15, 15, 15), 2)
            labels.append(f"1 {(cx+30)/640:.6f} {(cy+20)/640:.6f} {70/640:.6f} {50/640:.6f}")

            # Save
            img_name = f"starter_road_{split}_{i:03d}.jpg"
            cv2.imwrite(os.path.join(img_dir, img_name), img)
            with open(os.path.join(lbl_dir, f"starter_road_{split}_{i:03d}.txt"), 'w') as lf:
                lf.write('\n'.join(labels) + '\n')

def process_rdd2022_dataset(raw_dir='ml/raw/RDD2022', output_dir='ml/datasets/rdd2022_yolo', train_ratio=0.8, val_ratio=0.15):
    print(f"Starting conversion from: {raw_dir} -> {output_dir}")
    auto_find_and_extract_archives()
    
    # Destination directories
    for split in ['train', 'val', 'test']:
        os.makedirs(os.path.join(output_dir, 'images', split), exist_ok=True)
        os.makedirs(os.path.join(output_dir, 'labels', split), exist_ok=True)

    # Search for XML annotations in all raw subdirectories or entire workspace
    xml_files = glob.glob(os.path.join(raw_dir, '**', '*.xml'), recursive=True)
    if not xml_files:
        # Search parent or /content as fallback
        xml_files = glob.glob('/content/**/*.xml', recursive=True) + glob.glob('**/*.xml', recursive=True)
        xml_files = [x for x in xml_files if 'node_modules' not in x and '.git' not in x]

    if not xml_files:
        print("[INFO] No external VOC XML files detected. Generating initial multi-class road dataset for seamless pipeline training...")
        create_synthetic_road_dataset(output_dir)
        total_converted = 50
    else:
        print(f"Found {len(xml_files)} annotation files.")
        random.seed(42)
        random.shuffle(xml_files)

        total_converted = 0
        total_annotations = 0

        for xml_file in xml_files:
            xml_dir = os.path.dirname(xml_file)
            base_name = os.path.splitext(os.path.basename(xml_file))[0]
            
            possible_img_dirs = [
                os.path.join(os.path.dirname(os.path.dirname(xml_dir)), 'images'),
                os.path.join(os.path.dirname(xml_dir), 'images'),
                os.path.join(raw_dir, 'images'),
                xml_dir
            ]
            
            img_path = None
            for p in possible_img_dirs:
                for ext in ['.jpg', '.png', '.jpeg', '.JPG']:
                    candidate = os.path.join(p, base_name + ext)
                    if os.path.exists(candidate):
                        img_path = candidate
                        break
                if img_path:
                    break

            if not img_path:
                continue

            default_w, default_h = 1280, 720
            yolo_lines = convert_voc_xml_to_yolo(xml_file, default_w, default_h)
            
            rand = random.random()
            if rand < train_ratio:
                split = 'train'
            elif rand < (train_ratio + val_ratio):
                split = 'val'
            else:
                split = 'test'

            dst_img = os.path.join(output_dir, 'images', split, os.path.basename(img_path))
            shutil.copy2(img_path, dst_img)

            dst_label = os.path.join(output_dir, 'labels', split, base_name + '.txt')
            with open(dst_label, 'w', encoding='utf-8') as f:
                if yolo_lines:
                    f.write('\n'.join(yolo_lines) + '\n')

            total_converted += 1
            total_annotations += len(yolo_lines)

        print(f"[SUCCESS] Converted {total_converted} images with {total_annotations} defect bounding boxes!")

    # Always generate valid data.yaml with absolute paths
    abs_out = os.path.abspath(output_dir).replace(chr(92), '/')
    yaml_content = f"""# YOLOv8 Dataset Spec for RDD2022 Road Defect Training
path: {abs_out}
train: images/train
val: images/val
test: images/test

names:
  0: pothole
  1: longitudinal_crack
  2: transverse_crack
  3: alligator_crack
  4: road_patch
  5: rutting
  6: waterlogging
"""
    yaml_path = os.path.join(output_dir, 'rdd2022.yaml')
    with open(yaml_path, 'w', encoding='utf-8') as f:
        f.write(yaml_content)

    print(f"YOLO Dataset Config Ready: {yaml_path}")
    return total_converted

if __name__ == '__main__':
    raw_dir = sys.argv[1] if len(sys.argv) > 1 else 'ml/raw/RDD2022'
    out_dir = sys.argv[2] if len(sys.argv) > 2 else 'ml/datasets/rdd2022_yolo'
    process_rdd2022_dataset(raw_dir, out_dir)
