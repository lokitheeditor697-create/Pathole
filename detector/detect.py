"""
Road-Defect and Traffic Detection Script
Smart City Edge Prototype

Loads YOLOv8 model, processes video frame-by-frame, interpolates GPS coordinates,
and generates JSON events for detections with confidence >= 0.6.
Can run in standalone mode (printing JSON to console) or post events to backend.
"""

import argparse
import json
import os
import sys

# Ensure project root is in sys.path when running from any working directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import time
import math
from datetime import datetime, timezone
import cv2
import numpy as np
import requests
from ultralytics import YOLO


def get_severity(confidence: float, high_thresh: float = 0.70, med_thresh: float = 0.55) -> str:
    """
    Derive severity (High / Medium / Low) from realistic pothole model confidence thresholds.
    Roboflow-trained pothole models typically cluster between 0.45 and 0.80+.
    """
    if confidence >= high_thresh:
        return "High"
    elif confidence >= med_thresh:
        return "Medium"
    else:
        return "Low"


def interpolate_polyline(waypoints: list, progress: float):
    """
    Interpolate coordinates smoothly along actual road polyline waypoints.
    Follows real road geometry (e.g. Google Maps paths) instead of straight lines through buildings.
    """
    if not waypoints:
        return 0.0, 0.0
    if len(waypoints) == 1 or progress <= 0.0:
        return round(float(waypoints[0][0]), 6), round(float(waypoints[0][1]), 6)
    if progress >= 1.0:
        return round(float(waypoints[-1][0]), 6), round(float(waypoints[-1][1]), 6)

    total_dist = 0.0
    seg_dists = []
    for i in range(len(waypoints) - 1):
        dlat = waypoints[i+1][0] - waypoints[i][0]
        dlon = waypoints[i+1][1] - waypoints[i][1]
        dist = math.hypot(dlat, dlon)
        seg_dists.append(dist)
        total_dist += dist

    if total_dist == 0.0:
        return round(float(waypoints[0][0]), 6), round(float(waypoints[0][1]), 6)

    target = progress * total_dist
    accum = 0.0
    for i in range(len(waypoints) - 1):
        sdist = seg_dists[i]
        if accum + sdist >= target:
            frac = (target - accum) / sdist if sdist > 0 else 0.0
            lat = waypoints[i][0] + (waypoints[i+1][0] - waypoints[i][0]) * frac
            lon = waypoints[i][1] + (waypoints[i+1][1] - waypoints[i][1]) * frac
            return round(lat, 6), round(lon, 6)
        accum += sdist
    return round(float(waypoints[-1][0]), 6), round(float(waypoints[-1][1]), 6)


def interpolate_gps(start_lat: float, start_lon: float, end_lat: float, end_lon: float,
                    current_frame: int, total_frames: int):
    """Linearly interpolate coordinates between start and end GPS points."""
    if total_frames <= 1:
        return start_lat, start_lon
    fraction = current_frame / (total_frames - 1)
    lat = start_lat + (end_lat - start_lat) * fraction
    lon = start_lon + (end_lon - start_lon) * fraction
    return round(lat, 6), round(lon, 6)


def fallback_pothole_detection(frame, conf_threshold=0.6):
    """
    Heuristic computer-vision detector for dark road depressions/craters.
    Acts as a graceful fallback when testing before a custom-trained pothole
    weights file (.pt) is provided.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    # Focus on lower 60% of frame (the road surface)
    road_roi = gray[int(h * 0.4):, :]
    
    # Threshold for dark regions surrounded by asphalt
    blurred = cv2.GaussianBlur(road_roi, (7, 7), 0)
    _, dark_thresh = cv2.threshold(blurred, 45, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(dark_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    detections = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if 400 < area < 10000:
            x, y, bw, bh = cv2.boundingRect(cnt)
            aspect = bw / float(bh)
            if 0.5 <= aspect <= 3.0:
                # Estimate confidence based on darkness and shape compactness
                conf = min(0.95, round(0.62 + (area / 12000.0) * 0.3, 2))
                if conf >= conf_threshold:
                    detections.append({
                        "box": (x, y + int(h * 0.4), x + bw, y + int(h * 0.4) + bh),
                        "type": "pothole",
                        "confidence": conf
                    })
    return detections


def process_video(
    video_path: str,
    model_path: str,
    bus_id: str,
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
    conf_thresh: float = 0.50,
    high_thresh: float = 0.70,
    med_thresh: float = 0.55,
    backend_url: str = None,
    standalone: bool = False,
    display: bool = False,
    loop: bool = False,
    max_frames: int = None,
    fps_delay: float = 0.03,
    waypoints: list = None,
    defect_points: list = None
):
    print("=" * 60)
    print(" Road Defect & Traffic Detection Agent")
    print("=" * 60)
    print(f" Bus ID        : {bus_id}")
    print(f" Input Video   : {video_path}")
    print(f" Model Weights : {model_path}")
    if waypoints:
        print(f" Route Mode    : Polyline Waypoints ({len(waypoints)} road waypoints)")
    else:
        print(f" Route GPS     : ({start_lat}, {start_lon}) -> ({end_lat}, {end_lon})")
    if defect_points:
        print(f" Defect Spots  : {len(defect_points)} designated road defect zones")
    print(f" Confidence    : >= {conf_thresh}")
    print(f" Backend URL   : {backend_url if (backend_url and not standalone) else 'Standalone (Console Only)'}")
    print("=" * 60)

    # Initialize video capture
    if video_path.isdigit():
        cap = cv2.VideoCapture(int(video_path))
    else:
        if not os.path.exists(video_path):
            print(f"Error: Video file not found: {video_path}")
            sys.exit(1)
        cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print(f"Error: Could not open video source: {video_path}")
        sys.exit(1)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        total_frames = 300  # Fallback for streams

    if max_frames and max_frames < total_frames:
        total_frames = max_frames

    # Load YOLO model
    print(f"Loading model: {model_path}...")
    try:
        model = YOLO(model_path)
        is_custom_pothole_model = any(
            name.lower() in ["pothole", "defect", "crack", "manhole"]
            for name in model.names.values()
        )
        print(f"Model loaded successfully. Classes: {list(model.names.values())[:5]}... (Total: {len(model.names)})")
        if is_custom_pothole_model:
            print("Detected specialized pothole/defect model classes!")
        else:
            print("Standard YOLO model loaded. Fallback CV pothole detector enabled alongside YOLO.")
    except Exception as e:
        print(f"Warning: Could not load YOLO model ({e}). Using heuristic CV detector.")
        model = None
        is_custom_pothole_model = False

    frame_idx = 0
    total_events_sent = 0
    last_event_time = 0
    defect_sent_timestamps = {}
    event_cooldown = 0.5  # Seconds between repeated events for fallback mode

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                if loop:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    frame_idx = 0
                    continue
                break
            if max_frames and frame_idx >= max_frames:
                break

            progress = frame_idx / float(max(1, total_frames - 1))
            if waypoints and len(waypoints) > 1:
                current_lat, current_lon = interpolate_polyline(waypoints, progress)
            else:
                current_lat, current_lon = interpolate_gps(
                    start_lat, start_lon, end_lat, end_lon, frame_idx, total_frames
                )

            # Periodically broadcast live bus position telemetry so bus icon glides smoothly on map
            if backend_url and not standalone and (frame_idx % 8 == 0):
                try:
                    telemetry_url = backend_url.rsplit('/', 1)[0] + '/bus_position'
                    requests.post(telemetry_url, json={
                        "bus_id": bus_id,
                        "latitude": current_lat,
                        "longitude": current_lon
                    }, timeout=0.15)
                except Exception:
                    pass

            detections = []

            # 1. Run YOLO inference if model available
            if model is not None:
                results = model(frame, conf=conf_thresh, verbose=False)[0]
                for box in results.boxes:
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    cls_name = model.names[cls_id].lower()

                    # Accept pothole/road defects, or traffic defects
                    if is_custom_pothole_model:
                        detected_type = cls_name
                    elif cls_name in ["pothole", "crack", "defect"]:
                        detected_type = cls_name
                    else:
                        detected_type = cls_name

                    coords = box.xyxy[0].cpu().numpy().astype(int)
                    detections.append({
                        "box": (coords[0], coords[1], coords[2], coords[3]),
                        "type": detected_type,
                        "confidence": round(conf, 3)
                    })

            # 2. If no pothole detected by model, run CV heuristic road analyzer
            if not any(d["type"] == "pothole" for d in detections):
                cv_detections = fallback_pothole_detection(frame, conf_threshold=conf_thresh)
                detections.extend(cv_detections)

            # Process detections above threshold
            now_epoch = time.time()

            # Check if bus is near any designated road defect point
            near_defect_pt = None
            if defect_points:
                for pt in defect_points:
                    dlat = current_lat - pt[0]
                    dlon = current_lon - pt[1]
                    if math.hypot(dlat, dlon) < 0.0030:  # within ~300m road zone
                        near_defect_pt = pt
                        break

            for det in detections:
                if det["confidence"] >= conf_thresh:
                    should_emit = False
                    event_lat = current_lat
                    event_lon = current_lon

                    if defect_points:
                        # Only emit if bus is passing near a designated road defect point
                        if near_defect_pt is not None:
                            pt_key = f"{near_defect_pt[0]:.4f}_{near_defect_pt[1]:.4f}"
                            last_sent = defect_sent_timestamps.get(pt_key, 0)
                            # 35s cooldown per defect point so it logs once per pass
                            if (now_epoch - last_sent) >= 35.0:
                                should_emit = True
                                event_lat = round(near_defect_pt[0], 6)
                                event_lon = round(near_defect_pt[1], 6)
                                defect_sent_timestamps[pt_key] = now_epoch
                    else:
                        if (now_epoch - last_event_time) >= event_cooldown:
                            should_emit = True
                            last_event_time = now_epoch

                    if should_emit:
                        severity = get_severity(det["confidence"], high_thresh=high_thresh, med_thresh=med_thresh)
                        timestamp = datetime.now(timezone.utc).isoformat()

                        event_data = {
                            "type": det["type"],
                            "confidence": det["confidence"],
                            "severity": severity,
                            "latitude": event_lat,
                            "longitude": event_lon,
                            "timestamp": timestamp,
                            "bus_id": bus_id
                        }

                        # Print JSON event to console
                        print(f"\n[EVENT DETECTED @ Frame {frame_idx}/{total_frames}]")
                        print(json.dumps(event_data, indent=2))

                        # Send to backend if configured
                        if backend_url and not standalone:
                            try:
                                resp = requests.post(backend_url, json=event_data, timeout=3.0)
                                if resp.status_code in [200, 201]:
                                    print(f" -> Sent to backend successfully (HTTP {resp.status_code})")
                                else:
                                    print(f" -> Backend responded with HTTP {resp.status_code}: {resp.text}")
                            except requests.exceptions.RequestException as req_err:
                                print(f" -> Failed to reach backend: {req_err}")

                        total_events_sent += 1
                        last_event_time = now_epoch

                    # Draw bounding boxes and severity on frame
                    x1, y1, x2, y2 = det["box"]
                    sev = get_severity(det["confidence"], high_thresh=high_thresh, med_thresh=med_thresh)
                    color = (0, 0, 255) if sev == "High" else (0, 165, 255) if sev == "Medium" else (0, 255, 0)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(
                        frame,
                        f"{det['type']} {det['confidence']:.2f} ({sev})",
                        (x1, max(20, y1 - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.55,
                        color,
                        2
                    )

            # Overlay HUD telemetry
            cv2.rectangle(frame, (5, 5), (420, 75), (20, 20, 20), -1)
            cv2.rectangle(frame, (5, 5), (420, 75), (80, 80, 80), 1)
            cv2.putText(frame, f"LIVE BUS: {bus_id} | GPS: {current_lat:.5f}, {current_lon:.5f}",
                        (15, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)
            cv2.putText(frame, f"Frame: {frame_idx}/{total_frames} | Defects Sent: {total_events_sent}",
                        (15, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
            cv2.putText(frame, "Edge AI: YOLOv8 Pothole Model",
                        (15, 68), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (180, 180, 180), 1)

            # Stream frame to backend for live web dashboard viewing
            if backend_url and not standalone and (frame_idx % 2 == 0):
                try:
                    frame_url = backend_url.rsplit('/', 1)[0] + '/frame'
                    _, enc_jpg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 65])
                    requests.post(frame_url, data=enc_jpg.tobytes(), timeout=0.15)
                except Exception:
                    pass

            if display:
                cv2.imshow(f"Road Defect Detector - {bus_id}", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    print("\nUser requested exit.")
                    break

            frame_idx += 1
            if fps_delay > 0:
                time.sleep(fps_delay)

    except KeyboardInterrupt:
        print("\nDetection interrupted by user.")
    finally:
        cap.release()
        if display:
            cv2.destroyAllWindows()

    print("\n" + "=" * 60)
    print(f" Processing complete. Processed {frame_idx} frames. Total events detected: {total_events_sent}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Smart City Road Defect & Traffic Detector")
    default_video = "detector/real_dashcam.mp4" if os.path.exists("detector/real_dashcam.mp4") else "detector/sample_road.mp4"
    parser.add_argument("--video", type=str, default=default_video,
                        help=f"Path to video file or camera index (default: {default_video})")
    default_model = os.getenv("YOLO_MODEL_PATH") or (
        "detector/best.pt" if os.path.exists("detector/best.pt")
        else ("detector/pothole_yolov8.pt" if os.path.exists("detector/pothole_yolov8.pt") else "yolov8n.pt")
    )
    parser.add_argument("--model", type=str, default=default_model,
                        help=f"YOLO model path or name (default: {default_model})")
    parser.add_argument("--bus-id", type=str, default="MTC 46G",
                        help="Identifier for the bus (e.g. MTC 46G, MTC 15G)")
    parser.add_argument("--start-lat", type=float, default=13.1333,
                        help="Origin Latitude (default: 13.1333 Kodungaiyur)")
    parser.add_argument("--start-lon", type=float, default=80.2622,
                        help="Origin Longitude (default: 80.2622 Kodungaiyur)")
    parser.add_argument("--end-lat", type=float, default=13.0743,
                        help="Destination Latitude (default: 13.0743 DG Vaishnav College, Arumbakkam)")
    parser.add_argument("--end-lon", type=float, default=80.2108,
                        help="Destination Longitude (default: 80.2108 DG Vaishnav College, Arumbakkam)")
    default_conf = float(os.getenv("YOLO_CONF_THRESHOLD", "0.50"))
    parser.add_argument("--conf", type=float, default=default_conf,
                        help=f"Confidence threshold for detections (default: {default_conf})")
    parser.add_argument("--conf-high", type=float, default=0.70,
                        help="Threshold for High severity classification (default: 0.70)")
    parser.add_argument("--conf-med", type=float, default=0.55,
                        help="Threshold for Medium severity classification (default: 0.55)")
    default_iou = float(os.getenv("YOLO_IOU_THRESHOLD", "0.45"))
    parser.add_argument("--iou", type=float, default=default_iou,
                        help=f"IoU threshold for NMS filtering (default: {default_iou})")
    parser.add_argument("--backend-url", type=str, default="",
                        help="Backend POST endpoint (e.g. http://localhost:8000/events)")
    parser.add_argument("--standalone", action="store_true", default=False,
                        help="Force standalone mode: only print JSON events to console, don't POST")
    parser.add_argument("--display", action="store_true", default=False,
                        help="Display OpenCV visualization window")
    parser.add_argument("--loop", action="store_true", default=False,
                        help="Continuously loop video for perpetual live streaming")
    parser.add_argument("--max-frames", type=int, default=None,
                        help="Maximum frames to process (useful for testing)")
    parser.add_argument("--fps-delay", type=float, default=0.01,
                        help="Delay in seconds per frame to control simulation speed (default: 0.01)")
    parser.add_argument("--waypoints", type=str, default=None,
                        help="JSON string or file path containing list of [[lat, lon], ...] route waypoints")
    parser.add_argument("--defect-points", type=str, default=None,
                        help="JSON string or file path containing list of [[lat, lon], ...] defect coordinates")
    parser.add_argument("--route-id", type=str, default="MTC 46G",
                        help="MTC route ID (default: 'MTC 46G' Kodungaiyur -> DG Vaishnav College)")

    args = parser.parse_args()

    # Strict CLI Input Validation
    # 1. Validate video path
    if not args.video.isdigit():
        if not os.path.exists(args.video):
            print(f"[ERROR] Video file not found: '{args.video}'", file=sys.stderr)
            sys.exit(1)
        if os.path.getsize(args.video) == 0:
            print(f"[ERROR] Video file is empty (0 bytes): '{args.video}'", file=sys.stderr)
            sys.exit(1)

    # 2. Validate model path
    if not os.path.exists(args.model) and not args.model.endswith('.pt'):
        print(f"[ERROR] Model file not found: '{args.model}'", file=sys.stderr)
        sys.exit(1)

    # 3. Validate GPS coordinates
    if not (-90.0 <= args.start_lat <= 90.0):
        print(f"[ERROR] Invalid --start-lat: {args.start_lat}. Latitude must be between -90.0 and 90.0.", file=sys.stderr)
        sys.exit(1)
    if not (-90.0 <= args.end_lat <= 90.0):
        print(f"[ERROR] Invalid --end-lat: {args.end_lat}. Latitude must be between -90.0 and 90.0.", file=sys.stderr)
        sys.exit(1)
    if not (-180.0 <= args.start_lon <= 180.0):
        print(f"[ERROR] Invalid --start-lon: {args.start_lon}. Longitude must be between -180.0 and 180.0.", file=sys.stderr)
        sys.exit(1)
    if not (-180.0 <= args.end_lon <= 180.0):
        print(f"[ERROR] Invalid --end-lon: {args.end_lon}. Longitude must be between -180.0 and 180.0.", file=sys.stderr)
        sys.exit(1)

    # 4. Validate confidence thresholds
    if not (0.0 <= args.conf <= 1.0):
        print(f"[ERROR] Invalid --conf: {args.conf}. Must be between 0.0 and 1.0.", file=sys.stderr)
        sys.exit(1)
    if not (0.0 <= args.conf_high <= 1.0):
        print(f"[ERROR] Invalid --conf-high: {args.conf_high}. Must be between 0.0 and 1.0.", file=sys.stderr)
        sys.exit(1)
    if not (0.0 <= args.conf_med <= 1.0):
        print(f"[ERROR] Invalid --conf-med: {args.conf_med}. Must be between 0.0 and 1.0.", file=sys.stderr)
        sys.exit(1)
    if args.conf_med > args.conf_high:
        print(f"[ERROR] --conf-med ({args.conf_med}) cannot be greater than --conf-high ({args.conf_high}).", file=sys.stderr)
        sys.exit(1)

    # Resolve waypoints and defect points
    waypoints_data = None
    defect_points_data = None

    if args.route_id:
        try:
            from backend.routes_data import CHENNAI_BUS_ROUTES
            if args.route_id in CHENNAI_BUS_ROUTES:
                r_info = CHENNAI_BUS_ROUTES[args.route_id]
                waypoints_data = r_info.get("waypoints")
                defect_points_data = r_info.get("defect_points")
                print(f"[ROUTE LOADED] {args.route_id}: {len(waypoints_data)} waypoints, {len(defect_points_data)} defect spots")
        except Exception as e:
            print(f"Warning: Could not auto-load route '{args.route_id}': {e}")

    if args.waypoints:
        try:
            if os.path.exists(args.waypoints):
                waypoints_data = json.load(open(args.waypoints))
            else:
                waypoints_data = json.loads(args.waypoints)
        except Exception as e:
            print(f"[ERROR] Failed to parse --waypoints: {e}")

    if args.defect_points:
        try:
            if os.path.exists(args.defect_points):
                defect_points_data = json.load(open(args.defect_points))
            else:
                defect_points_data = json.loads(args.defect_points)
        except Exception as e:
            print(f"[ERROR] Failed to parse --defect-points: {e}")

    # Determine backend URL
    target_backend = None
    if not args.standalone and args.backend_url.strip():
        target_backend = args.backend_url.strip()

    process_video(
        video_path=args.video,
        model_path=args.model,
        bus_id=args.bus_id,
        start_lat=args.start_lat,
        start_lon=args.start_lon,
        end_lat=args.end_lat,
        end_lon=args.end_lon,
        conf_thresh=args.conf,
        high_thresh=args.conf_high,
        med_thresh=args.conf_med,
        backend_url=target_backend,
        standalone=args.standalone,
        display=args.display,
        loop=args.loop,
        max_frames=args.max_frames,
        fps_delay=args.fps_delay,
        waypoints=waypoints_data,
        defect_points=defect_points_data
    )


if __name__ == "__main__":
    main()
