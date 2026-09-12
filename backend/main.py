"""
FastAPI Backend for Smart City Road-Defect and Traffic Detection
"""

import asyncio
import time
import subprocess
import os
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.database import (
    init_db,
    process_and_deduplicate_event,
    get_all_defects,
    get_statistics,
    reset_database
)
from backend.alerts import dispatch_alert, clear_alert_cache

# In-memory video frame cache for live dashcam streaming
latest_frame_bytes: Optional[bytes] = None
last_frame_timestamp: float = 0.0

# In-memory bus position tracker: {bus_id: {lat, lon, timestamp, status}}
bus_positions: Dict[str, Dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite schema on startup
    init_db()
    yield


app = FastAPI(
    title="Road Defect & Traffic Detection Backend",
    description="Backend API for edge bus defect ingestion, spatial-temporal deduplication, and map polling",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend (default Vite port: 5173, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EventInput(BaseModel):
    type: str = Field(..., min_length=1, example="pothole", description="Defect type (pothole, crack, etc.)")
    confidence: float = Field(..., ge=0.0, le=1.0, example=0.88, description="Detection confidence score between 0.0 and 1.0")
    severity: Optional[str] = Field(None, example="High", description="Severity label (High, Medium, Low)")
    latitude: float = Field(..., ge=-90.0, le=90.0, example=37.774929, description="Latitude between -90.0 and 90.0")
    longitude: float = Field(..., ge=-180.0, le=180.0, example=-122.419416, description="Longitude between -180.0 and 180.0")
    timestamp: str = Field(..., min_length=1, example="2026-09-10T15:10:00Z", description="ISO-8601 timestamp string")
    bus_id: str = Field(..., min_length=1, example="BUS_01", description="Identifier of the reporting transit bus")


class BusPositionUpdate(BaseModel):
    bus_id: str
    latitude: float
    longitude: float
    confidence: Optional[float] = None
    severity: Optional[str] = None


@app.get("/api")
def api_info():
    return {
        "status": "online",
        "service": "Smart City Road Defect Backend",
        "endpoints": {
            "POST /events": "Ingest defect event with 15m/10min deduplication",
            "GET /events": "Retrieve all verified defects",
            "GET /stats": "Dashboard metrics and charts data",
            "DELETE /events": "Reset defect database"
        }
    }


@app.post("/events", status_code=201)
def ingest_event(event: EventInput):
    """
    Ingest a new road defect detection event.
    Performs deduplication within ~15 meters and 10 minutes.
    Also updates the live bus position tracker and fires official alerts.
    """
    global bus_positions
    try:
        # Snapshot bus_count BEFORE merge so we can detect the 1→2 transition
        from backend.database import get_all_defects as _gad
        existing = {d["id"]: d["bus_count"] for d in _gad()}

        defect, is_merged = process_and_deduplicate_event(event.model_dump())

        # Track live bus GPS position
        bus_positions[event.bus_id] = {
            "bus_id": event.bus_id,
            "latitude": event.latitude,
            "longitude": event.longitude,
            "timestamp": event.timestamp,
            "last_seen": time.time(),
            "confidence": event.confidence,
            "severity": event.severity or "Low"
        }

        # Fire alerts to municipal officials (non-blocking background threads)
        previous_bus_count = existing.get(defect["id"], 1) if is_merged else 0
        dispatch_alert(defect, is_merged=is_merged, previous_bus_count=previous_bus_count)

        return {
            "status": "success",
            "merged": is_merged,
            "message": "Merged into existing verified defect" if is_merged else "Created new verified defect",
            "defect": defect
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing event: {str(e)}")


@app.get("/events")
def list_events():
    """
    Returns all verified defects for map plotting and table display.
    """
    defects = get_all_defects()
    return {
        "count": len(defects),
        "defects": defects
    }


@app.get("/stats")
def stats():
    """
    Returns aggregated metrics for summary tiles and bar charts.
    """
    return get_statistics()


@app.get("/reports/csv")
def export_incident_report_csv():
    """
    Generates a formal municipal road defect incident report in CSV format.
    Supports evidence-based decision making for maintenance dispatches.
    """
    import csv
    import io
    defects = get_all_defects()
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Incident_ID",
        "Defect_Type",
        "Severity",
        "Confidence_Score",
        "Latitude",
        "Longitude",
        "Bus_Count",
        "Reporting_Buses",
        "Verification_Status",
        "First_Detected",
        "Last_Detected",
        "Recommended_Municipal_Action"
    ])

    for d in defects:
        is_verified = d.get("bus_count", 1) > 1
        sev = d.get("severity", "Low")
        action = (
            "URGENT: Dispatch Asphalt Repair Crew within 24h" if (is_verified and sev == "High")
            else "PRIORITY: Schedule Maintenance within 72h" if is_verified
            else "MONITORING: Pending Secondary Bus Confirmation"
        )
        writer.writerow([
            d.get("id"),
            d.get("defect_type", "pothole"),
            sev,
            f"{d.get('confidence', 0.0):.2f}",
            f"{d.get('latitude', 0.0):.6f}",
            f"{d.get('longitude', 0.0):.6f}",
            d.get("bus_count", 1),
            d.get("bus_ids", ""),
            "MULTI-BUS VERIFIED" if is_verified else "PENDING CONFIRMATION",
            d.get("first_detected", ""),
            d.get("last_detected", ""),
            action
        ])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=municipal_incident_report.csv"}
    )


@app.delete("/events")
def clear_events():
    """
    Clears all defect events and resets live bus positions (fresh demo).
    """
    global bus_positions
    reset_database()
    clear_alert_cache()
    bus_positions = {}
    return {"status": "success", "message": "All defect records cleared and bus positions reset."}


@app.get("/bus_positions")
def get_bus_positions():
    """
    Returns live GPS positions of all active buses (seen within last 60 seconds).
    Used by the frontend to render animated bus icons on the map.
    """
    now = time.time()
    active = [
        {**pos, "active": (now - pos["last_seen"]) < 60.0}
        for pos in bus_positions.values()
    ]
    return {"buses": active}


@app.post("/bus_position")
def update_bus_position(update: BusPositionUpdate):
    """
    Update live GPS telemetry of a bus without needing a defect detection event.
    Enables smooth bus movement along real road waypoints.
    """
    global bus_positions
    bus_positions[update.bus_id] = {
        "bus_id": update.bus_id,
        "latitude": update.latitude,
        "longitude": update.longitude,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "last_seen": time.time(),
        "confidence": update.confidence or 0.85,
        "severity": update.severity or "High"
    }
    return {"status": "ok"}


@app.get("/bus_routes")
def get_bus_routes():
    """
    Returns real Chennai MTC bus routes and road waypoints for map rendering.
    """
    from backend.routes_data import CHENNAI_BUS_ROUTES
    return {"routes": CHENNAI_BUS_ROUTES}


@app.post("/frame")
async def upload_frame(request: Request):
    """
    Receives current annotated video frame from detector (JPEG binary).
    """
    global latest_frame_bytes, last_frame_timestamp
    latest_frame_bytes = await request.body()
    last_frame_timestamp = time.time()
    return {"status": "ok"}


@app.get("/video_status")
def video_status():
    """
    Checks if a live camera/dashcam stream is actively broadcasting.
    """
    is_active = (time.time() - last_frame_timestamp) < 4.0 and (latest_frame_bytes is not None)
    return {"active": is_active, "last_updated": last_frame_timestamp}


@app.get("/video_feed")
async def video_feed():
    """
    Streams live video frames (MJPEG) to the web browser.
    Optimized: only yields when a new frame is available, avoiding CPU/network choke.
    """
    async def frame_generator():
        last_sent_ts = 0.0
        while True:
            # Yield new frame only if it has been updated
            if (latest_frame_bytes is not None and 
                last_frame_timestamp > last_sent_ts and 
                (time.time() - last_frame_timestamp) < 5.0):
                last_sent_ts = last_frame_timestamp
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + latest_frame_bytes + b"\r\n"
                )
            await asyncio.sleep(0.03)  # ~30 checks/sec

    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/latest_frame")
def get_latest_frame():
    """
    Returns the single latest frame as image/jpeg.
    """
    if latest_frame_bytes is None:
        raise HTTPException(status_code=404, detail="No video frame available")
    return Response(content=latest_frame_bytes, media_type="image/jpeg")


# Subprocess handles for UI-triggered live detection
live_detector_processes: list = []


@app.post("/start_live_detect")
def start_live_detect(bus_id: str = "MTC 46G"):
    """
    Launches live intersecting MTC buses in Arumbakkam / DG Vaishnav College area.
    Launches MTC 46G and MTC 15G simultaneously:
    They follow real Chennai roads and converge at DG Vaishnav College (Arumbakkam)
    and Aminjikarai, repeatedly creating live multi-bus verified potholes!
    """
    global live_detector_processes
    import sys
    import subprocess
    import os

    # Stop any previously running live processes
    stop_live_detect()

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Dual live buses intersecting in Arumbakkam
    bus_configs = [
        {
            "bus_id": "MTC 46G",
            "route_id": "MTC 46G",
            "video": "detector/video_46g.mp4",
            "fps_delay": "0.04"
        },
        {
            "bus_id": "MTC 15G",
            "route_id": "MTC 15G",
            "video": "detector/video_15g.mp4",
            "fps_delay": "0.04"
        }
    ]

    started = []
    for cfg in bus_configs:
        cmd = [
            sys.executable,
            "detector/detect.py",
            "--video", cfg["video"],
            "--bus-id", cfg["bus_id"],
            "--route-id", cfg["route_id"],
            "--conf", "0.55",
            "--fps-delay", cfg["fps_delay"],
            "--backend-url", "http://127.0.0.1:8000/events",
            "--loop"
        ]
        proc = subprocess.Popen(cmd, cwd=base_dir)
        live_detector_processes.append(proc)
        started.append({"bus_id": cfg["bus_id"], "pid": proc.pid})

    return {
        "status": "started",
        "message": "Live intersecting buses running in Arumbakkam (DG Vaishnav College)",
        "buses": started
    }


@app.post("/stop_live_detect")
def stop_live_detect():
    """
    Stops all currently running live edge detector subprocesses.
    """
    global live_detector_processes
    stopped = 0
    for p in live_detector_processes:
        try:
            if p.poll() is None:
                p.terminate()
                stopped += 1
        except Exception:
            pass
    live_detector_processes = []
    return {"status": "stopped", "count": stopped}


# Serve built React frontend in production / Docker mode
frontend_dist_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(frontend_dist_path):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
