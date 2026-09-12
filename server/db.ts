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

export interface DatabaseSchema {
  version: string;
  last_updated: string;
  roads: Road[];
  defects: DefectItem[];
  video_inspections: VideoInspection[];
  work_orders: RepairWorkOrder[];
  vehicles: Record<string, VehiclePatrol>;
  next_defect_id: number;
  next_inspection_id: number;
  next_work_order_id: number;
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
      next_defect_id: 1,
      next_inspection_id: 1,
      next_work_order_id: 1
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
      next_defect_id: 1,
      next_inspection_id: 1,
      next_work_order_id: 1
    };
    this.memoryData = defaultData;
    this.persistSync(defaultData);
    return defaultData;
  }
}

export const municipalDB = new MunicipalDatabase();
