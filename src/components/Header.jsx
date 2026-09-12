import React from 'react';
import {
  Layers,
  MapPin,
  Bus,
  BarChart3,
  Video,
  Download,
  Bell,
  RefreshCw,
  Pause,
  Play,
  Wifi,
  WifiOff,
  Radio,
  Activity
} from 'lucide-react';
import { API_BASE } from '../config';

export default function Header({
  activeTab,
  setActiveTab,
  systemStatus,
  patrolActive,
  onTogglePatrol,
  onOpenAlertModal,
  onRefresh,
  loading,
  lastRefreshed,
  serverStatus = 'connected',
  latencyMs = 12,
  gpsStatus = 'locked',
  gpsDetails,
  onOpenDiagnostics,
  simulatedServerOffline = false,
  simulatedGpsLost = false
}) {
  const isServerOnline = serverStatus === 'connected' && !simulatedServerOffline;
  const isGpsLocked = gpsStatus === 'locked' && !simulatedGpsLost;
  const isGpsLost = gpsStatus === 'lost' || simulatedGpsLost;
  const isGpsDegraded = gpsStatus === 'degraded' && !simulatedGpsLost;

  const formatTime = (date) => {
    if (!date) return '—';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const navItems = [
    { id: 'LIVE_MONITORING', label: 'Live Monitoring', icon: Video },
    { id: 'ROAD_HEALTH_MAP', label: 'Google Road Map', icon: MapPin },
    { id: 'DEFECT_INVENTORY', label: 'Defect Inventory', icon: Layers },
    { id: 'PATROL_FLEET', label: 'Patrol Fleet', icon: Bus },
    { id: 'AI_PERFORMANCE', label: 'AI Model & Metrics', icon: BarChart3 },
  ];

  return (
    <header style={{
      backgroundColor: '#0f172a',
      borderBottom: '1px solid #1e293b',
      flexShrink: 0,
      zIndex: 20
    }}>
      {/* Top Banner: Brand + System Diagnostics + Global Actions */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        gap: '12px',
        borderBottom: '1px solid #1e293b'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#38bdf8',
            boxShadow: '0 0 12px #38bdf8',
            flexShrink: 0
          }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '17px', fontWeight: '800', letterSpacing: '-0.02em', color: '#f8fafc' }}>
                AI Road Intelligence &amp; Predictive Maintenance
              </h1>
              <span style={{
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '9999px',
                textTransform: 'uppercase'
              }}>
                Phase 1 Active
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
              GIS 100m Corridor Segmentation • YOLOv8-road-v1 7-Class Inference • Multi-Bus Spatial Deduplication
              {lastRefreshed && (
                <span style={{ marginLeft: '8px', color: '#475569' }}>
                  • Synced: {formatTime(lastRefreshed)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Operational Reliability & System Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Municipal Server Link Badge */}
          <button
            onClick={onOpenDiagnostics}
            title={isServerOnline ? `Municipal Server connected (${latencyMs}ms) — Click for Redundancy Diagnostics` : 'Municipal Server disconnected! Operating in degraded offline mode — Click for Diagnostics'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              border: `1px solid ${isServerOnline ? 'rgba(34, 197, 94, 0.4)' : '#ef4444'}`,
              backgroundColor: isServerOnline ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.25)',
              color: isServerOnline ? '#4ade80' : '#fca5a5',
              transition: 'all 0.15s ease'
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: isServerOnline ? '#22c55e' : '#ef4444',
                boxShadow: isServerOnline ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
                flexShrink: 0
              }}
              className={!isServerOnline ? 'animate-ping' : ''}
            />
            {isServerOnline ? <Wifi size={13} color="#22c55e" /> : <WifiOff size={13} color="#ef4444" />}
            <span>{isServerOnline ? 'Server Online' : 'Server Offline'}</span>
            <span style={{ fontSize: '10px', color: isServerOnline ? '#86efac' : '#f87171', fontFamily: 'monospace' }}>
              {isServerOnline ? `${latencyMs}ms` : 'FAIL'}
            </span>
          </button>

          {/* GPS Signal Status Badge */}
          <button
            onClick={onOpenDiagnostics}
            title={
              isGpsLocked
                ? `GPS 3D RTK Fix Locked (${gpsDetails?.satellites || 12} satellites) — Click for GNSS Diagnostics`
                : isGpsLost
                ? 'GPS Signal Lost! Inertial Dead Reckoning active — Click for Diagnostics'
                : 'GPS Signal Degraded — Click for Diagnostics'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              border: `1px solid ${
                isGpsLocked
                  ? 'rgba(56, 189, 248, 0.4)'
                  : isGpsLost
                  ? '#ef4444'
                  : 'rgba(245, 158, 11, 0.5)'
              }`,
              backgroundColor: isGpsLocked
                ? 'rgba(56, 189, 248, 0.12)'
                : isGpsLost
                ? 'rgba(239, 68, 68, 0.25)'
                : 'rgba(245, 158, 11, 0.2)',
              color: isGpsLocked ? '#38bdf8' : isGpsLost ? '#fca5a5' : '#fbbf24',
              transition: 'all 0.15s ease'
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: isGpsLocked ? '#38bdf8' : isGpsLost ? '#ef4444' : '#f59e0b',
                boxShadow: isGpsLocked ? '0 0 8px #38bdf8' : isGpsLost ? '0 0 8px #ef4444' : '0 0 8px #f59e0b',
                flexShrink: 0
              }}
              className={isGpsLost ? 'animate-ping' : ''}
            />
            <Radio size={13} color={isGpsLocked ? '#38bdf8' : isGpsLost ? '#ef4444' : '#f59e0b'} />
            <span>{isGpsLocked ? 'GPS 3D Fix' : isGpsLost ? 'GPS Signal Lost' : isGpsDegraded ? 'GPS Degraded' : 'GPS Fix'}</span>
            <span style={{ fontSize: '10px', color: isGpsLocked ? '#7dd3fc' : isGpsLost ? '#f87171' : '#fde047', fontFamily: 'monospace' }}>
              {isGpsLost ? 'DR MODE' : `${gpsDetails?.satellites || 12}S`}
            </span>
          </button>

          {/* Secondary Subsystem Indicators */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#1e293b',
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid #334155'
          }}>
            <StatusDot label="Camera" status={systemStatus?.camera || 'green'} />
            <div style={{ width: '1px', height: '12px', backgroundColor: '#334155' }} />
            <StatusDot label="YOLOv8" status={systemStatus?.ai_model || 'green'} />
            <div style={{ width: '1px', height: '12px', backgroundColor: '#334155' }} />
            <StatusDot label="Municipal DB" status={systemStatus?.database || 'green'} />
          </div>

          {/* Diagnostics Modal Button */}
          <button
            onClick={onOpenDiagnostics}
            title="Open Municipal Reliability & Redundancy Center"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 9px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155'
            }}
          >
            <Activity size={13} color="#38bdf8" />
            <span>Diagnostics</span>
          </button>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Patrol Play/Pause */}
          <button
            onClick={onTogglePatrol}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: patrolActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: patrolActive ? '#4ade80' : '#f87171',
              border: `1px solid ${patrolActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}
          >
            {patrolActive ? <Pause size={13} /> : <Play size={13} />}
            <span>{patrolActive ? 'Patrol Live' : 'Patrol Paused'}</span>
          </button>

          {/* Test Alerts */}
          <button
            onClick={onOpenAlertModal}
            title="Send test Telegram Bot & Gmail dispatch alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}
          >
            <Bell size={13} />
            <span>Test Alerts</span>
          </button>

          {/* Export Report CSV */}
          <a
            href={`${API_BASE}/api/reports/csv`}
            download="phase1_road_defects_report.csv"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'none',
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #334155'
            }}
          >
            <Download size={13} />
            <span>Export CSV</span>
          </a>

          {/* Backup Database */}
          <a
            href={`${API_BASE}/api/db/export`}
            download="municipal_pavement_db.json"
            title="Export complete persistent municipal database (Corridors, Defects, Work Orders, Surveys)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'none',
              backgroundColor: '#1e293b',
              color: '#22c55e',
              border: '1px solid #22c55e44'
            }}
          >
            <Download size={13} />
            <span>DB Backup</span>
          </a>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: loading ? 'default' : 'pointer',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        backgroundColor: '#090d16',
        gap: '4px',
        overflowX: 'auto'
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: isActive ? '700' : '500',
                color: isActive ? '#38bdf8' : '#94a3b8',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}

function StatusDot({ label, status }) {
  const isGreen = status === 'green';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94a3b8' }}>
      <span style={{
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        backgroundColor: isGreen ? '#22c55e' : '#ef4444',
        boxShadow: isGreen ? '0 0 6px #22c55e' : '0 0 6px #ef4444'
      }} />
      <span>{label}</span>
    </div>
  );
}
