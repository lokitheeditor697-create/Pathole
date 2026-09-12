"""
Dataset Preparation & Multi-Source Merge Utility for YOLOv8 Road Defect Intelligence.
"""
import os

DATASET_SOURCES = {
    "RDD2022_India": {
        "name": "Road Damage Dataset 2022 (India Subset - 7,706 Images)",
        "url": "https://github.com/sekilab/RoadDamageDetector",
        "kaggle": "https://www.kaggle.com/datasets/sekilab/road-damage-dataset",
        "description": "Captured across Indian municipal roads (New Delhi, Bangalore). Matches Indian asphalt textures and lighting.",
        "covers": ["pothole", "longitudinal_crack", "transverse_crack", "alligator_crack", "road_patch"]
    },
    "Roboflow_Pothole_V8": {
        "name": "Roboflow Universe Pothole & Crack Dataset (YOLOv8 Ready)",
        "url": "https://universe.roboflow.com/search?q=pothole+road+damage",
        "description": "Pre-annotated in YOLO format with 3,000+ dashcam frames.",
        "covers": ["pothole", "alligator_crack", "longitudinal_crack"]
    },
    "Crack500": {
        "name": "CRACK500 High-Resolution Pavement Cracks",
        "url": "https://github.com/fyang91/CrackForest-dataset",
        "description": "500+ extreme close-up and road-level crack images (transverse & longitudinal micro-cracks).",
        "covers": ["longitudinal_crack", "transverse_crack", "alligator_crack"]
    },
    "FloodNet_Waterlogging": {
        "name": "FloodNet Road Waterlogging & Standing Water Dataset",
        "url": "https://github.com/BinaLab/FloodNet-Challenge-EARTHVISION21",
        "description": "High-resolution flooded pavement and waterlogged road surfaces.",
        "covers": ["waterlogging", "rutting"]
    }
}

def print_dataset_summary():
    print("=" * 70)
    print("AI ROAD INTELLIGENCE: AVAILABLE TRAINING DATASETS & SOURCES")
    print("=" * 70)
    for key, data in DATASET_SOURCES.items():
        print(f"\n[+] {data['name']}")
        print(f"    URL: {data['url']}")
        print(f"    Description: {data['description']}")
        print(f"    Classes Covered: {', '.join(data['covers'])}")
    print("\n" + "=" * 70)

if __name__ == "__main__":
    print_dataset_summary()
