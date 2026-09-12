"""
Strict Verification and Boundary Test Suite for Backend Deduplication and SQLite Storage.
"""

import math
from datetime import datetime, timezone, timedelta
from backend.database import (
    init_db,
    reset_database,
    process_and_deduplicate_event,
    get_all_defects,
    get_statistics,
    get_db_connection,
    haversine_distance
)


def calculate_offset_coords(lat: float, lon: float, distance_meters: float) -> tuple:
    """Calculate new coordinates exactly distance_meters north of (lat, lon)."""
    # 1 meter of latitude ~ 1 / 111139 degrees
    delta_lat = distance_meters / 111139.0
    new_lat = lat + delta_lat
    # Verify exact haversine distance
    actual_dist = haversine_distance(lat, lon, new_lat, lon)
    return new_lat, lon, actual_dist


def run_all_tests():
    init_db()
    reset_database()
    print("=" * 70)
    print("BACKEND STRICT VALIDATION & BOUNDARY TEST SUITE")
    print("=" * 70)

    # -------------------------------------------------------------
    # Test 1: Basic Ingestion and Deduplication Merge
    # -------------------------------------------------------------
    print("\n[TEST 1] Ingestion & Deduplication Merge")
    now = datetime(2026, 9, 10, 12, 0, 0, tzinfo=timezone.utc)
    ev1 = {
        "type": "pothole",
        "confidence": 0.80,
        "severity": "High",
        "latitude": 37.774900,
        "longitude": -122.419400,
        "timestamp": now.isoformat(),
        "bus_id": "BUS_01"
    }
    def1, m1 = process_and_deduplicate_event(ev1)
    print(f" -> Event 1: ID={def1['id']}, Merged={m1}, BusCount={def1['bus_count']}, Conf={def1['confidence']}")
    assert not m1, "Event 1 must create a new record"
    assert def1["bus_count"] == 1

    ev2 = {
        "type": "pothole",
        "confidence": 0.90,
        "severity": "High",
        "latitude": 37.774935,  # ~4m away
        "longitude": -122.419420,
        "timestamp": (now + timedelta(seconds=120)).isoformat(),
        "bus_id": "BUS_02"
    }
    def2, m2 = process_and_deduplicate_event(ev2)
    print(f" -> Event 2: ID={def2['id']}, Merged={m2}, BusCount={def2['bus_count']}, Buses={def2['bus_ids']}, AvgConf={def2['confidence']}")
    assert m2, "Event 2 within ~4m and 2 min must merge"
    assert def2["id"] == def1["id"]
    assert def2["bus_count"] == 2
    assert def2["confidence"] == 0.85, f"Expected 0.85, got {def2['confidence']}"
    assert "BUS_01" in def2["bus_ids"] and "BUS_02" in def2["bus_ids"]
    print("   [PASS]: Basic deduplication and confidence averaging verified.")

    # -------------------------------------------------------------
    # Test 2: Spatial Boundary Conditions (14.9m vs 15.1m)
    # -------------------------------------------------------------
    print("\n[TEST 2] Spatial Boundary Conditions (14.9m vs 15.1m)")
    base_lat, base_lon = 37.780000, -122.410000
    base_time = datetime(2026, 9, 10, 14, 0, 0, tzinfo=timezone.utc)

    # Base defect at (37.780000, -122.410000)
    ev_base = {
        "type": "pothole",
        "confidence": 0.75,
        "severity": "High",
        "latitude": base_lat,
        "longitude": base_lon,
        "timestamp": base_time.isoformat(),
        "bus_id": "BUS_SPATIAL_BASE"
    }
    def_base, m_base = process_and_deduplicate_event(ev_base)
    print(f" -> Base Defect created: ID={def_base['id']} at ({base_lat:.6f}, {base_lon:.6f})")

    # 2a: Event at exactly 14.9 meters apart -> SHOULD MERGE
    lat_14_9, lon_14_9, dist_14_9 = calculate_offset_coords(base_lat, base_lon, 14.9)
    print(f" -> Testing 14.9m distance: calculated actual dist = {dist_14_9:.2f} meters")
    ev_14_9 = {
        "type": "pothole",
        "confidence": 0.85,
        "severity": "High",
        "latitude": lat_14_9,
        "longitude": lon_14_9,
        "timestamp": (base_time + timedelta(seconds=60)).isoformat(),
        "bus_id": "BUS_14_9M"
    }
    def_14_9, m_14_9 = process_and_deduplicate_event(ev_14_9)
    print(f"    Result 14.9m: Merged={m_14_9}, Target Defect ID={def_14_9['id']}, BusCount={def_14_9['bus_count']}")
    assert m_14_9 is True, f"14.9m event must merge into existing defect! (Actual dist: {dist_14_9})"
    assert def_14_9["id"] == def_base["id"], "14.9m event must merge into base defect ID"
    print("   [PASS]: 14.9m boundary successfully MERGED.")
    
    # 2b: Event at exactly 15.1 meters apart from the defect -> SHOULD NOT MERGE
    # Place a fresh base defect to avoid centroid drift
    lat_iso_base, lon_iso_base = 37.790000, -122.405000
    ev_iso = {
        "type": "pothole",
        "confidence": 0.70,
        "severity": "Medium",
        "latitude": lat_iso_base,
        "longitude": lon_iso_base,
        "timestamp": base_time.isoformat(),
        "bus_id": "BUS_ISO_BASE"
    }
    def_iso, _ = process_and_deduplicate_event(ev_iso)

    lat_15_1, lon_15_1, dist_15_1 = calculate_offset_coords(lat_iso_base, lon_iso_base, 15.1)
    print(f" -> Testing 15.1m distance: calculated actual dist = {dist_15_1:.2f} meters")
    ev_15_1 = {
        "type": "pothole",
        "confidence": 0.75,
        "severity": "High",
        "latitude": lat_15_1,
        "longitude": lon_15_1,
        "timestamp": (base_time + timedelta(seconds=60)).isoformat(),
        "bus_id": "BUS_15_1M"
    }
    def_15_1, m_15_1 = process_and_deduplicate_event(ev_15_1)
    print(f"    Result 15.1m: Merged={m_15_1}, New Defect ID={def_15_1['id']} (Iso Base ID={def_iso['id']})")
    assert m_15_1 is False, f"15.1m event must NOT merge! (Actual dist: {dist_15_1})"
    assert def_15_1["id"] != def_iso["id"], "15.1m event must create a separate record"
    print("   [PASS]: 15.1m boundary successfully REJECTED from merging.")

    # -------------------------------------------------------------
    # Test 3: Temporal Boundary Conditions (599s vs 601s)
    # -------------------------------------------------------------
    print("\n[TEST 3] Temporal Boundary Conditions (599s vs 601s at same location)")
    time_base = datetime(2026, 9, 10, 16, 0, 0, tzinfo=timezone.utc)
    t_lat, t_lon = 37.760000, -122.430000

    # Base defect
    ev_t_base = {
        "type": "pothole",
        "confidence": 0.80,
        "severity": "High",
        "latitude": t_lat,
        "longitude": t_lon,
        "timestamp": time_base.isoformat(),
        "bus_id": "BUS_TIME_BASE"
    }
    def_t_base, _ = process_and_deduplicate_event(ev_t_base)
    print(f" -> Base Defect for Time Test: ID={def_t_base['id']} at {time_base.isoformat()}")

    # 3a: Event 599 seconds (9m 59s) later -> SHOULD MERGE
    time_599 = time_base + timedelta(seconds=599)
    ev_599 = {
        "type": "pothole",
        "confidence": 0.84,
        "severity": "High",
        "latitude": t_lat,
        "longitude": t_lon,
        "timestamp": time_599.isoformat(),
        "bus_id": "BUS_599S"
    }
    def_599, m_599 = process_and_deduplicate_event(ev_599)
    print(f" -> Testing 599s difference: Merged={m_599}, Target Defect ID={def_599['id']}")
    assert m_599 is True, "Event 599s later (within 600s window) must merge"
    assert def_599["id"] == def_t_base["id"], "Event 599s must merge into same record"
    print("   [PASS]: 599s boundary successfully MERGED.")

    # 3b: Event 601 seconds (10m 1s) later -> SHOULD NOT MERGE
    # Place a fresh defect at time_base_2 to test pure 601s gap
    time_base_2 = datetime(2026, 9, 10, 18, 0, 0, tzinfo=timezone.utc)
    t2_lat, t2_lon = 37.765000, -122.435000
    ev_t2 = {
        "type": "pothole",
        "confidence": 0.78,
        "severity": "High",
        "latitude": t2_lat,
        "longitude": t2_lon,
        "timestamp": time_base_2.isoformat(),
        "bus_id": "BUS_T2_BASE"
    }
    def_t2, _ = process_and_deduplicate_event(ev_t2)

    time_601 = time_base_2 + timedelta(seconds=601)
    ev_601 = {
        "type": "pothole",
        "confidence": 0.82,
        "severity": "High",
        "latitude": t2_lat,
        "longitude": t2_lon,
        "timestamp": time_601.isoformat(),
        "bus_id": "BUS_601S"
    }
    def_601, m_601 = process_and_deduplicate_event(ev_601)
    print(f" -> Testing 601s difference: Merged={m_601}, Defect ID={def_601['id']} (Base ID={def_t2['id']})")
    assert m_601 is False, "Event 601s later (exceeding 600s window) must NOT merge"
    assert def_601["id"] != def_t2["id"], "Event 601s later must create a new defect"
    print("   [PASS]: 601s boundary successfully REJECTED from merging.")

    # -------------------------------------------------------------
    # Test 4: Database Consistency & Stats Verification
    # -------------------------------------------------------------
    print("\n[TEST 4] Database Consistency & Stats Cross-Check")
    stats = get_statistics()
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("SELECT COUNT(*) FROM verified_defects")
    db_total_defects = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM raw_events")
    db_total_raw = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM verified_defects WHERE bus_count > 1")
    db_multi_bus = c.fetchone()[0]
    conn.close()

    print(f" -> Stats API total_defects       : {stats['total_defects']} == DB: {db_total_defects}")
    print(f" -> Stats API total_raw_events   : {stats['total_raw_events']} == DB: {db_total_raw}")
    print(f" -> Stats API multi_bus_verified : {stats['multi_bus_verified']} == DB: {db_multi_bus}")

    assert stats["total_defects"] == db_total_defects, "Stats total_defects mismatch"
    assert stats["total_raw_events"] == db_total_raw, "Stats total_raw_events mismatch"
    assert stats["multi_bus_verified"] == db_multi_bus, "Stats multi_bus_verified mismatch"
    print("   [PASS]: Stats API perfectly matches direct SQLite database queries.")

    print("\n" + "=" * 70)
    print(">>> ALL STRICT BACKEND & BOUNDARY TESTS PASSED SUCCESSFULLY! <<<")
    print("=" * 70)


if __name__ == "__main__":
    run_all_tests()
