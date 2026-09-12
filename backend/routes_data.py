"""
Real MTC Chennai Bus Routes with accurate road waypoints and defect coordinates.
All waypoints follow real Chennai roads on Google Maps / OpenStreetMap.
Destination: DG Vaishnav College, E.V.R. Periyar Salai (Poonamallee High Road), Arumbakkam (13.0743, 80.2108)
"""

DG_VAISHNAV_COORDS = [13.0743, 80.2108]
AMINJIKARAI_COORDS = [13.0765, 80.2210]

CHENNAI_BUS_ROUTES = {
    "MTC 46G": {
        "bus_id": "MTC 46G",
        "route_name": "Kodungaiyur -> Arumbakkam (DG Vaishnav)",
        "color": "#f59e0b",  # Amber
        "video": "detector/video_46g.mp4",
        # Road waypoints (Kodungaiyur -> Madhavaram -> Inner Ring Rd -> Poonamallee High Rd -> DG Vaishnav)
        "waypoints": [
            [13.1333, 80.2622],  # Kodungaiyur (User GPS)
            [13.1310, 80.2520],  # Tondiarpet High Road
            [13.1250, 80.2395],  # Madhavaram / GNT Road
            [13.1180, 80.2230],  # Retteri Junction / Inner Ring Road
            [13.1070, 80.2105],  # Konnur High Road / Villivakkam
            [13.0920, 80.2030],  # Anna Nagar West Depot / 100 Feet Road
            [13.0830, 80.1985],  # Thirumangalam Junction
            [13.0725, 80.1970],  # Koyambedu Roundtana onto Poonamallee High Rd
            [13.0735, 80.2045],  # Poonamallee High Road (Rohini)
            [13.0743, 80.2108],  # Poonamallee High Road / DG Vaishnav College
        ],
        "defect_points": [
            [13.1180, 80.2230],  # Single-bus: Retteri / Inner Ring Rd
            [13.0743, 80.2108],  # INTERSECTION: DG Vaishnav College (Shared with 29C, 15G, 27B)
        ]
    },
    "MTC 29C": {
        "bus_id": "MTC 29C",
        "route_name": "Perambur -> Arumbakkam (DG Vaishnav)",
        "color": "#06b6d4",  # Cyan
        "video": "detector/video_29c.mp4",
        # Road waypoints (Perambur -> Konnur High Rd / Otteri -> Kilpauk -> Shenoy Nagar -> DG Vaishnav)
        "waypoints": [
            [13.1090, 80.2430],  # Perambur Bus Stand
            [13.1025, 80.2355],  # Perambur Barracks Road
            [13.0940, 80.2260],  # Otteri Bridge / Konnur High Road
            [13.0870, 80.2205],  # Kilpauk Garden Road
            [13.0815, 80.2175],  # New Avadi Road
            [13.0770, 80.2150],  # Shenoy Nagar
            [13.0755, 80.2130],  # Poonamallee High Road approach
            [13.0743, 80.2108],  # Poonamallee High Road / DG Vaishnav College
        ],
        "defect_points": [
            [13.0940, 80.2260],  # Single-bus: Otteri / Konnur High Rd
            [13.0743, 80.2108],  # INTERSECTION: DG Vaishnav College (Shared with 46G, 15G, 27B)
        ]
    },
    "MTC 15G": {
        "bus_id": "MTC 15G",
        "route_name": "Chennai Central -> Arumbakkam (DG Vaishnav)",
        "color": "#a855f7",  # Violet
        "video": "detector/video_15g.mp4",
        # Road waypoints (Poonamallee High Road / EVR Periyar Salai straight corridor)
        "waypoints": [
            [13.0827, 80.2707],  # Chennai Central Station
            [13.0815, 80.2570],  # EVR Periyar Salai / Periamet
            [13.0795, 80.2440],  # EVR Periyar Salai / Nehru Park
            [13.0780, 80.2330],  # EVR Periyar Salai / Kilpauk Medical College
            [13.0765, 80.2210],  # EVR Periyar Salai / Aminjikarai Market (INTERSECTION 1)
            [13.0752, 80.2150],  # EVR Periyar Salai / Arumbakkam
            [13.0743, 80.2108],  # Poonamallee High Road / DG Vaishnav College (INTERSECTION 2)
        ],
        "defect_points": [
            [13.0780, 80.2330],  # Single-bus: Kilpauk Medical College / EVR Salai
            [13.0765, 80.2210],  # INTERSECTION 1: Aminjikarai Market (Shared with 27B)
            [13.0743, 80.2108],  # INTERSECTION 2: DG Vaishnav College (Shared with 46G, 29C, 27B)
        ]
    },
    "MTC 27B": {
        "bus_id": "MTC 27B",
        "route_name": "Chetpet -> Arumbakkam (DG Vaishnav)",
        "color": "#ec4899",  # Pink
        "video": "detector/video_27b.mp4",
        # Road waypoints (Chetpet -> Spurtank Rd -> Aminjikarai -> EVR Salai -> DG Vaishnav)
        "waypoints": [
            [13.0650, 80.2480],  # Chetpet Signal
            [13.0695, 80.2385],  # Spurtank Road / Chetpet
            [13.0730, 80.2285],  # Mehta Nagar / 1st Main Road
            [13.0765, 80.2210],  # Aminjikarai Junction onto EVR Salai (INTERSECTION 1)
            [13.0752, 80.2150],  # EVR Salai / Arumbakkam
            [13.0743, 80.2108],  # Poonamallee High Road / DG Vaishnav College (INTERSECTION 2)
        ],
        "defect_points": [
            [13.0695, 80.2385],  # Single-bus: Spurtank Road / Chetpet
            [13.0765, 80.2210],  # INTERSECTION 1: Aminjikarai Junction (Shared with 15G)
            [13.0743, 80.2108],  # INTERSECTION 2: DG Vaishnav College (Shared with 46G, 29C, 15G)
        ]
    }
}
