"""
Multi-Task Road AI: End-to-End YOLOv8 Model Training & Validation Pipeline
Trains 7-class model: Potholes, Severe Cracks, Zebra Crosswalks, Heavy Vehicles (Buses), Light Vehicles (Cars), Two-Wheelers, Pedestrians.
Automatically exports to ONNX (for Pi/CPU) and TensorRT Engine (for Jetson Orin).
"""

import os
import sys

# Ensure UTF-8 output encoding for Windows shells
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import argparse
from datetime import datetime
import torch
from ultralytics import YOLO

# Resolve paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
DEFAULT_DATA_CONFIG = os.path.join(PROJECT_ROOT, "ml", "dataset", "multitask_road_ai.yaml")
DEFAULT_WEIGHTS = "yolov8m.pt"


def run_training(
    data_config=DEFAULT_DATA_CONFIG,
    model_weights=DEFAULT_WEIGHTS,
    epochs=100,
    batch_size=32,
    img_size=640,
    device="0",
    project_name="runs/train_multitask",
    run_name=None,
    export_onnx=True,
    export_tensorrt=False
):
    if run_name is None:
        run_name = f"road_traffic_zebra_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    # Verify compute hardware availability
    if device != "cpu" and not torch.cuda.is_available():
        print(f"\n[Hardware Notice] Requested device='{device}', but CUDA GPU is not available on this machine.")
        print("  -> Automatically switching to device='cpu'.")
        print("  -> NOTE: For full 100-epoch training, run on Google Colab or Kaggle GPU for 25x faster speed.")
        device = "cpu"
        if batch_size > 8:
            print(f"  -> Adjusting CPU batch size from {batch_size} to 4 for memory stability.")
            batch_size = 4

    print("=" * 70)
    print("  INITIATING MULTI-TASK ROAD AI TRAINING PIPELINE (YOLOv8)")
    print("=" * 70)
    print(f"  Base Weights:       {model_weights}")
    print(f"  Dataset Config:     {data_config}")
    print(f"  Target Epochs:      {epochs} (Early-stopping patience: 20)")
    print(f"  Batch Size:         {batch_size}")
    print(f"  Input Resolution:   {img_size}x{img_size}")
    print(f"  Compute Device:     {device}")
    print(f"  Output Directory:   {project_name}/{run_name}")
    print("=" * 70)

    # 1. Load Architecture
    print("\n[Step 1/4] Initializing YOLOv8 Architecture & Transfer Learning Backbone...")
    model = YOLO(model_weights)

    # 2. Execute Training
    print("\n[Step 2/4] Commencing Training Schedule...")
    results = model.train(
        data=data_config,
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        device=device,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        weight_decay=0.0005,
        momentum=0.937,
        warmup_epochs=1.0 if device == "cpu" else 3.0,
        warmup_momentum=0.8,
        warmup_bias_lr=0.1,
        # Augmentations
        mosaic=1.0,
        mixup=0.15,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=5.0,
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        close_mosaic=5 if device == "cpu" else 10,
        # Validation & Logging
        patience=20,
        val=True,
        save=True,
        save_period=10,
        project=project_name,
        name=run_name,
        verbose=True
    )

    # 3. Model Validation & Metric Check
    print("\n[Step 3/4] Running Full Test Set Validation & Metric Convergence...")
    metrics = model.val(data=data_config, split="val", imgsz=img_size)
    print("\n[OK] Validation Completed:")
    print(f"  Overall mAP@50:    {metrics.box.map50 * 100:.2f}%")
    print(f"  Overall mAP@50-95: {metrics.box.map * 100:.2f}%")
    print(f"  Mean Precision:    {metrics.box.mp * 100:.2f}%")
    print(f"  Mean Recall:       {metrics.box.mr * 100:.2f}%")

    # 4. Production Runtimes Export
    print("\n[Step 4/4] Exporting Checkpoints for Edge Hardware Deployment...")
    best_pt_path = os.path.join(project_name, run_name, "weights", "best.pt")

    if export_onnx and os.path.exists(best_pt_path):
        print("  Exporting ONNX Runtime (for Raspberry Pi 5 / Hailo-8 / CPU)...")
        onnx_model = YOLO(best_pt_path)
        onnx_path = onnx_model.export(
            format="onnx",
            dynamic=True,
            simplify=True,
            opset=17
        )
        print(f"  Exported ONNX: {onnx_path}")

    if export_tensorrt and os.path.exists(best_pt_path):
        try:
            print("  Exporting TensorRT FP16 Engine (for NVIDIA Jetson Orin Nano)...")
            trt_model = YOLO(best_pt_path)
            engine_path = trt_model.export(
                format="engine",
                half=True,
                device=device
            )
            print(f"  Exported TensorRT Engine: {engine_path}")
        except Exception as e:
            print(f"  TensorRT export skipped: {e}")

    print("\n" + "=" * 70)
    print("[DONE] MULTI-TASK ROAD AI TRAINING & EXPORT COMPLETED!")
    print(f"Best Weights: {best_pt_path}")
    print("=" * 70)
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Multi-Task Road AI Training Script")
    parser.add_argument("--data", type=str, default=DEFAULT_DATA_CONFIG, help="Path to data.yaml")
    parser.add_argument("--weights", "--model", dest="weights", type=str, default=DEFAULT_WEIGHTS, help="Base weights (e.g. yolov8m.pt or yolov8s.pt)")
    parser.add_argument("--epochs", type=int, default=100, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=32, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image dimension")
    parser.add_argument("--device", type=str, default="0", help="CUDA device index or 'cpu'")
    parser.add_argument("--no-onnx", action="store_true", help="Skip ONNX export")
    parser.add_argument("--tensorrt", action="store_true", help="Export TensorRT FP16 engine")

    args = parser.parse_args()

    run_training(
        data_config=args.data,
        model_weights=args.weights,
        epochs=args.epochs,
        batch_size=args.batch,
        img_size=args.imgsz,
        device=args.device,
        export_onnx=not args.no_onnx,
        export_tensorrt=args.tensorrt
    )
