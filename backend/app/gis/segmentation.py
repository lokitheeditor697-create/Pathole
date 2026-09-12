import math
from typing import Tuple, Optional, Dict, Any, List

def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance in meters between two lat/lon points."""
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c

def project_point_onto_segment(
    p_lat: float, p_lon: float,
    s_lat: float, s_lon: float,
    e_lat: float, e_lon: float
) -> Tuple[float, float, float]:
    """
    Project point P onto line segment S-E.
    Returns (projected_lat, projected_lon, t_ratio).
    """
    dx = e_lon - s_lon
    dy = e_lat - s_lat
    seg_len_sq = dx * dx + dy * dy

    if seg_len_sq == 0:
        return s_lat, s_lon, 0.0

    t = ((p_lon - s_lon) * dx + (p_lat - s_lat) * dy) / seg_len_sq
    t = max(0.0, min(1.0, t))

    proj_lat = s_lat + t * dy
    proj_lon = s_lon + t * dx
    return proj_lat, proj_lon, t

class RoadSegmenter:
    """
    GIS Road Segmentation Engine:
    Maps raw GPS coordinates to structured road corridors and 100m segment blocks.
    In PostGIS, this uses ST_Distance, ST_ClosestPoint, and ST_LineLocatePoint.
    """

    def __init__(self, segments_cache: List[Dict[str, Any]]):
        self.segments = segments_cache

    def match_nearest_segment(
        self, lat: float, lon: float, max_buffer_m: float = 80.0
    ) -> Optional[Dict[str, Any]]:
        best_segment = None
        min_dist = float("inf")

        for seg in self.segments:
            s_lat = seg["start_lat"]
            s_lon = seg["start_lon"]
            e_lat = seg["end_lat"]
            e_lon = seg["end_lon"]

            proj_lat, proj_lon, t = project_point_onto_segment(lat, lon, s_lat, s_lon, e_lat, e_lon)
            dist = haversine_distance_m(lat, lon, proj_lat, proj_lon)

            if dist < min_dist:
                min_dist = dist
                best_segment = {
                    **seg,
                    "distance_to_road_center_m": round(dist, 2),
                    "relative_position_t": round(t, 4),
                    "exact_chainage_m": round(seg["start_chainage_m"] + t * seg["length_m"], 1)
                }

        if min_dist <= max_buffer_m and best_segment:
            return best_segment
        return best_segment if best_segment else None
