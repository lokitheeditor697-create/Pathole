from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="OPERATOR") # ADMIN, ENGINEER, INSPECTOR, OPERATOR, VIEWER
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. MTC 46G, V001
    vehicle_type = Column(String(50), default="Transit Bus")
    plate_number = Column(String(30), nullable=True)
    camera_model = Column(String(100), default="Dashcam 1080p 30fps")
    edge_device = Column(String(100), default="NVIDIA Jetson Orin Nano")
    is_active = Column(Boolean, default=True)
    last_latitude = Column(Float, nullable=True)
    last_longitude = Column(Float, nullable=True)
    last_ping = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    buffer_queue_count = Column(Integer, default=0)

    observations = relationship("Observation", back_populates="vehicle")

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. ROUTE-46G
    name = Column(String(150), nullable=False) # Kodungaiyur -> Arumbakkam (DG Vaishnav)
    color = Column(String(20), default="#f59e0b")
    origin = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    waypoints = Column(JSON, nullable=False) # List of [lat, lon] coordinates

class Road(Base):
    __tablename__ = "roads"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. R001
    name = Column(String(150), nullable=False) # EVR Periyar Salai (Poonamallee High Rd)
    classification = Column(String(50), default="Arterial") # National Highway, State Highway, Arterial, Collector
    total_length_meters = Column(Float, default=12000.0)
    surface_type = Column(String(50), default="Bituminous Asphalt")
    construction_date = Column(DateTime, nullable=True)
    last_major_resurfacing = Column(DateTime, nullable=True)

    segments = relationship("RoadSegment", back_populates="road")
    observations = relationship("Observation", back_populates="road")

class RoadSegment(Base):
    __tablename__ = "road_segments"

    id = Column(Integer, primary_key=True, index=True)
    segment_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. R001-S003
    road_id = Column(String(50), ForeignKey("roads.road_id"), nullable=False)
    start_chainage_m = Column(Float, nullable=False) # 200.0m
    end_chainage_m = Column(Float, nullable=False)   # 300.0m
    length_m = Column(Float, default=100.0)
    start_lat = Column(Float, nullable=False)
    start_lon = Column(Float, nullable=False)
    end_lat = Column(Float, nullable=False)
    end_lon = Column(Float, nullable=False)
    current_health_score = Column(Float, default=85.0) # 0 to 100
    health_grade = Column(String(20), default="Good")  # Excellent, Good, Moderate, Poor, Critical
    active_defect_count = Column(Integer, default=0)
    last_scanned_at = Column(DateTime(timezone=True), nullable=True)

    road = relationship("Road", back_populates="segments")
    observations = relationship("Observation", back_populates="segment")
    defects = relationship("Defect", back_populates="segment")

class Observation(Base):
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, index=True)
    observation_id = Column(String(60), unique=True, index=True, nullable=False)
    road_id = Column(String(50), ForeignKey("roads.road_id"), nullable=False)
    segment_id = Column(String(50), ForeignKey("road_segments.segment_id"), nullable=False)
    vehicle_id = Column(String(50), ForeignKey("vehicles.vehicle_id"), nullable=False)
    route_id = Column(String(50), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    pothole_count = Column(Integer, default=0)
    crack_count = Column(Integer, default=0)
    rutting_score = Column(Float, default=0.0)
    waterlogging_score = Column(Float, default=0.0)
    model_version = Column(String(50), default="YOLOv8-road-v1")
    inference_latency_ms = Column(Float, default=14.5)
    frame_number = Column(Integer, default=0)

    road = relationship("Road", back_populates="observations")
    segment = relationship("RoadSegment", back_populates="observations")
    vehicle = relationship("Vehicle", back_populates="observations")
    defects = relationship("Defect", back_populates="observation")

class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    detection_id = Column(String(60), unique=True, index=True, nullable=False)
    observation_id = Column(String(60), ForeignKey("observations.observation_id"), nullable=True)
    segment_id = Column(String(50), ForeignKey("road_segments.segment_id"), nullable=False)
    
    # 7 Phase 1 Classes
    class_name = Column(String(50), nullable=False) # pothole, longitudinal_crack, transverse_crack, alligator_crack, road_patch, rutting, waterlogging
    confidence = Column(Float, nullable=False)
    severity = Column(String(20), default="Medium") # Critical, High, Medium, Low
    
    # Coordinates & Bounding Box
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    bbox_x_min = Column(Float, nullable=False)
    bbox_y_min = Column(Float, nullable=False)
    bbox_x_max = Column(Float, nullable=False)
    bbox_y_max = Column(Float, nullable=False)
    
    # Physical vs Pixel Dimension distinction
    pixel_area = Column(Float, nullable=True)
    estimated_physical_width_cm = Column(Float, nullable=True)
    estimated_physical_length_cm = Column(Float, nullable=True)
    
    # Spatial deduplication tracking
    vehicle_id = Column(String(50), nullable=False)
    reporting_vehicles = Column(String(200), default="") # Comma-separated bus IDs
    verification_count = Column(Integer, default=1)
    is_multi_bus_verified = Column(Boolean, default=False)
    
    frame_number = Column(Integer, default=0)
    image_reference = Column(String(255), nullable=True)
    model_version = Column(String(50), default="YOLOv8-road-v1")
    first_detected = Column(DateTime(timezone=True), server_default=func.now())
    last_detected = Column(DateTime(timezone=True), server_default=func.now())

    segment = relationship("RoadSegment", back_populates="defects")
    observation = relationship("Observation", back_populates="defects")

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(String(60), unique=True, index=True, nullable=False)
    file_path = Column(String(255), nullable=False)
    frame_number = Column(Integer, default=0)
    captured_at = Column(DateTime(timezone=True), server_default=func.now())
    vehicle_id = Column(String(50), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    defect_count = Column(Integer, default=0)

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False) # YOLOv8-road-v1
    version = Column(String(50), unique=True, nullable=False)
    framework = Column(String(50), default="Ultralytics YOLOv8")
    training_dataset = Column(String(150), default="RDD2022 + Chennai Municipal Road Patrols")
    total_images_trained = Column(Integer, default=6420)
    mAP_50 = Column(Float, default=0.894)
    mAP_50_95 = Column(Float, default=0.682)
    precision = Column(Float, default=0.887)
    recall = Column(Float, default=0.912)
    f1_score = Column(Float, default=0.899)
    deployed_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
