from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class BoundingBox(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    pixel_area: Optional[float] = None
    estimated_physical_width_cm: Optional[float] = None
    estimated_physical_length_cm: Optional[float] = None

class DetectionCreate(BaseModel):
    class_name: str
    confidence: float
    severity: Optional[str] = "Medium"
    bounding_box: BoundingBox
    latitude: float
    longitude: float
    vehicle_id: str
    route_id: Optional[str] = None
    frame_number: Optional[int] = 0
    model_version: Optional[str] = "YOLOv8-road-v1"

class DefectResponse(BaseModel):
    detection_id: str
    class_name: str
    confidence: float
    severity: str
    latitude: float
    longitude: float
    segment_id: str
    road_id: Optional[str] = None
    vehicle_id: str
    reporting_vehicles: List[str]
    verification_count: int
    is_multi_bus_verified: bool
    bounding_box: BoundingBox
    first_detected: datetime
    last_detected: datetime
    model_version: str

    class Config:
        orm_mode = True

class ObservationCreate(BaseModel):
    latitude: float
    longitude: float
    vehicle_id: str
    route_id: Optional[str] = None
    frame_number: Optional[int] = 0
    inference_latency_ms: Optional[float] = 14.5
    model_version: Optional[str] = "YOLOv8-road-v1"
    detections: List[DetectionCreate] = []

class RoadSegmentResponse(BaseModel):
    segment_id: str
    road_id: str
    start_chainage_m: float
    end_chainage_m: float
    length_m: float
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    current_health_score: float
    health_grade: str
    active_defect_count: int
    last_scanned_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class RoadResponse(BaseModel):
    road_id: str
    name: str
    classification: str
    total_length_meters: float
    surface_type: str
    segments: List[RoadSegmentResponse] = []

    class Config:
        orm_mode = True

class ModelPerformanceResponse(BaseModel):
    model_name: str
    version: str
    framework: str
    training_dataset: str
    total_images_trained: int
    mAP_50: float
    mAP_50_95: float
    precision: float
    recall: float
    f1_score: float
    classes: List[str]
    per_class_metrics: Dict[str, Dict[str, float]]
    confusion_matrix: List[List[int]]

class DashboardOverviewResponse(BaseModel):
    total_road_km: float
    total_segments: int
    total_defects: int
    multi_bus_verified_defects: int
    critical_defects: int
    active_patrol_vehicles: int
    average_network_health: float
    system_status: Dict[str, str]
    recent_detections: List[DefectResponse]
