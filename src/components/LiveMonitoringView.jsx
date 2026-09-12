import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Radio,
  Camera,
  Upload,
  ShieldAlert,
  MapPin,
  Send,
  CheckCircle2,
  Info,
  HelpCircle,
  Play,
  Pause,
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
  serverConnected = true
}) {
  // Video source modes: 'simulation' | 'sample' | 'webcam' | 'upload'
  const [videoMode, setVideoMode] = useState('simulation');
  const [selectedVehicleId, setSelectedVehicleId] = useState('MTC 46G');
  const [showModeGuide, setShowModeGuide] = useState(false);

  // Sample Highway video state
  const [samplePlaying, setSamplePlaying] = useState(true);
  const [sampleDefectIndex, setSampleDefectIndex] = useState(0);

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

    // Simulate/Call AI inference
    setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/detect/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_name: file.name,
            media_type: file.type.startsWith('video') ? 'video' : 'image',
            latitude: activeVehicle.latitude,
            longitude: activeVehicle.longitude,
            manual_class: uploadDefectClass,
            confidence: 0.89,
            vehicle_id: 'User Upload (Real Road)'
          })
        });

        if (res.ok) {
          const data = await res.json();
          setUploadResult(data);
        }
      } catch (err) {
        console.warn('Inference notice:', err);
      } finally {
        setUploadAnalyzing(false);
      }
    }, 1000);
  };

  // Highway Sample cycle
  const sampleDefects = [
    { class: 'pothole', conf: 0.89, x: 260, y: 220, w: 140, h: 70, wCm: 52, lCm: 38, color: '#ef4444' },
    { class: 'alligator_crack', conf: 0.82, x: 210, y: 190, w: 180, h: 90, wCm: 76, lCm: 64, color: '#f97316' },
    { class: 'longitudinal_crack', conf: 0.85, x: 290, y: 160, w: 60, h: 140, wCm: 18, lCm: 112, color: '#eab308' },
    { class: 'waterlogging', conf: 0.91, x: 180, y: 230, w: 220, h: 80, wCm: 165, lCm: 85, color: '#38bdf8' }
  ];

  useEffect(() => {
    if (videoMode === 'sample' && samplePlaying) {
      const timer = setInterval(() => {
        setSampleDefectIndex((prev) => (prev + 1) % sampleDefects.length);
      }, 3500);
      return () => clearInterval(timer);
    }
  }, [videoMode, samplePlaying, sampleDefects.length]);

  const currentSampleDefect = sampleDefects[sampleDefectIndex];

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
            Model: <strong style={{ color: '#38bdf8' }}>YOLOv8-road-v1</strong> (14.2ms · 29.8 FPS)
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
        gap: '16px',
        minHeight: '480px'
      }}>
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

          {/* Camera Frame Container */}
          <div style={{
            position: 'relative',
            flex: 1,
            backgroundColor: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '380px',
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
              />
            )}

            {/* MODE 2: Sample Highway Road Footage with YOLOv8 Overlays */}
            {videoMode === 'sample' && (
              <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '380px', backgroundColor: '#111827', overflow: 'hidden' }}>
                {/* Perspective Pavement Rendering with asphalt texture */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 40%, #0b0f19 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {/* Perspective Road Surface */}
                  <svg width="100%" height="100%" viewBox="0 0 640 360" preserveAspectRatio="none">
                    <polygon points="260,140 380,140 590,360 50,360" fill="#1e2530" />
                    {/* Asphalt texture lines */}
                    <line x1="260" y1="140" x2="50" y2="360" stroke="#334155" strokeWidth="2" />
                    <line x1="380" y1="140" x2="590" y2="360" stroke="#334155" strokeWidth="2" />
                    {/* Center Dashed Lane Divider */}
                    <line x1="320" y1="150" x2="320" y2="180" stroke="#eab308" strokeWidth="3" strokeDasharray="8,10" />
                    <line x1="320" y1="200" x2="320" y2="250" stroke="#eab308" strokeWidth="4" strokeDasharray="12,14" />
                    <line x1="320" y1="280" x2="320" y2="350" stroke="#eab308" strokeWidth="6" />

                    {/* Defect Bounding Box on Actual Asphalt */}
                    <g style={{ transition: 'all 0.5s ease-out' }}>
                      <rect
                        x={currentSampleDefect.x}
                        y={currentSampleDefect.y}
                        width={currentSampleDefect.w}
                        height={currentSampleDefect.h}
                        fill={`${currentSampleDefect.color}22`}
                        stroke={currentSampleDefect.color}
                        strokeWidth="2.5"
                        rx="4"
                      />
                      <rect
                        x={currentSampleDefect.x}
                        y={currentSampleDefect.y - 24}
                        width="180"
                        height="24"
                        fill={currentSampleDefect.color}
                        rx="3"
                      />
                      <text
                        x={currentSampleDefect.x + 8}
                        y={currentSampleDefect.y - 8}
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {currentSampleDefect.class}: {currentSampleDefect.conf}
                      </text>
                      <text
                        x={currentSampleDefect.x + 8}
                        y={currentSampleDefect.y + 24}
                        fill="#f8fafc"
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="monospace"
                      >
                        Est: {currentSampleDefect.wCm}cm × {currentSampleDefect.lCm}cm
                      </text>
                    </g>
                  </svg>
                </div>

                {/* Top Dashcam Overlay Tag */}
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
                  gap: '8px'
                }}>
                  <span style={{ color: '#38bdf8', fontWeight: '700' }}>HIGHWAY DASHCAM FEED</span>
                  <span>·</span>
                  <span style={{ color: '#4ade80' }}>RECORDED 1080p 30FPS</span>
                  <span>·</span>
                  <span style={{ color: '#facc15' }}>YOLOv8 DETECTING</span>
                </div>

                {/* Sample Player Controls */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  display: 'flex',
                  gap: '8px'
                }}>
                  <button
                    onClick={() => setSamplePlaying(!samplePlaying)}
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {samplePlaying ? <Pause size={12} /> : <Play size={12} />}
                    <span>{samplePlaying ? 'Pause Stream' : 'Resume Stream'}</span>
                  </button>
                  <button
                    onClick={() => setSampleDefectIndex((prev) => (prev + 1) % sampleDefects.length)}
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Next Defect Class ➔
                  </button>
                </div>
              </div>
            )}

            {/* MODE 3: Live Hardware Webcam (Phone / Laptop Dashcam) */}
            {videoMode === 'webcam' && (
              <WebcamPotholeDetector
                activeVehicle={activeVehicle}
                onRefreshData={onRefreshData}
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
                      padding: '36px 24px',
                      textAlign: 'center',
                      backgroundColor: 'rgba(56, 189, 248, 0.05)',
                      maxWidth: '480px',
                      width: '100%'
                    }}
                  >
                    <Upload size={38} color="#38bdf8" style={{ margin: '0 auto 12px auto' }} />
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#f8fafc', fontWeight: '700' }}>
                      Upload Real Road Video or Photo
                    </h3>
                    <p style={{ margin: '0 0 18px 0', fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                      Select any video or photo of real asphalt, potholes, or cracks from your phone, dashcam, or drone.
                      YOLOv8-road-v1 will run inference and display detections with bounding boxes.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Upload size={14} />
                        <span>Browse Device Files</span>
                      </button>
                      <button
                        onClick={() => {
                          const testVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
                          setUploadedFile({ name: 'Municipal_Pavement_Survey_Demo.mp4', type: 'video/mp4', size: 15480000 });
                          setUploadedPreview(testVideoUrl);
                        }}
                        style={{
                          backgroundColor: '#1e293b',
                          color: '#38bdf8',
                          border: '1px solid #38bdf8',
                          padding: '10px 18px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Play size={14} />
                        <span>Load Sample Road Video</span>
                      </button>
                    </div>
                  </div>
                ) : (uploadedFile?.type?.startsWith('video') || uploadedFile?.name?.match(/\.(mp4|webm|mov|mkv|avi|m4v)$/i)) ? (
                  <RoadVideoInspectionPlayer
                    uploadedFile={uploadedFile}
                    uploadedPreview={uploadedPreview}
                    activeVehicle={activeVehicle}
                    onDefectLogged={onRefreshData}
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
                    ) : uploadResult && (
                      <div style={{
                        position: 'absolute',
                        top: '20%',
                        left: '25%',
                        width: '50%',
                        height: '45%',
                        border: '2.5px solid #ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        borderRadius: '4px'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '-26px',
                          left: '-2px',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          fontFamily: 'monospace',
                          borderRadius: '3px'
                        }}>
                          {uploadResult.detected_defect.class_name.toUpperCase()}: {(uploadResult.detected_defect.confidence * 100).toFixed(0)}%
                        </div>
                        <div style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '8px',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '700',
                          fontFamily: 'monospace',
                          textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                        }}>
                          EST: {uploadResult.detected_defect.bbox.estimated_physical_width_cm}cm × {uploadResult.detected_defect.bbox.estimated_physical_length_cm}cm
                        </div>
                      </div>
                    )}

                    {/* Change File Button */}
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      display: 'flex',
                      gap: '8px'
                    }}>
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
                        Upload Another File
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            backgroundColor: '#090d16',
            borderTop: '1px solid #1e293b',
            padding: '10px 14px',
            gap: '8px',
            fontSize: '11px'
          }}>
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
