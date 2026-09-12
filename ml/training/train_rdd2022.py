"""
Train YOLOv8 on RDD2022 Road Defect Dataset.
Produces production weights for deployment in the AI Road Intelligence platform.
"""
import os
import shutil
from pathlib import Path

def train_rdd2022():
    print("=" * 70)
    print("🚀 STARTING YOLOv8 TRAINING ON RDD2022 ROAD DEFECT DATASET")
    print("=" * 70)

    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] Ultralytics is not installed. Run: pip install ultralytics torch torchvision")
        return

    yaml_path = os.path.join(os.path.dirname(__dirname__), 'datasets', 'rdd2022_yolo', 'rdd2022.yaml')
    if not os.path.exists(yaml_path):
        # Fallback to dataset spec if rdd2022.yaml is not yet generated
        yaml_path = os.path.join(os.path.dirname(__dirname__), 'datasets', 'dataset_spec.yaml')

    print(f"Using Dataset YAML: {yaml_path}")
    
    # Load pretrained YOLOv8 model (yolov8s for balanced speed & accuracy, or yolov8m for max mAP)
    model = YOLO("yolov8s.pt")

    # Hyperparameters optimized for road dashcam conditions (potholes, cracks, shadows, wet roads)
    results = model.train(
        data=yaml_path,
        epochs=100,
        patience=25,
        imgsz=640,
        batch=16,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        warmup_epochs=3.0,
        # Road-specific augmentations:
        hsv_h=0.015,     # Asphalt hue variation
        hsv_s=0.7,       # Wet vs dry saturation
        hsv_v=0.4,       # Sunlight vs heavy shadow brightness
        fliplr=0.5,      # Horizontal lane flips
        mosaic=1.0,      # Multi-scene distress mosaic
        close_mosaic=10, # Disable mosaic during final 10 epochs for fine-grained crack convergence
        save=True,
        project="ml/models",
        name="yolov8_rdd2022_v1"
    )

    best_weights = os.path.join("ml", "models", "yolov8_rdd2022_v1", "weights", "best.pt")
    if os.path.exists(best_weights):
        target_pt = os.path.join("detector", "pothole_yolov8.pt")
        shutil.copy2(best_weights, target_pt)
        print(f"\n✅ Training Complete! Updated platform model weights -> {target_pt}")

    return results

if __name__ == "__main__":
    train_rdd2022()
