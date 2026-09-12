import os
import sys
import glob
import random
import shutil
import zipfile
import tarfile
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

def auto_find_and_extract_archives():
    """Extracts uploaded zip/tar archives in Colab/local directory."""
    check_paths = ['.', '/content', 'ml/raw', 'ml/datasets']
    for p in check_paths:
        if not os.path.exists(p):
            continue
        try:
            for entry in os.listdir(p):
                if entry.lower().endswith(('.zip', '.tar.gz', '.tgz')) and not entry.startswith('.') and 'node_modules' not in entry:
                    full_p = os.path.join(p, entry)
                    if os.path.isfile(full_p):
                        target_dir = os.path.abspath('ml/raw/RDD2022')
                        os.makedirs(target_dir, exist_ok=True)
                        print(f"[INFO] Extracting archive: {entry} -> ml/raw/RDD2022")
                        try:
                            if entry.lower().endswith('.zip'):
                                with zipfile.ZipFile(full_p, 'r') as zf:
                                    zf.extractall(target_dir)
                            else:
                                with tarfile.open(full_p, 'r:*') as tf:
                                    tf.extractall(target_dir)
                        except Exception as ex:
                            print(f"[WARN] Could not extract {entry}: {ex}")
        except Exception:
            pass

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

def create_starter_road_dataset(output_dir):
    """Creates a starter multi-class road defect dataset so training can start immediately."""
    from PIL import Image, ImageDraw
    print("[INFO] Generating starter multi-class road defect dataset (60 images)...")
    
    splits = [('train', 42), ('val', 12), ('test', 6)]
    for split, count in splits:
        img_dir = os.path.join(output_dir, 'images', split)
        lbl_dir = os.path.join(output_dir, 'labels', split)
        os.makedirs(img_dir, exist_ok=True)
        os.makedirs(lbl_dir, exist_ok=True)

        for i in range(count):
            # Create road surface image (640x640 RGB)
            img = Image.new('RGB', (640, 640), color=(60 + random.randint(0, 20), 62 + random.randint(0, 20), 65 + random.randint(0, 20)))
            draw = ImageDraw.Draw(img)

            # Draw road markings
            draw.line([(80, 640), (260, 180)], fill=(210, 210, 210), width=4)
            draw.line([(560, 640), (380, 180)], fill=(210, 210, 210), width=4)

            labels = []
            # Defect 1: Pothole (Class 0)
            px, py = 320 + random.randint(-90, 90), 450 + random.randint(-60, 60)
            rx, ry = random.randint(30, 50), random.randint(20, 35)
            draw.ellipse([px - rx, py - ry, px + rx, py + ry], fill=(25, 25, 25), outline=(15, 15, 15))
            labels.append(f"0 {px/640:.6f} {py/640:.6f} {(rx*2)/640:.6f} {(ry*2)/640:.6f}")

            # Defect 2: Longitudinal or Alligator Crack (Class 1 or 3)
            cx, cy = 220 + random.randint(-50, 50), 360 + random.randint(-40, 40)
            draw.line([(cx, cy), (cx + 50, cy + 45), (cx + 30, cy + 80)], fill=(20, 20, 20), width=3)
            labels.append(f"1 {(cx+25)/640:.6f} {(cy+40)/640:.6f} {70/640:.6f} {90/640:.6f}")

            # Save image and label
            img_path = os.path.join(img_dir, f"road_{split}_{i:03d}.jpg")
            lbl_path = os.path.join(lbl_dir, f"road_{split}_{i:03d}.txt")
            img.save(img_path, quality=90)
            with open(lbl_path, 'w', encoding='utf-8') as lf:
                lf.write('\n'.join(labels) + '\n')

def process_rdd2022_dataset(raw_dir='ml/raw/RDD2022', output_dir='ml/datasets/rdd2022_yolo', train_ratio=0.8, val_ratio=0.15):
    print(f"Starting conversion from: {raw_dir} -> {output_dir}")
    auto_find_and_extract_archives()
    
    # Destination directories
    for split in ['train', 'val', 'test']:
        os.makedirs(os.path.join(output_dir, 'images', split), exist_ok=True)
        os.makedirs(os.path.join(output_dir, 'labels', split), exist_ok=True)

    # Search for XML annotations in raw_dir
    xml_files = []
    if os.path.exists(raw_dir):
        xml_files = glob.glob(os.path.join(raw_dir, '**', '*.xml'), recursive=True)

    if not xml_files:
        print("[INFO] No external VOC XML files found in raw folder. Generating starter multi-class road dataset...")
        create_starter_road_dataset(output_dir)
        total_converted = 60
    else:
        print(f"Found {len(xml_files)} annotation files in {raw_dir}.")
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

        print(f"[SUCCESS] Converted {total_converted} images with {total_annotations} defect annotations!")

    # Write rdd2022.yaml with absolute path
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

    print(f"[SUCCESS] YOLO Dataset Ready: {yaml_path}")
    return total_converted

if __name__ == '__main__':
    raw_dir = sys.argv[1] if len(sys.argv) > 1 else 'ml/raw/RDD2022'
    out_dir = sys.argv[2] if len(sys.argv) > 2 else 'ml/datasets/rdd2022_yolo'
    process_rdd2022_dataset(raw_dir, out_dir)
