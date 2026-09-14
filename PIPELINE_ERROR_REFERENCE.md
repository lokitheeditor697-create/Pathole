================================================================================
ROAD DEFECT DETECTION PLATFORM: PIPELINE, ERRORS & DEBUGGING REFERENCE MANUAL
================================================================================
Date: 2026-09-14
System: YOLOv8 Road Hazard AI, ByteTrack Deduplication & GIS Infrastructure
================================================================================

TABLE OF CONTENTS:
1. Pipeline Architecture & Cross-Model Integration
2. Major Pipeline Errors & Root Causes
3. Computer Vision & Tracking Engine Errors (Intra-Frame / Inter-Frame)
4. Fullstack & Cloud Deployment Errors
5. Prevention Rules & Diagnostic Checklist

================================================================================
1. PIPELINE ARCHITECTURE & CROSS-MODEL INTEGRATION
================================================================================
The platform integrates 4 distinct YOLOv8 deep learning models:
  * Model 1: 7-Class Road Anomaly (YOLOv8m - 52MB)
    Classes: Heavy-Vehicle, Light-Vehicle, Pedestrian, Crack, Crack-Severe, Pothole, Speed-Bump
  * Model 2: PotBot Dedicated Pothole (YOLOv8m - 148MB)
    Classes: Dedicated deep asphalt pothole void specialist
  * Model 3: CRDDC Road Damage Benchmark (YOLOv8s - 89.5MB)
    Classes: Longitudinal Crack (D00), Transverse Crack (D01), Alligator Crack (D20), Pothole (D40)
  * Model 4: Road Doctor / RoadGuard (YOLOv8m - 52MB)
    Classes: 9-class structural distress & severe deformation engine

Pipeline Lifecycle:
  [Video / Frame Input]
         │
         ▼
  [Node.js Express Gateway (server.ts)]
         │ (Subprocess IPC with maxBuffer=10MB, YOLO_OFFLINE=True)
         ▼
  [Python PyTorch Inference Engine (detector/infer_video.py)]
         │ (YOLOv8 inference at conf=0.28)
         ▼
  [Intra-Frame IoMin & Containment Deduplication]
         │ (Merges sub-boxes on large potholes into single enclosing bounding box)
         ▼
  [Inter-Frame Road-Perspective Tracking Corridor]
         │ (Perspective flow: |Δx| <= 0.16, Δy in [-0.06, 0.45], scale expansion)
         ▼
  [Defect Family Grouping & Severity Smoothing]
         │ (Unifies minor -> moderate -> major transitions under same track ID)
         ▼
  [GPS Speed Projection & GIS 100m Road Segment Match]
         │
         ▼
  [Municipal Database Ingestion & Case Creation]
         │
         ▼
  [React/Vite Frontend HUD Player with Unique Physical Defect Counter]


================================================================================
2. MAJOR PIPELINE ERRORS & HOW THEY WERE FIXED
================================================================================

--------------------------------------------------------------------------------
ERROR 2.1: Model Switching Race Condition & In-Flight State Collision
--------------------------------------------------------------------------------
Symptom:
  When switching between models (e.g. 7-Class -> PotBot -> CRDDC) while a video was
  scanning, the previous scan finished later and overwrote the new model state.
  Defect bounding boxes and classes collided, creating corrupted municipal cases.

Root Cause:
  In-flight asynchronous HTTP promises did not have cancellation or monotonic ID
  tagging. Both promises resolved into the shared React state.

Fix:
  - Added monotonic request ID tracking: activeScanRequestIdRef.current++
  - When a scan completes, it verifies: if (reqId !== activeScanRequestIdRef.current) return;
  - Added instant state purging in handleSwitchModel():
      lockedTracksRef.current.clear();
      setDetectedMoments([]);
      setActiveDefectsOnScreen([]);
      setActiveDefectOnScreen(null);

--------------------------------------------------------------------------------
ERROR 2.2: Cross-Model Nomenclature Discrepancies & Class Lookup Collapse
--------------------------------------------------------------------------------
Symptom:
  CRDDC models output codes like 'D40', 'D00', 'D20', while 7-class models output
  'pothole', 'crack', and PotBot output 'moderate_pothole'. Downstream GIS mapping
  and database creation failed or rendered undefined icons/colors.

Root Cause:
  Hardcoded string equality checks in database ingestion and UI renderers failed
  to recognize equivalent defect categories across different model taxonomies.

Fix:
  - Built unified defect metadata mapping in src/utils/defectMeta.js:
      getDefectMeta(classNameOrCode) -> maps all aliases to unified family
  - Added CLASS_PREFIXES dictionary in server.ts:
      pothole -> PTH, longitudinal_crack -> LCRK, alligator_crack -> ACRK, D40 -> PTH

--------------------------------------------------------------------------------
ERROR 2.3: Node.js Child Process Buffer Overflow (maxBuffer Crash)
--------------------------------------------------------------------------------
Symptom:
  Long videos (>30s) or videos with dense road damage crashed with:
  'RangeError: maxBuffer length exceeded' and returned 0 defects.

Root Cause:
  Node.js child_process.exec() defaults to a 200KB stdout buffer. JSON outputs
  with hundreds of frame detection bboxes easily exceed 500KB - 2MB.

Fix:
  - Expanded child_process options:
      exec(cmd, { maxBuffer: 10 * 1024 * 1024, timeout: 180000, env })
  - Added robust extractJsonFromOutput() regex parser to isolate the JSON payload
    even if Ultralytics prints progress lines to stdout.

--------------------------------------------------------------------------------
ERROR 2.4: Ultralytics Auto-Update & Online Font Download Hangs
--------------------------------------------------------------------------------
Symptom:
  Python inference stalled for 15-30 seconds or failed when offline.

Root Cause:
  Ultralytics YOLO by default attempts to check for pip updates and download
  Arial fonts from Google Fonts on first initialization.

Fix:
  - Injected offline flags in subprocess environment variables:
      env = { ...process.env, YOLO_OFFLINE: 'True', ULTRALYTICS_AUTOINSTALL: '0' }


================================================================================
3. COMPUTER VISION & TRACKING ENGINE ERRORS
================================================================================

--------------------------------------------------------------------------------
ERROR 3.1: Large Potholes Generating Multiple Sub-Boxes (Intra-Frame Splitting)
--------------------------------------------------------------------------------
Symptom:
  A single large pothole received 2-4 boxes simultaneously in the same frame.

Root Cause:
  Large potholes have varied internal textures (shadows, loose gravel, deep centers).
  Standard NMS calculates IoU = Inter / (Area1 + Area2 - Inter). When a small box
  is inside a large box, IoU is < 0.15, so NMS fails to suppress it.

Fix:
  - Added compute_iomin() (Intersection-over-Minimum):
      iomin = interArea / min(area1, area2)
      If iomin > 0.28 -> merge into single enclosing box.
  - Added containment merge:
      If box A contains > 80% of box B -> merge [min(x1), min(y1), max(x2), max(y2)].

--------------------------------------------------------------------------------
ERROR 3.2: Track ID Splitting During Vehicle Approach (Inter-Frame Drops)
--------------------------------------------------------------------------------
Symptom:
  As the car moved toward a pothole, its track ID kept changing every 0.5 seconds
  (e.g., PTH-#11 -> PTH-#12 -> PTH-#14), inflating total defect counts.

Root Cause:
  Naive trackers assume objects move slowly and uniformly (Euclidean distance < 0.15).
  In forward vehicle motion, road perspective causes objects to:
    1. Expand in scale rapidly (2x - 4x size increase)
    2. Shift downward toward bottom of frame (Δy from 0.05 to 0.40)

Fix:
  - Implemented Road-Perspective Forward Corridor in detector/infer_video.py:
      * Lateral limit: |Δx| <= 0.16 (camera travels mostly straight)
      * Forward downward flow: Δy in [-0.06, 0.45]
      * Scale expansion factor: w2 >= 0.75 * w1
      * Horizontal overlap requirement: overlap_x > 0.30
  - Grouped defect severity transitions (minor -> moderate -> major) into
    same defect family using is_same_defect_category().


================================================================================
4. FULLSTACK & CLOUD DEPLOYMENT ERRORS
================================================================================

--------------------------------------------------------------------------------
ERROR 4.1: Raw Frame Count Displayed on HUD ('200 Defects Found')
--------------------------------------------------------------------------------
Symptom:
  HUD displayed '200 Defects Found' for a video with only 2 physical potholes.

Root Cause:
  The badge rendered detectedMoments.length (total video frame detections at 30 FPS)
  rather than distinct physical defect tracks.

Fix:
  - Created uniqueDefectsList using useMemo() to group by pothole_id / track_id:
      const uniqueDefectsCount = uniqueDefectsList.length;
  - Scrubber pins, jump chips, and HUD badge now all render uniqueDefectsCount.

--------------------------------------------------------------------------------
ERROR 4.2: Hugging Face 403 CPU-Basic Quota Limit
--------------------------------------------------------------------------------
Symptom:
  Hugging Face Space was stuck on 'PAUSED' and threw:
  '403 You\'ve reached your cpu-basic quota limit'.

Root Cause:
  Docker Spaces (sdk: docker) consume Hugging Face's limited free CPU quota.
  When multiple spaces exist, new Docker containers cannot boot.

Fix:
  - Converted the Hugging Face Space to 100% Free Unlimited Static Space (sdk: static).
  - Static Spaces have 0 CPU quota consumption, never sleep, and run 24/7 for free.
  - Connected live Python inference locally via public live share tunnel (localtunnel).

--------------------------------------------------------------------------------
ERROR 4.3: Custom Uploads Failing on Static Hosting ('Server Unreachable')
--------------------------------------------------------------------------------
Symptom:
  Custom WhatsApp video uploaded to static.hf.space returned 'AI inference error'.

Root Cause:
  Static hosting platforms (Vercel / HF Static) only host HTML/JS files in browser.
  They do NOT execute Python/PyTorch. When a brand new video is uploaded, it must
  be sent to a live Python backend.

Fix:
  - Local / Live Share tunnel (http://localhost:3000 / https://rotten-insects-happen.loca.lt)
    processes any uploaded custom video with 100% live Python PyTorch inference.
  - Production recommendation: Host frontend on Vercel and backend container on
    Render.com (Free 24/7 web service with Python).


================================================================================
5. FUTURE PREVENTION RULES & DIAGNOSTIC CHECKLIST
================================================================================

Rule 1: COMPUTER VISION NMS
  Always check BOTH IoU and IoMin (>0.28) for road surface distress. Potholes and
  cracks have nested sub-textures that will bypass standard IoU.

Rule 2: VEHICLE PERSPECTIVE TRACKING
  Never use isotropic Euclidean distance for dashcam objects. Constrain lateral drift
  (|Δx| <= 0.16) and allow asymmetric forward flow (Δy in [-0.06, 0.45]).

Rule 3: HUD METRIC SEPARATION
  Always separate 'Timeline Scrubber Moments' (per-frame array) from 'Incident Inventory'
  (unique deduplicated track IDs).

Rule 4: BUILD INTEGRITY
  Always run 'npm run build' after refactoring React components to catch import
  syntax or TypeScript errors before deploying.

Rule 5: ENVIRONMENT & HOSTING SEPARATION
  Never attempt heavy PyTorch model inference inside static or serverless runtimes.
  Keep static frontend (Vercel/HF) separated from Python backend (Docker/Render/Local).

================================================================================
END OF REFERENCE MANUAL
================================================================================
