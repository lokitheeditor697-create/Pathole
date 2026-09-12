export type DefectClass =
  | 'pothole'
  | 'longitudinal_crack'
  | 'transverse_crack'
  | 'alligator_crack'
  | 'road_patch'
  | 'rutting'
  | 'waterlogging';

export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  pixel_area: number;
  estimated_physical_width_cm: number;
  estimated_physical_length_cm: number;
}

export interface DefectItem {
  id: number;
  detection_id: string;
  defect_type: DefectClass;
  class_name: DefectClass;
  latitude: number;
  longitude: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  road_id: string;
  segment_id: string;
  exact_chainage_m: number;
  bus_count: number;
  bus_ids: string;
  reporting_vehicles: string[];
  total_detections: number;
  is_multi_bus_verified: boolean;
  bbox: BoundingBox;
  first_detected: string;
  last_detected: string;
  model_version: string;
}

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
  health_grade: 'Excellent' | 'Good' | 'Moderate' | 'Poor' | 'Critical';
  active_defect_count: number;
  traffic_volume_vpd: number;
  last_scanned_at: string;
  defects?: DefectItem[];
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

export interface VehiclePatrol {
  vehicle_id: string;
  plate_number: string;
  type: string;
  camera: string;
  edge_device: string;
  status: 'Online' | 'Standby' | 'Offline';
  buffer_queue: number;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading_deg: number;
  current_road: string;
  current_segment: string;
  last_ping: string;
}

export interface SystemStatus {
  camera: string;
  gps: string;
  ai_model: string;
  api: string;
  database: string;
  active_vehicles_count: number;
  telegram_alerts_enabled: boolean;
  gmail_alerts_enabled: boolean;
  alert_recipients: string;
}

export interface DashboardMetrics {
  total_road_km: number;
  total_segments: number;
  total_defects: number;
  multi_bus_verified_defects: number;
  critical_defects: number;
  average_network_health: number;
  severity_counts: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  class_counts: Record<DefectClass, number>;
  active_patrol_vehicles: number;
  recent_detections: DefectItem[];
}

export interface ModelPerformanceData {
  model_name: string;
  version: string;
  framework: string;
  training_dataset: string;
  total_images_trained: number;
  mAP_50: number;
  mAP_50_95: number;
  precision: number;
  recall: number;
  f1_score: number;
  classes: DefectClass[];
  per_class_metrics: Record<
    DefectClass,
    { mAP50: number; precision: number; recall: number; samples: number }
  >;
  confusion_matrix: number[][];
}
