import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Radio,
  Camera,
  Upload,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Send,
  CheckCircle2,
  Info,
  HelpCircle,
  Play,
  RefreshCw
} from 'lucide-react';
import { API_BASE } from '../config';
import PatrolHUD from './PatrolHUD';
import WebcamPotholeDetector from './WebcamPotholeDetector';
import RoadVideoInspectionPlayer from './RoadVideoInspectionPlayer';

export default function LiveMonitoringView({
  defects,
  vehicles,
  patrolActive = true,
  onTogglePatrol,
  onRefreshData,
  onOpenAlertModal,
  onSelectDefect,
  gpsStatus = 'locked',
  serverConnected = true,
  aiModelMode = 'pothole',
  setAiModelMode = () => {}
}) {
  // Video source modes: 'simulation' | 'sample' | 'webcam' | 'upload'
  const [videoMode, setVideoMode] = useState('simulation');
  const [selectedVehicleId, setSelectedVehicleId] = useState('MTC 46G');
  const [showModeGuide, setShowModeGuide] = useState(false);


  // Upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const [uploadAnalyzing, setUploadAnalyzing] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadDefectClass, setUploadDefectClass] = useState('pothole');

  const fileInputRef = useRef(null);

  const activeVehicle = vehicles.find((v) => v.vehicle_id === selectedVehicleId) || vehicles[0] || {
    vehicle_id: 'MTC 46G',
    current_road: 'EVR Periyar Salai (Poonamallee High Rd)',
    current_segment: 'R001-S004',
    speed_kmh: 32,
    latitude: 13.0743,
    longitude: 80.2108,
    edge_device: 'NVIDIA Jetson Orin Nano',
    camera: 'Front Dashcam 1080p 30fps',
    buffer_queue: 0
  };

  const recentDetections = defects.slice(0, 10);
  const [verificationTargets, setVerificationTargets] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const checkVerificationTargets = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/cases/verification-targets?lat=${activeVehicle.latitude}&lon=${activeVehicle.longitude}&radius=200`
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setVerificationTargets(data.targets || []);
          }
        }
      } catch {
        // Ignored
      }
    };
    checkVerificationTargets();
    const timer = setInterval(checkVerificationTargets, 8000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [activeVehicle.latitude, activeVehicle.longitude]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Real Road Media Upload Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setUploadedPreview(objectUrl);
    setUploadAnalyzing(true);
    setUploadResult(null);

    const isVideo = file.type.startsWith('video') || file.name.match(/\.(mp4|webm|mov|mkv|avi)$/i);
    const reader = new FileReader();

    if (isVideo) {
      // Stream to edge server in the background while keeping objectUrl active for instant native playback
      fetch(`${API_BASE}/api/upload-video?file_name=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name)
        },
        body: file
      })
        .then(async (res) => {
          if (!res.ok && res.status !== 413) {
            const b64 = await new Promise((resolve) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result);
              r.readAsDataURL(file);
            });
            return fetch(`${API_BASE}/api/upload-video`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file_name: file.name, file_data: b64 })
            }).then((r) => (r.ok ? r.json() : null));
          }
          return res.ok ? res.json() : null;
        })
        .then((data) => {
          if (data) {
            // Keep objectUrl for smooth native video decoding, while updating server file name
            setUploadedFile({ name: data.file_name, type: file.type || 'video/mp4' });
          }
        })
        .catch((err) => {
          console.warn('Video upload notice:', err);
        })
        .finally(() => {
          setUploadAnalyzing(false);
        });
    } else {
      // Real image upload to fine-tuned YOLOv8 model
      reader.onload = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/detect/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              snapshot_thumbnail: reader.result,
              media_type: 'image',
              file_name: file.name,
              latitude: activeVehicle.latitude,
              longitude: activeVehicle.longitude,
              vehicle_id: 'User Upload (Real Road)',
              model_mode: aiModelMode
            })
          });
          if (res.ok) {
            const data = await res.json();
            setUploadResult(data);
            if (onRefreshData) onRefreshData();
          }
        } catch (err) {
          console.warn('Inference notice:', err);
        } finally {
          setUploadAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };


  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      backgroundColor: '#090d16',
      padding: '16px',
      gap: '14px'
    }}>
      {/* Top Banner: Edge Status & Quick Action */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        padding: '12px 18px',
        borderRadius: '10px',
        border: '1px solid #1e293b',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(34, 197, 94, 0.12)',
            color: '#4ade80',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span>EDGE INFERENCE ACTIVE</span>
          </div>
          <span style={{ color: '#64748b', fontSize: '13px' }}>|</span>
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>
            Unit: <strong style={{ color: '#f8fafc' }}>{activeVehicle.vehicle_id}</strong> ({activeVehicle.edge_device})
          </span>
          <span style={{ color: '#64748b', fontSize: '13px' }}>|</span>
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>
            Model: <strong style={{ color: aiModelMode === 'potbot' ? '#c084fc' : (aiModelMode === 'rdd2022' ? '#2dd4bf' : '#38bdf8') }}>
              {aiModelMode === 'potbot' ? 'PotBot-YOLOv8m' : (aiModelMode === 'rdd2022' ? 'YOLOv8s-CRDDC' : 'YOLOv8m-7Class')}
            </strong> ({aiModelMode === 'potbot' ? '14.2ms · 70 FPS' : (aiModelMode === 'rdd2022' ? '9.8ms · 102 FPS' : '12.0ms · 83 FPS')})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Guide Toggle */}
          <button
            onClick={() => setShowModeGuide(!showModeGuide)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: showModeGuide ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
              color: showModeGuide ? '#38bdf8' : '#94a3b8',
              border: '1px solid #334155',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <HelpCircle size={14} />
            <span>What are these modes?</span>
          </button>

          {/* Vehicle selector */}
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            style={{
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {vehicles.map((v) => (
              <option key={v.vehicle_id} value={v.vehicle_id}>
                {v.vehicle_id} ({v.type})
              </option>
            ))}
          </select>

          {/* Test Telegram/Gmail */}
          <button
            onClick={onOpenAlertModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)'
            }}
          >
            <Send size={13} />
            <span>Verify Dispatch Gateway</span>
          </button>
        </div>
      </div>

      {/* Explanatory Guide Drawer (Answers user's question directly) */}
      {showModeGuide && (
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #0284c7',
          borderRadius: '10px',
          padding: '14px 18px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: '700', fontSize: '12px', marginBottom: '4px' }}>
              <Radio size={14} /> 1. Patrol HUD (Transit Fleet)
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
              Simulates live public transit buses (e.g. MTC 46G) cruising Chennai corridors (Poonamallee High Rd) with 100m segment tracking, GPS telemetry, and multi-bus spatial deduplication.
            </p>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontWeight: '700', fontSize: '12px', marginBottom: '4px' }}>
              <Video size={14} /> 2. Sample Highway (Real Footage)
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
              Plays realistic highway pavement dashcam footage with live YOLOv8 road defect bounding box annotations (potholes, cracks, waterlogging) tracking actual asphalt in real-time.
            </p>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: '700', fontSize: '12px', marginBottom: '4px' }}>
              <Camera size={14} /> 3. Live Webcam (Real Camera)
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
              Connects directly to your laptop camera, smartphone, or USB dashcam pointing out the vehicle window to detect real-world road pavement conditions live.
            </p>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ec4899', fontWeight: '700', fontSize: '12px', marginBottom: '4px' }}>
              <Upload size={14} /> 4. Upload Real Road Media
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
              Allows you to drag &amp; drop any photo or video of an actual road (potholes, cracks on your local streets) to run YOLOv8 detection, estimate dimensions, and log into the GIS inventory.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Camera Video HUD on Left (60%), Live Incident Feed on Right (40%) */}
      <div className="live-monitoring-grid">
        {/* Left Column: Live Camera Video HUD */}
        <div style={{
          backgroundColor: '#0f172a',
          borderRadius: '10px',
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Video Header & Mode Tabs */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={16} color="#ef4444" className="animate-pulse" />
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>
                Dashcam Edge Feed — {videoMode === 'webcam' ? 'Live Camera Feed' : videoMode === 'upload' ? 'Real Road Upload' : activeVehicle.vehicle_id}
              </span>
              <span style={{
                fontSize: '10px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: '600'
              }}>
                {videoMode === 'webcam' ? 'HARDWARE SENSOR' : videoMode === 'upload' ? 'USER MEDIA' : 'LIVE TELEMETRY'}
              </span>
            </div>

            {/* Source Mode Selectors */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[
                { id: 'simulation', label: 'Patrol HUD', icon: Radio },
                { id: 'sample', label: 'Sample Highway', icon: Video },
                { id: 'webcam', label: 'Webcam (Live)', icon: Camera },
                { id: 'upload', label: 'Upload Real Road', icon: Upload },
              ].map((m) => {
                const IconComp = m.icon;
                const isActive = videoMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setVideoMode(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      backgroundColor: isActive ? '#0284c7' : '#0f172a',
                      color: isActive ? '#ffffff' : '#94a3b8',
                      border: `1px solid ${isActive ? '#0284c7' : '#334155'}`,
                      padding: '4px 10px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <IconComp size={12} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Post-Repair Verification Proximity Banner */}
          {verificationTargets.length > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(236, 72, 153, 0.12)',
                borderBottom: '1px solid #ec4899',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color="#ec4899" className="animate-pulse" />
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#f472b6', textTransform: 'uppercase' }}>
                  Post-Repair Verification Target in Proximity:
                </span>
                <span style={{ fontSize: '12px', color: '#f8fafc', fontWeight: '700' }}>
                  {verificationTargets[0].case?.case_id}
                </span>
                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                  ({verificationTargets[0].case?.road_name} • Ch {verificationTargets[0].case?.exact_chainage_m}m)
                </span>
                <span style={{ fontSize: '11px', color: '#fbcfe8', fontWeight: '600' }}>
                  • {verificationTargets[0].distance_m}m away
                </span>
              </div>
              <span style={{ fontSize: '10px', color: '#ec4899', fontWeight: '700', backgroundColor: 'rgba(236, 72, 153, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                AI Verification Scanner Active
              </span>
            </div>
          )}

          {/* Camera Frame Container */}
          <div style={{
            position: 'relative',
            flex: 1,
            backgroundColor: '#000000',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '420px',
            overflow: 'hidden'
          }}>
            {/* MODE 1: Continuous SVG Patrol Stream */}
            {videoMode === 'simulation' && (
              <PatrolHUD
                activeVehicle={activeVehicle}
                patrolActive={patrolActive}
                onTogglePatrol={onTogglePatrol}
                gpsStatus={gpsStatus}
                serverConnected={serverConnected}
                aiModelMode={aiModelMode}
              />
            )}

            {/* MODE 2: Real Road Footage with Real-Time YOLOv8 Detection Overlays */}
            {videoMode === 'sample' && (
              <RoadVideoInspectionPlayer
                uploadedFile={{ name: 'real_dashcam.mp4', type: 'video/mp4' }}
                uploadedPreview="/videos/real_dashcam.mp4"
                activeVehicle={activeVehicle}
                onDefectLogged={onRefreshData}
                aiModelMode={aiModelMode}
                setAiModelMode={setAiModelMode}
              />
            )}

            {/* MODE 3: Live Hardware Webcam (Phone / Laptop Dashcam) */}
            {videoMode === 'webcam' && (
              <WebcamPotholeDetector
                activeVehicle={activeVehicle}
                onRefreshData={onRefreshData}
                aiModelMode={aiModelMode}
                setAiModelMode={setAiModelMode}
              />
            )}

            {/* MODE 4: Upload Real Road Photo / Video */}
            {videoMode === 'upload' && (
              <div style={{
                width: '100%',
                height: '100%',
                minHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px'
              }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.mp4,.webm,.mov,.mkv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                {!uploadedPreview ? (
                  <div
                    style={{
                      border: '2px dashed #38bdf8',
                      borderRadius: '12px',
                      padding: '24px 20px',
                      textAlign: 'center',
                      backgroundColor: 'rgba(56, 189, 248, 0.04)',
                      maxWidth: '540px',
                      width: '100%'
                    }}
                  >
                    <Upload size={36} color="#38bdf8" style={{ margin: '0 auto 10px auto' }} />
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#f8fafc', fontWeight: '700' }}>
                      Upload Real Road Video or Photo
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                      Select any video or photo of real road surfaces (potholes, cracks, patches) from your phone, dashcam, or drone. Real YOLOv8 AI will detect and display single tracked bounding boxes.
                    </p>

                    {/* Primary Browse Action */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          padding: '10px 22px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 10px rgba(2, 132, 199, 0.4)'
                        }}
                      >
                        <Upload size={14} />
                        <span>Browse Video / Photo from Device</span>
                      </button>
                    </div>

                    {/* Quick-Test Presets Divider */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      margin: '12px 0',
                      color: '#64748b',
                      fontSize: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase'
                    }}>
                      <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }} />
                      <span>Or Test Instant Real Road Footage</span>
                      <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }} />
                    </div>

                    {/* Quick-Test Buttons */}
                    <div className="upload-hub-presets">
                      <button
                        onClick={() => {
                          setUploadedFile({ name: 'real_dashcam.mp4', type: 'video/mp4', size: 10257801 });
                          setUploadedPreview('/videos/real_dashcam.mp4');
                        }}
                        style={{
                          backgroundColor: '#1e293b',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          padding: '8px 6px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>🎯</span>
                        <span>Real Potholes</span>
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '400' }}>Active Potholes</span>
                      </button>

                      <button
                        onClick={() => {
                          setUploadedFile({ name: 'shadows_and_cracks.mp4', type: 'video/mp4', size: 8400000 });
                          setUploadedPreview('/videos/shadows_and_cracks.mp4');
                        }}
                        style={{
                          backgroundColor: '#1e293b',
                          color: '#f59e0b',
                          border: '1px solid #f59e0b',
                          padding: '8px 6px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>⚡</span>
                        <span>Cracks &amp; Fatigue</span>
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '400' }}>Surface Cracks</span>
                      </button>

                      <button
                        onClick={() => {
                          setUploadedFile({ name: 'clean_highway.mp4', type: 'video/mp4', size: 6800000 });
                          setUploadedPreview('/videos/clean_highway.mp4');
                        }}
                        style={{
                          backgroundColor: '#1e293b',
                          color: '#22c55e',
                          border: '1px solid #22c55e',
                          padding: '8px 6px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>🛣️</span>
                        <span>Clean Road</span>
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '400' }}>0 False Alarms</span>
                      </button>
                    </div>
                  </div>
                ) : (uploadedFile?.type?.startsWith('video') || uploadedFile?.name?.match(/\.(mp4|webm|mov|mkv|avi|m4v)$/i)) ? (
                  <RoadVideoInspectionPlayer
                    uploadedFile={uploadedFile}
                    uploadedPreview={uploadedPreview}
                    activeVehicle={activeVehicle}
                    onDefectLogged={onRefreshData}
                    aiModelMode={aiModelMode}
                    setAiModelMode={setAiModelMode}
                    onSelectAnotherFile={() => {
                      setUploadedFile(null);
                      setUploadedPreview(null);
                    }}
                  />
                ) : (
                  <div style={{ position: 'relative', width: '100%', height: '100%', maxHeight: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={uploadedPreview}
                      alt="Uploaded Real Road"
                      style={{ maxHeight: '340px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}
                    />
                    {/* File Name & Class Tag */}
                    {uploadedFile && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '12px',
                        backgroundColor: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(4px)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #334155',
                        fontSize: '11px',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ color: '#38bdf8', fontWeight: '700' }}>{uploadedFile.name}</span>
                        <span>·</span>
                        <span>Class:</span>
                        <select
                          value={uploadDefectClass}
                          onChange={(e) => setUploadDefectClass(e.target.value)}
                          style={{
                            backgroundColor: '#1e293b',
                            color: '#f8fafc',
                            border: '1px solid #475569',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px'
                          }}
                        >
                          <option value="pothole">pothole</option>
                          <option value="longitudinal_crack">longitudinal_crack</option>
                          <option value="transverse_crack">transverse_crack</option>
                          <option value="alligator_crack">alligator_crack</option>
                          <option value="road_patch">road_patch</option>
                          <option value="waterlogging">waterlogging</option>
                        </select>
                      </div>
                    )}

                    {uploadAnalyzing ? (
                      <div style={{
                        position: 'absolute',
                        backgroundColor: 'rgba(15, 23, 42, 0.85)',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        color: '#38bdf8',
                        fontWeight: '700',
                        fontSize: '12px'
                      }}>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Running YOLOv8 Defect Detection...</span>
                      </div>
                    ) : (uploadResult && Array.isArray(uploadResult.detections) && uploadResult.detections.length > 0) ? (
                      uploadResult.detections.map((det, dIdx) => (
                        <div
                          key={dIdx}
                          style={{
                            position: 'absolute',
                            top: `${(det.bbox.y / (det.bbox.video_h || 720)) * 100}%`,
                            left: `${(det.bbox.x / (det.bbox.video_w || 1280)) * 100}%`,
                            width: `${(det.bbox.w / (det.bbox.video_w || 1280)) * 100}%`,
                            height: `${(det.bbox.h / (det.bbox.video_h || 720)) * 100}%`,
                            border: '2.5px solid #ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            borderRadius: '4px',
                            zIndex: 10
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            top: '-24px',
                            left: 0,
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            padding: '2px 6px',
                            fontSize: '10px',
                            fontWeight: '800',
                            fontFamily: 'monospace',
                            borderRadius: '3px',
                            whiteSpace: 'nowrap'
                          }}>
                            {det.class_name.toUpperCase()}: {(det.conf * 100).toFixed(0)}% ({det.wCm}×{det.lCm}cm)
                          </div>
                        </div>
                      ))
                    ) : uploadResult ? (
                      <div style={{
                        position: 'absolute',
                        backgroundColor: 'rgba(15, 23, 42, 0.88)',
                        border: '1px solid #22c55e',
                        color: '#4ade80',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700'
                      }}>
                        ✓ Surface Verified: Clean Asphalt (No Defects Detected)
                      </div>
                    ) : null}

                    {/* Change File Button */}
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      display: 'flex',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => {
                          setUploadedFile(null);
                          setUploadedPreview(null);
                          setUploadResult(null);
                        }}
                        style={{
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        ⬅️ Return to Upload Hub
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          color: '#f8fafc',
                          border: '1px solid #334155',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Browse Another File
                      </button>
                      <button
                        onClick={() => {
                          alert(`Defect ${uploadResult?.detected_defect?.detection_id || 'ID'} is verified and entered into the GIS 100m Corridor Inventory.`);
                        }}
                        style={{
                          backgroundColor: '#22c55e',
                          color: '#000000',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Logged to Municipal GIS
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Under-Camera Vehicle Diagnostics Footer */}
          <div className="telemetry-footer-grid">
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>CORRIDOR</span>
              <span style={{ color: '#f8fafc', fontWeight: '600' }}>{activeVehicle.current_road}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>GIS SEGMENT</span>
              <span style={{ color: '#38bdf8', fontWeight: '600' }}>{activeVehicle.current_segment}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>VEHICLE SPEED</span>
              <span style={{ color: '#4ade80', fontWeight: '600' }}>{activeVehicle.speed_kmh} km/h</span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>EDGE QUEUE</span>
              <span style={{ color: activeVehicle.buffer_queue > 0 ? '#f59e0b' : '#94a3b8', fontWeight: '600' }}>
                {activeVehicle.buffer_queue} synced
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Ingestion & Detection Stream */}
        <div style={{
          backgroundColor: '#0f172a',
          borderRadius: '10px',
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} color="#38bdf8" />
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>
                Live Ingestion Stream
              </span>
            </div>
            <span style={{
              fontSize: '11px',
              backgroundColor: '#0f172a',
              color: '#38bdf8',
              padding: '2px 8px',
              borderRadius: '9999px',
              border: '1px solid #334155',
              fontWeight: '700'
            }}>
              {defects.length} Incidents Logged
            </span>
          </div>

          {/* Spatial Deduplication Explanation Banner */}
          <div style={{
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
            padding: '8px 12px',
            fontSize: '11px',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Info size={14} color="#38bdf8" style={{ flexShrink: 0 }} />
            <span>
              <strong>Spatial Deduplication:</strong> Sightings within 15m and 10min merge coordinates into a single incident.
            </span>
          </div>

          {/* Incident List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {recentDetections.map((defect) => {
              const isMulti = defect.is_multi_bus_verified;
              const sevColor =
                defect.severity === 'Critical'
                  ? '#ef4444'
                  : defect.severity === 'High'
                  ? '#f97316'
                  : defect.severity === 'Medium'
                  ? '#eab308'
                  : '#3b82f6';

              return (
                <div
                  key={defect.id}
                  onClick={() => onSelectDefect && onSelectDefect(defect)}
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    border: `1px solid ${isMulti ? 'rgba(34, 197, 94, 0.4)' : '#334155'}`,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  {/* Line 1: Class + Severity + Multi-bus pill */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: sevColor,
                        flexShrink: 0
                      }} />
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>
                        {defect.class_name.replace('_', ' ').toUpperCase()}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        backgroundColor: `${sevColor}22`,
                        color: sevColor,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: '700',
                        border: `1px solid ${sevColor}44`
                      }}>
                        {defect.severity}
                      </span>
                    </div>

                    {isMulti ? (
                      <span style={{
                        fontSize: '10px',
                        backgroundColor: 'rgba(34, 197, 94, 0.2)',
                        color: '#4ade80',
                        border: '1px solid #22c55e',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <CheckCircle2 size={11} />
                        VERIFIED (2+ BUSES)
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '10px',
                        backgroundColor: 'rgba(100, 116, 139, 0.2)',
                        color: '#94a3b8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>
                        Pending Cross-Bus
                      </span>
                    )}
                  </div>

                  {/* Line 2: Segment + Physical Dimension */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} color="#38bdf8" />
                      <span>{defect.segment_id} (Chainage: {defect.exact_chainage_m}m)</span>
                    </div>
                    <span style={{ color: '#f8fafc', fontWeight: '600' }}>
                      {defect.bbox.estimated_physical_width_cm}cm × {defect.bbox.estimated_physical_length_cm}cm
                    </span>
                  </div>

                  {/* Line 3: Bus IDs + Confidence + Timestamp */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10px',
                    color: '#64748b',
                    borderTop: '1px solid #334155',
                    paddingTop: '6px',
                    marginTop: '2px'
                  }}>
                    <span>Reporting: <strong style={{ color: '#cbd5e1' }}>{defect.bus_ids}</strong></span>
                    <span>Conf: <strong style={{ color: '#38bdf8' }}>{(defect.confidence * 100).toFixed(1)}%</strong></span>
                    <span>{new Date(defect.last_detected).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
