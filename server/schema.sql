-- ─────────────────────────────────────────────────────────────────────────────
-- GCC Municipal Road Intelligence - PostgreSQL & PostGIS Database Schema
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable PostGIS Spatial Extension for Sub-Meter Geodesic GIS Tracking
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Roads Table
CREATE TABLE IF NOT EXISTS roads (
    road_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    classification VARCHAR(100) NOT NULL,
    total_length_meters NUMERIC(10, 2) NOT NULL,
    surface_type VARCHAR(100) DEFAULT 'Bituminous Asphalt',
    construction_year INT DEFAULT 2021,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Road Segments Table (with spatial LineString geometry)
CREATE TABLE IF NOT EXISTS road_segments (
    segment_id VARCHAR(50) PRIMARY KEY,
    road_id VARCHAR(50) REFERENCES roads(road_id) ON DELETE CASCADE,
    road_name VARCHAR(255) NOT NULL,
    start_chainage_m NUMERIC(10, 2) NOT NULL,
    end_chainage_m NUMERIC(10, 2) NOT NULL,
    length_m NUMERIC(10, 2) NOT NULL,
    start_lat NUMERIC(10, 7) NOT NULL,
    start_lon NUMERIC(10, 7) NOT NULL,
    end_lat NUMERIC(10, 7) NOT NULL,
    end_lon NUMERIC(10, 7) NOT NULL,
    current_health_score INT DEFAULT 85,
    health_grade VARCHAR(50) DEFAULT 'Good',
    active_defect_count INT DEFAULT 0,
    traffic_volume_vpd INT DEFAULT 18500,
    last_scanned_at TIMESTAMPTZ DEFAULT NOW(),
    geom GEOMETRY(LineString, 4326)
);
CREATE INDEX IF NOT EXISTS idx_road_segments_geom ON road_segments USING GIST(geom);

-- 3. Defects Table (Physical pavement defects with Point geometry)
CREATE TABLE IF NOT EXISTS defects (
    id SERIAL PRIMARY KEY,
    detection_id VARCHAR(100) UNIQUE NOT NULL,
    pothole_id VARCHAR(100),
    defect_type VARCHAR(100) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    geom GEOMETRY(Point, 4326),
    severity VARCHAR(50) NOT NULL,
    confidence NUMERIC(5, 3) NOT NULL,
    road_id VARCHAR(50) REFERENCES roads(road_id) ON DELETE SET NULL,
    segment_id VARCHAR(50) REFERENCES road_segments(segment_id) ON DELETE SET NULL,
    exact_chainage_m NUMERIC(10, 2) NOT NULL,
    bus_count INT DEFAULT 1,
    bus_ids TEXT DEFAULT 'MTC 46G',
    reporting_vehicles JSONB DEFAULT '[]'::jsonb,
    total_detections INT DEFAULT 1,
    is_multi_bus_verified BOOLEAN DEFAULT FALSE,
    bbox JSONB,
    snapshot_thumbnail TEXT,
    status VARCHAR(50) DEFAULT 'Open',
    source VARCHAR(50) DEFAULT 'transit_bus',
    first_detected TIMESTAMPTZ DEFAULT NOW(),
    last_detected TIMESTAMPTZ DEFAULT NOW(),
    model_version VARCHAR(100) DEFAULT 'YOLOv8-road-v1'
);
CREATE INDEX IF NOT EXISTS idx_defects_geom ON defects USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_defects_pothole_id ON defects(pothole_id);
CREATE INDEX IF NOT EXISTS idx_defects_road_id ON defects(road_id);

-- 4. Defect Cases Table (Official municipal work orders and closed-loop lifecycle)
CREATE TABLE IF NOT EXISTS defect_cases (
    case_id VARCHAR(100) PRIMARY KEY,
    pothole_id VARCHAR(100),
    defect_id INT REFERENCES defects(id) ON DELETE SET NULL,
    detection_id VARCHAR(100),
    defect_type VARCHAR(100) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    road_id VARCHAR(50) REFERENCES roads(road_id) ON DELETE SET NULL,
    road_name VARCHAR(255) NOT NULL,
    segment_id VARCHAR(50) REFERENCES road_segments(segment_id) ON DELETE SET NULL,
    exact_chainage_m NUMERIC(10, 2) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    geom GEOMETRY(Point, 4326),
    severity VARCHAR(50) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    assigned_contractor VARCHAR(255),
    assigned_team VARCHAR(255),
    assigned_person VARCHAR(255),
    target_completion_date VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reported_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    assigned_at TIMESTAMPTZ,
    work_started_at TIMESTAMPTZ,
    repair_completed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    before_evidence JSONB,
    after_evidence JSONB,
    recurrence_count INT DEFAULT 0,
    previous_case_ids JSONB DEFAULT '[]'::jsonb,
    deterioration_detected BOOLEAN DEFAULT FALSE,
    verified_repaired_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_defect_cases_geom ON defect_cases USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_defect_cases_status ON defect_cases(status);
CREATE INDEX IF NOT EXISTS idx_defect_cases_pothole_id ON defect_cases(pothole_id);

-- 5. Defect Observations Table (Multi-Bus Temporal Ledger: Bus 101 -> Bus 205 -> 3rd Observation)
CREATE TABLE IF NOT EXISTS defect_observations (
    observation_id VARCHAR(100) PRIMARY KEY,
    case_id VARCHAR(100) REFERENCES defect_cases(case_id) ON DELETE CASCADE,
    pothole_id VARCHAR(100),
    observation_number INT NOT NULL,
    vehicle_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    geom GEOMETRY(Point, 4326),
    exact_chainage_m NUMERIC(10, 2) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    confidence NUMERIC(5, 3) NOT NULL,
    width_cm NUMERIC(6, 2) NOT NULL,
    length_cm NUMERIC(6, 2) NOT NULL,
    area_sq_cm NUMERIC(10, 2),
    deterioration_notes TEXT,
    snapshot_thumbnail TEXT
);
CREATE INDEX IF NOT EXISTS idx_defect_observations_case_id ON defect_observations(case_id);
CREATE INDEX IF NOT EXISTS idx_defect_observations_geom ON defect_observations USING GIST(geom);

-- 6. Case Lifecycle Events Table (Audit Trail)
CREATE TABLE IF NOT EXISTS case_events (
    id VARCHAR(100) PRIMARY KEY,
    case_id VARCHAR(100) REFERENCES defect_cases(case_id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    notes TEXT,
    metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_case_events_case_id ON case_events(case_id);

-- 7. Case Communications Table (WhatsApp, Telegram, Email to Officers)
CREATE TABLE IF NOT EXISTS case_communications (
    id VARCHAR(100) PRIMARY KEY,
    case_id VARCHAR(100) REFERENCES defect_cases(case_id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) NOT NULL,
    message_id VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    payload JSONB
);
CREATE INDEX IF NOT EXISTS idx_case_communications_case_id ON case_communications(case_id);
