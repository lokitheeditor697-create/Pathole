import React, { useState, useEffect } from 'react';
import { Video, VideoOff, Maximize2, Minimize2, Radio, PlayCircle, StopCircle, RefreshCw } from 'lucide-react';
import { API_BASE } from '../config';

export default function LiveVideoPanel({ isOpen, onClose }) {
  const [isActive, setIsActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [imgKey, setImgKey] = useState(Date.now());

  // Poll video status every 2 seconds
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/video_status`);
        if (res.ok) {
          const data = await res.json();
          setIsActive(data.active);
        } else {
          setIsActive(false);
        }
      } catch {
        setIsActive(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartStream = async () => {
    setIsStarting(true);
    try {
      await fetch(`${API_BASE}/start_live_detect`, { method: 'POST' });
      // Poll faster for first few seconds
      setTimeout(() => {
        setIsStarting(false);
        setImgKey(Date.now());
      }, 2000);
    } catch (err) {
      console.error('Failed to start live detect:', err);
      setIsStarting(false);
    }
  };

  const handleStopStream = async () => {
    try {
      await fetch(`${API_BASE}/stop_live_detect`, { method: 'POST' });
      setIsActive(false);
    } catch (err) {
      console.error('Failed to stop live detect:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      zIndex: 1000,
      width: isMinimized ? '280px' : '460px',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid #334155',
      borderRadius: '10px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      overflow: 'hidden',
      transition: 'all 0.25s ease'
    }}>
      {/* Panel Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        fontSize: '13px',
        fontWeight: '700'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={16} color={isActive ? '#ef4444' : '#64748b'} className={isActive ? 'animate-pulse' : ''} />
          <span style={{ color: '#f8fafc' }}>Live Dashcam Video</span>
          <span style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)',
            color: isActive ? '#f87171' : '#94a3b8',
            fontWeight: '600'
          }}>
            {isActive ? 'STREAMING' : 'STANDBY'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isActive && (
            <button
              onClick={handleStopStream}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: '#7f1d1d',
                color: '#fca5a5',
                border: '1px solid #b91c1c',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              title="Stop live stream"
            >
              <StopCircle size={12} />
              Stop
            </button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', fontSize: '15px' }}
            title="Close video window"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Video Content */}
      {!isMinimized && (
        <div style={{ position: 'relative', width: '100%', height: '260px', backgroundColor: '#000' }}>
          {isActive ? (
            <img
              key={imgKey}
              src={`${API_BASE}/video_feed`}
              alt="Live Dashcam Stream"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={() => {
                setTimeout(() => setImgKey(Date.now()), 2000);
              }}
            />
          ) : (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              textAlign: 'center',
              color: '#94a3b8',
              backgroundColor: '#090d16'
            }}>
              <VideoOff size={36} color="#64748b" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginBottom: '4px' }}>
                Arumbakkam Live Transit Stream
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', maxWidth: '340px', lineHeight: '1.4', marginBottom: '14px' }}>
                Streams live MTC buses converging at DG Vaishnav College, Arumbakkam with real-time intersecting multi-bus defect verification.
              </div>
              
              {/* One-click launch button */}
              <button
                onClick={handleStartStream}
                disabled={isStarting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: isStarting ? 'default' : 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                {isStarting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Launching Arumbakkam Fleet...
                  </>
                ) : (
                  <>
                    <PlayCircle size={15} />
                    Start Live Arumbakkam Bus Patrol
                  </>
                )}
              </button>

              <div style={{
                marginTop: '12px',
                padding: '4px 8px',
                backgroundColor: '#1e293b',
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#64748b',
                border: '1px solid #334155'
              }}>
                Or run: python demo_4bus.py
              </div>
            </div>
          )}

          {/* Video HUD Badge */}
          {isActive && (
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
              YOLOv8 Edge Dashcam Stream (Active)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
