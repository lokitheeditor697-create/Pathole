"""
Utility script to generate a synthetic road video with potholes/road defects.
Useful for immediate testing and hackathon demonstrations before real dashcam footage is loaded.
"""

import cv2
import numpy as np
import os

def create_sample_road_video(output_path="detector/sample_road.mp4", duration_sec=10, fps=30):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    width, height = 640, 360
    total_frames = duration_sec * fps
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    # Define simulated potholes with their frame ranges and screen positions
    # (frame_start, frame_end, center_x, center_y, radius_x, radius_y)
    defects = [
        (30, 70, 300, 240, 45, 25, "pothole"),
        (90, 130, 420, 260, 35, 20, "pothole"),
        (160, 200, 240, 270, 55, 30, "pothole"),
        (220, 260, 350, 230, 40, 22, "pothole")
    ]
    
    print(f"Generating synthetic road video: {output_path} ({total_frames} frames)...")
    
    for frame_idx in range(total_frames):
        # Background: asphalt road
        frame = np.full((height, width, 3), (60, 60, 65), dtype=np.uint8)
        
        # Road shoulder / ground
        cv2.fillPoly(frame, [np.array([[0, 0], [150, 0], [40, height], [0, height]])], (40, 100, 50))
        cv2.fillPoly(frame, [np.array([[490, 0], [640, 0], [640, height], [600, height]])], (40, 100, 50))
        
        # Lane markings (moving down)
        lane_offset = (frame_idx * 12) % 60
        for y in range(-60 + lane_offset, height, 60):
            cv2.line(frame, (width // 2, max(0, y)), (width // 2, min(height, y + 30)), (240, 240, 240), 4)
        
        # Draw road defect / pothole if active in this frame
        for start, end, cx, cy, rx, ry, d_type in defects:
            if start <= frame_idx <= end:
                # Add slight motion simulation (approaching vehicle)
                progress = (frame_idx - start) / (end - start)
                cur_y = int(cy + progress * 40)
                cur_rx = int(rx * (1 + progress * 0.4))
                cur_ry = int(ry * (1 + progress * 0.4))
                
                # Dark crater/depression with jagged edge
                cv2.ellipse(frame, (cx, cur_y), (cur_rx, cur_ry), 0, 0, 360, (25, 25, 25), -1)
                cv2.ellipse(frame, (cx, cur_y), (cur_rx + 2, cur_ry + 2), 0, 0, 360, (15, 15, 15), 2)
                # Cracked edge inner contour
                cv2.ellipse(frame, (cx - 5, cur_y - 2), (cur_rx // 2, cur_ry // 2), 0, 0, 360, (10, 10, 10), -1)
        
        # Overlay HUD text
        cv2.putText(frame, f"Frame: {frame_idx:03d}/{total_frames}", (15, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        cv2.putText(frame, "Smart City Road Inspection Camera", (15, 55),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)
        
        out.write(frame)
        
    out.release()
    print(f"Video generated successfully: {output_path}")

if __name__ == "__main__":
    create_sample_road_video()
