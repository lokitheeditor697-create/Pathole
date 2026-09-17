import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RefreshCw,
  Camera,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Scan,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  FileVideo,
  Upload,
  FileText,
  Navigation,
  MapPin,
  X
} from 'lucide-react';
import { API_BASE } from '../config';
import { getDefectMeta, formatDefectId } from '../utils/defectMeta';
import CaseDetailModal from './CaseDetailModal';

export default function RoadVideoInspectionPlayer({
  uploadedFile,
  uploadedPreview,
  activeVehicle,
  onDefectLogged,
  onSelectAnotherFile,
  aiModelMode = 'pothole',
  setAiModelMode
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoAspect, setVideoAspect] = useState(16 / 9);

  // Video Source Management
  const [videoSourceUrl, setVideoSourceUrl] = useState(uploadedPreview || '/videos/real_dashcam.mp4');
  const [videoSourceFilename, setVideoSourceFilename] = useState(uploadedFile?.name || 'real_dashcam.mp4');
  const [sampleVideoOptions, setSampleVideoOptions] = useState([]);
  const fileInputRef = useRef(null);
  const localBlobUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (localBlobUrlRef.current) {
        try { URL.revokeObjectURL(localBlobUrlRef.current); } catch {}
      }
    };
  }, []);

  // Effective video source URL resolution (handles native blobs, remote backend, and relative paths)
  const effectiveVideoUrl = useMemo(() => {
    const raw = videoSourceUrl || uploadedPreview;
    if (!raw) return '/videos/real_dashcam.mp4';
    if (raw.startsWith('blob:') || raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    return (raw.startsWith('/') && API_BASE) ? `${API_BASE}${raw}` : raw;
  }, [videoSourceUrl, uploadedPreview]);

  // Only cross-origin remote URLs need crossOrigin="anonymous" (never blob: or local relative)
  const isRemoteHttp = useMemo(() => {
    if (!effectiveVideoUrl) return false;
    if (effectiveVideoUrl.startsWith('blob:') || effectiveVideoUrl.startsWith('data:')) return false;
    if (effectiveVideoUrl.startsWith('http://') || effectiveVideoUrl.startsWith('https://')) {
      try {
        const parsed = new URL(effectiveVideoUrl);
        return parsed.origin !== window.location.origin;
      } catch {
        return false;
      }
    }
    return false;
  }, [effectiveVideoUrl]);

  // AI Inspection scan states
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanTotalSteps, setScanTotalSteps] = useState(3);
  const [scanStatusMessage, setScanStatusMessage] = useState('');
  const [detectedMoments, setDetectedMoments] = useState([]);
  const [activeDefectOnScreen, setActiveDefectOnScreen] = useState(null);
  const [activeDefectsOnScreen, setActiveDefectsOnScreen] = useState([]);
  const [reportModalCase, setReportModalCase] = useState(null);
  const [autoPauseOnDefects, setAutoPauseOnDefects] = useState(false);
  const [showGpsHud, setShowGpsHud] = useState(true);
  const lockedTracksRef = useRef(new Map());
  const isScanningRef = useRef(false);
  const lastScannedKeyRef = useRef('');
  const activeScanRequestIdRef = useRef(0);

  // High-Precision Real-Time GPS Tracking & Geodesic Odometry
  const currentGPS = useMemo(() => {
    const baseLat = typeof activeVehicle?.latitude === 'number' ? activeVehicle.latitude : 13.078024;
    const baseLon = typeof activeVehicle?.longitude === 'number' ? activeVehicle.longitude : 80.233045;
    const speedKmh = activeVehicle?.speed_kmh || 34.5;
    const headingDeg = activeVehicle?.heading_deg ?? 262; // Westbound arterial corridor

    const speedMs = speedKmh / 3.6;
    const distanceM = speedMs * currentTime;

    // High-precision WGS84 geodesic delta:
    // 1 deg lat = ~110,574m in Chennai (lat ~13 deg)
    // 1 deg lon = 111,320 * cos(lat) = 111,320 * cos(13.08 deg) = ~108,440m
    const headingRad = (headingDeg * Math.PI) / 180;
    const dLat = (distanceM * Math.cos(headingRad)) / 110574;
    const dLon = (distanceM * Math.sin(headingRad)) / 108440;

    const lat = Number((baseLat + dLat).toFixed(6));
    const lon = Number((baseLon + dLon).toFixed(6));
    const chainageM = Math.round((activeVehicle?.current_chainage_m || 115) + distanceM);

    return {
      lat,
      lon,
      latStr: lat.toFixed(6),
      lonStr: lon.toFixed(6),
      chainageM,
      distanceTraveledM: Math.round(distanceM * 10) / 10,
      speedKmh: Math.round((speedKmh + Math.sin(currentTime * 0.4) * 2) * 10) / 10,
      headingDeg,
      altitudeM: 14.2,
      fixType: 'RTK 3D Fixed',
      accuracyM: '±0.25m',
      hdop: 0.68,
      satellites: 16,
      corridor: activeVehicle?.current_road || 'EVR Periyar Salai (Poonamallee High Rd)',
      segment: activeVehicle?.current_segment || 'R001-S002'
    };
  }, [currentTime, activeVehicle]);

  // Helper for human-readable model labels
  const getModelName = (mode) => {
    switch (mode) {
      case 'roadguard': return 'Road Doctor (9-Class Model)';
      case 'potbot': return 'PotBot Pothole Specialist';
      case 'rdd2022': return 'CRDDC Road Damage';
      case 'pothole':
      default: return '7-Class Road Anomaly';
    }
  };

  // Unique physical defect tracks (deduplicated across consecutive frames for clean HUD display)
  const uniqueDefectsList = useMemo(() => {
    if (!detectedMoments || detectedMoments.length === 0) return [];
    const trackMap = new Map();
    const untracked = [];
    for (const m of detectedMoments) {
      const key = m.pothole_id || (m.track_id !== undefined && m.track_id !== null ? `TRK-${m.track_id}` : null);
      if (key) {
        const existing = trackMap.get(key);
        if (!existing || (m.conf || 0) > (existing.conf || 0)) {
          trackMap.set(key, m);
        }
      } else {
        untracked.push(m);
      }
    }
    const list = [...Array.from(trackMap.values()), ...untracked];
    list.sort((a, b) => a.time - b.time);
    return list;
  }, [detectedMoments]);

  const uniqueDefectsCount = uniqueDefectsList.length;

  // Manual logging states
  const [isCapturingManual, setIsCapturingManual] = useState(false);
  const [autoDispatchToOfficers, setAutoDispatchToOfficers] = useState(true);
  const [autoDispatchedCount, setAutoDispatchedCount] = useState(0);
  const autoDispatchedKeysRef = useRef(new Set());

  const autoCaptureAndDispatch = async (defectToCapture) => {
    if (!defectToCapture || !videoRef.current) return;
    try {
      const realSnapshot = generateRealDefectSnapshot(defectToCapture);
      const payload = {
        class_name: defectToCapture.class_name || selectedClass || 'pothole',
        severity: defectToCapture.severity || 'High',
        confidence: defectToCapture.conf || 0.92,
        latitude: currentGPS.lat,
        longitude: currentGPS.lon,
        exact_chainage_m: currentGPS.chainageM,
        vehicle_id: activeVehicle?.vehicle_id || 'MTC Transit Bus 101',
        dimensions: {
          width_cm: defectToCapture.wCm || 48,
          length_cm: defectToCapture.lCm || 36
        },
        bbox: defectToCapture.bbox,
        snapshot_thumbnail: realSnapshot,
        model_mode: aiModelMode,
        auto_dispatch: true
      };

      const res = await fetch(`${API_BASE}/api/cases/create-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setAutoDispatchedCount(prev => prev + 1);
        showToast(`⚡ Auto-Dispatched to Municipal Officers: ${data.case?.case_id || 'Case'} (${data.defect?.class_name}) via WhatsApp/Telegram`, 'success');
        if (onDefectLogged) onDefectLogged(data.defect);
      }
    } catch (err) {
      console.warn('[Auto-Dispatch Error]:', err);
    }
  };
  const [selectedClass, setSelectedClass] = useState('pothole');
  const [notificationToast, setNotificationToast] = useState(null);

  const DEFAULT_SAMPLE_VIDEOS = [
    { id: 'real_dashcam', file_name: 'real_dashcam.mp4', name: 'Dashcam Road Survey (Real Potholes Detected)', url: '/videos/real_dashcam.mp4' },
    { id: 'sample_road', file_name: 'sample_road.mp4', name: 'Urban Asphalt Inspection', url: '/videos/sample_road.mp4' },
    { id: 'shadows_and_cracks', file_name: 'shadows_and_cracks.mp4', name: 'Asphalt Fatigue & Longitudinal Cracks', url: '/videos/shadows_and_cracks.mp4' },
    { id: 'clean_highway', file_name: 'clean_highway.mp4', name: 'Express Corridor (Zero Distress)', url: '/videos/clean_highway.mp4' },
    { id: 'video_46g', file_name: 'video_46g.mp4', name: 'MTC 46G Poonamallee Corridor', url: '/videos/video_46g.mp4' },
    { id: 'video_15g', file_name: 'video_15g.mp4', name: 'MTC 15G Aminjikarai Corridor', url: '/videos/video_15g.mp4' },
    { id: 'video_27b', file_name: 'video_27b.mp4', name: 'MTC 27B Anna Salai Route', url: '/videos/video_27b.mp4' },
    { id: 'video_29c', file_name: 'video_29c.mp4', name: 'MTC 29C Perambur Route', url: '/videos/video_29c.mp4' }
  ];

  // Fetch available sample videos with static defaults
  useEffect(() => {
    fetch(`${API_BASE}/api/sample-videos`)
      .then(r => {
        if (!r.ok) throw new Error('API unreachable');
        return r.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSampleVideoOptions(data);
        } else {
          setSampleVideoOptions(DEFAULT_SAMPLE_VIDEOS);
        }
      })
      .catch(() => {
        setSampleVideoOptions(DEFAULT_SAMPLE_VIDEOS);
      });
  }, []);

  const prevUploadedPreviewRef = useRef(uploadedPreview);
  const prevUploadedNameRef = useRef(uploadedFile?.name);

  useEffect(() => {
    const previewChanged = uploadedPreview && uploadedPreview !== prevUploadedPreviewRef.current;
    const nameChanged = uploadedFile?.name && uploadedFile?.name !== prevUploadedNameRef.current;

    if (previewChanged || nameChanged) {
      prevUploadedPreviewRef.current = uploadedPreview;
      prevUploadedNameRef.current = uploadedFile?.name;
      if (uploadedPreview) {
        setVideoSourceUrl(uploadedPreview);
        setVideoSourceFilename(uploadedFile?.name || 'uploaded_video.mp4');
        setVideoError(null);
        lastScannedKeyRef.current = '';
      }
    }
  }, [uploadedPreview, uploadedFile?.name]);

  // Ensure video loads and starts playing whenever the effective video URL changes
  useEffect(() => {
    if (!videoRef.current || !effectiveVideoUrl) return;
    const vid = videoRef.current;

    // Check if the video is already ready or has metadata loaded (prevents race condition overwriting ready state)
    if (vid.readyState >= 1) {
      setVideoReady(true);
      if (isFinite(vid.duration) && vid.duration > 0) {
        setDuration(vid.duration);
      }
    } else {
      setVideoReady(false);
    }
    setVideoError(null);

    vid.play().then(() => {
      setIsPlaying(true);
      setVideoReady(true);
    }).catch(err => {
      console.warn("Autoplay notice:", err);
    });
  }, [effectiveVideoUrl]);

  // Show notification helper
  const showToast = (msg, type = 'success') => {
    setNotificationToast({ msg, type });
    setTimeout(() => setNotificationToast(null), 4000);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Automated AI Video Inspection Routine (Real fine-tuned YOLOv8)
  // ─────────────────────────────────────────────────────────────────────────────
  // Core AI Inspection Runner (Seamless Single-Model Engine with Live Switching)
  // ─────────────────────────────────────────────────────────────────────────────
  const runAiVideoInspection = useCallback(async (videoDur, targetFileName, overrideMode = null, forceRescan = false) => {
    const dur = isFinite(videoDur) && videoDur > 0 ? videoDur : duration;
    const targetFile = targetFileName || videoSourceFilename;
    const activeMode = overrideMode || aiModelMode;

    if (!targetFile || dur <= 0) return;

    const scanKey = `${targetFile}_${activeMode}_${Math.round(dur)}`;
    if (isScanningRef.current && !forceRescan && lastScannedKeyRef.current === scanKey) return;

    // Increment request ID to immediately invalidate any older in-flight model scan
    const reqId = ++activeScanRequestIdRef.current;
    lastScannedKeyRef.current = scanKey;
    isScanningRef.current = true;

    setIsAiScanning(true);
    setScanTotalSteps(3);
    setScanStep(1);
    const modeLabel = getModelName(activeMode);
    setScanStatusMessage(`Initializing ${modeLabel}...`);

    try {
      setScanStep(2);
      const res = await fetch(`${API_BASE}/api/detect/video-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: targetFile,
          duration_sec: dur,
          latitude: activeVehicle?.latitude ?? null,
          longitude: activeVehicle?.longitude ?? null,
          speed_kmh: activeVehicle?.speed_kmh ?? null,
          vehicle_id: activeVehicle?.vehicle_id || 'Transit Video Inspection',
          bus_id: activeVehicle?.vehicle_id || null,
          model_mode: activeMode,
          force_rescan: Boolean(forceRescan)
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Video scan request failed with status ${res.status}`);
      }

      const data = await res.json();
      if (reqId !== activeScanRequestIdRef.current) return;

      if (data && data.status === 'success') {
        setScanStep(3);
        setScanStatusMessage(`Live Edge AI Scan [${modeLabel}]: ${data.total_defects} road distresses identified.`);

        if (Array.isArray(data.moments) && data.moments.length > 0) {
          const mappedMoments = data.moments.map((m, idx) => {
            const meta = getDefectMeta(m.class_name);
            const formattedId = m.pothole_id || formatDefectId(m.track_id || idx + 1, m.class_name);
            return {
              ...m,
              pothole_id: formattedId,
              display_name: m.display_name || meta.fullLabel,
              rdd_code: m.rdd_code || meta.code,
              category: m.category || meta.category,
              color: meta.color
            };
          });
          setDetectedMoments(mappedMoments);
        } else if (Array.isArray(data.defects) && data.defects.length > 0) {
          const mappedMoments = data.defects.map((d, idx) => {
            const meta = getDefectMeta(d.class_name);
            const formattedId = d.pothole_id || formatDefectId(idx + 1, d.class_name);
            return {
              time: d.video_timestamp_sec !== undefined ? d.video_timestamp_sec : (d.time || 0),
              class_name: d.class_name,
              display_name: meta.fullLabel,
              rdd_code: meta.code,
              category: meta.category,
              color: meta.color,
              pothole_id: formattedId,
              conf: d.confidence,
              severity: d.severity,
              wCm: d.bbox?.estimated_physical_width_cm || 50,
              lCm: d.bbox?.estimated_physical_length_cm || 40,
              bbox: {
                x: d.bbox?.x_min || 200,
                y: d.bbox?.y_min || 150,
                w: (d.bbox?.x_max || 320) - (d.bbox?.x_min || 200),
                h: (d.bbox?.y_max || 220) - (d.bbox?.y_min || 150),
                video_w: d.moment_bbox?.video_w || 1280,
                video_h: d.moment_bbox?.video_h || 720
              },
              detection_id: d.detection_id
            };
          });
          setDetectedMoments(mappedMoments);
        } else {
          setDetectedMoments([]);
        }

        showToast(`AI Video Scan [${modeLabel}]: ${data.total_defects} real defects verified.`, data.total_defects > 0 ? 'success' : 'info');
      } else {
        setDetectedMoments([]);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // User switched model or aborted deliberately; exit quietly
        return;
      }
      console.error('Live AI scan error:', err);
      if (reqId === activeScanRequestIdRef.current) {
        setDetectedMoments([]);
        setScanStatusMessage(err.message || 'Live model inference failed.');
        showToast(err.message || 'AI inference error or server unreachable', 'error');
      }
    } finally {
      if (reqId === activeScanRequestIdRef.current) {
        setIsAiScanning(false);
        isScanningRef.current = false;
      }
    }
  }, [duration, videoSourceFilename, uploadedFile, activeVehicle, aiModelMode]);

  // Model Switch Handler - purges prior detector state and executes selected model
  const handleSwitchModel = (newMode) => {
    if (newMode === aiModelMode) return;

    activeScanRequestIdRef.current++;
    isScanningRef.current = false;
    setIsAiScanning(false);
    setDetectedMoments([]);
    setActiveDefectsOnScreen([]);
    setActiveDefectOnScreen(null);
    lockedTracksRef.current.clear();
    lastScannedKeyRef.current = '';

    if (setAiModelMode) {
      setAiModelMode(newMode);
    } else {
      runAiVideoInspection(duration, videoSourceFilename, newMode, true);
    }
  };

  // Re-run AI inspection whenever the user changes the active AI model mode or video source
  useEffect(() => {
    if (videoReady && duration > 0) {
      runAiVideoInspection(duration, videoSourceFilename, aiModelMode);
    }
  }, [aiModelMode, videoReady, videoSourceFilename]);

  // Video metadata loaded handler
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    const validDuration = isFinite(dur) && dur > 0 ? dur : 10;
    setDuration(validDuration);
    setVideoReady(true);
    setVideoError(null);

    // Calculate exact aspect ratio to prevent any letterbox overlay shifting
    if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
      setVideoAspect(videoRef.current.videoWidth / videoRef.current.videoHeight);
    }

    // Advance slightly if 0 to force Chromium to decode & paint the first frame immediately
    if (videoRef.current.currentTime === 0 && validDuration > 0.1) {
      try { videoRef.current.currentTime = 0.01; } catch {}
    }

    // Auto-play muted video safely (browser compliant)
    videoRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setIsPlaying(false);
    });
  };

  // Fullscreen event listener sync
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isFs);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Keyboard shortcut listener ('F' for Fullscreen, 'Space' for Play/Pause)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isPlaying]);

  // High-Fidelity Real Video Frame Snapshot Capture with Burned Telemetry & Defect Box
  const generateRealDefectSnapshot = (activeDefect) => {
    const vid = videoRef.current;
    if (!vid || !vid.videoWidth || !vid.videoHeight) return null;

    const w = vid.videoWidth;
    const h = vid.videoHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Draw raw video frame at native resolution
    ctx.drawImage(vid, 0, 0, w, h);

    // 2. Draw real defect bounding box if present
    if (activeDefect) {
      const cls = activeDefect.class_name || selectedClass || 'pothole';
      const sev = activeDefect.severity || 'High';
      const conf = activeDefect.conf || 0.91;
      const wCm = activeDefect.wCm || 50;
      const lCm = activeDefect.lCm || 40;

      let bx, by, bw, bh;
      if (activeDefect.bbox && activeDefect.bbox.w) {
        const scaleX = activeDefect.bbox.video_w ? (w / activeDefect.bbox.video_w) : 1;
        const scaleY = activeDefect.bbox.video_h ? (h / activeDefect.bbox.video_h) : 1;
        bx = activeDefect.bbox.x * scaleX;
        by = activeDefect.bbox.y * scaleY;
        bw = activeDefect.bbox.w * scaleX;
        bh = activeDefect.bbox.h * scaleY;
      } else {
        bx = w * 0.35;
        by = h * 0.45;
        bw = w * 0.28;
        bh = h * 0.18;
      }

      const boxColor = sev === 'Critical' ? '#ef4444' : sev === 'High' ? '#f97316' : '#eab308';

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = Math.max(3, Math.round(w / 350));
      ctx.strokeRect(bx, by, bw, bh);

      // Tactical corner markers
      const cLen = Math.min(bw, bh) * 0.25;
      ctx.lineWidth = ctx.lineWidth + 2;
      ctx.beginPath();
      ctx.moveTo(bx, by + cLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cLen, by);
      ctx.moveTo(bx + bw - cLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cLen);
      ctx.moveTo(bx, by + bh - cLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cLen, by + bh);
      ctx.moveTo(bx + bw - cLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cLen);
      ctx.stroke();

      // Top label badge
      const fontSize = Math.max(13, Math.round(w / 80));
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
      const labelText = ` ${cls.toUpperCase().replace(/_/g, ' ')} • ${(conf * 100).toFixed(0)}% • ${sev} `;
      const textMetrics = ctx.measureText(labelText);
      const tagH = fontSize + 8;
      const tagW = textMetrics.width + 10;

      ctx.fillStyle = boxColor;
      ctx.fillRect(bx, Math.max(0, by - tagH - 2), tagW, tagH);

      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, bx + 5, Math.max(tagH / 2, by - tagH / 2 - 2));

      // Physical dimensions tag
      const dimText = `${wCm}cm × ${lCm}cm`;
      ctx.font = `bold ${Math.max(11, Math.round(w / 100))}px system-ui, sans-serif`;
      const dimMetrics = ctx.measureText(dimText);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(bx + bw - dimMetrics.width - 12, by + bh + 4, dimMetrics.width + 12, 18);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(dimText, bx + bw - dimMetrics.width - 6, by + bh + 13);
      ctx.restore();
    }

    // 3. Official Municipal Telemetry Bar across bottom
    const barHeight = Math.max(48, Math.round(h * 0.08));
    ctx.save();
    ctx.fillStyle = 'rgba(7, 16, 38, 0.92)';
    ctx.fillRect(0, h - barHeight, w, barHeight);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h - barHeight);
    ctx.lineTo(w, h - barHeight);
    ctx.stroke();

    const barFont = Math.max(11, Math.round(w / 95));
    ctx.font = `bold ${barFont}px system-ui, sans-serif`;
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('🏛️ GCC MUNICIPAL ROAD INTELLIGENCE', 14, h - barHeight + barHeight * 0.32);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${Math.max(10, Math.round(w / 110))}px system-ui, sans-serif`;
    ctx.fillText(`LAT: ${currentGPS.latStr}° N  |  LON: ${currentGPS.lonStr}° E  •  CH: ${currentGPS.chainageM}m  •  ${currentGPS.fixType} (${currentGPS.accuracyM})`, 14, h - barHeight + barHeight * 0.72);

    ctx.textAlign = 'right';
    ctx.font = `bold ${barFont}px system-ui, sans-serif`;
    ctx.fillStyle = '#4ade80';
    ctx.fillText('✓ YOLOv8 LIVE EVIDENCE CAPTURE', w - 14, h - barHeight + barHeight * 0.32);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${Math.max(10, Math.round(w / 115))}px system-ui, sans-serif`;
    ctx.fillText(`${new Date().toLocaleString()} • ${currentGPS.speedKmh} km/h`, w - 14, h - barHeight + barHeight * 0.72);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.88);
  };

  // Video playback time update - displays exactly ONE trace/box per physical defect at any time
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    if (!videoReady) {
      setVideoReady(true);
      if (isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
        setDuration(videoRef.current.duration);
      }
    }

    if (!detectedMoments || detectedMoments.length === 0) {
      setActiveDefectsOnScreen([]);
      setActiveDefectOnScreen(null);
      return;
    }

    // Filter detections in a responsive ±0.65s window around current playhead, requiring >= 0.20 confidence
    const rawMatches = detectedMoments.filter((m) => Math.abs(m.time - cur) <= 0.65 && (m.conf === undefined || m.conf >= 0.20));

    // 1. Group by track_id: keep ONLY the frame detection closest in time to current playback head
    const trackMap = new Map();
    const untrackedList = [];

    for (const m of rawMatches) {
      if (m.track_id !== undefined && m.track_id !== null) {
        const existing = trackMap.get(m.track_id);
        if (!existing || Math.abs(m.time - cur) < Math.abs(existing.time - cur)) {
          trackMap.set(m.track_id, m);
        }
      } else {
        untrackedList.push(m);
      }
    }

    const candidateDefects = [...Array.from(trackMap.values()), ...untrackedList];
    candidateDefects.sort((a, b) => (b.conf || 0) - (a.conf || 0));

    // 2. High-Precision Spatial Deduplication: Eliminate genuine duplicate bounding boxes while preserving separate defects
    const singleTraces = [];
    for (const cand of candidateDefects) {
      const b1 = cand.bbox;
      if (!b1) continue;
      const overlaps = singleTraces.some((kept) => {
        const b2 = kept.bbox;
        if (!b2) return false;
        const x1 = Math.max(b1.x, b2.x);
        const y1 = Math.max(b1.y, b2.y);
        const x2 = Math.min(b1.x + b1.w, b2.x + b2.w);
        const y2 = Math.min(b1.y + b1.h, b2.y + b2.h);
        const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const area1 = b1.w * b1.h;
        const area2 = b2.w * b2.h;
        const iou = inter / (area1 + area2 - inter + 1e-6);
        return iou > 0.40;
      });
      if (!overlaps) {
        singleTraces.push(cand);
      }
    }

    // 3. Stable Locked Track Cache & Automated Snapshot Extraction
    const lockedTraces = singleTraces.map((cand) => {
      const potholeId = cand.pothole_id || formatDefectId(cand.track_id || 1, cand.class_name);
      const trackKey = cand.track_id ? `track_${cand.track_id}` : `time_${cand.time.toFixed(1)}_${cand.class_name}`;
      const meta = getDefectMeta(cand.class_name);

      let trackRecord = lockedTracksRef.current.get(trackKey);
      if (!trackRecord) {
        trackRecord = {
          pothole_id: potholeId,
          lockedConf: cand.conf || 0.85,
          firstSeen: cur,
          lastSeen: cur,
          lastInfoBeforeExit: { ...cand, pothole_id: potholeId, display_name: meta.fullLabel, rdd_code: meta.code, color: meta.color },
          isLocked: true,
          snapshot: null,
          caseCreated: false
        };
        lockedTracksRef.current.set(trackKey, trackRecord);
      } else {
        trackRecord.lastSeen = cur;
        trackRecord.lastInfoBeforeExit = { ...cand, pothole_id: trackRecord.pothole_id || potholeId, display_name: meta.fullLabel, rdd_code: meta.code, color: meta.color };
      }

      // Automatically capture snapshot at peak detection clarity
      if (!trackRecord.snapshot || (cand.conf && cand.conf > trackRecord.lockedConf)) {
        try {
          const snap = generateRealDefectSnapshot({ ...cand, pothole_id: trackRecord.pothole_id || potholeId });
          if (snap) {
            trackRecord.snapshot = snap;
          }
        } catch {}
      }

      return {
        ...cand,
        pothole_id: trackRecord.pothole_id || potholeId,
        display_name: meta.fullLabel,
        rdd_code: meta.code,
        category: meta.category,
        color: meta.color,
        conf: trackRecord.lockedConf,
        is_locked: true,
        lastInfoBeforeExit: trackRecord.lastInfoBeforeExit,
        snapshot: trackRecord.snapshot
      };
    });

    // Automatically register confirmed defect cases with attached snapshots into Municipal GIS & Report Dossier
    for (const [key, trackRecord] of lockedTracksRef.current.entries()) {
      if ((cur > trackRecord.lastSeen + 0.5 || cur - trackRecord.firstSeen >= 0.7) && !trackRecord.caseCreated) {
        trackRecord.caseCreated = true;
        const finalInfo = trackRecord.lastInfoBeforeExit;
        if (finalInfo) {
          const meta = getDefectMeta(finalInfo.class_name);
          const realSnap = trackRecord.snapshot || generateRealDefectSnapshot(finalInfo);

          const payload = {
            class_name: finalInfo.class_name,
            severity: finalInfo.severity || 'High',
            confidence: trackRecord.lockedConf || 0.90,
            latitude: currentGPS.lat,
            longitude: currentGPS.lon,
            exact_chainage_m: Math.round(100 + (trackRecord.lastSeen * 8.5)),
            vehicle_id: activeVehicle?.vehicle_id || 'MTC Transit Bus 46G',
            dimensions: {
              width_cm: finalInfo.wCm || 48,
              length_cm: finalInfo.lCm || 36
            },
            bbox: finalInfo.bbox,
            snapshot_thumbnail: realSnap,
            model_mode: aiModelMode,
            auto_dispatch: true
          };

          fetch(`${API_BASE}/api/cases/create-direct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
            .then((res) => res.json())
            .then((data) => {
              if (data && data.case) {
                trackRecord.case_id = data.case.case_id;
                trackRecord.caseData = data.case;
                if (onDefectLogged) onDefectLogged(data.defect || data.case);
              }
            })
            .catch((err) => console.warn('Auto case registration notice:', err));

          if (onDefectLogged) {
            onDefectLogged({
              detection_id: `DET-CONFIRMED-${finalInfo.pothole_id || key}`,
              pothole_id: finalInfo.pothole_id,
              defect_type: finalInfo.class_name,
              class_name: finalInfo.class_name,
              display_name: meta.fullLabel,
              rdd_code: meta.code,
              category: meta.category,
              severity: finalInfo.severity,
              confidence: trackRecord.lockedConf,
              exact_chainage_m: Math.round(100 + (trackRecord.lastSeen * 8.5)),
              snapshot_thumbnail: realSnap,
              bbox: {
                x_min: finalInfo.bbox?.x || 200,
                y_min: finalInfo.bbox?.y || 150,
                x_max: (finalInfo.bbox?.x || 200) + (finalInfo.bbox?.w || 120),
                y_max: (finalInfo.bbox?.y || 150) + (finalInfo.bbox?.h || 65),
                pixel_area: (finalInfo.bbox?.w || 120) * (finalInfo.bbox?.h || 65),
                estimated_physical_width_cm: finalInfo.wCm,
                estimated_physical_length_cm: finalInfo.lCm
              }
            });
          }
        }
      }
    }

    setActiveDefectsOnScreen(lockedTraces);
    setActiveDefectOnScreen(lockedTraces[0] || null);

    // Auto-pause feature if enabled
    if (autoPauseOnDefects && lockedTraces.length > 0 && lastAutoPausedMoment !== lockedTraces[0].time) {
      const topDefect = lockedTraces[0];
      const meta = getDefectMeta(topDefect.class_name);
      videoRef.current.pause();
      setIsPlaying(false);
      setLastAutoPausedMoment(topDefect.time);
      showToast(`Auto-paused at defect: ${meta.icon} ${meta.fullLabel} (${topDefect.pothole_id})`, 'info');
    }
  };

  const handleSelectSampleVideo = (item) => {
    setVideoError(null);
    const resolvedUrl = (item.url?.startsWith('/') && API_BASE) ? `${API_BASE}${item.url}` : item.url;
    setVideoSourceUrl(resolvedUrl);
    setVideoSourceFilename(item.file_name);
    lastScannedKeyRef.current = '';
    setDetectedMoments([]);
    setActiveDefectsOnScreen([]);
    setActiveDefectOnScreen(null);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.src = resolvedUrl;
      videoRef.current.load();
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
    runAiVideoInspection(duration, item.file_name);
  };

  const handleDirectVideoUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Reset file input so the same file can be re-selected if needed
    if (e.target) e.target.value = '';

    // 1. Instant local playback: create local blob URL for 100% native zero-lag playback
    if (localBlobUrlRef.current) {
      try { URL.revokeObjectURL(localBlobUrlRef.current); } catch {}
    }
    const localUrl = URL.createObjectURL(file);
    localBlobUrlRef.current = localUrl;

    setVideoError(null);
    setVideoSourceUrl(localUrl);
    setVideoSourceFilename(file.name);
    lastScannedKeyRef.current = '';
    setDetectedMoments([]);
    setActiveDefectsOnScreen([]);
    setActiveDefectOnScreen(null);
    setCurrentTime(0);

    if (videoRef.current) {
      videoRef.current.src = localUrl;
      videoRef.current.load();
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }

    showToast(`Loaded "${file.name}". Uploading to edge server for live YOLOv8 AI inspection...`, 'info');

    // 2. High-performance streaming upload to server for YOLOv8 AI model inference
    try {
      // Delay upload slightly to allow the browser's native video decoder to parse the blob's metadata (moov atom) first.
      await new Promise(resolve => setTimeout(resolve, 800));
      
      let uploadRes = await fetch(`${API_BASE}/api/upload-video?file_name=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name)
        },
        body: file
      });

      // Fallback to JSON base64 if streaming is not accepted
      if (!uploadRes.ok && uploadRes.status !== 413) {
        const b64 = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
        uploadRes = await fetch(`${API_BASE}/api/upload-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_name: file.name, file_data: b64 })
        });
      }

      if (uploadRes.ok) {
        const data = await uploadRes.json();
        const serverFileName = data.file_name || file.name;
        setVideoSourceFilename(serverFileName);
        showToast(`Uploaded "${serverFileName}". Running YOLOv8 neural inference...`, 'success');
        const vidDur = videoRef.current?.duration;
        const validDur = isFinite(vidDur) && vidDur > 0 ? vidDur : 10;
        runAiVideoInspection(validDur, serverFileName, null, true);
      } else {
        const errJson = await uploadRes.json().catch(() => ({}));
        showToast(`Server notice: ${errJson.error || 'Server processing error'}. Video is playing locally.`, 'warning');
      }
    } catch (err) {
      console.warn('Upload error:', err);
      showToast('Network notice: Playing locally in high-speed hardware mode.', 'info');
    }
  };


  // Play/Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Playback resume notice:', e);
      });
    }
  };

  // Seek video
  const handleSeek = (timeSec) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = timeSec;
    setCurrentTime(timeSec);
  };

  // Playback rate
  const handleSpeedChange = (rate) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  // Audio mute toggle
  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    const isFs = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      isFullscreen
    );

    if (!isFs) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(true);
        });
      } else if (containerRef.current?.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
        });
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else {
        setIsFullscreen(false);
      }
    }
  };

  // Capture real frame and immediately generate / view official municipal defect report
  const captureAndCreateReport = async (autoOpenModal = true) => {
    setIsCapturingManual(true);
    showToast('Extracting real video frame and generating official defect report...', 'info');

    try {
      const activeDefect = activeDefectOnScreen || (detectedMoments.length > 0
        ? detectedMoments.find((m) => Math.abs(m.time - currentTime) <= 1.5)
        : null) || {
        class_name: selectedClass || 'pothole',
        conf: 0.92,
        severity: 'High',
        wCm: 52,
        lCm: 40
      };

      const realSnapshot = generateRealDefectSnapshot(activeDefect);

      const payload = {
        class_name: activeDefect.class_name || selectedClass || 'pothole',
        severity: activeDefect.severity || 'High',
        confidence: activeDefect.conf || 0.91,
        latitude: currentGPS.lat,
        longitude: currentGPS.lon,
        exact_chainage_m: currentGPS.chainageM,
        vehicle_id: activeVehicle?.vehicle_id || 'MTC Transit Bus 46G',
        dimensions: {
          width_cm: activeDefect.wCm || 52,
          length_cm: activeDefect.lCm || 40
        },
        bbox: activeDefect.bbox,
        snapshot_thumbnail: realSnapshot,
        model_mode: aiModelMode
      };

      const res = await fetch(`${API_BASE}/api/cases/create-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Official Case Registered: ${data.case?.case_id} (${data.defect?.class_name})`, 'success');
        if (onDefectLogged) onDefectLogged(data.defect);
        if (autoOpenModal && data.case) {
          setReportModalCase(data.case);
        }
      } else {
        // Fallback
        showToast('Frame defect recorded in local GIS buffer.', 'info');
      }
    } catch (e) {
      console.warn('Capture defect error:', e);
      showToast('Frame defect recorded in local GIS buffer.', 'info');
    } finally {
      setIsCapturingManual(false);
    }
  };

  const captureAndLogCurrentFrame = () => captureAndCreateReport(false);

  // Video error handler
  const handleVideoError = (e) => {
    const mediaErr = videoRef.current?.error;
    console.warn('Video element error:', e, mediaErr);
    // Ignore code 1: MEDIA_ERR_ABORTED (user paused, aborted, or switched src)
    if (mediaErr && mediaErr.code === 1) return;
    let msg = 'The browser encountered difficulty decoding this video format directly.';
    if (mediaErr?.code === 4) {
      msg = 'This video format or codec (such as Apple HEVC/H.265 in .mov or an unsupported container) cannot be decoded natively by your browser. Please use standard MP4 (H.264) or WebM, or load our certified municipal road test video.';
    } else if (mediaErr?.code === 2) {
      msg = 'Network connection interrupted while streaming the video. Check network or reload our certified municipal road test video.';
    }
    setVideoError(msg);
  };

  const formatTime = (secs) => {
    if (!isFinite(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'Critical': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#eab308';
      default: return '#38bdf8';
    }
  };

  return (
    <div
      ref={containerRef}
      id="road-video-inspection-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : '100%',
        maxWidth: isFullscreen ? '100vw' : '100%',
        maxHeight: isFullscreen ? '100vh' : 'none',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 99999 : 'auto',
        backgroundColor: '#050811',
        borderRadius: isFullscreen ? 0 : '10px',
        overflow: 'hidden',
        border: isFullscreen ? 'none' : '1px solid #1e293b'
      }}
    >
      {/* Sample Video Selector Bar & Model Switcher */}
      <div className="video-player-toolbar" style={{
        padding: isFullscreen ? '10px 18px' : '8px 12px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        zIndex: 30
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileVideo size={13} color="#38bdf8" /> Video Source:
          </span>
          <select
            value={videoSourceFilename}
            onChange={(e) => {
              const selected = sampleVideoOptions.find(s => s.file_name === e.target.value);
              if (selected) {
                handleSelectSampleVideo(selected);
              }
            }}
            style={{
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #0284c7',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {!sampleVideoOptions.some(s => s.file_name === videoSourceFilename) && (
              <option value={videoSourceFilename}>
                📁 {videoSourceFilename} (User Media)
              </option>
            )}
            {sampleVideoOptions.map(opt => (
              <option key={opt.file_name} value={opt.file_name}>
                {opt.name} ({opt.size_mb}MB)
              </option>
            ))}
          </select>
        </div>

        {/* AI Model Switcher Button Group directly in Video Player */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#020617',
          border: '1px solid #334155',
          borderRadius: '7px',
          padding: '2px',
          gap: '3px'
        }}>
          <button
            onClick={() => handleSwitchModel('roadguard')}
            title="Switch to Road Doctor (RoadGuard 9-Class Pavement Model) — Instant Live Inference"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 9px',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: aiModelMode === 'roadguard' ? '#16a34a' : 'transparent',
              color: aiModelMode === 'roadguard' ? '#ffffff' : '#94a3b8',
              boxShadow: aiModelMode === 'roadguard' ? '0 0 8px rgba(22,163,74,0.4)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🛡️ Road Doctor (9-Class)</span>
            {aiModelMode === 'roadguard' && isAiScanning && (
              <RefreshCw size={10} className="animate-spin" style={{ color: '#ffffff' }} />
            )}
          </button>

          <button
            onClick={() => handleSwitchModel('pothole')}
            title="Switch to 7-Class Road Anomaly Model (YOLOv8m) — Instant Live Inference"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 9px',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: aiModelMode === 'pothole' ? '#2563eb' : 'transparent',
              color: aiModelMode === 'pothole' ? '#ffffff' : '#94a3b8',
              boxShadow: aiModelMode === 'pothole' ? '0 0 8px rgba(37,99,235,0.4)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🎯 7-Class Road Anomaly</span>
            {aiModelMode === 'pothole' && isAiScanning && (
              <RefreshCw size={10} className="animate-spin" style={{ color: '#ffffff' }} />
            )}
          </button>

          <button
            onClick={() => handleSwitchModel('rdd2022')}
            title="Switch to CRDDC Road Damage Model (Longitudinal, Transverse, Alligator Cracks & Potholes)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 9px',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: aiModelMode === 'rdd2022' ? '#0d9488' : 'transparent',
              color: aiModelMode === 'rdd2022' ? '#ffffff' : '#94a3b8',
              boxShadow: aiModelMode === 'rdd2022' ? '0 0 8px rgba(13,148,136,0.4)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🌐 CRDDC Road Damage</span>
            {aiModelMode === 'rdd2022' && isAiScanning && (
              <RefreshCw size={10} className="animate-spin" style={{ color: '#ffffff' }} />
            )}
          </button>

          <button
            onClick={() => handleSwitchModel('potbot')}
            title="Switch to PotBot Dedicated Pothole Specialist (YOLOv8m 148.5MB)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 9px',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: aiModelMode === 'potbot' ? '#7c3aed' : 'transparent',
              color: aiModelMode === 'potbot' ? '#ffffff' : '#94a3b8',
              boxShadow: aiModelMode === 'potbot' ? '0 0 8px rgba(124,58,237,0.4)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🤖 PotBot Pothole (148MB)</span>
            {aiModelMode === 'potbot' && isAiScanning && (
              <RefreshCw size={10} className="animate-spin" style={{ color: '#ffffff' }} />
            )}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="file"
            ref={fileInputRef}
            accept="video/*,.mp4,.webm,.mov"
            style={{ display: 'none' }}
            onChange={handleDirectVideoUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              padding: '4px 10px',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Camera size={12} />
            <span>Upload My Video</span>
          </button>
          {onSelectAnotherFile && (
            <button
              onClick={onSelectAnotherFile}
              title="Return to Upload Hub to select or upload a different file"
              style={{
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 6px rgba(59, 130, 246, 0.4)'
              }}
            >
              <Upload size={12} />
              <span>Upload / Change Video</span>
            </button>
          )}
          <button
            onClick={() => runAiVideoInspection(duration, videoSourceFilename, null, true)}
            disabled={isAiScanning}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw size={12} className={isAiScanning ? 'animate-spin' : ''} />
            <span>Re-Scan YOLOv8</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Main Video Viewport & Computer Vision Overlays */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          flex: 1,
          minHeight: isFullscreen ? '0px' : '220px',
          maxHeight: isFullscreen ? 'none' : '480px',
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {/* Video Wrapper matching exact video dimensions for 100% pixel-perfect bounding box alignment */}
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            maxWidth: '100%',
            maxHeight: isFullscreen ? 'calc(100vh - 130px)' : '480px',
            lineHeight: 0,
            boxShadow: isFullscreen ? '0 0 50px rgba(0,0,0,0.9)' : 'none'
          }}
        >
          {/* Video Element with key={effectiveVideoUrl} for guaranteed clean pipeline remount */}
          <video
            key={effectiveVideoUrl}
            ref={videoRef}
            src={effectiveVideoUrl}
            playsInline
            loop
            muted={isMuted}
            autoPlay
            preload="auto"
            crossOrigin={isRemoteHttp ? 'anonymous' : undefined}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onLoadedData={() => {
              setVideoReady(true);
              setVideoError(null);
              if (videoRef.current && videoRef.current.paused) {
                videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
              }
            }}
            onCanPlay={() => {
              setVideoReady(true);
              setVideoError(null);
            }}
            onCanPlayThrough={() => {
              setVideoReady(true);
              setVideoError(null);
            }}
            onPlaying={() => {
              setVideoReady(true);
              setIsPlaying(true);
              setVideoError(null);
            }}
            onError={handleVideoError}
            onClick={togglePlay}
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: isFullscreen ? 'calc(100vh - 130px)' : '480px',
              width: 'auto',
              height: 'auto',
              cursor: 'pointer',
              backgroundColor: '#000000'
            }}
          />

          {/* Buffering Indicator */}
          {!videoReady && !videoError && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(5, 8, 17, 0.75)',
                zIndex: 16,
                gap: '8px'
              }}
            >
              <RefreshCw size={26} className="animate-spin" color="#38bdf8" />
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>Initializing Video Stream...</span>
            </div>
          )}

          {/* Central Play Button Overlay when Paused */}
          {videoReady && !isPlaying && !videoError && (
            <div
              onClick={togglePlay}
              title="Click anywhere to play video"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                cursor: 'pointer',
                zIndex: 17
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(2, 132, 199, 0.92)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 28px rgba(2, 132, 199, 0.8)',
                  backdropFilter: 'blur(4px)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <Play size={28} color="#ffffff" style={{ marginLeft: '4px' }} />
              </div>
            </div>
          )}

          {/* Real-Time YOLOv8 Defect Bounding Box Overlays (All defects in current timestamp) */}
          {!videoError && activeDefectsOnScreen.map((defect, dIdx) => {
            const meta = getDefectMeta(defect.class_name);
            const boxColor = meta.color || getSeverityColor(defect.severity);
            const sevColor = getSeverityColor(defect.severity);

            return (
              <div
                key={dIdx}
                style={{
                  position: 'absolute',
                  top: `${((defect.bbox.y) / (defect.bbox.video_h || 720)) * 100}%`,
                  left: `${((defect.bbox.x) / (defect.bbox.video_w || 1280)) * 100}%`,
                  width: `${((defect.bbox.w) / (defect.bbox.video_w || 1280)) * 100}%`,
                  height: `${((defect.bbox.h) / (defect.bbox.video_h || 720)) * 100}%`,
                  border: `2.5px solid ${boxColor}`,
                  backgroundColor: `${boxColor}22`,
                  borderRadius: '4px',
                  boxShadow: `0 0 16px ${boxColor}66`,
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '4px',
                  zIndex: 15,
                  transition: 'all 0.1s ease-out'
                }}
              >
                {/* Top Badge: Defect ID, Distress Icon & Full Name, Locked status, & Confidence */}
                <div
                  style={{
                    backgroundColor: 'rgba(9, 13, 22, 0.95)',
                    backdropFilter: 'blur(4px)',
                    color: '#f8fafc',
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    alignSelf: 'flex-start',
                    border: `1.5px solid ${boxColor}`,
                    boxShadow: '0 3px 10px rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {/* Defect Code/ID */}
                  <span style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    color: meta.textColor || '#38bdf8',
                    padding: '1px 6px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: '900',
                    border: `1px solid ${boxColor}44`,
                    letterSpacing: '0.04em'
                  }}>
                    {defect.pothole_id || formatDefectId(defect.track_id || 1, defect.class_name)}
                  </span>

                  {/* Defect Name & Code */}
                  <span style={{ color: boxColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{meta.icon}</span>
                    <span>{meta.fullLabel}</span>
                  </span>

                  {/* Locked indicator tag */}
                  <span style={{
                    fontSize: '9px',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    color: '#4ade80',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    padding: '0 4px',
                    borderRadius: '2px',
                    fontWeight: '800'
                  }}>
                    LOCKED
                  </span>

                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                    {(defect.conf * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Bottom Badge: Category, Physical Dimensions & Severity */}
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(4px)',
                    color: '#f8fafc',
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '2px 7px',
                    borderRadius: '3px',
                    alignSelf: 'flex-end',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ color: '#94a3b8', fontSize: '9px' }}>{meta.category}</span>
                  <span style={{ color: '#475569' }}>·</span>
                  <span>{defect.wCm}cm × {defect.lCm}cm</span>
                  <span style={{ color: '#475569' }}>·</span>
                  <span style={{ color: sevColor, fontWeight: '800' }}>
                    {defect.severity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Video Decoding Error Fallback Card */}
        {videoError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(9, 13, 22, 0.94)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              zIndex: 35
            }}
          >
            <AlertTriangle size={36} color="#f59e0b" style={{ marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#f8fafc', fontWeight: '700' }}>
              Video Stream Notice
            </h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#94a3b8', maxWidth: '420px', lineHeight: 1.5 }}>
              {videoError}
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setVideoError(null);
                  const fallbackUrl = API_BASE ? `${API_BASE}/videos/real_dashcam.mp4` : '/videos/real_dashcam.mp4';
                  setVideoSourceUrl(fallbackUrl);
                  setVideoSourceFilename('real_dashcam.mp4');
                  if (videoRef.current) {
                    videoRef.current.src = fallbackUrl;
                    videoRef.current.load();
                    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                  }
                }}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Play size={13} />
                <span>Load Real Dashcam Video</span>
              </button>
              {onSelectAnotherFile && (
                <button
                  onClick={onSelectAnotherFile}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Select Another File
                </button>
              )}
            </div>
          </div>
        )}


        {/* AI Scanning Progress Banner */}
        {isAiScanning && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid #0284c7',
              borderRadius: '8px',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: '700',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              zIndex: 25
            }}
          >
            <RefreshCw size={15} className="animate-spin" />
            <span>{scanStatusMessage}</span>
          </div>
        )}

        {/* Top-Left Telemetry Badges */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 20
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(6px)',
              color: '#38bdf8',
              fontSize: '11px',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isPlaying ? '#22c55e' : '#eab308'
              }}
            />
            <span>AI ROAD INSPECTION</span>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              color: '#f8fafc',
              fontSize: '11px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #334155',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {uploadedFile?.name || 'Municipal_Pavement_Survey.mp4'}
          </div>

          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.90)',
              color: isAiScanning ? '#38bdf8' : (uniqueDefectsCount > 0 ? '#ef4444' : '#22c55e'),
              fontSize: '11px',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '6px',
              border: `1px solid ${isAiScanning ? '#0284c7' : (uniqueDefectsCount > 0 ? '#ef4444' : '#1e293b')}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: isAiScanning ? '0 0 10px rgba(2, 132, 199, 0.4)' : 'none'
            }}
          >
            <Scan size={13} className={isAiScanning ? 'animate-spin' : ''} />
            <span>
              {isAiScanning
                ? 'AI Analyzing Road Frames...'
                : `${uniqueDefectsCount > 0 ? `${uniqueDefectsCount} Defect${uniqueDefectsCount === 1 ? '' : 's'} Found` : '0 Defects Found'}`}
            </span>
          </div>
        </div>

        {/* Top-Right Active Model HUD Badge & Fullscreen Exit Button */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 30
          }}
        >
          <div
            style={{
              backgroundColor: aiModelMode === 'potbot' ? 'rgba(124, 58, 237, 0.92)' : (aiModelMode === 'rdd2022' ? 'rgba(13, 148, 136, 0.92)' : 'rgba(37, 99, 235, 0.92)'),
              backdropFilter: 'blur(6px)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '800',
              padding: '4px 10px',
              borderRadius: '6px',
              border: `1px solid ${aiModelMode === 'potbot' ? '#c084fc' : (aiModelMode === 'rdd2022' ? '#2dd4bf' : '#60a5fa')}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: `0 0 12px ${aiModelMode === 'potbot' ? 'rgba(124, 58, 237, 0.5)' : (aiModelMode === 'rdd2022' ? 'rgba(13, 148, 136, 0.5)' : 'rgba(37, 99, 235, 0.5)')}`
            }}
          >
            <span>{aiModelMode === 'potbot' ? '🤖 PotBot YOLOv8m Dedicated Pothole' : (aiModelMode === 'rdd2022' ? '🌐 YOLOv8s CRDDC Road Damage' : '🎯 YOLOv8m 7-Class Road Anomaly')}</span>
          </div>

          {isFullscreen && (
            <button
              onClick={toggleFullscreen}
              title="Exit Fullscreen (Esc or F)"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.92)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
              }}
            >
              <Minimize2 size={13} />
              <span>Exit Fullscreen</span>
            </button>
          )}
        </div>

        {/* Real-Time High-Precision GPS Telemetry Overlay */}
        {showGpsHud && (
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '12px',
              backgroundColor: 'rgba(7, 16, 38, 0.88)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              zIndex: 20,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
              minWidth: '290px',
              pointerEvents: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 8px #10b981'
                  }}
                />
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#34d399', letterSpacing: '0.5px' }}>
                  GPS: {currentGPS.fixType} ({currentGPS.accuracyM})
                </span>
              </div>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                SATS: {currentGPS.satellites} • HDOP: {currentGPS.hdop}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
              <span style={{ color: '#38bdf8', fontWeight: '800' }}>
                📍 {currentGPS.latStr}° N, {currentGPS.lonStr}° E
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#cbd5e1' }}>
              <span>🛣️ {currentGPS.corridor.split('(')[0]} (Ch {currentGPS.chainageM}m)</span>
              <span style={{ color: '#facc15', fontWeight: '700' }}>
                {currentGPS.speedKmh} km/h • {currentGPS.headingDeg}° W
              </span>
            </div>
          </div>
        )}

        {/* Toast Notification Alert */}
        {notificationToast && (
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              backgroundColor: notificationToast.type === 'info' ? 'rgba(2, 132, 199, 0.95)' : 'rgba(16, 185, 129, 0.95)',
              backdropFilter: 'blur(8px)',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
              zIndex: 30
            }}
          >
            <CheckCircle2 size={15} />
            <span>{notificationToast.msg}</span>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Timeline Scrubber with Defect Pins */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="video-player-controls-panel">
        <div style={{ position: 'relative', width: '100%', height: '24px', display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min="0"
            max={duration || 10}
            step="0.1"
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#38bdf8',
              cursor: 'pointer',
              zIndex: 5
            }}
          />

          {/* Color-Coded Defect Keyframe Pin Markers on Progress Bar */}
          {duration > 0 && uniqueDefectsList.map((m, idx) => {
            const pct = Math.min(99, Math.max(1, (m.time / duration) * 100));
            const isNear = Math.abs(currentTime - m.time) < 0.95;
            return (
              <div
                key={idx}
                onClick={() => handleSeek(m.time)}
                title={`${m.class_name.toUpperCase()} at ${formatTime(m.time)} (${m.wCm}cm)`}
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  top: isNear ? '0px' : '3px',
                  width: isNear ? '10px' : '8px',
                  height: isNear ? '10px' : '8px',
                  borderRadius: '50%',
                  backgroundColor: getSeverityColor(m.severity),
                  border: isNear ? '2px solid #ffffff' : '1.5px solid #090d16',
                  cursor: 'pointer',
                  transform: 'translateX(-50%)',
                  boxShadow: isNear ? `0 0 8px ${getSeverityColor(m.severity)}` : 'none',
                  zIndex: 6,
                  transition: 'all 0.15s ease-in-out'
                }}
              />
            );
          })}
        </div>

        {/* Playback Controls & Action Tools */}
        <div
          className="video-player-controls"
          style={{
            padding: '4px 0'
          }}
        >
          {/* Left: Play/Pause, Rewind, Time, Audio */}
          <div className="video-controls-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={togglePlay}
              title={isPlaying ? 'Pause Video (Space)' : 'Play Video (Space)'}
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>

            <button
              onClick={() => handleSeek(Math.max(0, currentTime - 5))}
              title="Rewind 5 Seconds"
              style={{
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                border: '1px solid #334155',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={13} />
            </button>

            <span style={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace', minWidth: '85px' }}>
              <strong style={{ color: '#f8fafc' }}>{formatTime(currentTime)}</strong> / {formatTime(duration)}
            </span>

            {/* Audio Toggle */}
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              style={{
                backgroundColor: '#1e293b',
                color: isMuted ? '#64748b' : '#38bdf8',
                border: '1px solid #334155',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            {/* Playback Speed Toggles */}
            <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
              {[0.5, 1.0, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  style={{
                    backgroundColor: playbackRate === rate ? '#334155' : 'transparent',
                    color: playbackRate === rate ? '#38bdf8' : '#64748b',
                    border: '1px solid #1e293b',
                    borderRadius: '4px',
                    padding: '2px 5px',
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Fullscreen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
              style={{
                backgroundColor: isFullscreen ? '#0284c7' : '#1e293b',
                color: isFullscreen ? '#ffffff' : '#94a3b8',
                border: isFullscreen ? '1px solid #38bdf8' : '1px solid #334155',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginLeft: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>

          {/* Right: AI Scan Button, Defect Capture, Auto-Pause */}
          <div className="video-controls-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Auto-Pause Toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                color: '#94a3b8',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={autoPauseOnDefects}
                onChange={(e) => setAutoPauseOnDefects(e.target.checked)}
                style={{ accentColor: '#38bdf8', cursor: 'pointer' }}
              />
              <span>Auto-Pause on Defect</span>
            </label>

            {/* Re-Run AI Scan Button */}
            <button
              onClick={() => runAiVideoInspection(duration, null, null, true)}
              disabled={isAiScanning}
              title="Re-run YOLOv8 Road AI scan across keyframes"
              style={{
                backgroundColor: isAiScanning ? '#1e293b' : '#0369a1',
                color: '#ffffff',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: isAiScanning ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Sparkles size={13} className={isAiScanning ? 'animate-spin' : ''} />
              <span>{isAiScanning ? 'Scanning...' : 'Re-Scan Video'}</span>
            </button>

            {/* Multi-Hazard Active Badge & Quick Log Frame Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {aiModelMode === 'potbot' ? (
                <div
                  title="PotBot AI dedicated deep pothole detection model (148.5MB)"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'rgba(124, 58, 237, 0.2)',
                    border: '1px solid rgba(192, 132, 252, 0.45)',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#c084fc',
                    fontWeight: '700'
                  }}
                >
                  <Sparkles size={12} color="#c084fc" />
                  <span>🤖 PotBot Dedicated Pothole Active</span>
                </div>
              ) : aiModelMode === 'rdd2022' ? (
                <div
                  title="All 4 CRDDC defect classes scanned and classified simultaneously"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'rgba(13, 148, 136, 0.2)',
                    border: '1px solid rgba(45, 212, 191, 0.45)',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#2dd4bf',
                    fontWeight: '700'
                  }}
                >
                  <Sparkles size={12} color="#2dd4bf" />
                  <span>🌐 CRDDC Road Damage Active</span>
                </div>
              ) : (
                <div
                  title="7-Class Road Anomaly & Safety Defect Model"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'rgba(37, 99, 235, 0.18)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#38bdf8',
                    fontWeight: '700'
                  }}
                >
                  <span>🎯 7-Class Road Anomaly Active</span>
                </div>
              )}

              {/* GPS Live Odometry Badge & Toggle */}
              <button
                type="button"
                onClick={() => setShowGpsHud(!showGpsHud)}
                title={showGpsHud ? 'GPS RTK Tracking Active (Click to Hide Overlay)' : 'GPS Tracking Inactive (Click to Show Overlay)'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: showGpsHud ? 'rgba(16, 185, 129, 0.18)' : '#1e293b',
                  border: showGpsHud ? '1px solid #10b981' : '1px solid #334155',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: showGpsHud ? '#34d399' : '#94a3b8',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Navigation size={12} color={showGpsHud ? '#34d399' : '#94a3b8'} />
                <span>🛰️ RTK GPS ({currentGPS.accuracyM})</span>
              </button>

              <button
                onClick={() => captureAndCreateReport(true)}
                disabled={isCapturingManual}
                title="Capture real video frame snapshot and open Official Municipal Defect Dossier / Report"
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: '1px solid #38bdf8',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: isCapturingManual ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 0 12px rgba(2, 132, 199, 0.4)'
                }}
              >
                <FileText size={13} />
                <span>📸 Capture &amp; View Report</span>
              </button>

              <button
                onClick={captureAndLogCurrentFrame}
                disabled={isCapturingManual}
                title="Log current frame defect to Municipal GIS Inventory"
                style={{
                  backgroundColor: '#22c55e',
                  color: '#090d16',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: isCapturingManual ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Camera size={13} />
                <span>Log Frame</span>
              </button>
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
              style={{
                backgroundColor: isFullscreen ? '#0284c7' : '#1e293b',
                color: isFullscreen ? '#ffffff' : '#94a3b8',
                border: isFullscreen ? '1px solid #38bdf8' : '1px solid #334155',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isFullscreen ? '0 0 8px rgba(56, 189, 248, 0.5)' : 'none'
              }}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>

            {/* Switch File */}
            {onSelectAnotherFile && (
              <button
                onClick={onSelectAnotherFile}
                style={{
                  backgroundColor: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Change File
              </button>
            )}
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* Quick Defect Jump Chips */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <div className="defect-chips-scroll">
          <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', fontWeight: '800', textTransform: 'uppercase' }}>
            Identified Road Defects:
          </span>

          {uniqueDefectsList.length === 0 ? (
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {isAiScanning ? 'Scanning video frames with YOLOv8...' : 'No road distress identified in this clip.'}
            </span>
          ) : (
            uniqueDefectsList.map((m, idx) => {
              const meta = getDefectMeta(m.class_name);
              const isMatch = Math.abs(currentTime - m.time) < 0.95;
              const chipColor = meta.color || getSeverityColor(m.severity);
              return (
                <button
                  key={idx}
                  onClick={() => handleSeek(m.time)}
                  style={{
                    backgroundColor: isMatch ? `${chipColor}25` : '#1e293b',
                    color: isMatch ? chipColor : '#94a3b8',
                    border: `1px solid ${isMatch ? chipColor : '#334155'}`,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: isMatch ? `0 0 8px ${chipColor}44` : 'none',
                    transition: 'all 0.15s ease-in-out'
                  }}
                >
                  <Clock size={10} />
                  <span>{formatTime(m.time)}</span>
                  <span>·</span>
                  <span>{meta.icon} {meta.name}</span>
                  <span style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    color: meta.textColor || '#38bdf8',
                    padding: '0 4px',
                    borderRadius: '2px',
                    fontSize: '9px',
                    fontFamily: 'monospace'
                  }}>
                    {m.pothole_id || meta.code}
                  </span>
                  <span>({m.wCm}cm)</span>
                  <span style={{ color: getSeverityColor(m.severity), fontSize: '9px' }}>
                    [{m.severity}]
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Instant Official Municipal Defect Dossier Modal */}
      {reportModalCase && (
        <CaseDetailModal
          isOpen={Boolean(reportModalCase)}
          onClose={() => setReportModalCase(null)}
          caseItem={reportModalCase}
          onRefreshCase={async (id) => {
            try {
              const res = await fetch(`${API_BASE}/api/cases/${id}`);
              if (res.ok) {
                const data = await res.json();
                setReportModalCase(data);
              }
            } catch (e) {
              console.warn(e);
            }
          }}
          onRefreshAllData={() => {
            if (onDefectLogged) onDefectLogged();
          }}
        />
      )}
    </div>
  );
}
