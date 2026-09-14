# RoadGuard detection pipeline

## One model in production

All live-camera, image, and video requests use only:

`detector/roadguard_yolov8.pt`

The other weight files are retained only for offline comparison. They are not loaded by the server and cannot scan the same video at the same time.

## Live road scan

`camera frame` → `RoadGuard YOLOv8` → `spatial defect match` → `one municipal defect record` → `alert rule`

- The browser sends one JPEG frame about every 1.2 seconds.
- The server runs RoadGuard and matches the result to an existing nearby defect of the same class.
- A continuing match updates that record. It does not reduce road health again or send another alert.
- An alert is allowed only for a new defect, or when a different vehicle newly verifies an existing defect.

## Uploaded or sample video scan

`video` → `sample consecutive frames` → `RoadGuard YOLOv8 + ByteTrack` → `persistent track ID` → `one defect per track`

- Frames are processed in sequence, never with multiple YOLO models in parallel.
- ByteTrack keeps a single ID while the same pothole changes size or position as the vehicle approaches it.
- Very short, low-confidence tracks are discarded.
- The result contains the track ID, first/last appearance time, best confidence, and one unique defect record.

## Model files

| File | Role |
| --- | --- |
| `roadguard_yolov8.pt` | Active production model: pothole severity, cracking, edge breaks |
| `pothole_yolov8.pt` | Offline comparison model |
| `best.pt` | Exact duplicate of `pothole_yolov8.pt`; safe to delete |
| `rdd2022_multiclass.pt` | Offline crack-classification comparison model |
| `potbot_yolov8m.pt` | Offline pothole-only comparison model |

## File cleanup already made

`render.yaml` was removed. It is unrelated to the RoadGuard pipeline.

The files below are verified byte-for-byte duplicates and are safe to remove when you want to reclaim space:

- `detector/*.mp4` (the application uses the matching copies under `public/videos/`)
- `detector/best.pt` (identical to `detector/pothole_yolov8.pt`)
- `detector_tmp/` (temporary detector files)
