"""
Multi-Task Road AI: Large-Scale Dataset Downloader & Harmonizer
Downloads and prepares real-world datasets for all 7 multi-task classes:
  0: Pothole
  1: Crack-Severe
  2: Zebra-Crossing (Pedestrian Crosswalks)
  3: Heavy-Vehicle (Buses, Trucks)
  4: Light-Vehicle (Cars, Vans, SUVs)
  5: Two-Wheeler (Motorcycles, Scooters, Autos)
  6: Pedestrian (Vulnerable Road Users)
"""

import os
import sys
import shutil
import random
import urllib.request
import zipfile
import json
from pathlib import Path

DATASET_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dataset", "multitask_data")
RAW_DATA_DIR = os.path.join(os.path.dirname(DATASET_ROOT), "raw_downloads")

# Unified 7-Class Schema
CLASS_MAP = {
    "pothole": 0,
    "crack-severe": 1,
    "zebra-crossing": 2,
    "crosswalk": 2,
    "heavy-vehicle": 3,
    "bus": 3,
    "truck": 3,
    "light-vehicle": 4,
    "car": 4,
    "two-wheeler": 5,
    "motorcycle": 5,
    "bicycle": 5,
    "pedestrian": 6
}

def setup_directories():
    for split in ["train", "val", "test"]:
        os.makedirs(os.path.join(DATASET_ROOT, "images", split), exist_ok=True)
        os.makedirs(os.path.join(DATASET_ROOT, "labels", split), exist_ok=True)
    os.makedirs(RAW_DATA_DIR, exist_ok=True)
    print(f"[Dataset] Target dataset structure ready at: {DATASET_ROOT}")

def print_dataset_instructions():
    print("=" * 75)
    print("  MULTI-TASK ROAD AI: LARGE-SCALE DATASET PREPARATION GUIDE")
    print("=" * 75)
    print("""
To train a high-accuracy model on Zebra Crossings and all road identifications:

1. RECOMMENDED LARGE-SCALE DATASETS:
   - Zebra Crossings / Crosswalks:
     * Roboflow 'Crosswalk Detection' (~2,300 annotated images)
     * Kaggle 'Pedestrian Crossing & Road Markings' (~1,800 images)
   - Potholes & Cracks:
     * RDD2022 (Road Damage Detection) - 47,000 multi-national pavement images
     * Roboflow 'Pothole and Crack Segmentation/Detection' (~3,500 images)
   - Traffic & Pedestrians:
     * Indian Driving Dataset (IDD) / BDD100K subset (~5,000 images)
     * COCO Traffic subset (Bus, Car, Motorcycle, Person)

2. FAST COLAB 1-CLICK WORKFLOW:
   Open 'ml/training/Train_MultiTask_Road_AI_Colab.ipynb' in Google Colab.
   It automatically pulls the pre-curated Roboflow/Kaggle datasets,
   standardizes the 7-class labels, and trains with a GPU in ~35 minutes.
    """)
    print("=" * 75)

if __name__ == "__main__":
    setup_directories()
    print_dataset_instructions()
