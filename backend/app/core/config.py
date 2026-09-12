import os
from pydantic import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Road Intelligence & Predictive Maintenance Platform"
    PHASE: str = "PHASE 1 - AI Road Inspection & Live Detection"
    API_V1_STR: str = "/api"
    
    # Database (PostgreSQL + PostGIS)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/road_intelligence_db"
    )
    
    # Model Configuration
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "ml/models/yolov8_road_v1.pt")
    YOLO_CONF_THRESHOLD: float = float(os.getenv("YOLO_CONF_THRESHOLD", "0.50"))
    YOLO_IOU_THRESHOLD: float = float(os.getenv("YOLO_IOU_THRESHOLD", "0.45"))
    MODEL_VERSION: str = "YOLOv8-road-v1"
    
    # 7 Phase 1 Defect Classes
    DEFECT_CLASSES: List[str] = [
        "pothole",
        "longitudinal_crack",
        "transverse_crack",
        "alligator_crack",
        "road_patch",
        "rutting",
        "waterlogging"
    ]
    
    # Telegram Bot Alerts
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")
    
    # Gmail SMTP
    GMAIL_USER: str = os.getenv("GMAIL_USER", "")
    GMAIL_APP_PASSWORD: str = os.getenv("GMAIL_APP_PASSWORD", "")
    ALERT_RECIPIENTS: str = os.getenv("ALERT_RECIPIENTS", "")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
