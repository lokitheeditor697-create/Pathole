"""
Train YOLOv8 on RDD2022 Road Defect Dataset.
Produces production weights for deployment in the AI Road Intelligence platform.
"""
import os
import sys
import shutil
import argparse
from pathlib import Path

def train_rdd2022(epochs=50, batch=16, imgsz=640):
    print("=" * 70)
    print("🚀 STARTING YOLOv8 TRAINING ON RDD2022 ROAD DEFECT DATASET")
    print(f"Parameters: Epochs={epochs}, Batch={batch}, ImgSz={imgsz}")
    print("=" * 70)

    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] Ultralytics is not installed. Run: pip install ultralytics torch torchvision")
        return

    # Look for dataset yaml
    possible_yamls = [
        os.path.join("ml", "datasets", "rdd2022_yolo", "rdd2022.yaml"),
        os.path.join("ml", "datasets", "dataset_spec.yaml"),
        "rdd2022.yaml"
    ]
    
    yaml_path = None
    for y in possible_yamls:
        if os.path.exists(y):
            yaml_path = os.path.abspath(y)
            break

    if not yaml_path or not os.path.exists(yaml_path):
        # Default fallback
        yaml_path = os.path.abspath(possible_yamls[0])

    print(f"Using Dataset YAML: {yaml_path}")
    
    # Load pretrained YOLOv8 model (yolov8s for balanced speed & accuracy)
    model = YOLO("yolov8s.pt")

    # Hyperparameters optimized for road dashcam conditions
    results = model.train(
        data=yaml_path,
        epochs=epochs,
        patience=20,
        imgsz=imgsz,
        batch=batch,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        warmup_epochs=3.0,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        fliplr=0.5,
        mosaic=1.0,
        close_mosaic=10,
        save=True,
        project="ml/models",
        name="yolov8_rdd2022_v1"
    )

    best_weights = os.path.join("ml", "models", "yolov8_rdd2022_v1", "weights", "best.pt")
    if os.path.exists(best_weights):
        os.makedirs("detector", exist_ok=True)
        target_pt = os.path.join("detector", "rdd2022_multiclass.pt")
        shutil.copy2(best_weights, target_pt)
        print(f"\n✅ Training Complete! Exported to separate model: {target_pt}")
        print("🔒 Existing fine-tuned pothole model (detector/pothole_yolov8.pt) remains completely intact and preserved.")

    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--imgsz", type=int, default=640)
    args = parser.parse_args()
    
    train_rdd2022(epochs=args.epochs, batch=args.batch, imgsz=args.imgsz)
