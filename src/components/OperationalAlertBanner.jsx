import React from 'react';
import {
  WifiOff,
  Radio,
  AlertTriangle,
  RefreshCw,
  Activity,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function OperationalAlertBanner({
  isServerOffline = false,
  isGpsLost = false,
  isGpsDegraded = false,
  reconnecting = false,
  onRetryConnection,
  onRestoreGps,
  onOpenDiagnostics,
  simulatedOffline = false,
  onRestoreServer
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // If both systems are healthy, banner is hidden
  if (!isServerOffline && !isGpsLost && !isGpsDegraded) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: isServerOffline && isGpsLost ? '#450a0a' : isServerOffline ? '#431407' : '#3b0764',
        borderBottom: `2px solid ${isServerOffline ? '#ef4444' : '#f59e0b'}`,
        color: '#f8fafc',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        zIndex: 30,
        position: 'relative',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      {/* Main Alert Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isCollapsed ? '6px 16px' : '10px 16px',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        {/* Left: Indicator Badges & Main Message */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          {/* Pulsing Status Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: isServerOffline ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
              border: `1px solid ${isServerOffline ? '#ef4444' : '#f59e0b'}`,
              flexShrink: 0
            }}
          >
            {isServerOffline ? (
              <WifiOff size={18} color="#ef4444" className="animate-pulse" />
            ) : isGpsLost ? (
              <Radio size={18} color="#f59e0b" className="animate-pulse" />
            ) : (
              <AlertTriangle size={18} color="#fbbf24" />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: isServerOffline ? '#dc2626' : '#d97706',
                  color: '#ffffff'
                }}
              >
                {isServerOffline && isGpsLost
                  ? 'CRITICAL TELEMETRY & GNSS FAULT'
                  : isServerOffline
                  ? 'MUNICIPAL SERVER OFFLINE'
                  : isGpsLost
                  ? 'GPS GNSS SIGNAL LOST'
                  : 'GPS ACCURACY DEGRADED'}
              </span>

              {simulatedOffline && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    backgroundColor: 'rgba(56, 189, 248, 0.2)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    padding: '1px 6px',
                    borderRadius: '4px'
                  }}
                >
                  SIMULATION ACTIVE
                </span>
              )}

              <span style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>
                {isServerOffline
                  ? 'Municipal link disconnected — Autonomous offline degraded mode active'
                  : isGpsLost
                  ? 'Zero satellites visible — Switched to Inertial Dead Reckoning (DR)'
                  : 'GPS Dilution of Precision high — Positional fix estimated'}
              </span>
            </div>

            {!isCollapsed && (
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
                {isServerOffline && (
                  <span>
                    The client is safely operating using the in-memory GIS corridor cache. Telemetry and defect queues are buffered locally.
                  </span>
                )}
                {isServerOffline && isGpsLost && ' • '}
                {isGpsLost && (
                  <span>
                    Patrol dashcam units are tracking position using onboard wheel-speed sensors and IMU gyroscope heading until satellite lock is re-acquired.
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Right: Operational Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isServerOffline && (
            <>
              {simulatedOffline && onRestoreServer ? (
                <button
                  onClick={onRestoreServer}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>Restore Server</span>
                </button>
              ) : (
                <button
                  onClick={onRetryConnection}
                  disabled={reconnecting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: reconnecting ? 'default' : 'pointer',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)'
                  }}
                >
                  <RefreshCw size={13} className={reconnecting ? 'animate-spin' : ''} />
                  <span>{reconnecting ? 'Reconnecting...' : 'Retry Connection'}</span>
                </button>
              )}
            </>
          )}

          {isGpsLost && onRestoreGps && (
            <button
              onClick={onRestoreGps}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#d97706',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(217, 119, 6, 0.4)'
              }}
            >
              <Radio size={13} />
              <span>Acquire GPS Fix</span>
            </button>
          )}

          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Activity size={13} />
              <span>Diagnostics</span>
            </button>
          )}

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand details' : 'Collapse banner'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
