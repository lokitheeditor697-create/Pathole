import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, Video, Radio, ShieldAlert, Navigation, WifiOff } from 'lucide-react';

export default function PatrolHUD({
  activeVehicle,
  patrolActive = true,
  onTogglePatrol,
  gpsStatus = 'locked',
  serverConnected = true
}) {
  const [hudMode, setHudMode] = useState('video'); // 'video' (default) | 'vector'
  const [defectCycle, setDefectCycle] = useState(0);
  const [nowTime, setNowTime] = useState(new Date().toLocaleTimeString());
  const [alertCriteria, setAlertCriteria] = useState('MULTI_BUS_VERIFIED');
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const scrollOffsetRef = useRef(0);

  // Road defect dataset with real pavement bounding coordinates
  const simulatedDefects = [
    {
      class_name: 'alligator_crack',
      conf: 0.82,
      color: '#f97316',
      wCm: 76,
      lCm: 64,
      xPct: 30,
      yPct: 48,
      wPct: 32,
      hPct: 28,
      sev: 'High',
      desc: 'Interconnected fatigue cracking network'
    },
    {
      class_name: 'pothole',
      conf: 0.89,
      color: '#ef4444',
      wCm: 52,
      lCm: 38,
      xPct: 38,
      yPct: 54,
      wPct: 24,
      hPct: 22,
      sev: 'Critical',
      desc: 'Asphalt cavity with broken aggregate edges'
    },
    {
      class_name: 'longitudinal_crack',
      conf: 0.85,
      color: '#eab308',
      wCm: 18,
      lCm: 120,
      xPct: 45,
      yPct: 40,
      wPct: 12,
      hPct: 38,
      sev: 'Medium',
      desc: 'Linear joint separation along transit lane'
    },
    {
      class_name: 'waterlogging',
      conf: 0.94,
      color: '#38bdf8',
      wCm: 160,
      lCm: 90,
      xPct: 22,
      yPct: 60,
      wPct: 42,
      hPct: 24,
      sev: 'Critical',
      desc: 'Standing stormwater pooling over road gutter'
    }
  ];

  const currentDefect = simulatedDefects[defectCycle % simulatedDefects.length];

  // Fetch active criteria rule
  useEffect(() => {
    fetch('/api/alerts/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.trigger_criteria) setAlertCriteria(data.trigger_criteria);
      })
      .catch(() => {});
  }, []);

  // Clock interval
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setNowTime(new Date().toLocaleTimeString());
    }, 1000);

    const defectTimer = setInterval(() => {
      if (patrolActive) {
        setDefectCycle((prev) => prev + 1);
      }
    }, 4500);

    return () => {
      clearInterval(clockInterval);
      clearInterval(defectTimer);
    };
  }, [patrolActive]);

  const speed = activeVehicle?.speed_kmh ?? 36;
  const lat = activeVehicle?.latitude ? activeVehicle.latitude.toFixed(6) : '13.074320';
  const lon = activeVehicle?.longitude ? activeVehicle.longitude.toFixed(6) : '80.210850';
  const roadName = activeVehicle?.current_road || 'EVR Periyar Salai (Poonamallee High Rd)';
  const segId = activeVehicle?.current_segment || 'R001-S004';
  const vehicleId = activeVehicle?.vehicle_id || 'MTC 46G';

  // ─────────────────────────────────────────────────────────────────────────────
  // HIGH-FIDELITY HIGHWAY DASHCAM CANVAS ENGINE
  // Renders photorealistic moving asphalt, lane lines, perspective road,
  // roadside lampposts, and real defect visuals right beneath the AI bounding box.
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hudMode !== 'video') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    let lastTimestamp = performance.now();

    const renderFrame = (timestamp) => {
      if (!isRunning) return;
      const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
      lastTimestamp = timestamp;

      if (patrolActive) {
        // Speed factor: scroll speed scales with km/h
        const speedMultiplier = (speed / 30) * 160;
        scrollOffsetRef.current = (scrollOffsetRef.current + speedMultiplier * dt) % 1000;
      }

      const w = canvas.width;
      const h = canvas.height;
      const horizonY = h * 0.38;
      const scroll = scrollOffsetRef.current;

      // 1. SKY & HORIZON GRADIENT
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#090d16');
      skyGrad.addColorStop(0.6, '#131c2e');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, horizonY);

      // Distant city silhouette & Chennai urban road horizon
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w * 0.08, horizonY - 14);
      ctx.lineTo(w * 0.14, horizonY - 14);
      ctx.lineTo(w * 0.16, horizonY - 26);
      ctx.lineTo(w * 0.22, horizonY - 26);
      ctx.lineTo(w * 0.25, horizonY - 8);
      ctx.lineTo(w * 0.38, horizonY - 18);
      ctx.lineTo(w * 0.44, horizonY - 6);
      ctx.lineTo(w * 0.55, horizonY - 10);
      ctx.lineTo(w * 0.65, horizonY - 22);
      ctx.lineTo(w * 0.72, horizonY - 12);
      ctx.lineTo(w * 0.85, horizonY - 28);
      ctx.lineTo(w * 0.92, horizonY - 15);
      ctx.lineTo(w, horizonY);
      ctx.closePath();
      ctx.fill();

      // Horizon haze glow
      const hazeGrad = ctx.createLinearGradient(0, horizonY - 15, 0, horizonY + 5);
      hazeGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      hazeGrad.addColorStop(1, 'rgba(56, 189, 248, 0.12)');
      ctx.fillStyle = hazeGrad;
      ctx.fillRect(0, horizonY - 15, w, 20);

      // 2. ROADSIDE TERRAIN (LEFT & RIGHT EMBANKMENT)
      const terrainGrad = ctx.createLinearGradient(0, horizonY, 0, h);
      terrainGrad.addColorStop(0, '#151d28');
      terrainGrad.addColorStop(1, '#0b0f17');
      ctx.fillStyle = terrainGrad;
      ctx.fillRect(0, horizonY, w, h - horizonY);

      // 3. PERSPECTIVE ASPHALT ROAD SURFACE
      const roadTopLeft = w * 0.38;
      const roadTopRight = w * 0.62;
      const roadBottomLeft = -w * 0.15;
      const roadBottomRight = w * 1.15;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(roadTopLeft, horizonY);
      ctx.lineTo(roadTopRight, horizonY);
      ctx.lineTo(roadBottomRight, h);
      ctx.lineTo(roadBottomLeft, h);
      ctx.closePath();
      ctx.clip();

      // Asphalt base gradient with realistic bitumen tone
      const roadGrad = ctx.createLinearGradient(0, horizonY, 0, h);
      roadGrad.addColorStop(0, '#1e2530');
      roadGrad.addColorStop(0.5, '#171e27');
      roadGrad.addColorStop(1, '#0e141d');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, horizonY, w, h - horizonY);

      // Asphalt texture grain / subtle aggregate flecks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      for (let i = 0; i < 40; i++) {
        const seedX = ((i * 47 + scroll * 0.3) % w);
        const seedY = horizonY + ((i * 31 + scroll * 1.2) % (h - horizonY));
        ctx.fillRect(seedX, seedY, 3, 2);
      }

      // 4. ROAD SHOULDER EDGELINES (WHITE CONTINUOUS LINES)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      // Left edge
      ctx.beginPath();
      ctx.moveTo(roadTopLeft + 8, horizonY);
      ctx.lineTo(roadBottomLeft + 45, h);
      ctx.stroke();
      // Right edge
      ctx.beginPath();
      ctx.moveTo(roadTopRight - 8, horizonY);
      ctx.lineTo(roadBottomRight - 45, h);
      ctx.stroke();

      // 5. MOVING CENTER DASHED LANE LINES (DOUBLE YELLOW & WHITE DIVIDERS)
      const numDashes = 10;
      for (let i = 0; i < numDashes; i++) {
        // Perspective distribution from horizon to bottom
        const prog = ((i / numDashes + (scroll / 1000)) % 1);
        // Ease power creates perspective foreshortening
        const p = Math.pow(prog, 2.2);
        const y = horizonY + p * (h - horizonY);
        const dashLen = Math.max(8, p * 60);
        const yEnd = Math.min(h, y + dashLen);

        // Center line X coordinate at y
        const centerX = w * 0.5;
        const widthAtY = (roadTopRight - roadTopLeft) + p * ((roadBottomRight - roadBottomLeft) - (roadTopRight - roadTopLeft));
        const leftLaneX = centerX - widthAtY * 0.22;
        const rightLaneX = centerX + widthAtY * 0.22;

        const lineWidth = Math.max(1.5, p * 7);

        // Center Yellow Line
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(centerX - lineWidth * 0.8, y);
        ctx.lineTo(centerX - lineWidth * 0.8, yEnd);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX + lineWidth * 0.8, y);
        ctx.lineTo(centerX + lineWidth * 0.8, yEnd);
        ctx.stroke();

        // White Lane dividers
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
        ctx.lineWidth = Math.max(1.2, p * 5);
        ctx.beginPath();
        ctx.moveTo(leftLaneX, y);
        ctx.lineTo(leftLaneX, yEnd);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rightLaneX, y);
        ctx.lineTo(rightLaneX, yEnd);
        ctx.stroke();
      }

      // 6. DRAW THE DETECTED DEFECT ON THE ACTUAL ASPHALT SURFACE
      // Coordinates scale to canvas dimensions
      const defX = (currentDefect.xPct / 100) * w;
      const defY = (currentDefect.yPct / 100) * h;
      const defW = (currentDefect.wPct / 100) * w;
      const defH = (currentDefect.hPct / 100) * h;

      if (currentDefect.class_name === 'pothole') {
        // Pothole: Deep dark irregular crater with fractured perimeter
        ctx.fillStyle = '#05070a';
        ctx.beginPath();
        ctx.ellipse(defX + defW / 2, defY + defH / 2, defW * 0.45, defH * 0.4, 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Inner shadow
        ctx.strokeStyle = '#222831';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Exposed aggregate stone debris in pothole cavity
        ctx.fillStyle = '#64748b';
        for (let j = 0; j < 8; j++) {
          ctx.fillRect(defX + defW * 0.25 + (j * 7) % (defW * 0.5), defY + defH * 0.3 + (j * 5) % (defH * 0.4), 3, 2);
        }

        // Perimeter radial fracture lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(defX + defW * 0.1, defY + defH * 0.4);
        ctx.lineTo(defX - 8, defY + defH * 0.3);
        ctx.moveTo(defX + defW * 0.9, defY + defH * 0.6);
        ctx.lineTo(defX + defW + 10, defY + defH * 0.7);
        ctx.stroke();
      } else if (currentDefect.class_name === 'alligator_crack') {
        // Alligator Crack: Interconnected fatigue cracking network
        ctx.strokeStyle = '#1a222d';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        // Webbed polygon cracks
        const cx = defX + defW / 2;
        const cy = defY + defH / 2;
        ctx.moveTo(cx - defW * 0.4, cy - defH * 0.3);
        ctx.lineTo(cx - defW * 0.1, cy - defH * 0.2);
        ctx.lineTo(cx + defW * 0.2, cy - defH * 0.35);
        ctx.lineTo(cx + defW * 0.4, cy - defH * 0.1);
        ctx.lineTo(cx + defW * 0.3, cy + defH * 0.2);
        ctx.lineTo(cx + defW * 0.35, cy + defH * 0.38);
        ctx.lineTo(cx, cy + defH * 0.35);
        ctx.lineTo(cx - defW * 0.3, cy + defH * 0.3);
        ctx.lineTo(cx - defW * 0.4, cy);
        ctx.closePath();
        ctx.stroke();

        // Cross-fracture veins
        ctx.beginPath();
        ctx.moveTo(cx - defW * 0.1, cy - defH * 0.2);
        ctx.lineTo(cx, cy + defH * 0.1);
        ctx.lineTo(cx + defW * 0.3, cy + defH * 0.2);
        ctx.moveTo(cx - defW * 0.2, cy + defH * 0.1);
        ctx.lineTo(cx + defW * 0.2, cy - defH * 0.1);
        ctx.stroke();
      } else if (currentDefect.class_name === 'longitudinal_crack') {
        // Longitudinal Crack: Continuous linear road fissure along wheel path
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(defX + defW * 0.5, defY);
        ctx.lineTo(defX + defW * 0.52, defY + defH * 0.3);
        ctx.lineTo(defX + defW * 0.46, defY + defH * 0.6);
        ctx.lineTo(defX + defW * 0.54, defY + defH);
        ctx.stroke();

        // Secondary fissure
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(defX + defW * 0.52, defY + defH * 0.3);
        ctx.lineTo(defX + defW * 0.7, defY + defH * 0.45);
        ctx.stroke();
      } else if (currentDefect.class_name === 'waterlogging') {
        // Waterlogging: Reflective stormwater puddle with sky sheen
        const puddleGrad = ctx.createRadialGradient(defX + defW / 2, defY + defH / 2, 5, defX + defW / 2, defY + defH / 2, defW * 0.5);
        puddleGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
        puddleGrad.addColorStop(0.7, 'rgba(30, 58, 138, 0.55)');
        puddleGrad.addColorStop(1, 'rgba(15, 23, 42, 0.1)');
        ctx.fillStyle = puddleGrad;
        ctx.beginPath();
        ctx.ellipse(defX + defW / 2, defY + defH / 2, defW * 0.46, defH * 0.38, -0.08, 0, Math.PI * 2);
        ctx.fill();

        // Ripple sheen
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(defX + defW * 0.48, defY + defH * 0.45, defW * 0.25, defH * 0.15, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore(); // Exit road clip

      // 7. ROADSIDE INFRASTRUCTURE: STREETLIGHTS & TREES PASSING
      const numPoles = 6;
      for (let pIdx = 0; pIdx < numPoles; pIdx++) {
        const pProg = ((pIdx / numPoles + (scroll / 800)) % 1);
        const pFactor = Math.pow(pProg, 2.0);
        const poleY = horizonY + pFactor * (h - horizonY);
        const poleH = Math.max(10, pFactor * 90);

        // Left lamppost
        const leftPoleX = roadTopLeft - 15 - pFactor * (w * 0.25);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = Math.max(1, pFactor * 3.5);
        ctx.beginPath();
        ctx.moveTo(leftPoleX, poleY);
        ctx.lineTo(leftPoleX, poleY - poleH);
        ctx.lineTo(leftPoleX + poleH * 0.25, poleY - poleH * 0.95);
        ctx.stroke();

        // Right lamppost
        const rightPoleX = roadTopRight + 15 + pFactor * (w * 0.25);
        ctx.beginPath();
        ctx.moveTo(rightPoleX, poleY);
        ctx.lineTo(rightPoleX, poleY - poleH);
        ctx.lineTo(rightPoleX - poleH * 0.25, poleY - poleH * 0.95);
        ctx.stroke();
      }

      // 8. ONCOMING TRAFFIC VEHICLE (ADDS EXTRA REALISM)
      const oncomingProg = ((scroll * 0.5) % 1000) / 1000;
      if (oncomingProg > 0.3 && oncomingProg < 0.95) {
        const oFactor = (oncomingProg - 0.3) / 0.65;
        const carY = horizonY + oFactor * (h - horizonY) * 0.7;
        const carW = Math.max(12, oFactor * 52);
        const carH = Math.max(8, oFactor * 34);
        const carX = (w * 0.5 + 20) + oFactor * (w * 0.12);

        // Vehicle body
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(carX - carW / 2, carY - carH, carW, carH);
        // Windshield
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.fillRect(carX - carW * 0.35, carY - carH * 0.9, carW * 0.7, carH * 0.4);
        // Headlights
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(carX - carW * 0.45, carY - carH * 0.35, carW * 0.2, carH * 0.25);
        ctx.fillRect(carX + carW * 0.25, carY - carH * 0.35, carW * 0.2, carH * 0.25);
      }

      animFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animFrameRef.current = requestAnimationFrame(renderFrame);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [hudMode, patrolActive, speed, currentDefect]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '400px',
        backgroundColor: '#090d16',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
        borderRadius: '8px'
      }}
    >
      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* Visual Layer: Either Realistic Road Dashcam Canvas OR Vector Radar HUD */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {hudMode === 'video' ? (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#020617' }}>
          {/* Real Highway Road Dashcam Canvas Stream */}
          <canvas
            ref={canvasRef}
            width={720}
            height={440}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />

          {/* Road LiDAR Scanning Grid & Targeting Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'radial-gradient(circle at 50% 60%, rgba(56, 189, 248, 0.04) 0%, rgba(2, 6, 23, 0.35) 100%)'
            }}
          />

          {/* Active YOLOv8 Detected Defect Bounding Box on Road Surface */}
          <div
            style={{
              position: 'absolute',
              left: `${currentDefect.xPct}%`,
              top: `${currentDefect.yPct}%`,
              width: `${currentDefect.wPct}%`,
              height: `${currentDefect.hPct}%`,
              border: `2px solid ${currentDefect.color}`,
              backgroundColor: `${currentDefect.color}25`,
              borderRadius: '6px',
              boxShadow: `0 0 16px ${currentDefect.color}60`,
              pointerEvents: 'none',
              transition: 'all 0.35s ease-out'
            }}
          >
            {/* Corner Bracket Accents */}
            <div style={{ position: 'absolute', top: -3, left: -3, width: 10, height: 10, borderTop: `3px solid ${currentDefect.color}`, borderLeft: `3px solid ${currentDefect.color}` }} />
            <div style={{ position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderTop: `3px solid ${currentDefect.color}`, borderRight: `3px solid ${currentDefect.color}` }} />
            <div style={{ position: 'absolute', bottom: -3, left: -3, width: 10, height: 10, borderBottom: `3px solid ${currentDefect.color}`, borderLeft: `3px solid ${currentDefect.color}` }} />
            <div style={{ position: 'absolute', bottom: -3, right: -3, width: 10, height: 10, borderBottom: `3px solid ${currentDefect.color}`, borderRight: `3px solid ${currentDefect.color}` }} />

            {/* Scanning Laser Line inside the detected defect */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: currentDefect.color,
                boxShadow: `0 0 8px ${currentDefect.color}`,
                animation: 'scanLaser 2.2s infinite ease-in-out'
              }}
            />

            {/* Floating Top AI Inference Label Pill */}
            <div
              style={{
                position: 'absolute',
                top: '-26px',
                left: '-2px',
                backgroundColor: currentDefect.color,
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '4px 4px 0 0',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
              }}
            >
              <span>{currentDefect.class_name.toUpperCase()}</span>
              <span style={{ opacity: 0.9 }}>{(currentDefect.conf * 100).toFixed(0)}%</span>
            </div>

            {/* Dimension Measurement Callout */}
            <div
              style={{
                position: 'absolute',
                bottom: '-22px',
                left: '0',
                color: '#ffffff',
                backgroundColor: 'rgba(15, 23, 42, 0.88)',
                backdropFilter: 'blur(4px)',
                border: '1px solid #334155',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: '700',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap'
              }}
            >
              EST: {currentDefect.wCm}cm × {currentDefect.lCm}cm [{currentDefect.sev}]
            </div>
          </div>

          {/* Pavement Targeting Crosshair Reticle */}
          <div
            style={{
              position: 'absolute',
              top: '52%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '60px',
              height: '60px',
              pointerEvents: 'none'
            }}
          >
            <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '1px', backgroundColor: 'rgba(56, 189, 248, 0.4)' }} />
            <div style={{ position: 'absolute', left: '50%', top: '0', bottom: '0', width: '1px', backgroundColor: 'rgba(56, 189, 248, 0.4)' }} />
            <div style={{ position: 'absolute', inset: '12px', border: '1px dashed rgba(56, 189, 248, 0.5)', borderRadius: '50%' }} />
          </div>
        </div>
      ) : (
        /* Vector Radar HUD SVG Mode */
        <svg
          viewBox="0 0 640 360"
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        >
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b1120" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="asphaltGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0a0f1d" />
            </linearGradient>
            <linearGradient id="scannerSweep" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0)" />
              <stop offset="50%" stopColor="rgba(56, 189, 248, 0.25)" />
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0.6)" />
            </linearGradient>
          </defs>

          <rect width="640" height="145" fill="url(#skyGrad)" />
          <path d="M 0 145 L 80 145 L 80 135 L 120 135 L 120 145 L 200 145 L 230 130 L 260 145 L 420 145 L 450 128 L 480 145 L 560 145 L 600 138 L 640 145 Z" fill="#0f172a" opacity="0.6" />
          <rect y="145" width="640" height="215" fill="url(#asphaltGrad)" />
          <polygon points="250,145 390,145 610,360 30,360" fill="#151e2e" opacity="0.95" />
          <line x1="250" y1="145" x2="30" y2="360" stroke="#475569" strokeWidth="2.5" />
          <line x1="390" y1="145" x2="610" y2="360" stroke="#475569" strokeWidth="2.5" />

          <g stroke="#f59e0b" strokeDasharray="16,14" strokeDashoffset={((scrollOffsetRef.current * 0.5) % 30)}>
            <line x1="320" y1="150" x2="320" y2="360" strokeWidth="4.5" />
          </g>

          <g>
            <rect
              x={(currentDefect.xPct / 100) * 640}
              y={(currentDefect.yPct / 100) * 360}
              width={(currentDefect.wPct / 100) * 640}
              height={(currentDefect.hPct / 100) * 360}
              fill={`${currentDefect.color}25`}
              stroke={currentDefect.color}
              strokeWidth="2.5"
              rx="4"
            />
            <rect
              x={(currentDefect.xPct / 100) * 640}
              y={(currentDefect.yPct / 100) * 360 - 24}
              width="170"
              height="24"
              fill={currentDefect.color}
              rx="3"
            />
            <text
              x={(currentDefect.xPct / 100) * 640 + 8}
              y={(currentDefect.yPct / 100) * 360 - 7}
              fill="#ffffff"
              fontSize="11"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {currentDefect.class_name.toUpperCase()}: {(currentDefect.conf * 100).toFixed(0)}%
            </text>
            <text
              x={(currentDefect.xPct / 100) * 640 + 8}
              y={(currentDefect.yPct / 100) * 360 + 20}
              fill="#f8fafc"
              fontSize="10"
              fontWeight="600"
              fontFamily="monospace"
            >
              Est: {currentDefect.wCm}cm × {currentDefect.lCm}cm
            </text>
          </g>
        </svg>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TOP DASHCAM HUD OVERLAY HEADER                                         */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '38px',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(6px)',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          zIndex: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Live Recording Red Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: patrolActive ? '#ef4444' : '#64748b',
                boxShadow: patrolActive ? '0 0 8px #ef4444' : 'none',
                animation: patrolActive ? 'pulse 1.5s infinite' : 'none'
              }}
            />
            <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: '800', fontFamily: 'monospace' }}>
              {patrolActive ? 'LIVE DASHCAM' : 'PAUSED'}
            </span>
          </div>

          <span style={{ color: '#64748b', fontSize: '11px' }}>|</span>

          {/* Vehicle ID */}
          <span style={{ color: '#38bdf8', fontSize: '12px', fontWeight: '800', letterSpacing: '0.02em' }}>
            {vehicleId}
          </span>

          <span style={{ color: '#64748b', fontSize: '11px' }}>|</span>

          <span style={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}>
            YOLOv8-road-v1
          </span>
        </div>

        {/* Center: Active ALERT_TRIGGER_CRITERIA Badge & Connection Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!serverConnected && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid #ef4444',
                padding: '2px 6px',
                borderRadius: '4px'
              }}
              title="Municipal backend offline — Dashcam buffering telemetry to local flash memory"
            >
              <WifiOff size={11} color="#ef4444" />
              <span style={{ color: '#f87171', fontSize: '10px', fontWeight: '800' }}>
                SERVER OFFLINE
              </span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: 'rgba(2, 132, 199, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '2px 8px',
              borderRadius: '4px'
            }}
            title="Active criteria governing automatic Telegram/Gmail dispatch"
          >
            <ShieldAlert size={12} color="#38bdf8" />
            <span style={{ color: '#38bdf8', fontSize: '10px', fontWeight: '700', fontFamily: 'monospace' }}>
              RULE: {alertCriteria}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#facc15', fontSize: '11px', fontFamily: 'monospace' }}>
            FPS: 29.8 | 14.2ms
          </span>
          <span style={{ color: '#e2e8f0', fontSize: '11px', fontFamily: 'monospace', fontWeight: '600' }}>
            {nowTime}
          </span>
        </div>
      </div>

      {/* GNSS Signal Loss Floating Badge */}
      {gpsStatus === 'lost' && (
        <div
          style={{
            position: 'absolute',
            top: '46px',
            left: '12px',
            backgroundColor: 'rgba(185, 28, 28, 0.9)',
            border: '1px solid #ef4444',
            backdropFilter: 'blur(4px)',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 25,
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
          }}
        >
          <Radio size={13} className="animate-pulse" />
          <span>GPS SIGNAL LOST — DEAD RECKONING ACTIVE</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* BOTTOM TELEMETRY HUD BAR                                               */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '36px',
          backgroundColor: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(6px)',
          borderTop: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          zIndex: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {gpsStatus === 'lost' ? (
            <>
              <Radio size={12} color="#ef4444" className="animate-pulse" />
              <span style={{ color: '#f87171', fontSize: '11px', fontFamily: 'monospace', fontWeight: '800' }}>
                GPS: NO LOCK (DR {lat}, {lon})
              </span>
            </>
          ) : gpsStatus === 'degraded' ? (
            <>
              <Radio size={12} color="#f59e0b" />
              <span style={{ color: '#fbbf24', fontSize: '11px', fontFamily: 'monospace', fontWeight: '700' }}>
                GPS: DEGRADED ({lat}, {lon})
              </span>
            </>
          ) : (
            <>
              <Navigation size={12} color="#4ade80" />
              <span style={{ color: '#4ade80', fontSize: '11px', fontFamily: 'monospace' }}>
                GPS: {lat}, {lon} [RTK FIX]
              </span>
            </>
          )}
        </div>

        <div style={{ color: '#38bdf8', fontSize: '11px', fontFamily: 'monospace' }}>
          SEG: {segId} ({roadName.slice(0, 26)}...)
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: '800', fontFamily: 'monospace' }}>
            SPEED: {speed} km/h
          </span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* FLOATING ACTION TOOLBAR: Toggle Video/Vector, Next Defect, Pause       */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: '44px',
          right: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 25
        }}
      >
        {/* Mode Toggle: Dashcam Feed vs Radar Vector */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(6px)',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '2px',
            display: 'flex'
          }}
        >
          <button
            onClick={() => setHudMode('video')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: hudMode === 'video' ? '#0284c7' : 'transparent',
              color: hudMode === 'video' ? '#ffffff' : '#94a3b8'
            }}
            title="Display live moving road patrol dashcam camera view"
          >
            <Video size={12} />
            <span>Dashcam Feed</span>
          </button>
          <button
            onClick={() => setHudMode('vector')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: hudMode === 'vector' ? '#0284c7' : 'transparent',
              color: hudMode === 'vector' ? '#ffffff' : '#94a3b8'
            }}
            title="Display synthetic vector radar view"
          >
            <Radio size={12} />
            <span>Radar Vector</span>
          </button>
        </div>

        {/* Cycle Next Defect */}
        <button
          onClick={() => setDefectCycle((prev) => prev + 1)}
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(6px)',
            color: '#f8fafc',
            border: '1px solid #334155',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          title="Cycle through detected defect classes on the pavement"
        >
          <RefreshCw size={12} />
          <span>Next Defect ({currentDefect.class_name})</span>
        </button>

        {/* Play / Pause Patrol Fleet */}
        {onTogglePatrol && (
          <button
            onClick={onTogglePatrol}
            style={{
              backgroundColor: patrolActive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)',
              color: patrolActive ? '#fca5a5' : '#86efac',
              border: `1px solid ${patrolActive ? '#ef4444' : '#22c55e'}`,
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {patrolActive ? <Pause size={12} /> : <Play size={12} />}
            <span>{patrolActive ? 'Pause Fleet' : 'Resume Fleet'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
