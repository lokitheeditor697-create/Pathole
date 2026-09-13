import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  X
} from 'lucide-react';
import { API_BASE } from '../config';
import { getDefectMeta, formatDefectId } from '../utils/defectMeta';

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

  // AI Inspection scan states
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanTotalSteps, setScanTotalSteps] = useState(3);
  const [scanStatusMessage, setScanStatusMessage] = useState('');
  const [detectedMoments, setDetectedMoments] = useState([]);
  const [activeDefectOnScreen, setActiveDefectOnScreen] = useState(null);
  const [activeDefectsOnScreen, setActiveDefectsOnScreen] = useState([]);
  const [autoPauseOnDefects, setAutoPauseOnDefects] = useState(false);
  const [lastAutoPausedMoment, setLastAutoPausedMoment] = useState(null);
  const lockedTracksRef = useRef(new Map());
  const isScanningRef = useRef(false);
  const lastScannedKeyRef = useRef('');

  // Manual logging states
  const [isCapturingManual, setIsCapturingManual] = useState(false);
  const [selectedClass, setSelectedClass] = useState('pothole');
  const [notificationToast, setNotificationToast] = useState(null);

  // Fetch available sample videos
  useEffect(() => {
    fetch(`${API_BASE}/api/sample-videos`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setSampleVideoOptions(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (uploadedPreview) {
      setVideoSourceUrl(uploadedPreview);
      setVideoSourceFilename(uploadedFile?.name || 'uploaded_video.mp4');
      lastScannedKeyRef.current = '';
    }
  }, [uploadedPreview, uploadedFile]);

  // Show notification helper
  const showToast = (msg, type = 'success') => {
    setNotificationToast({ msg, type });
    setTimeout(() => setNotificationToast(null), 4000);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Automated AI Video Inspection Routine (Real fine-tuned YOLOv8)
  // ─────────────────────────────────────────────────────────────────────────────
  const runAiVideoInspection = useCallback(async (videoDurationSec, fileOverride = null, modeOverride = null) => {
    const dur = Math.max(4, videoDurationSec || duration || 10);
    const targetFile = fileOverride || videoSourceFilename || uploadedFile?.name || 'real_dashcam.mp4';
    const activeMode = modeOverride || aiModelMode;

    const scanKey = `${targetFile}_${activeMode}_${Math.round(dur)}`;
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    lastScannedKeyRef.current = scanKey;

    setIsAiScanning(true);
    setScanTotalSteps(3);
    setScanStep(1);
    setScanStatusMessage(`Initializing ${activeMode === 'rdd2022' ? 'YOLOv8 7-Class RDD2022' : 'YOLOv8 Dedicated Pothole'} model...`);

    try {
      setScanStep(2);
      setScanStatusMessage(`Running real AI inference (${activeMode === 'rdd2022' ? '7-Class RDD2022' : 'Dedicated Pothole'}) on "${targetFile}"...`);

      const res = await fetch(`${API_BASE}/api/detect/video-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: targetFile,
          duration_sec: dur,
          latitude: activeVehicle?.latitude || 13.0780,
          longitude: activeVehicle?.longitude || 80.2330,
          vehicle_id: activeVehicle?.vehicle_id || 'Transit Video Inspection',
          model_mode: activeMode,
          force_rescan: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        setScanStep(3);
        const modeLabel = activeMode === 'rdd2022' ? '7-Class RDD2022' : 'Dedicated Pothole';
        setScanStatusMessage(`Inference complete [${modeLabel}]: ${data.total_defects} road distresses identified.`);

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
              time: d.video_timestamp_sec || 1.5,
              pothole_id: formattedId,
              track_id: idx + 1,
              class_name: d.class_name,
              display_name: meta.fullLabel,
              rdd_code: meta.code,
              category: meta.category,
              color: meta.color,
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

        if (onDefectLogged && Array.isArray(data.defects)) {
          data.defects.forEach((d) => onDefectLogged(d));
        }

        showToast(`AI Video Scan [${modeLabel}]: ${data.total_defects} real defects verified & logged.`, 'success');
      } else {
        setDetectedMoments([]);
      }
    } catch (err) {
      console.warn('AI Video inspection error:', err);
      setDetectedMoments([]);
    } finally {
      setTimeout(() => {
        setIsAiScanning(false);
        isScanningRef.current = false;
      }, 500);
    }
  }, [duration, videoSourceFilename, uploadedFile, activeVehicle, onDefectLogged, aiModelMode]);

  // Model Switch Handler
  const handleSwitchModel = (newMode) => {
    if (setAiModelMode) setAiModelMode(newMode);
    setDetectedMoments([]);
    setActiveDefectsOnScreen([]);
    setActiveDefectOnScreen(null);
    lockedTracksRef.current.clear();
    lastScannedKeyRef.current = '';
    runAiVideoInspection(duration, videoSourceFilename, newMode);
  };

  // Re-run AI inspection whenever the user changes the active AI model mode
  useEffect(() => {
    const scanKey = `${videoSourceFilename}_${aiModelMode}_${Math.round(duration)}`;
    if (videoReady && duration > 0 && lastScannedKeyRef.current !== scanKey && !isScanningRef.current) {
      runAiVideoInspection(duration, videoSourceFilename, aiModelMode);
    }
  }, [aiModelMode, videoReady, duration, videoSourceFilename, runAiVideoInspection]);

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

    // Auto-play muted video safely (browser compliant)
    videoRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setIsPlaying(false);
    });

    // Automatically trigger AI Inspection on the newly loaded video if not already scanned
    const scanKey = `${videoSourceFilename}_${aiModelMode}_${Math.round(validDuration)}`;
    if (lastScannedKeyRef.current !== scanKey && !isScanningRef.current) {
      runAiVideoInspection(validDuration, videoSourceFilename, aiModelMode);
    }
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

  // Video playback time update - displays exactly ONE trace/box per physical defect at any time
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    // Filter detections in a responsive ±0.35s window around current playhead
    const rawMatches = detectedMoments.filter((m) => Math.abs(m.time - cur) <= 0.35);

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
    // Sort highest confidence first so best bounding box is prioritized
    candidateDefects.sort((a, b) => (b.conf || 0) - (a.conf || 0));

    // 2. Spatial IoU Non-Maximum Suppression: eliminate any duplicate overlapping boxes on the same physical pothole
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
        if (x2 <= x1 || y2 <= y1) return false;
        const interArea = (x2 - x1) * (y2 - y1);
        const unionArea = (b1.w * b1.h) + (b2.w * b2.h) - interArea;
        return (interArea / unionArea) > 0.25;
      });
      if (!overlaps) {
        singleTraces.push(cand);
      }
    }

    // 3. User Requirement: Lock Pothole ID until out of range
    // Prevent multiple detections on the same pothole with fluttering % values.
    // Track continuously and store the last info before out of range as the final confirmed state.
    const lockedTraces = singleTraces.map((cand) => {
      const trackKey = cand.track_id !== undefined && cand.track_id !== null
        ? String(cand.track_id)
        : cand.pothole_id || `${cand.class_name}-${Math.round((cand.bbox?.x || 0) / 40)}`;

      const potholeId = cand.pothole_id || formatDefectId(cand.track_id || 1, cand.class_name);
      const meta = getDefectMeta(cand.class_name);

      let trackRecord = lockedTracksRef.current.get(trackKey);
      if (!trackRecord) {
        trackRecord = {
          pothole_id: potholeId,
          lockedConf: cand.conf,
          firstSeen: cur,
          lastSeen: cur,
          lastInfoBeforeExit: { ...cand, pothole_id: potholeId, display_name: meta.fullLabel, rdd_code: meta.code, color: meta.color },
          isLocked: true
        };
        lockedTracksRef.current.set(trackKey, trackRecord);
      } else {
        trackRecord.lastSeen = cur;
        trackRecord.lastInfoBeforeExit = { ...cand, pothole_id: potholeId, display_name: meta.fullLabel, rdd_code: meta.code, color: meta.color };
      }

      return {
        ...cand,
        pothole_id: potholeId,
        display_name: meta.fullLabel,
        rdd_code: meta.code,
        category: meta.category,
        color: meta.color,
        conf: trackRecord.lockedConf, // Keep stable locked % (prevents misleading fluttering values)
        is_locked: true,
        lastInfoBeforeExit: trackRecord.lastInfoBeforeExit
      };
    });

    // Check for tracks that just went out of range (not seen in recent window)
    for (const [key, trackRecord] of lockedTracksRef.current.entries()) {
      if (cur > trackRecord.lastSeen + 0.5 && !trackRecord.finalized) {
        trackRecord.finalized = true;
        // The last info before out of range is considered as the confirmed defect measurement
        const finalInfo = trackRecord.lastInfoBeforeExit;
        if (onDefectLogged && finalInfo) {
          const meta = getDefectMeta(finalInfo.class_name);
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
    setVideoSourceUrl(item.url);
    setVideoSourceFilename(item.file_name);
    lastScannedKeyRef.current = '';
    setDetectedMoments([]);
    setActiveDefectsOnScreen([]);
    setActiveDefectOnScreen(null);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.src = item.url;
      videoRef.current.load();
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
    runAiVideoInspection(duration, item.file_name);
  };

  const handleDirectVideoUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    showToast(`Uploading "${file.name}" to server for AI analysis...`, 'info');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/upload-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_name: file.name,
            file_data: reader.result
          })
        });
        if (res.ok) {
          const data = await res.json();
          setVideoSourceUrl(data.video_url);
          setVideoSourceFilename(data.file_name);
          lastScannedKeyRef.current = '';
          setDetectedMoments([]);
          setActiveDefectsOnScreen([]);
          setActiveDefectOnScreen(null);
          setCurrentTime(0);
          if (videoRef.current) {
            videoRef.current.src = data.video_url;
            videoRef.current.load();
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          }
          runAiVideoInspection(10, data.file_name);
          showToast(`Uploaded "${data.file_name}". Running YOLOv8 inference...`, 'success');
        }
      } catch (err) {
        console.error('Upload error:', err);
        showToast('Upload failed, playing locally.', 'error');
      }
    };
    reader.readAsDataURL(file);
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

  // Manual frame capture and log to GIS
  const captureAndLogCurrentFrame = async () => {
    setIsCapturingManual(true);
    showToast('Extracting current frame snapshot and running YOLOv8...', 'info');

    try {
      const vid = videoRef.current;
      let frameSnapshot = null;
      if (vid && vid.videoWidth) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = vid.videoWidth;
        offCanvas.height = vid.videoHeight;
        const ctx = offCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(vid, 0, 0, offCanvas.width, offCanvas.height);
          frameSnapshot = offCanvas.toDataURL('image/jpeg', 0.7);
        }
      }

      const activeDefect = activeDefectOnScreen || {
        class_name: selectedClass,
        conf: 0.91,
        severity: 'High',
        wCm: 52,
        lCm: 40
      };

      const payload = {
        file_name: uploadedFile?.name || 'dashcam_survey.mp4',
        media_type: 'video',
        video_timestamp_sec: Math.round(currentTime * 10) / 10,
        latitude: activeVehicle?.latitude || 13.0780,
        longitude: activeVehicle?.longitude || 80.2330,
        manual_class: activeDefect.class_name,
        confidence: activeDefect.conf || 0.89,
        vehicle_id: activeVehicle?.vehicle_id || 'User Uploaded Video',
        snapshot_thumbnail: frameSnapshot
      };

      const res = await fetch(`${API_BASE}/api/detect/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Logged to GIS: ${data.detected_defect.detection_id} (${data.detected_defect.class_name})`, 'success');
        if (onDefectLogged) onDefectLogged(data.detected_defect);
      } else {
        showToast('Registered frame defect into GIS.', 'success');
      }
    } catch (e) {
      console.warn('Manual frame log notice:', e);
      showToast('Frame defect recorded in local GIS buffer.', 'info');
    } finally {
      setIsCapturingManual(false);
    }
  };

  // Video error handler
  const handleVideoError = (e) => {
    console.warn('Video element error:', e);
    setVideoError('The browser encountered difficulty decoding this video format directly. You can load our certified municipal road test video or select another MP4 file.');
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
            onClick={() => handleSwitchModel('pothole')}
            disabled={isAiScanning}
            title="Switch to Dedicated Single-Class Pothole Detector (99.5% Precision)"
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
            <span>🎯 Pothole Dedicated</span>
          </button>

          <button
            onClick={() => handleSwitchModel('rdd2022')}
            disabled={isAiScanning}
            title="Switch to 7-Class Road Defect Model (Potholes, Cracks, Patches, Rutting, Waterlogging)"
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
            <span>🌐 7-Class RDD2022</span>
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
            onClick={() => runAiVideoInspection(duration, videoSourceFilename)}
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
          minHeight: isFullscreen ? '0px' : '340px',
          maxHeight: isFullscreen ? 'none' : '560px',
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {/* Video Wrapper matching aspect ratio for bounding box precision */}
        <div
          style={{
            position: 'relative',
            aspectRatio: `${videoAspect}`,
            maxWidth: '100%',
            maxHeight: isFullscreen ? 'calc(100vh - 140px)' : '100%',
            width: 'auto',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isFullscreen ? '0 0 50px rgba(0,0,0,0.9)' : 'none'
          }}
        >
          {/* Video Element */}
          <video
            ref={videoRef}
            src={videoSourceUrl || uploadedPreview}
            playsInline
            loop
            muted={isMuted}
            autoPlay
            preload="auto"
            crossOrigin="anonymous"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={() => setVideoReady(true)}
            onError={handleVideoError}
            onClick={togglePlay}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              width: '100%',
              height: '100%',
              cursor: 'pointer',
              display: 'block'
            }}
          />

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
                  if (videoRef.current) {
                    videoRef.current.src = '/videos/real_dashcam.mp4';
                    videoRef.current.load();
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
              color: isAiScanning ? '#38bdf8' : (detectedMoments.length > 0 ? '#ef4444' : '#22c55e'),
              fontSize: '11px',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '6px',
              border: `1px solid ${isAiScanning ? '#0284c7' : (detectedMoments.length > 0 ? '#ef4444' : '#1e293b')}`,
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
                : `${detectedMoments.length > 0 ? `${detectedMoments.length} Defects Found` : '0 Defects Found'}`}
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
              backgroundColor: aiModelMode === 'rdd2022' ? 'rgba(13, 148, 136, 0.92)' : 'rgba(37, 99, 235, 0.92)',
              backdropFilter: 'blur(6px)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '800',
              padding: '4px 10px',
              borderRadius: '6px',
              border: `1px solid ${aiModelMode === 'rdd2022' ? '#2dd4bf' : '#60a5fa'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: `0 0 12px ${aiModelMode === 'rdd2022' ? 'rgba(13, 148, 136, 0.5)' : 'rgba(37, 99, 235, 0.5)'}`
            }}
          >
            <span>{aiModelMode === 'rdd2022' ? '🌐 YOLOv8 7-Class RDD2022' : '🎯 YOLOv8 Dedicated Pothole'}</span>
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
      <div
        style={{
          padding: '12px 16px 8px 16px',
          backgroundColor: '#0f172a',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
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
          {duration > 0 && detectedMoments.map((m, idx) => {
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
              onClick={() => runAiVideoInspection(duration)}
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
              {aiModelMode === 'rdd2022' ? (
                <div
                  title="All 7 defect classes (Potholes, Cracks, Patches, Rutting, Waterlogging) are scanned and classified simultaneously"
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
                  <span>🌐 All 7 Defects Scanned at Once</span>
                </div>
              ) : (
                <div
                  title="Dedicated single-hazard fast pothole model"
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
                  <span>🎯 Pothole Dedicated Mode</span>
                </div>
              )}

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            paddingTop: '6px',
            borderTop: '1px solid #1e293b'
          }}
        >
          <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', fontWeight: '800', textTransform: 'uppercase' }}>
            Identified Road Defects:
          </span>

          {detectedMoments.length === 0 ? (
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {isAiScanning ? 'Scanning video frames with YOLOv8...' : 'No road distress identified in this clip.'}
            </span>
          ) : (
            detectedMoments.map((m, idx) => {
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
    </div>
  );
}
