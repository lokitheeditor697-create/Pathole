"""
YOLOv8 Training Pipeline for AI Road Intelligence & Predictive Maintenance.
Applies route-based validation splits and dashcam-tailored augmentations.
"""
import os

def train_yolov8_road_model():
    print("Initializing YOLOv8-road-v1 training pipeline...")
    try:
        from ultralytics import YOLO
        model = YOLO("yolov8s.pt")
        results = model.train(
            data="ml/datasets/dataset_spec.yaml",
            epochs=100,
            patience=20,
            imgsz=640,
            batch=16,
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
            name="yolov8_road_v1"
        )
        print("Training complete. Best weights saved to ml/models/yolov8_road_v1/weights/best.pt")
        return results
    except ImportError:
        print("Ultralytics library not installed in current environment. Ready for GPU/Colab execution.")
        return None

if __name__ == "__main__":
    train_yolov8_road_model()
