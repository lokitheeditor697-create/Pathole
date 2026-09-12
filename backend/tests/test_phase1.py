import pytest
from backend.app.gis.segmentation import RoadSegmenter, haversine_distance_m, project_point_onto_segment
from backend.app.ml.yolo_detector import YOLORoadDetector, PHASE1_CLASSES

def test_phase1_defect_classes():
    """Verify strictly the 7 designated Phase 1 defect classes."""
    assert len(PHASE1_CLASSES) == 7
    expected = [
        "pothole",
        "longitudinal_crack",
        "transverse_crack",
        "alligator_crack",
        "road_patch",
        "rutting",
        "waterlogging"
    ]
    assert PHASE1_CLASSES == expected

def test_haversine_distance():
    """Test haversine calculation between two known points in Chennai."""
    lat1, lon1 = 13.0827, 80.2707 # Chennai Central
    lat2, lon2 = 13.0815, 80.2570 # Periamet
    dist = haversine_distance_m(lat1, lon1, lat2, lon2)
    assert 1400.0 < dist < 1600.0

def test_gis_road_segment_matching():
    """Test that a GPS coordinate snaps to the correct 100m road segment and chainage."""
    sample_segments = [
        {
            "segment_id": "R001-S001",
            "road_id": "R001",
            "start_chainage_m": 0.0,
            "end_chainage_m": 100.0,
            "length_m": 100.0,
            "start_lat": 13.0827,
            "start_lon": 80.2707,
            "end_lat": 13.0815,
            "end_lon": 80.2570
        },
        {
            "segment_id": "R001-S002",
            "road_id": "R001",
            "start_chainage_m": 100.0,
            "end_chainage_m": 200.0,
            "length_m": 100.0,
            "start_lat": 13.0815,
            "start_lon": 80.2570,
            "end_lat": 13.0795,
            "end_lon": 80.2440
        }
    ]
    segmenter = RoadSegmenter(sample_segments)
    # Coordinate near the start of S002
    match = segmenter.match_nearest_segment(13.0814, 80.2568)
    assert match is not None
    assert match["segment_id"] == "R001-S002"
    assert match["exact_chainage_m"] >= 100.0

def test_physical_dimension_estimation():
    """Test estimation of physical defect dimensions from bounding box."""
    detector = YOLORoadDetector()
    bbox = {"x_min": 100, "y_min": 150, "x_max": 220, "y_max": 230}
    dims = detector.estimate_physical_dimensions(bbox)
    assert dims["pixel_area"] == 120 * 80
    assert dims["estimated_physical_width_cm"] > 0
    assert dims["estimated_physical_length_cm"] > 0
