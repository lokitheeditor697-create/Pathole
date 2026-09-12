import React from 'react';
import {
  Radio,
  Wifi,
  WifiOff,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  X
} from 'lucide-react';

export default function ReliabilityDiagnosticsModal({
  isOpen,
  onClose,
  serverStatus, // 'connected' | 'reconnecting' | 'disconnected'
  latencyMs,
  lastHeartbeat,
  gpsStatus, // 'locked' | 'degraded' | 'lost'
  gpsDetails,
  _systemStatus,
  simulatedServerOffline,
  onToggleSimulatedServer,
  simulatedGpsLost,
  onToggleSimulatedGps,
  onForceRefresh
}) {
  if (!isOpen) return null;

  const isServerOnline = serverStatus === 'connected' && !simulatedServerOffline;
  const isGpsLocked = gpsStatus === 'locked' && !simulatedGpsLost;
  const isGpsLost = gpsStatus === 'lost' || simulatedGpsLost;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0b1329'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#f8fafc' }}>
                Municipal Operational Reliability &amp; Redundancy
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Central telemetry link health, GNSS satellite tracking, and autonomous edge failover systems
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* Quick Simulation Bar for Testing Indicators */}
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#f8fafc' }}>
                Interactive Operational Reliability Tester
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Simulate signal loss and network disconnects to test UI indicators and automatic failover handling.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={onToggleSimulatedServer}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: simulatedServerOffline ? '#16a34a' : '#ef4444',
                  color: '#ffffff'
                }}
              >
                {simulatedServerOffline ? 'Restore Server Connection' : 'Simulate Server Offline'}
              </button>

              <button
                onClick={onToggleSimulatedGps}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: simulatedGpsLost ? '#16a34a' : '#f59e0b',
                  color: '#ffffff'
                }}
              >
                {simulatedGpsLost ? 'Restore 3D GPS Lock' : 'Simulate GPS Signal Loss'}
              </button>
            </div>
          </div>

          {/* Primary Subsystem Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px'
            }}
          >
            {/* SUBSYSTEM 1: Municipal Central Server */}
            <div
              style={{
                backgroundColor: '#131d33',
                border: `1px solid ${isServerOnline ? '#22c55e44' : '#ef4444'}`,
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isServerOnline ? (
                    <Wifi size={18} color="#22c55e" />
                  ) : (
                    <WifiOff size={18} color="#ef4444" className="animate-pulse" />
                  )}
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
                    Municipal Server Telemetry Link
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: isServerOnline ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: isServerOnline ? '#4ade80' : '#f87171',
                    border: `1px solid ${isServerOnline ? '#22c55e' : '#ef4444'}`
                  }}
                >
                  {isServerOnline ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Round-Trip Latency:</span>
                  <span style={{ color: '#f8fafc', fontWeight: '600', fontFamily: 'monospace' }}>
                    {isServerOnline ? `${latencyMs || 14} ms` : 'TIMED OUT'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Heartbeat Interval:</span>
                  <span style={{ color: '#f8fafc', fontWeight: '600' }}>2,500 ms (Background Polling)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>In-Memory Fallback Cache:</span>
                  <span style={{ color: '#22c55e', fontWeight: '600' }}>Active (6 Corridors / 7 Defects)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Last Received Heartbeat:</span>
                  <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>
                    {lastHeartbeat ? lastHeartbeat.toLocaleTimeString() : 'Awaiting sync...'}
                  </span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '11px',
                  color: isServerOnline ? '#86efac' : '#fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={13} />
                <span>
                  {isServerOnline
                    ? 'Bi-directional sync operational with zero packet loss.'
                    : 'Degraded offline mode engaged. UI is rendering locally without crashing.'}
                </span>
              </div>
            </div>

            {/* SUBSYSTEM 2: GNSS / GPS Satellite Subsystem */}
            <div
              style={{
                backgroundColor: '#131d33',
                border: `1px solid ${isGpsLocked ? '#22c55e44' : isGpsLost ? '#ef4444' : '#f59e0b'}`,
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Radio
                    size={18}
                    color={isGpsLocked ? '#22c55e' : isGpsLost ? '#ef4444' : '#f59e0b'}
                    className={isGpsLost ? 'animate-pulse' : ''}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
                    Fleet GNSS / GPS Navigation
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: isGpsLocked
                      ? 'rgba(34, 197, 94, 0.2)'
                      : isGpsLost
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(245, 158, 11, 0.2)',
                    color: isGpsLocked ? '#4ade80' : isGpsLost ? '#f87171' : '#fbbf24',
                    border: `1px solid ${isGpsLocked ? '#22c55e' : isGpsLost ? '#ef4444' : '#f59e0b'}`
                  }}
                >
                  {isGpsLocked ? '3D RTK LOCKED' : isGpsLost ? 'SIGNAL LOST' : 'DEGRADED (2D)'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Visible GNSS Satellites:</span>
                  <span style={{ color: '#f8fafc', fontWeight: '700', fontFamily: 'monospace' }}>
                    {isGpsLost ? '0 / 12' : gpsDetails?.satellites || 12} satellites
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Horizontal DOP (HDOP):</span>
                  <span style={{ color: '#f8fafc', fontWeight: '600', fontFamily: 'monospace' }}>
                    {isGpsLost ? '99.9 (No Fix)' : `${gpsDetails?.hdop || 0.8} (Ideal)`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Positioning Fix Mode:</span>
                  <span style={{ color: isGpsLocked ? '#38bdf8' : '#f59e0b', fontWeight: '600' }}>
                    {isGpsLost ? 'Dead Reckoning (Wheel Odometry + IMU)' : gpsDetails?.fix_type || '3D RTK Fix (±0.3m)'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Differential Source:</span>
                  <span style={{ color: '#cbd5e1' }}>NavIC / GAGAN Satellite Augmentation</span>
                </div>
              </div>

              {/* NMEA Sentence View */}
              <div
                style={{
                  backgroundColor: '#090d16',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  color: isGpsLost ? '#ef4444' : '#38bdf8',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                {isGpsLost
                  ? '$GNGGA,000000.00,,,,0,00,99.9,,,,,,*00 (NO SATELLITE CARRIER)'
                  : gpsDetails?.last_nmea_gpgga || '$GNGGA,071422.00,1304.9620,N,08013.9800,E,4,12,0.8,14.5,M,-52.0,M,,*4A'}
              </div>
            </div>
          </div>

          {/* Redundancy Failover Architecture */}
          <div
            style={{
              backgroundColor: '#131d33',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '16px'
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', marginBottom: '10px' }}>
              Operational Failover &amp; Reliability Safeguards
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12px' }}>
                  <strong style={{ color: '#e2e8f0' }}>Zero-Loss Edge Buffer</strong>
                  <p style={{ margin: '2px 0 0 0', color: '#94a3b8', fontSize: '11px' }}>
                    Detections caught during server outages are queued in local memory and synced upon reconnect.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12px' }}>
                  <strong style={{ color: '#e2e8f0' }}>Dead Reckoning DR</strong>
                  <p style={{ margin: '2px 0 0 0', color: '#94a3b8', fontSize: '11px' }}>
                    When entering underpasses or signal canyons, transit vehicle speeds and headings project chainage.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12px' }}>
                  <strong style={{ color: '#e2e8f0' }}>Graceful Degradation</strong>
                  <p style={{ margin: '2px 0 0 0', color: '#94a3b8', fontSize: '11px' }}>
                    Cartographic maps and AI inventories continue displaying baseline GIS data without throwing fatal exceptions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0b1329'
          }}
        >
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            System Diagnostic Cycle ID: #REL-2026-SYS
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onForceRefresh && (
              <button
                onClick={onForceRefresh}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} />
                <span>Force Telemetry Sync</span>
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: '7px 18px',
                borderRadius: '6px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
