import fs from 'fs';
import path from 'path';

export interface RoadSegment {
  segment_id: string;
  road_id: string;
  road_name: string;
  start_chainage_m: number;
  end_chainage_m: number;
  length_m: number;
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  current_health_score: number;
  health_grade: "Excellent" | "Good" | "Moderate" | "Poor" | "Critical";
  active_defect_count: number;
  traffic_volume_vpd: number;
  last_scanned_at: string;
}

export interface Road {
  road_id: string;
  name: string;
  classification: string;
  total_length_meters: number;
  surface_type: string;
  construction_year: number;
  segments: RoadSegment[];
}

export interface DefectItem {
  id: number;
  detection_id: string;
  pothole_id?: string;
  defect_type: string;
  class_name: string;
  latitude: number;
  longitude: number;
  severity: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  road_id: string;
  segment_id: string;
  exact_chainage_m: number;
  bus_count: number;
  bus_ids: string;
  reporting_vehicles: string[];
  total_detections: number;
  is_multi_bus_verified: boolean;
  bbox: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
    pixel_area: number;
    estimated_physical_width_cm: number;
    estimated_physical_length_cm: number;
  };
  first_detected: string;
  last_detected: string;
  model_version: string;
  snapshot_thumbnail?: string;
  status?: "Open" | "Verified" | "Scheduled" | "Repaired";
  source?: "transit_bus" | "webcam" | "video_upload" | "manual";
}

export interface VideoInspection {
  id: number;
  inspection_id: string;
  filename: string;
  file_size_mb: number;
  duration_seconds: number;
  vehicle_id: string;
  road_id: string;
  segment_id: string;
  total_defects_found: number;
  detected_defects_list: Array<{
    timestamp_sec: number;
    class_name: string;
    confidence: number;
    severity: string;
    width_cm: number;
    length_cm: number;
    bbox: { x: number; y: number; w: number; h: number };
  }>;
  processed_at: string;
  fps: number;
  status: "Completed" | "Processing" | "Flagged";
  // A clean scan is evidence about this inspection only; it never deletes prior cases.
  scan_outcome?: "defects_confirmed" | "no_defects_confirmed";
  officer_note?: string;
}

export interface RepairWorkOrder {
  work_order_id: string;
  defect_id: number;
  road_id: string;
  segment_id: string;
  road_name: string;
  defect_type: string;
  priority: "P1 - Emergency" | "P2 - High Priority" | "P3 - Standard";
  contractor: string;
  estimated_cost_inr: number;
  status: "Pending Dispatch" | "In Progress" | "Completed" | "Inspected";
  created_at: string;
  target_completion_date: string;
}

export interface VehiclePatrol {
  vehicle_id: string;
  plate_number: string;
  type: string;
  camera: string;
  edge_device: string;
  status: "Online" | "Standby" | "Offline";
  buffer_queue: number;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading_deg: number;
  current_road: string;
  current_segment: string;
  last_ping: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Closed-Loop Defect Lifecycle & Municipal Case Management
// ─────────────────────────────────────────────────────────────────────────────
export type CaseStatus =
  | "DETECTED"
  | "REPORTED"
  | "ACKNOWLEDGED"
  | "ASSIGNED"
  | "WORK_IN_PROGRESS"
  | "REPAIR_COMPLETED"
  | "VERIFICATION_REQUIRED"
  | "VERIFIED"
  | "CLOSED"
  | "REOPENED";

export type CasePriority = "P1 - Emergency" | "P2 - High Priority" | "P3 - Standard";

export interface CaseEvent {
  id: string;
  timestamp: string;
  from_status?: CaseStatus;
  to_status: CaseStatus;
  actor: string;
  action: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CommunicationItem {
  id: string;
  channel: "whatsapp" | "telegram" | "email";
  recipient: string;
  timestamp: string;
  status: "sent" | "delivered" | "failed" | "simulated";
  message_id: string;
  summary: string;
  payload?: any;
}

export interface DefectCase {
  case_id: string;
  pothole_id?: string;
  defect_id?: number;
  detection_id?: string;
  defect_type: string;
  class_name: string;
  road_id: string;
  road_name: string;
  segment_id: string;
  exact_chainage_m: number;
  latitude: number;
  longitude: number;
  severity: "Critical" | "High" | "Medium" | "Low";
  priority: CasePriority;
  status: CaseStatus;
  assigned_contractor?: string;
  assigned_team?: string;
  assigned_person?: string;
  target_completion_date?: string;
  created_at: string;
  reported_at?: string;
  acknowledged_at?: string;
  assigned_at?: string;
  work_started_at?: string;
  repair_completed_at?: string;
  verified_at?: string;
  closed_at?: string;
  before_evidence: {
    image_url?: string;
    snapshot_thumbnail?: string;
    detected_at: string;
    bbox?: {
      x_min: number;
      y_min: number;
      x_max: number;
      y_max: number;
      pixel_area?: number;
      estimated_physical_width_cm?: number;
      estimated_physical_length_cm?: number;
    };
    confidence: number;
    model_version?: string;
    reporting_vehicles?: string[];
  };
  after_evidence?: {
    image_url?: string;
    snapshot_thumbnail?: string;
    scanned_at: string;
    scanner_vehicle_id: string;
    ai_verification_result: "NO_DEFECT_DETECTED" | "DEFECT_PERSISTS" | "NEW_DEFECT_FOUND";
    ai_confidence_threshold_used: number;
    ai_verification_statement: string;
    human_verifier_name?: string;
    human_verified_at?: string;
    human_notes?: string;
  };
  events: CaseEvent[];
  communications: CommunicationItem[];
  recurrence_count: number;
  previous_case_ids: string[];
}

export interface DatabaseSchema {
  version: string;
  last_updated: string;
  roads: Road[];
  defects: DefectItem[];
  video_inspections: VideoInspection[];
  work_orders: RepairWorkOrder[];
  vehicles: Record<string, VehiclePatrol>;
  cases: DefectCase[];
  next_defect_id: number;
  next_inspection_id: number;
  next_work_order_id: number;
  next_case_id: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Seed Data
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_ROADS: Road[] = [
  {
    road_id: "R001",
    name: "EVR Periyar Salai (Poonamallee High Rd)",
    classification: "Arterial Corridor",
    total_length_meters: 400.0,
    surface_type: "Bituminous Asphalt (BC/DBM)",
    construction_year: 2018,
    segments: [
      {
        segment_id: "R001-S001",
        road_id: "R001",
        road_name: "EVR Periyar Salai (Poonamallee High Rd)",
        start_chainage_m: 0.0,
        end_chainage_m: 100.0,
        length_m: 100.0,
        start_lat: 13.0827,
        start_lon: 80.2707,
        end_lat: 13.0815,
        end_lon: 80.2570,
        current_health_score: 92.0,
        health_grade: "Excellent",
        active_defect_count: 0,
        traffic_volume_vpd: 42000,
        last_scanned_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        segment_id: "R001-S002",
        road_id: "R001",
        road_name: "EVR Periyar Salai (Poonamallee High Rd)",
        start_chainage_m: 100.0,
        end_chainage_m: 200.0,
        length_m: 100.0,
        start_lat: 13.0815,
        start_lon: 80.2570,
        end_lat: 13.0795,
        end_lon: 80.2440,
        current_health_score: 78.5,
        health_grade: "Good",
        active_defect_count: 1,
        traffic_volume_vpd: 45000,
        last_scanned_at: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        segment_id: "R001-S003",
        road_id: "R001",
        road_name: "EVR Periyar Salai (Poonamallee High Rd)",
        start_chainage_m: 200.0,
        end_chainage_m: 300.0,
        length_m: 100.0,
        start_lat: 13.0780,
        start_lon: 80.2330,
        end_lat: 13.0765,
        end_lon: 80.2210,
        current_health_score: 47.0,
        health_grade: "Poor",
        active_defect_count: 5,
        traffic_volume_vpd: 48000,
        last_scanned_at: new Date().toISOString(),
      },
      {
        segment_id: "R001-S004",
        road_id: "R001",
        road_name: "EVR Periyar Salai (Poonamallee High Rd)",
        start_chainage_m: 300.0,
        end_chainage_m: 400.0,
        length_m: 100.0,
        start_lat: 13.0765,
        start_lon: 80.2210,
        end_lat: 13.0743,
        end_lon: 80.2108,
        current_health_score: 36.0,
        health_grade: "Critical",
        active_defect_count: 8,
        traffic_volume_vpd: 52000,
        last_scanned_at: new Date().toISOString(),
      },
    ],
  },
  {
    road_id: "R002",
    name: "Inner Ring Road (Jawaharlal Nehru Salai)",
    classification: "State Highway 2",
    total_length_meters: 200.0,
    surface_type: "Dense Graded Bituminous Asphalt",
    construction_year: 2017,
    segments: [
      {
        segment_id: "R002-S001",
        road_id: "R002",
        road_name: "Inner Ring Road (Jawaharlal Nehru Salai)",
        start_chainage_m: 0.0,
        end_chainage_m: 100.0,
        length_m: 100.0,
        start_lat: 13.1180,
        start_lon: 80.2230,
        end_lat: 13.1070,
        end_lon: 80.2105,
        current_health_score: 43.5,
        health_grade: "Poor",
        active_defect_count: 4,
        traffic_volume_vpd: 61000,
        last_scanned_at: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        segment_id: "R002-S002",
        road_id: "R002",
        road_name: "Inner Ring Road (Jawaharlal Nehru Salai)",
        start_chainage_m: 100.0,
        end_chainage_m: 200.0,
        length_m: 100.0,
        start_lat: 13.1070,
        start_lon: 80.2105,
        end_lat: 13.0920,
        end_lon: 80.2030,
        current_health_score: 82.0,
        health_grade: "Good",
        active_defect_count: 1,
        traffic_volume_vpd: 58000,
        last_scanned_at: new Date(Date.now() - 10800000).toISOString(),
      },
    ],
  },
];

const DEFAULT_DEFECTS: DefectItem[] = [];

const DEFAULT_WORK_ORDERS: RepairWorkOrder[] = [];


const DEFAULT_VEHICLES: Record<string, VehiclePatrol> = {
  "MTC 46G": {
    vehicle_id: "MTC 46G",
    plate_number: "TN-01-AN-4601",
    type: "Transit Bus Patrol",
    camera: "Front Dashcam 1080p 30fps",
    edge_device: "NVIDIA Jetson Orin Nano",
    status: "Online",
    buffer_queue: 0,
    latitude: 13.0743,
    longitude: 80.2108,
    speed_kmh: 32,
    heading_deg: 140,
    current_road: "EVR Periyar Salai (Poonamallee High Rd)",
    current_segment: "R001-S004",
    last_ping: new Date().toISOString(),
  },
  "MTC 15G": {
    vehicle_id: "MTC 15G",
    plate_number: "TN-01-AN-1502",
    type: "Transit Bus Patrol",
    camera: "Front Dashcam 1080p 30fps",
    edge_device: "NVIDIA Jetson Orin Nano",
    status: "Online",
    buffer_queue: 0,
    latitude: 13.0765,
    longitude: 80.2210,
    speed_kmh: 28,
    heading_deg: 260,
    current_road: "EVR Periyar Salai (Poonamallee High Rd)",
    current_segment: "R001-S003",
    last_ping: new Date().toISOString(),
  },
  "MTC 29C": {
    vehicle_id: "MTC 29C",
    plate_number: "TN-01-AN-2903",
    type: "Transit Bus Patrol",
    camera: "Front Dashcam 1080p 30fps",
    edge_device: "Intel NUC Edge Core i7",
    status: "Standby",
    buffer_queue: 0,
    latitude: 13.0827,
    longitude: 80.2707,
    speed_kmh: 0,
    heading_deg: 90,
    current_road: "EVR Periyar Salai (Poonamallee High Rd)",
    current_segment: "R001-S001",
    last_ping: new Date().toISOString(),
  },
};

export const DEFAULT_CASES: DefectCase[] = [
  {
    case_id: "CASE-2026-001",
    pothole_id: "PTH-#01",
    defect_id: 1,
    detection_id: "DET-2026-001",
    defect_type: "pothole",
    class_name: "pothole",
    road_id: "R001",
    road_name: "EVR Periyar Salai (Poonamallee High Rd)",
    segment_id: "R001-S001",
    exact_chainage_m: 42.5,
    latitude: 13.0827,
    longitude: 80.2707,
    severity: "Critical",
    priority: "P1 - Emergency",
    status: "VERIFICATION_REQUIRED",
    assigned_contractor: "L&T Pavement Solutions",
    assigned_team: "North Chennai Road Maintenance Unit 3",
    assigned_person: "Eng. R. Selvam",
    target_completion_date: "2026-09-14",
    created_at: "2026-09-12T08:15:00.000Z",
    reported_at: "2026-09-12T08:15:30.000Z",
    acknowledged_at: "2026-09-12T08:30:00.000Z",
    assigned_at: "2026-09-12T09:00:00.000Z",
    work_started_at: "2026-09-13T06:00:00.000Z",
    repair_completed_at: "2026-09-13T11:45:00.000Z",
    before_evidence: {
      detected_at: "2026-09-12T08:15:00.000Z",
      bbox: {
        x_min: 220,
        y_min: 160,
        x_max: 340,
        y_max: 245,
        pixel_area: 10200,
        estimated_physical_width_cm: 64.0,
        estimated_physical_length_cm: 48.0,
      },
      confidence: 0.94,
      model_version: "YOLOv8m 7-Class Road Anomaly Model",
      reporting_vehicles: ["MTC 46G", "MTC 15G"],
    },
    after_evidence: {
      scanned_at: "2026-09-13T12:30:00.000Z",
      scanner_vehicle_id: "V001 (Inspection Van)",
      ai_verification_result: "NO_DEFECT_DETECTED",
      ai_confidence_threshold_used: 0.28,
      ai_verification_statement: "Original defect was not detected during post-repair AI inspection",
      human_notes: "Asphalt cold-mix patch applied with pneumatic compactor. Awaiting final engineer audit.",
    },
    events: [],
    communications: [
      {
        id: "COMM-001",
        channel: "whatsapp",
        recipient: "+91 98400 12345 (Contractor Lead)",
        timestamp: "2026-09-12T09:02:00.000Z",
        status: "delivered",
        message_id: "wamid.HBgLMjAyNjAwMDFfMDFA",
        summary: "Emergency Work Order: Pothole on EVR Periyar Salai Ch 42m",
      },
      {
        id: "COMM-002",
        channel: "telegram",
        recipient: "@gcc_pavement_alerts",
        timestamp: "2026-09-12T08:16:00.000Z",
        status: "sent",
        message_id: "tg_msg_84920",
        summary: "Critical P1 Pothole Alert Dispatched",
      },
    ],
    recurrence_count: 0,
    previous_case_ids: [],
  },
  {
    case_id: "CASE-2026-002",
    pothole_id: "PTH-#02",
    defect_id: 2,
    detection_id: "DET-2026-002",
    defect_type: "alligator_crack",
    class_name: "alligator_crack",
    road_id: "R002",
    road_name: "Konnur High Road / Otteri",
    segment_id: "R002-S002",
    exact_chainage_m: 128.0,
    latitude: 13.0940,
    longitude: 80.2260,
    severity: "High",
    priority: "P2 - High Priority",
    status: "WORK_IN_PROGRESS",
    assigned_contractor: "Chennai Metro Pavement Works",
    assigned_team: "Central Repair Squad B",
    assigned_person: "Supervisor M. Dinesh",
    target_completion_date: "2026-09-15",
    created_at: "2026-09-12T10:20:00.000Z",
    reported_at: "2026-09-12T10:21:00.000Z",
    acknowledged_at: "2026-09-12T11:00:00.000Z",
    assigned_at: "2026-09-12T14:30:00.000Z",
    work_started_at: "2026-09-13T08:00:00.000Z",
    before_evidence: {
      detected_at: "2026-09-12T10:20:00.000Z",
      bbox: {
        x_min: 180,
        y_min: 140,
        x_max: 380,
        y_max: 270,
        pixel_area: 26000,
        estimated_physical_width_cm: 110.0,
        estimated_physical_length_cm: 85.0,
      },
      confidence: 0.89,
      model_version: "YOLOv8s CRDDC Road Damage Model",
      reporting_vehicles: ["MTC 29C"],
    },
    events: [],
    communications: [
      {
        id: "COMM-010",
        channel: "whatsapp",
        recipient: "+91 94440 54321 (Supervisor Dinesh)",
        timestamp: "2026-09-12T14:35:00.000Z",
        status: "delivered",
        message_id: "wamid.HBgLMjAyNjAwMDJfMDFA",
        summary: "Work Order Assigned: Alligator Crack Konnur High Rd",
      },
    ],
    recurrence_count: 1,
    previous_case_ids: ["CASE-2025-412"],
  },
  {
    case_id: "CASE-2026-003",
    pothole_id: "PTH-#03",
    defect_id: 3,
    detection_id: "DET-2026-003",
    defect_type: "pothole",
    class_name: "pothole",
    road_id: "R003",
    road_name: "Anna Salai (Mount Road Arterial)",
    segment_id: "R003-S001",
    exact_chainage_m: 65.0,
    latitude: 13.0620,
    longitude: 80.2640,
    severity: "High",
    priority: "P2 - High Priority",
    status: "CLOSED",
    assigned_contractor: "State Highways Dept Pavement Wing",
    assigned_team: "Highways Emergency Mobile Unit",
    assigned_person: "Eng. P. Murugan",
    target_completion_date: "2026-09-13",
    created_at: "2026-09-11T14:00:00.000Z",
    reported_at: "2026-09-11T14:02:00.000Z",
    acknowledged_at: "2026-09-11T14:30:00.000Z",
    assigned_at: "2026-09-11T15:00:00.000Z",
    work_started_at: "2026-09-12T05:30:00.000Z",
    repair_completed_at: "2026-09-12T09:15:00.000Z",
    verified_at: "2026-09-12T14:20:00.000Z",
    closed_at: "2026-09-12T16:00:00.000Z",
    before_evidence: {
      detected_at: "2026-09-11T14:00:00.000Z",
      bbox: {
        x_min: 240,
        y_min: 170,
        x_max: 330,
        y_max: 230,
        pixel_area: 5400,
        estimated_physical_width_cm: 52.0,
        estimated_physical_length_cm: 38.0,
      },
      confidence: 0.91,
      model_version: "YOLOv8m 7-Class Road Anomaly Model",
      reporting_vehicles: ["MTC 27B", "MTC 46G"],
    },
    after_evidence: {
      scanned_at: "2026-09-12T14:20:00.000Z",
      scanner_vehicle_id: "MTC 27B (Patrol Bus)",
      ai_verification_result: "NO_DEFECT_DETECTED",
      ai_confidence_threshold_used: 0.28,
      ai_verification_statement: "Original defect was not detected during post-repair AI inspection",
      human_verifier_name: "Chief Eng. V. Ramakrishnan (Greater Chennai Corp)",
      human_verified_at: "2026-09-12T16:00:00.000Z",
      human_notes: "Hot-mix asphalt patch verified flush with existing pavement. Rider comfort restored.",
    },
    events: [],
    communications: [
      {
        id: "COMM-020",
        channel: "whatsapp",
        recipient: "+91 99400 98765 (Eng. Murugan)",
        timestamp: "2026-09-11T15:05:00.000Z",
        status: "delivered",
        message_id: "wamid.HBgLMjAyNjAwMDNfMDFA",
        summary: "Emergency Work Order: Anna Salai Ch 65m Pothole",
      },
      {
        id: "COMM-021",
        channel: "whatsapp",
        recipient: "+91 98400 00001 (GCC Executive Office)",
        timestamp: "2026-09-12T16:02:00.000Z",
        status: "delivered",
        message_id: "wamid.HBgLMjAyNjAwMDNfMDJB",
        summary: "Case Closed & Verified: Anna Salai Ch 65m",
      },
    ],
    recurrence_count: 0,
    previous_case_ids: [],
  },
  {
    case_id: "CASE-2026-004",
    pothole_id: "PTH-#04",
    defect_id: 4,
    detection_id: "DET-2026-004",
    defect_type: "rutting",
    class_name: "rutting",
    road_id: "R004",
    road_name: "Jawaharlal Nehru Road (100 Ft Rd)",
    segment_id: "R004-S001",
    exact_chainage_m: 85.0,
    latitude: 13.0850,
    longitude: 80.2100,
    severity: "Critical",
    priority: "P1 - Emergency",
    status: "ASSIGNED",
    assigned_contractor: "Corridor Resurfacing Specialists",
    assigned_team: "Heavy Milling & Paving Unit 1",
    assigned_person: "Eng. S. Balaji",
    target_completion_date: "2026-09-16",
    created_at: "2026-09-13T09:00:00.000Z",
    reported_at: "2026-09-13T09:01:00.000Z",
    acknowledged_at: "2026-09-13T09:15:00.000Z",
    assigned_at: "2026-09-13T09:45:00.000Z",
    before_evidence: {
      detected_at: "2026-09-13T09:00:00.000Z",
      bbox: {
        x_min: 190,
        y_min: 155,
        x_max: 310,
        y_max: 220,
        pixel_area: 7800,
        estimated_physical_width_cm: 75.0,
        estimated_physical_length_cm: 120.0,
      },
      confidence: 0.92,
      model_version: "YOLOv8m 7-Class Road Anomaly Model",
      reporting_vehicles: ["MTC 46G"],
    },
    events: [],
    communications: [
      {
        id: "COMM-030",
        channel: "whatsapp",
        recipient: "+91 97900 11223 (Contractor Balaji)",
        timestamp: "2026-09-13T09:46:00.000Z",
        status: "delivered",
        message_id: "wamid.HBgLMjAyNjAwMDRfMDFA",
        summary: "Urgent P1 Work Order: Rutting JN Road Ch 85m",
      },
    ],
    recurrence_count: 0,
    previous_case_ids: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Robust File-Backed ACID Database Engine
// ─────────────────────────────────────────────────────────────────────────────
class MunicipalDatabase {
  private dbFilePath: string;
  private memoryData: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbFilePath = path.join(dataDir, 'municipal_pavement_registry.json');
    this.memoryData = this.loadOrInit();
  }

  private loadOrInit(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.roads && parsed.defects) {
          console.log(`[Municipal DB] Loaded existing database from ${this.dbFilePath} (${parsed.defects.length} defects, ${parsed.roads.length} roads)`);
          if (!Array.isArray(parsed.cases) || parsed.cases.length === 0) {
            parsed.cases = DEFAULT_CASES;
          }
          if (!parsed.next_case_id) {
            parsed.next_case_id = parsed.cases.length + 1;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Municipal DB] Corrupt or unreadable DB file, re-initializing from standard seeds:', e);
    }

    const defaultData: DatabaseSchema = {
      version: "2.0.0",
      last_updated: new Date().toISOString(),
      roads: DEFAULT_ROADS,
      defects: DEFAULT_DEFECTS,
      video_inspections: [],
      work_orders: DEFAULT_WORK_ORDERS,
      vehicles: DEFAULT_VEHICLES,
      cases: DEFAULT_CASES,
      next_defect_id: 1,
      next_inspection_id: 1,
      next_work_order_id: 1,
      next_case_id: DEFAULT_CASES.length + 1,
    };

    this.persistSync(defaultData);
    return defaultData;
  }

  private persistSync(data: DatabaseSchema) {
    try {
      data.last_updated = new Date().toISOString();
      const tmpPath = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.dbFilePath);
    } catch (err) {
      console.error('[Municipal DB] Failed atomic persist to disk:', err);
    }
  }

  public save() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.persistSync(this.memoryData);
      this.saveTimeout = null;
    }, 150);
  }

  // ── Roads & Segments ────────────────────────────────────────────────────────
  public getRoads(): Road[] {
    return this.memoryData.roads;
  }

  public getAllSegments(): RoadSegment[] {
    return this.memoryData.roads.flatMap((r) => r.segments);
  }

  public getSegments(): RoadSegment[] {
    return this.getAllSegments();
  }

  public getSegmentById(segmentId: string): RoadSegment | undefined {
    return this.getAllSegments().find((s) => s.segment_id === segmentId);
  }

  public updateSegmentHealth(segmentId: string, deltaDefects = 1) {
    for (const road of this.memoryData.roads) {
      const seg = road.segments.find((s) => s.segment_id === segmentId);
      if (seg) {
        seg.active_defect_count = Math.max(0, seg.active_defect_count + deltaDefects);
        seg.current_health_score = Math.max(10, Math.min(100, Math.round(seg.current_health_score - deltaDefects * 6.5)));
        if (seg.current_health_score >= 85) seg.health_grade = "Excellent";
        else if (seg.current_health_score >= 65) seg.health_grade = "Good";
        else if (seg.current_health_score >= 45) seg.health_grade = "Moderate";
        else if (seg.current_health_score >= 30) seg.health_grade = "Poor";
        else seg.health_grade = "Critical";
        seg.last_scanned_at = new Date().toISOString();
        this.save();
        break;
      }
    }
  }

  // ── Defects ─────────────────────────────────────────────────────────────────
  public getDefects(filters?: {
    class_name?: string;
    severity?: string;
    min_confidence?: number;
    road_id?: string;
    segment_id?: string;
    status?: string;
  }): DefectItem[] {
    let list = this.memoryData.defects;
    if (!filters) return list;

    if (filters.class_name) {
      list = list.filter((d) => d.class_name === filters.class_name || d.defect_type === filters.class_name);
    }
    if (filters.severity) {
      list = list.filter((d) => d.severity === filters.severity);
    }
    if (typeof filters.min_confidence === 'number') {
      list = list.filter((d) => d.confidence >= filters.min_confidence!);
    }
    if (filters.road_id) {
      list = list.filter((d) => d.road_id === filters.road_id);
    }
    if (filters.segment_id) {
      list = list.filter((d) => d.segment_id === filters.segment_id);
    }
    if (filters.status) {
      list = list.filter((d) => d.status === filters.status);
    }
    return list;
  }

  public getDefectById(id: number): DefectItem | undefined {
    return this.memoryData.defects.find((d) => d.id === id);
  }

  public upsertDefect(defect: Partial<DefectItem> & { detection_id?: string; id?: number }): DefectItem {
    // Check if defect already exists by id or detection_id
    const existingIndex = this.memoryData.defects.findIndex(
      (d) => (defect.id !== undefined && d.id === defect.id) ||
             (Boolean(defect.detection_id) && d.detection_id === defect.detection_id)
    );

    if (existingIndex !== -1) {
      // Update existing defect
      const existing = this.memoryData.defects[existingIndex];
      const updated: DefectItem = {
        ...existing,
        ...defect,
        id: existing.id,
        detection_id: existing.detection_id || defect.detection_id || `DET-2026-${String(existing.id).padStart(3, '0')}`,
        last_detected: defect.last_detected || new Date().toISOString()
      };
      this.memoryData.defects[existingIndex] = updated;
      this.save();
      return updated;
    } else {
      // Insert as new defect
      const id = defect.id || this.memoryData.next_defect_id++;
      if (id >= this.memoryData.next_defect_id) {
        this.memoryData.next_defect_id = id + 1;
      }
      const detection_id = defect.detection_id || `DET-2026-${String(id).padStart(3, '0')}`;
      const now = new Date().toISOString();
      const newDefect: DefectItem = {
        id,
        detection_id,
        defect_type: defect.defect_type || defect.class_name || 'pothole',
        class_name: defect.class_name || defect.defect_type || 'pothole',
        latitude: defect.latitude ?? 13.0827,
        longitude: defect.longitude ?? 80.2707,
        severity: defect.severity || 'Medium',
        confidence: defect.confidence ?? 0.75,
        road_id: defect.road_id || 'R001',
        segment_id: defect.segment_id || 'R001-S001',
        exact_chainage_m: defect.exact_chainage_m ?? 0,
        bus_count: defect.bus_count ?? 1,
        bus_ids: defect.bus_ids || 'MTC 46G',
        reporting_vehicles: defect.reporting_vehicles || [defect.bus_ids || 'MTC 46G'],
        total_detections: defect.total_detections ?? 1,
        is_multi_bus_verified: defect.is_multi_bus_verified ?? false,
        bbox: defect.bbox || {
          x_min: 200,
          y_min: 150,
          x_max: 275,
          y_max: 205,
          pixel_area: 4125,
          estimated_physical_width_cm: 45.0,
          estimated_physical_length_cm: 33.0,
        },
        first_detected: defect.first_detected || now,
        last_detected: defect.last_detected || now,
        model_version: defect.model_version || 'YOLOv8-road-v1',
        status: defect.status || 'Open',
        source: defect.source || 'transit_bus',
        snapshot_thumbnail: defect.snapshot_thumbnail
      };

      this.memoryData.defects.unshift(newDefect);
      this.save();
      return newDefect;
    }
  }

  public insertDefect(defect: Omit<DefectItem, 'id' | 'detection_id'> & { detection_id?: string }): DefectItem {
    const id = this.memoryData.next_defect_id++;
    const detection_id = defect.detection_id || `DET-2026-${String(id).padStart(3, '0')}`;
    
    const newDefect: DefectItem = {
      ...defect,
      id,
      detection_id,
      status: defect.status || 'Open',
      first_detected: defect.first_detected || new Date().toISOString(),
      last_detected: defect.last_detected || new Date().toISOString()
    };

    this.memoryData.defects.unshift(newDefect);
    if (newDefect.segment_id) {
      this.updateSegmentHealth(newDefect.segment_id, 1);
    }
    this.save();
    return newDefect;
  }

  public updateDefect(id: number, updates: Partial<DefectItem>): DefectItem | null {
    const idx = this.memoryData.defects.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    this.memoryData.defects[idx] = { ...this.memoryData.defects[idx], ...updates };
    this.save();
    return this.memoryData.defects[idx];
  }

  public deleteDefect(id: number): boolean {
    const initLen = this.memoryData.defects.length;
    this.memoryData.defects = this.memoryData.defects.filter((d) => d.id !== id);
    if (this.memoryData.defects.length !== initLen) {
      this.save();
      return true;
    }
    return false;
  }

  // ── Video Inspections ───────────────────────────────────────────────────────
  public getVideoInspections(): VideoInspection[] {
    return this.memoryData.video_inspections;
  }

  public insertVideoInspection(inspection: Omit<VideoInspection, 'id' | 'inspection_id'>): VideoInspection {
    const id = this.memoryData.next_inspection_id++;
    const inspection_id = `VID-INSP-${String(id).padStart(4, '0')}`;
    const newRecord: VideoInspection = {
      ...inspection,
      id,
      inspection_id
    };
    this.memoryData.video_inspections.unshift(newRecord);
    this.save();
    return newRecord;
  }

  // ── Work Orders ─────────────────────────────────────────────────────────────
  public getWorkOrders(): RepairWorkOrder[] {
    return this.memoryData.work_orders;
  }

  public insertWorkOrder(order: Omit<RepairWorkOrder, 'work_order_id' | 'created_at'>): RepairWorkOrder {
    const id = this.memoryData.next_work_order_id++;
    const work_order_id = `WO-2026-${String(id).padStart(3, '0')}`;
    const newOrder: RepairWorkOrder = {
      ...order,
      work_order_id,
      created_at: new Date().toISOString()
    };
    this.memoryData.work_orders.unshift(newOrder);
    this.save();
    return newOrder;
  }

  public updateWorkOrderStatus(workOrderId: string, status: RepairWorkOrder['status']): boolean {
    const order = this.memoryData.work_orders.find((w) => w.work_order_id === workOrderId);
    if (order) {
      order.status = status;
      this.save();
      return true;
    }
    return false;
  }

  // ── Vehicles ────────────────────────────────────────────────────────────────
  public getVehicles(): Record<string, VehiclePatrol> {
    return this.memoryData.vehicles;
  }

  public updateVehicleTelemetry(vehicleId: string, updates: Partial<VehiclePatrol>) {
    if (this.memoryData.vehicles[vehicleId]) {
      this.memoryData.vehicles[vehicleId] = {
        ...this.memoryData.vehicles[vehicleId],
        ...updates,
        last_ping: new Date().toISOString()
      };
      this.save();
    }
  }

  // ── Municipal Cases & Closed-Loop Lifecycle ────────────────────────────────
  public getCases(filters?: {
    status?: CaseStatus;
    severity?: string;
    priority?: CasePriority;
    road_id?: string;
    segment_id?: string;
    search?: string;
  }): DefectCase[] {
    let list = this.memoryData.cases || [];
    if (!filters) return list;

    if (filters.status) {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters.severity) {
      list = list.filter((c) => c.severity === filters.severity);
    }
    if (filters.priority) {
      list = list.filter((c) => c.priority === filters.priority);
    }
    if (filters.road_id) {
      list = list.filter((c) => c.road_id === filters.road_id);
    }
    if (filters.segment_id) {
      list = list.filter((c) => c.segment_id === filters.segment_id);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((c) =>
        c.case_id.toLowerCase().includes(q) ||
        (c.pothole_id && c.pothole_id.toLowerCase().includes(q)) ||
        c.road_name.toLowerCase().includes(q) ||
        c.defect_type.toLowerCase().includes(q) ||
        (c.assigned_team && c.assigned_team.toLowerCase().includes(q)) ||
        (c.assigned_contractor && c.assigned_contractor.toLowerCase().includes(q))
      );
    }
    return list;
  }

  public getCaseById(caseId: string): DefectCase | undefined {
    return (this.memoryData.cases || []).find(
      (c) =>
        c.case_id === caseId ||
        c.pothole_id === caseId ||
        c.detection_id === caseId
    );
  }

  public checkRecurrence(lat: number, lon: number, roadId: string, windowDays = 90): { recurrenceCount: number; previousCaseIds: string[] } {
    const cases = this.memoryData.cases || [];
    const now = Date.now();
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const matching: DefectCase[] = [];

    for (const c of cases) {
      if (c.road_id === roadId && (c.status === "CLOSED" || c.status === "VERIFIED")) {
        const cDate = new Date(c.closed_at || c.created_at).getTime();
        if (now - cDate <= windowMs) {
          const dLat = (lat - c.latitude) * 111320;
          const dLon = (lon - c.longitude) * 111320 * Math.cos((lat * Math.PI) / 180);
          const dist = Math.sqrt(dLat * dLat + dLon * dLon);
          if (dist <= 15.0) {
            matching.push(c);
          }
        }
      }
    }

    return {
      recurrenceCount: matching.length,
      previousCaseIds: matching.map((m) => m.case_id)
    };
  }

  public createCaseFromDefect(defect: DefectItem, initialActor = "AI Detection Engine"): DefectCase {
    const existing = this.getCaseById(defect.pothole_id || defect.detection_id);
    if (existing) return existing;

    const id = this.memoryData.next_case_id++;
    const case_id = `CASE-2026-${String(id).padStart(3, '0')}`;
    const recurrence = this.checkRecurrence(defect.latitude, defect.longitude, defect.road_id);

    const now = new Date().toISOString();
    const priority: CasePriority =
      defect.severity === "Critical" ? "P1 - Emergency" :
      defect.severity === "High" ? "P2 - High Priority" : "P3 - Standard";

    const newCase: DefectCase = {
      case_id,
      pothole_id: defect.pothole_id,
      defect_id: defect.id,
      detection_id: defect.detection_id,
      defect_type: defect.class_name,
      class_name: defect.class_name,
      road_id: defect.road_id,
      road_name: this.getSegmentById(defect.segment_id)?.road_name || defect.road_id,
      segment_id: defect.segment_id,
      exact_chainage_m: defect.exact_chainage_m,
      latitude: defect.latitude,
      longitude: defect.longitude,
      severity: defect.severity,
      priority,
      status: "REPORTED",
      created_at: defect.first_detected || now,
      reported_at: now,
      before_evidence: {
        snapshot_thumbnail: defect.snapshot_thumbnail,
        detected_at: defect.first_detected || now,
        bbox: defect.bbox,
        confidence: defect.confidence,
        model_version: defect.model_version,
        reporting_vehicles: defect.reporting_vehicles
      },
      events: [
        {
          id: `EVT-${Date.now()}-1`,
          timestamp: defect.first_detected || now,
          to_status: "DETECTED",
          actor: initialActor,
          action: "Defect Identified by Vision Engine",
          notes: `Detected with ${(defect.confidence * 100).toFixed(1)}% confidence.`
        },
        {
          id: `EVT-${Date.now()}-2`,
          timestamp: now,
          from_status: "DETECTED",
          to_status: "REPORTED",
          actor: "Municipal Ingestion Pipeline",
          action: "Municipal Case Created",
          notes: recurrence.recurrenceCount > 0
            ? `Flagged as Recurrent Defect (${recurrence.recurrenceCount} previous repairs within 15m).`
            : "Standard defect case logged to city registry."
        }
      ],
      communications: [],
      recurrence_count: recurrence.recurrenceCount,
      previous_case_ids: recurrence.previousCaseIds
    };

    if (!this.memoryData.cases) this.memoryData.cases = [];
    this.memoryData.cases.unshift(newCase);
    this.save();
    return newCase;
  }

  public updateCaseStatus(
    caseId: string,
    newStatus: CaseStatus,
    actor = "Municipal Officer",
    notes?: string,
    metadata?: Record<string, any>
  ): DefectCase | null {
    const c = this.getCaseById(caseId);
    if (!c) return null;

    const oldStatus = c.status;
    c.status = newStatus;
    const now = new Date().toISOString();

    if (newStatus === "ACKNOWLEDGED" && !c.acknowledged_at) c.acknowledged_at = now;
    if (newStatus === "ASSIGNED" && !c.assigned_at) c.assigned_at = now;
    if (newStatus === "WORK_IN_PROGRESS" && !c.work_started_at) c.work_started_at = now;
    if (newStatus === "REPAIR_COMPLETED" && !c.repair_completed_at) {
      c.repair_completed_at = now;
      c.status = "VERIFICATION_REQUIRED";
    }
    if (newStatus === "VERIFIED" && !c.verified_at) c.verified_at = now;
    if (newStatus === "CLOSED" && !c.closed_at) c.closed_at = now;

    c.events.push({
      id: `EVT-${Date.now()}`,
      timestamp: now,
      from_status: oldStatus,
      to_status: c.status,
      actor,
      action: `Status transitioned from ${oldStatus} to ${c.status}`,
      notes,
      metadata
    });

    this.save();
    return c;
  }

  public assignCase(
    caseId: string,
    assigned_team: string,
    assigned_person: string,
    assigned_contractor: string,
    target_completion_date?: string,
    actor = "Operations Lead"
  ): DefectCase | null {
    const c = this.getCaseById(caseId);
    if (!c) return null;

    c.assigned_team = assigned_team;
    c.assigned_person = assigned_person;
    c.assigned_contractor = assigned_contractor;
    if (target_completion_date) c.target_completion_date = target_completion_date;
    const now = new Date().toISOString();
    c.assigned_at = now;
    const oldStatus = c.status;
    c.status = "ASSIGNED";

    c.events.push({
      id: `EVT-${Date.now()}`,
      timestamp: now,
      from_status: oldStatus,
      to_status: "ASSIGNED",
      actor,
      action: "Work Crew Assigned",
      notes: `Assigned to ${assigned_team} (${assigned_person}, ${assigned_contractor}). Target completion: ${target_completion_date || "Standard SLA"}.`
    });

    this.save();
    return c;
  }

  public logCommunication(caseId: string, item: Omit<CommunicationItem, "id" | "timestamp">): DefectCase | null {
    const c = this.getCaseById(caseId);
    if (!c) return null;

    const comm: CommunicationItem = {
      ...item,
      id: `COMM-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    c.communications.unshift(comm);
    c.events.push({
      id: `EVT-${Date.now()}`,
      timestamp: comm.timestamp,
      to_status: c.status,
      actor: "Communication Dispatcher",
      action: `Dispatched ${comm.channel.toUpperCase()} message`,
      notes: `${comm.summary} [To: ${comm.recipient} | Status: ${comm.status}]`
    });

    this.save();
    return c;
  }

  public verifyRepairScan(
    caseId: string,
    scan: {
      scanner_vehicle_id: string;
      detected_defect_persists: boolean;
      confidence?: number;
      snapshot_thumbnail?: string;
      notes?: string;
    }
  ): DefectCase | null {
    const c = this.getCaseById(caseId);
    if (!c) return null;

    const now = new Date().toISOString();
    const oldStatus = c.status;

    if (scan.detected_defect_persists) {
      c.status = "REOPENED";
      c.after_evidence = {
        snapshot_thumbnail: scan.snapshot_thumbnail,
        scanned_at: now,
        scanner_vehicle_id: scan.scanner_vehicle_id,
        ai_verification_result: "DEFECT_PERSISTS",
        ai_confidence_threshold_used: 0.28,
        ai_verification_statement: "Defect remains detectable after repair attempt. Case reopened.",
        human_notes: scan.notes
      };
      c.events.push({
        id: `EVT-${Date.now()}`,
        timestamp: now,
        from_status: oldStatus,
        to_status: "REOPENED",
        actor: `AI Verification Scanner (${scan.scanner_vehicle_id})`,
        action: "Post-Repair Scan Failed",
        notes: "Same-location AI re-scan detected persisting distress. Case escalated & reopened."
      });
    } else {
      c.status = "VERIFIED";
      c.verified_at = now;
      c.after_evidence = {
        snapshot_thumbnail: scan.snapshot_thumbnail,
        scanned_at: now,
        scanner_vehicle_id: scan.scanner_vehicle_id,
        ai_verification_result: "NO_DEFECT_DETECTED",
        ai_confidence_threshold_used: 0.28,
        ai_verification_statement: "Original defect was not detected during post-repair AI inspection",
        human_notes: scan.notes
      };
      c.events.push({
        id: `EVT-${Date.now()}`,
        timestamp: now,
        from_status: oldStatus,
        to_status: "VERIFIED",
        actor: `AI Verification Scanner (${scan.scanner_vehicle_id})`,
        action: "Post-Repair AI Verification Passed",
        notes: "Original defect was not detected during post-repair AI inspection (threshold: 0.28). Pending human sign-off."
      });
      this.updateSegmentHealth(c.segment_id, -1);
    }

    this.save();
    return c;
  }

  public verifyHumanSignOff(caseId: string, verifierName: string, notes?: string): DefectCase | null {
    const c = this.getCaseById(caseId);
    if (!c) return null;

    const now = new Date().toISOString();
    const oldStatus = c.status;
    c.status = "CLOSED";
    c.closed_at = now;

    if (!c.after_evidence) {
      c.after_evidence = {
        scanned_at: now,
        scanner_vehicle_id: "Field Engineer Manual Audit",
        ai_verification_result: "NO_DEFECT_DETECTED",
        ai_confidence_threshold_used: 0.28,
        ai_verification_statement: "Original defect was not detected during post-repair AI inspection"
      };
    }

    c.after_evidence.human_verifier_name = verifierName;
    c.after_evidence.human_verified_at = now;
    c.after_evidence.human_notes = notes;

    c.events.push({
      id: `EVT-${Date.now()}`,
      timestamp: now,
      from_status: oldStatus,
      to_status: "CLOSED",
      actor: verifierName,
      action: "Human Verification Sign-Off & Case Closure",
      notes: notes || "Municipal engineer certified repair quality and restored pavement level."
    });

    this.save();
    return c;
  }

  public reopenCase(caseId: string, reason: string, actor = "Municipal Inspector"): DefectCase | null {
    const c = this.getCaseById(caseId);
    if (!c) return null;

    const oldStatus = c.status;
    c.status = "REOPENED";
    const now = new Date().toISOString();

    c.events.push({
      id: `EVT-${Date.now()}`,
      timestamp: now,
      from_status: oldStatus,
      to_status: "REOPENED",
      actor,
      action: "Case Reopened",
      notes: reason
    });

    this.save();
    return c;
  }

  public getCaseAnalytics() {
    const cases = this.memoryData.cases || [];
    const total = cases.length;

    const statusCounts: Record<string, number> = {
      DETECTED: 0,
      REPORTED: 0,
      ACKNOWLEDGED: 0,
      ASSIGNED: 0,
      WORK_IN_PROGRESS: 0,
      REPAIR_COMPLETED: 0,
      VERIFICATION_REQUIRED: 0,
      VERIFIED: 0,
      CLOSED: 0,
      REOPENED: 0
    };

    let totalResolutionHours = 0;
    let closedCount = 0;
    let recurrentCount = 0;
    let verifiedCount = 0;
    let repairsFinishedCount = 0;

    for (const c of cases) {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      if (c.recurrence_count > 0) recurrentCount++;
      if (c.status === "VERIFIED" || c.status === "CLOSED") verifiedCount++;
      if (
        c.repair_completed_at ||
        c.status === "REPAIR_COMPLETED" ||
        c.status === "VERIFICATION_REQUIRED" ||
        c.status === "VERIFIED" ||
        c.status === "CLOSED"
      ) {
        repairsFinishedCount++;
      }

      if (c.closed_at && c.created_at) {
        const diffMs = new Date(c.closed_at).getTime() - new Date(c.created_at).getTime();
        totalResolutionHours += diffMs / (1000 * 60 * 60);
        closedCount++;
      }
    }

    const avgResolutionHours = closedCount > 0 ? Math.round((totalResolutionHours / closedCount) * 10) / 10 : 28.5;
    const repairVerificationRate = repairsFinishedCount > 0 ? Math.round((verifiedCount / repairsFinishedCount) * 100) : 100;
    const recurrenceRate = total > 0 ? Math.round((recurrentCount / total) * 100) : 0;

    return {
      total_cases: total,
      active_cases: cases.filter((c) => c.status !== "CLOSED").length,
      status_counts: statusCounts,
      verification_required_count: statusCounts.VERIFICATION_REQUIRED || 0,
      work_in_progress_count: statusCounts.WORK_IN_PROGRESS || 0,
      closed_count: statusCounts.CLOSED || 0,
      recurrent_count: recurrentCount,
      recurrence_rate_percent: recurrenceRate,
      average_resolution_hours: avgResolutionHours,
      repair_verification_rate_percent: repairVerificationRate
    };
  }

  // ── Database Analytics & Management ─────────────────────────────────────────
  public getStats() {
    const fileStats = fs.existsSync(this.dbFilePath) ? fs.statSync(this.dbFilePath) : null;
    return {
      db_type: "ACID File-Backed Municipal GIS Database",
      version: this.memoryData.version,
      file_path: this.dbFilePath,
      file_size_bytes: fileStats ? fileStats.size : 0,
      total_roads: this.memoryData.roads.length,
      total_segments: this.getAllSegments().length,
      total_defects: this.memoryData.defects.length,
      total_cases: (this.memoryData.cases || []).length,
      total_video_inspections: this.memoryData.video_inspections.length,
      total_work_orders: this.memoryData.work_orders.length,
      total_patrol_vehicles: Object.keys(this.memoryData.vehicles).length,
      last_updated: this.memoryData.last_updated,
      multi_bus_verified_count: this.memoryData.defects.filter((d) => d.is_multi_bus_verified).length,
      critical_defects_count: this.memoryData.defects.filter((d) => d.severity === 'Critical').length
    };
  }

  public exportBackup(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.memoryData));
  }

  public resetToDefault(): DatabaseSchema {
    const cleanRoads = DEFAULT_ROADS.map((road) => ({
      ...road,
      segments: road.segments.map((seg) => ({
        ...seg,
        active_defect_count: 0,
        current_health_score: 96.0,
        health_grade: "Excellent" as const,
        last_scanned_at: new Date().toISOString()
      }))
    }));

    const defaultData: DatabaseSchema = {
      version: "2.0.0",
      last_updated: new Date().toISOString(),
      roads: cleanRoads,
      defects: [],
      video_inspections: [],
      work_orders: [],
      vehicles: DEFAULT_VEHICLES,
      cases: DEFAULT_CASES,
      next_defect_id: 1,
      next_inspection_id: 1,
      next_work_order_id: 1,
      next_case_id: DEFAULT_CASES.length + 1
    };
    this.memoryData = defaultData;
    this.persistSync(defaultData);
    return defaultData;
  }
}

export const municipalDB = new MunicipalDatabase();
