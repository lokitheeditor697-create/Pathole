"""
Multi-Task Road AI: Automated Dataset Merging & Remapping Utility
Harmonizes Potholes (RDD2022/Roboflow), Zebra Crosswalks, and Urban Traffic (IDD/COCO).
Standardizes labels into unified 7-class YOLOv8 format.
"""

import os
import sys

# Ensure UTF-8 output encoding for Windows shells
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import shutil
import random
import glob
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path

# Unified Target Taxonomy
CLASS_MAP = {
    "Pothole": 0,
    "Crack-Severe": 1,
    "Zebra-Crossing": 2,
    "Heavy-Vehicle": 3,
    "Light-Vehicle": 4,
    "Two-Wheeler": 5,
    "Pedestrian": 6
}

# Source Remapping Dictionaries
RDD_CLASS_REMAP = {
    "d40": 0,              # Pothole
    "pothole": 0,
    "d00": 1,              # Longitudinal crack
    "d01": 1,              # Transverse crack
    "d20": 1,              # Alligator crack
    "crack": 1,
    "severe_crack": 1
}

CROSSWALK_REMAP = {
    "crosswalk": 2,
    "zebra_crossing": 2,
    "zebra": 2,
    "pedestrian_crossing": 2
}

TRAFFIC_REMAP = {
    "bus": 3,
    "truck": 3,
    "heavy_vehicle": 3,
    "car": 4,
    "van": 4,
    "suv": 4,
    "light_vehicle": 4,
    "motorcycle": 5,
    "motorbike": 5,
    "scooter": 5,
    "bicycle": 5,
    "auto_rickshaw": 5,
    "autorickshaw": 5,
    "person": 6,
    "pedestrian": 6
}


def convert_voc_xml_to_yolo(xml_file, output_txt_file, class_remap):
    """Parses a Pascal VOC XML annotation file and outputs YOLO format lines."""
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
        size = root.find("size")
        if size is None:
            return 0
        img_w = float(size.find("width").text)
        img_h = float(size.find("height").text)
        if img_w <= 0 or img_h <= 0:
            return 0

        yolo_lines = []
        for obj in root.findall("object"):
            name = obj.find("name").text.strip().lower()
            if name in class_remap:
                target_cls = class_remap[name]
                bndbox = obj.find("bndbox")
                xmin = float(bndbox.find("xmin").text)
                ymin = float(bndbox.find("ymin").text)
                xmax = float(bndbox.find("xmax").text)
                ymax = float(bndbox.find("ymax").text)

                x_center = ((xmin + xmax) / 2.0) / img_w
                y_center = ((ymin + ymax) / 2.0) / img_h
                w = (xmax - xmin) / img_w
                h = (ymax - ymin) / img_h

                x_center = max(0.0, min(1.0, x_center))
                y_center = max(0.0, min(1.0, y_center))
                w = max(0.0, min(1.0, w))
                h = max(0.0, min(1.0, h))

                yolo_lines.append(f"{target_cls} {x_center:.6f} {y_center:.6f} {w:.6f} {h:.6f}\n")

        if yolo_lines:
            os.makedirs(os.path.dirname(output_txt_file), exist_ok=True)
            with open(output_txt_file, "w", encoding="utf-8") as f:
                f.writelines(yolo_lines)
            return len(yolo_lines)
        return 0
    except Exception as e:
        print(f"  [Notice] Skipping XML {xml_file}: {e}")
        return 0


def prepare_dataset_splits(base_output_dir):
    """Creates directory skeleton for train/val/test splits."""
    for split in ["train", "val", "test"]:
        os.makedirs(os.path.join(base_output_dir, "images", split), exist_ok=True)
        os.makedirs(os.path.join(base_output_dir, "labels", split), exist_ok=True)
    print(f"[OK] Initialized dataset partitions at: {base_output_dir}")


def populate_starter_samples(base_output_dir):
    """Generates starter baseline samples so the training pipeline can immediately be tested."""
    splits = {
        "train": [
            ("sample_pothole_01.jpg", "0 0.521 0.742 0.185 0.112\n"),
            ("sample_crack_01.jpg", "1 0.482 0.621 0.320 0.145\n"),
            ("sample_crosswalk_01.jpg", "2 0.500 0.680 0.650 0.220\n"),
            ("sample_bus_01.jpg", "3 0.750 0.450 0.280 0.350\n"),
            ("sample_car_01.jpg", "4 0.220 0.520 0.210 0.240\n"),
            ("sample_twowheeler_01.jpg", "5 0.430 0.510 0.090 0.180\n"),
            ("sample_pedestrian_01.jpg", "6 0.880 0.480 0.080 0.260\n"),
        ],
        "val": [
            ("sample_pothole_val.jpg", "0 0.510 0.730 0.170 0.105\n"),
            ("sample_crosswalk_val.jpg", "2 0.500 0.690 0.640 0.210\n"),
            ("sample_traffic_val.jpg", "4 0.230 0.510 0.200 0.230\n"),
        ],
        "test": [
            ("sample_multi_test.jpg", "0 0.520 0.740 0.180 0.110\n2 0.500 0.680 0.650 0.220\n3 0.750 0.450 0.280 0.350\n6 0.880 0.480 0.080 0.260\n")
        ]
    }

    try:
        import cv2
        import numpy as np
        has_cv2 = True
    except ImportError:
        has_cv2 = False

    created_samples = 0
    for split, items in splits.items():
        img_dir = os.path.join(base_output_dir, "images", split)
        lbl_dir = os.path.join(base_output_dir, "labels", split)
        for img_name, label_content in items:
            img_path = os.path.join(img_dir, img_name)
            txt_path = os.path.join(lbl_dir, os.path.splitext(img_name)[0] + ".txt")
            if not os.path.exists(txt_path):
                with open(txt_path, "w", encoding="utf-8") as f:
                    f.write(label_content)
            if not os.path.exists(img_path):
                if has_cv2:
                    dummy = np.full((640, 640, 3), 40, dtype=np.uint8)
                    cv2.line(dummy, (0, 480), (640, 480), (80, 80, 80), 2)
                    cv2.imwrite(img_path, dummy)
                else:
                    with open(img_path, "wb") as f:
                        f.write(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9")
            created_samples += 1

    return created_samples


def print_dataset_stats(base_output_dir):
    """Scans and reports image and label counts across partitions."""
    print("\nDataset Distribution Statistics:")
    print("-" * 55)
    total_imgs = 0
    total_labels = 0
    for split in ["train", "val", "test"]:
        img_count = len(glob.glob(os.path.join(base_output_dir, "images", split, "*.*")))
        lbl_count = len(glob.glob(os.path.join(base_output_dir, "labels", split, "*.txt")))
        total_imgs += img_count
        total_labels += lbl_count
        print(f"  * {split.upper():5s} Partition: {img_count:6d} Images | {lbl_count:6d} Label Files")
    print("-" * 55)
    print(f"  Total Images: {total_imgs} | Total Annotations: {total_labels}\n")


def main():
    parser = argparse.ArgumentParser(description="Multi-Task Road & Traffic AI Dataset Merger")
    parser.add_argument("--output", default="ml/dataset/multitask_data", help="Output directory for unified YOLO dataset")
    parser.add_argument("--rdd_dir", default=None, help="Directory containing raw RDD2022 dataset")
    parser.add_argument("--crosswalk_dir", default=None, help="Directory containing Roboflow crosswalk dataset")
    parser.add_argument("--traffic_dir", default=None, help="Directory containing IDD/traffic dataset")
    parser.add_argument("--train_ratio", type=float, default=0.80, help="Train split ratio (default: 0.80)")
    parser.add_argument("--val_ratio", type=float, default=0.15, help="Val split ratio (default: 0.15)")
    args = parser.parse_args()

    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    out_dir = os.path.abspath(args.output if os.path.isabs(args.output) else os.path.join(project_root, args.output))

    print("=" * 65)
    print("  MULTI-TASK ROAD AI: DATASET HARMONIZATION UTILITY")
    print("=" * 65)
    print(f"Output Target:  {out_dir}")
    print("Unified Target Taxonomy (7 Classes):")
    for name, idx in CLASS_MAP.items():
        print(f"  [{idx}] {name}")
    print("=" * 65)

    prepare_dataset_splits(out_dir)

    # Process raw datasets if provided
    for src_dir, remap, label in [
        (args.rdd_dir, RDD_CLASS_REMAP, "RDD2022 Potholes & Cracks"),
        (args.crosswalk_dir, CROSSWALK_REMAP, "Roboflow Zebra Crossings"),
        (args.traffic_dir, TRAFFIC_REMAP, "IDD / Traffic & Pedestrians")
    ]:
        if src_dir and os.path.exists(src_dir):
            print(f"[Processing {label}]: {src_dir}...")
            xml_files = glob.glob(os.path.join(src_dir, "**", "*.xml"), recursive=True)
            for xf in xml_files:
                base_name = os.path.splitext(os.path.basename(xf))[0]
                rnd = random.random()
                partition = "train" if rnd < args.train_ratio else ("val" if rnd < (args.train_ratio + args.val_ratio) else "test")
                out_txt = os.path.join(out_dir, "labels", partition, f"{base_name}.txt")
                if convert_voc_xml_to_yolo(xf, out_txt, remap) > 0:
                    for ext in [".jpg", ".png", ".jpeg"]:
                        candidate = os.path.join(os.path.dirname(xf), base_name + ext)
                        if not os.path.exists(candidate):
                            candidate = os.path.join(os.path.dirname(xf), "..", "images", base_name + ext)
                        if os.path.exists(candidate):
                            shutil.copy(candidate, os.path.join(out_dir, "images", partition, base_name + ext))
                            break

    # Seed starter samples if empty
    train_lbl_count = len(glob.glob(os.path.join(out_dir, "labels", "train", "*.txt")))
    if train_lbl_count == 0:
        print("[Info] Initializing starter multi-task dataset partitions...")
        samples = populate_starter_samples(out_dir)
        print(f"[OK] Seeded {samples} multi-task verification samples across train/val/test splits.")

    print_dataset_stats(out_dir)
    print("=" * 65)
    print("Dataset preparation complete!")
    print(f"You can now train Option B using:")
    print(f"  python ml/training/train_multitask.py --data ml/dataset/multitask_road_ai.yaml")
    print("=" * 65)


if __name__ == "__main__":
    main()
