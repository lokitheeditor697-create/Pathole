import os
import sys
import glob
import random
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path

CLASS_MAPPING = {
    'D40': 0,  # pothole
    'D00': 1,  # longitudinal_crack
    'D10': 1,  # longitudinal_crack (joint)
    'D01': 2,  # transverse_crack
    'D20': 3,  # alligator_crack
    'D44': 4,  # road_patch
    'D43': None # Crosswalk blur (ignore or optional)
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

def convert_voc_xml_to_yolo(xml_path, img_width, img_height):
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
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
            
        xmin = float(bndbox.find('xmin').text)
        ymin = float(bndbox.find('ymin').text)
        xmax = float(bndbox.find('xmax').text)
        ymax = float(bndbox.find('ymax').text)

        # Clamp values
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

        yolo_lines.append(f\"{class_id} {x_center:.6f} {y_center:.6f} {box_w:.6f} {box_h:.6f}\")
        
    return yolo_lines

def process_rdd2022_dataset(raw_dir, output_dir, train_ratio=0.8, val_ratio=0.15):
    print(f'Starting conversion from: {raw_dir} -> {output_dir}')
    
    # Destination directories
    for split in ['train', 'val', 'test']:
        os.makedirs(os.path.join(output_dir, 'images', split), exist_ok=True)
        os.makedirs(os.path.join(output_dir, 'labels', split), exist_ok=True)

    # Search for XML annotations in all subdirectories (e.g., India/annotations/xmls/*.xml)
    xml_files = glob.glob(os.path.join(raw_dir, '**', '*.xml'), recursive=True)
    if not xml_files:
        print(f'[WARN] No XML files found in {raw_dir}. Please ensure RDD2022 is extracted there.')
        return 0

    print(f'Found {len(xml_files)} annotation files in RDD2022 dataset.')
    random.seed(42)
    random.shuffle(xml_files)

    total_converted = 0
    total_annotations = 0

    for xml_file in xml_files:
        xml_dir = os.path.dirname(xml_file)
        # Standard RDD2022 layout: India/annotations/xmls/India_000001.xml -> India/images/India_000001.jpg
        base_name = os.path.splitext(os.path.basename(xml_file))[0]
        
        # Look for corresponding image
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

        # Default dashcam dimensions if missing from XML
        default_w, default_h = 1280, 720
        yolo_lines = convert_voc_xml_to_yolo(xml_file, default_w, default_h)
        
        # Decide split
        rand = random.random()
        if rand < train_ratio:
            split = 'train'
        elif rand < (train_ratio + val_ratio):
            split = 'val'
        else:
            split = 'test'

        # Copy image
        dst_img = os.path.join(output_dir, 'images', split, os.path.basename(img_path))
        shutil.copy2(img_path, dst_img)

        # Write label text file
        dst_label = os.path.join(output_dir, 'labels', split, base_name + '.txt')
        with open(dst_label, 'w', encoding='utf-8') as f:
            if yolo_lines:
                f.write('\n'.join(yolo_lines) + '\n')

        total_converted += 1
        total_annotations += len(yolo_lines)

    # Generate data.yaml
    yaml_content = f\"\"\"# YOLOv8 Dataset Spec for RDD2022 Road Defect Training
path: {os.path.abspath(output_dir).replace('\\\\', '/')}
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
\"\"\"
    yaml_path = os.path.join(output_dir, 'rdd2022.yaml')
    with open(yaml_path, 'w', encoding='utf-8') as f:
        f.write(yaml_content)

    print(f'\n[SUCCESS] Converted {total_converted} images with {total_annotations} defect bounding boxes!')
    print(f'YOLO Dataset Config: {yaml_path}')
    return total_converted

if __name__ == '__main__':
    raw_dir = sys.argv[1] if len(sys.argv) > 1 else 'ml/raw/RDD2022'
    out_dir = sys.argv[2] if len(sys.argv) > 2 else 'ml/datasets/rdd2022_yolo'
    process_rdd2022_dataset(raw_dir, out_dir)
