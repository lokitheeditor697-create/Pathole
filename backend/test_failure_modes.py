"""
Automated verification for failure modes:
- Mode 4: Duplicate bus_id submission (bus_count stays 1, total_detections increments)
- Mode 5: Database file deleted while backend is running (auto-recovery, no 500)
"""

import os
import time
import requests
from datetime import datetime, timezone

BASE_URL = "http://127.0.0.1:8000"
DB_PATH = os.path.join(os.path.dirname(__file__), "road_defects.db")

def test_duplicate_bus_id():
    print("\n--- Test: Duplicate bus_id submission ---")
    ts_now = datetime.now(timezone.utc).isoformat()
    bus_tag = f"BUS_DUP_{int(time.time())}"
    
    # Use distinct coordinates far from other tests
    lat = 37.950000
    lon = -122.550000

    event1 = {
        "type": "pothole",
        "confidence": 0.82,
        "severity": "High",
        "latitude": lat,
        "longitude": lon,
        "timestamp": ts_now,
        "bus_id": bus_tag
    }
    r1 = requests.post(f"{BASE_URL}/events", json=event1)
    assert r1.status_code in (200, 201), f"Expected 200/201, got {r1.status_code}"
    res1 = r1.json()
    defect1 = res1.get("defect", {})
    print(f"First event from {bus_tag}: id={defect1.get('id')}, bus_count={defect1.get('bus_count')}, total_detections={defect1.get('total_detections')}")
    assert defect1.get("bus_count") == 1
    assert defect1.get("total_detections") == 1

    # Second event: same bus_id, 5 seconds later, exact same location
    event2 = {
        "type": "pothole",
        "confidence": 0.88,
        "severity": "High",
        "latitude": lat + 0.000005,
        "longitude": lon + 0.000005,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "bus_id": bus_tag  # SAME BUS
    }
    r2 = requests.post(f"{BASE_URL}/events", json=event2)
    assert r2.status_code in (200, 201), f"Expected 200/201, got {r2.status_code}"
    res2 = r2.json()
    defect2 = res2.get("defect", {})
    print(f"Second event from {bus_tag}: id={defect2.get('id')}, bus_count={defect2.get('bus_count')}, total_detections={defect2.get('total_detections')}")
    
    assert defect2.get("id") == defect1.get("id"), f"Expected defect IDs to match ({defect1.get('id')} vs {defect2.get('id')})"
    assert defect2.get("bus_count") == 1, f"Expected bus_count=1, got {defect2.get('bus_count')}"
    assert defect2.get("total_detections") == 2, f"Expected total_detections=2, got {defect2.get('total_detections')}"
    print("[PASS] Duplicate bus_id test passed: bus_count remained 1, total_detections incremented to 2.")

def test_db_file_deleted():
    print("\n--- Test: Database file deleted while backend is running ---")
    r_before = requests.get(f"{BASE_URL}/events")
    assert r_before.status_code == 200
    
    print(f"Deleting/truncating DB file: {DB_PATH}")
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
            print("Successfully deleted road_defects.db")
        except PermissionError:
            with open(DB_PATH, "w") as f:
                f.truncate(0)
            print("Successfully truncated road_defects.db to 0 bytes")
    
    r_after = requests.get(f"{BASE_URL}/events")
    print(f"GET /events status code after DB deletion: {r_after.status_code}")
    assert r_after.status_code == 200, f"Expected 200, got {r_after.status_code}: {r_after.text}"
    data = r_after.json()
    print(f"GET /events response length: {len(data)} items")
    
    new_event = {
        "type": "pothole",
        "confidence": 0.77,
        "severity": "High",
        "latitude": 37.770000,
        "longitude": -122.410000,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "bus_id": "BUS_HEAL"
    }
    r_insert = requests.post(f"{BASE_URL}/events", json=new_event)
    print(f"POST /events status code after DB recreation: {r_insert.status_code}")
    assert r_insert.status_code in (200, 201), f"Expected 200/201, got {r_insert.status_code}: {r_insert.text}"
    print("[PASS] Self-healing DB test passed: backend auto-recreated schema without 500 errors.")

if __name__ == "__main__":
    test_duplicate_bus_id()
    test_db_file_deleted()
