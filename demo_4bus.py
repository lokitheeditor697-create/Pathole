"""
4-Bus Demo — Real MTC Chennai Bus Routes with Real Road Paths & Multi-Bus Verification Intersections
Uses 4 distinct videos with genuine pothole detections.
Each bus follows actual Chennai roads via polyline waypoints.

Intersections that trigger Multi-Bus Verification:
  1. Aminjikarai Market on EVR Periyar Salai (13.0765, 80.2210) — Intersected by MTC 15G & MTC 27B -> 2x Verified!
  2. DG Vaishnav College, Poonamallee High Rd (13.0743, 80.2108) — Intersected by ALL 4 buses -> Up to 4x Verified!

Plus 4 distinct single-bus sightings along individual corridors.
"""

import subprocess
import sys
import time
import os
import urllib.request

PYTHON = sys.executable
BASE = os.path.dirname(os.path.abspath(__file__))
BACKEND_URL = "http://127.0.0.1:8000/events"

BUSES = [
    {
        "bus_id": "MTC 46G",
        "route_id": "MTC 46G",
        "video": "detector/video_46g.mp4",
        "conf": "0.55",
        "fps_delay": "0.04",
        "color": "AMBER",
        "label": "Kodungaiyur -> DG Vaishnav College (via Retteri & Koyambedu)"
    },
    {
        "bus_id": "MTC 29C",
        "route_id": "MTC 29C",
        "video": "detector/video_29c.mp4",
        "conf": "0.55",
        "fps_delay": "0.05",
        "color": "CYAN",
        "label": "Perambur -> DG Vaishnav College (via Otteri & Kilpauk)"
    },
    {
        "bus_id": "MTC 15G",
        "route_id": "MTC 15G",
        "video": "detector/video_15g.mp4",
        "conf": "0.55",
        "fps_delay": "0.04",
        "color": "VIOLET",
        "label": "Chennai Central -> DG Vaishnav College (via EVR Periyar Salai)"
    },
    {
        "bus_id": "MTC 27B",
        "route_id": "MTC 27B",
        "video": "detector/video_27b.mp4",
        "conf": "0.55",
        "fps_delay": "0.05",
        "color": "PINK",
        "label": "Chetpet -> DG Vaishnav College (via Spurtank Rd & Aminjikarai)"
    }
]

def check_backend():
    try:
        urllib.request.urlopen("http://127.0.0.1:8000/", timeout=3)
        return True
    except Exception:
        return False

def launch_bus(bus):
    video_path = os.path.join(BASE, bus["video"])
    if not os.path.isfile(video_path):
        print(f"  [SKIP] {bus['bus_id']}: video not found: {bus['video']}")
        return None

    cmd = [
        PYTHON, "detector/detect.py",
        "--video", bus["video"],
        "--bus-id", bus["bus_id"],
        "--route-id", bus["route_id"],
        "--conf", bus["conf"],
        "--fps-delay", bus["fps_delay"],
        "--backend-url", BACKEND_URL,
        "--loop",
    ]
    proc = subprocess.Popen(cmd, cwd=BASE)
    print(f"  [{bus['color']:6}] {bus['bus_id']:7} (PID {proc.pid:6}) | {bus['label']}")
    print(f"             Video: {bus['video']} | Route ID: {bus['route_id']}")
    return proc

if __name__ == "__main__":
    print("=" * 76)
    print("  SMART CITY DEMO — Real MTC Chennai Bus Routes & Multi-Bus Verification")
    print("  Destination: DG Vaishnav College, Arumbakkam (13.0743, 80.2108)")
    print("=" * 76)

    if not check_backend():
        print("\n[ERROR] Backend not reachable at http://127.0.0.1:8000")
        print("        Start it with: python -m uvicorn backend.main:app --port 8000")
        sys.exit(1)

    print("\nBackend: ONLINE — Clearing old events and resetting IDs to #1...")
    req = urllib.request.Request("http://127.0.0.1:8000/events", method="DELETE")
    urllib.request.urlopen(req)
    print("Database reset complete.\n")

    print("Launching 4 MTC buses on genuine road routes...\n")
    procs = []
    for bus in BUSES:
        proc = launch_bus(bus)
        if proc:
            procs.append((bus["bus_id"], proc))
        time.sleep(1.5)

    if not procs:
        print("[ERROR] No buses could be launched.")
        sys.exit(1)

    print(f"\n{len(procs)}/4 MTC buses actively running on real Chennai roads.")
    print("Open http://127.0.0.1:5173 to watch live.\n")
    print("Press Ctrl+C to stop all buses cleanly.\n")

    try:
        while True:
            time.sleep(5)
    except KeyboardInterrupt:
        print("\nStopping all buses...")
        for bid, p in procs:
            p.terminate()
            print(f"  Stopped {bid}")
        print("Demo finished.")
