"""
SQLite Database and Deduplication Logic for Road Defects
"""

import math
import os
import sqlite3
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple

DB_PATH = os.path.join(os.path.dirname(__file__), "road_defects.db")


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees) in meters.
    """
    # Convert decimal degrees to radians
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    r = 6371000.0  # Radius of Earth in meters
    return r * c


def parse_iso_timestamp(ts_str: str) -> datetime:
    """Parse ISO timestamp with fallback."""
    try:
        # Handle 'Z' or '+00:00'
        if ts_str.endswith("Z"):
            ts_str = ts_str[:-1] + "+00:00"
        return datetime.fromisoformat(ts_str)
    except Exception:
        return datetime.now(timezone.utc)


def ensure_schema(conn: sqlite3.Connection):
    """Ensure database tables and indices exist."""
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS verified_defects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            defect_type TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            severity TEXT NOT NULL,
            confidence REAL NOT NULL,
            bus_count INTEGER NOT NULL DEFAULT 1,
            bus_ids TEXT NOT NULL,
            total_detections INTEGER NOT NULL DEFAULT 1,
            first_detected TEXT NOT NULL,
            last_detected TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS raw_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            confidence REAL NOT NULL,
            severity TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            timestamp TEXT NOT NULL,
            bus_id TEXT NOT NULL,
            defect_id INTEGER,
            FOREIGN KEY(defect_id) REFERENCES verified_defects(id)
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_defects_type ON verified_defects(defect_type);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_defects_coords ON verified_defects(latitude, longitude);")
    conn.commit()


def get_db_connection() -> sqlite3.Connection:
    """Get SQLite database connection with row factory, self-healing if db was deleted."""
    needs_schema = not os.path.exists(DB_PATH) or os.path.getsize(DB_PATH) == 0
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    if needs_schema:
        ensure_schema(conn)
    return conn


def init_db():
    """Initialize database tables."""
    conn = get_db_connection()
    ensure_schema(conn)
    conn.close()


def process_and_deduplicate_event(event_data: Dict[str, Any]) -> Tuple[Dict[str, Any], bool]:
    """
    Deduplication logic:
    Check if an existing defect of the same type exists within ~15 meters
    and within a 10-minute window (600s).
    If so, merge them into a 'verified defect' record with a bus count and averaged confidence.
    Otherwise, create a new defect record.
    
    Returns (defect_record, is_merged)
    """
    event_type = event_data["type"].lower()
    event_conf = float(event_data["confidence"])
    event_lat = float(event_data["latitude"])
    event_lon = float(event_data["longitude"])
    event_time_str = event_data.get("timestamp") or datetime.now(timezone.utc).isoformat()
    event_time = parse_iso_timestamp(event_time_str)
    bus_id = str(event_data.get("bus_id", "UNKNOWN")).strip()

    conn = get_db_connection()
    cursor = conn.cursor()

    # Query recent candidates of the same defect type
    cursor.execute("""
        SELECT * FROM verified_defects
        WHERE defect_type = ?
    """, (event_type,))
    candidates = cursor.fetchall()

    matched_defect = None
    min_dist = float("inf")

    for cand in candidates:
        cand_lat = cand["latitude"]
        cand_lon = cand["longitude"]
        dist_meters = haversine_distance(event_lat, event_lon, cand_lat, cand_lon)

        if dist_meters <= 15.0:
            cand_last_time = parse_iso_timestamp(cand["last_detected"])
            time_diff_sec = abs((event_time - cand_last_time).total_seconds())

            if time_diff_sec <= 600.0:  # 10 minutes window
                if dist_meters < min_dist:
                    min_dist = dist_meters
                    matched_defect = cand

    if matched_defect:
        # Merge into existing verified defect
        defect_id = matched_defect["id"]
        existing_buses = [b.strip() for b in matched_defect["bus_ids"].split(",") if b.strip()]
        if bus_id not in existing_buses:
            existing_buses.append(bus_id)
        
        new_bus_count = len(existing_buses)
        old_total = matched_defect["total_detections"]
        new_total = old_total + 1
        
        # Calculate new running averaged confidence
        new_avg_conf = round(((matched_defect["confidence"] * old_total) + event_conf) / new_total, 3)
        
        # Derive severity from new averaged confidence (calibrated for real-world pothole models)
        if new_avg_conf >= 0.70:
            new_severity = "High"
        elif new_avg_conf >= 0.55:
            new_severity = "Medium"
        else:
            new_severity = "Low"

        # Update centroid coordinates slightly towards new point
        new_lat = round(matched_defect["latitude"] * 0.7 + event_lat * 0.3, 6)
        new_lon = round(matched_defect["longitude"] * 0.7 + event_lon * 0.3, 6)

        cursor.execute("""
            UPDATE verified_defects
            SET latitude = ?,
                longitude = ?,
                confidence = ?,
                severity = ?,
                bus_count = ?,
                bus_ids = ?,
                total_detections = ?,
                last_detected = ?
            WHERE id = ?
        """, (
            new_lat,
            new_lon,
            new_avg_conf,
            new_severity,
            new_bus_count,
            ",".join(existing_buses),
            new_total,
            event_time_str,
            defect_id
        ))

        # Log raw event
        cursor.execute("""
            INSERT INTO raw_events (type, confidence, severity, latitude, longitude, timestamp, bus_id, defect_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (event_type, event_conf, event_data.get("severity", "Medium"),
              event_lat, event_lon, event_time_str, bus_id, defect_id))

        conn.commit()

        cursor.execute("SELECT * FROM verified_defects WHERE id = ?", (defect_id,))
        updated_defect = dict(cursor.fetchone())
        conn.close()
        return updated_defect, True

    else:
        # Create a new verified defect record
        severity = event_data.get("severity")
        if not severity:
            if event_conf >= 0.70:
                severity = "High"
            elif event_conf >= 0.55:
                severity = "Medium"
            else:
                severity = "Low"

        cursor.execute("""
            INSERT INTO verified_defects (
                defect_type, latitude, longitude, severity, confidence,
                bus_count, bus_ids, total_detections, first_detected, last_detected
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event_type,
            event_lat,
            event_lon,
            severity,
            round(event_conf, 3),
            1,
            bus_id,
            1,
            event_time_str,
            event_time_str
        ))
        defect_id = cursor.lastrowid

        # Log raw event
        cursor.execute("""
            INSERT INTO raw_events (type, confidence, severity, latitude, longitude, timestamp, bus_id, defect_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (event_type, event_conf, severity, event_lat, event_lon, event_time_str, bus_id, defect_id))

        conn.commit()

        cursor.execute("SELECT * FROM verified_defects WHERE id = ?", (defect_id,))
        new_defect = dict(cursor.fetchone())
        conn.close()
        return new_defect, False


def get_all_defects() -> List[Dict[str, Any]]:
    """Retrieve all verified defects ordered by last_detected desc."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM verified_defects
        ORDER BY last_detected DESC
    """)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # Format bus_ids as list for API consumers
    for r in rows:
        r["bus_list"] = [b.strip() for b in r["bus_ids"].split(",") if b.strip()]
    return rows


def get_statistics() -> Dict[str, Any]:
    """Calculate summary statistics for dashboard charts."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM verified_defects")
    total_defects = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM verified_defects WHERE bus_count > 1")
    multi_bus_verified = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM raw_events")
    total_raw_events = cursor.fetchone()[0]

    cursor.execute("SELECT severity, COUNT(*) FROM verified_defects GROUP BY severity")
    severity_counts = {row[0]: row[1] for row in cursor.fetchall()}

    cursor.execute("SELECT defect_type, COUNT(*) FROM verified_defects GROUP BY defect_type")
    type_counts = {row[0]: row[1] for row in cursor.fetchall()}

    cursor.execute("SELECT DISTINCT bus_id FROM raw_events")
    active_buses = [row[0] for row in cursor.fetchall()]

    conn.close()
    return {
        "total_defects": total_defects,
        "multi_bus_verified": multi_bus_verified,
        "total_raw_events": total_raw_events,
        "severity_counts": severity_counts,
        "type_counts": type_counts,
        "active_buses": active_buses
    }


def reset_database():
    """Clear all records from database and reset autoincrement counters so IDs restart from 1."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM raw_events;")
    cursor.execute("DELETE FROM verified_defects;")
    # Reset SQLite AUTOINCREMENT counters so next insert starts from id=1
    cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('verified_defects', 'raw_events');")
    conn.commit()
    conn.close()
