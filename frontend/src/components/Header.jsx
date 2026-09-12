import React from 'react';
import { Activity, ShieldAlert, Bus, Layers, RefreshCw, Trash2, Video, Download } from 'lucide-react';
import { API_BASE } from '../config';

export default function Header({
  stats,
  isPolling,
  setIsPolling,
  showVideo,
  setShowVideo,
  onRefresh,
  onReset,
  loading,
  lastRefreshed
}) {
  const formatTime = (date) => {
    if (!date) return '—';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header style={{
      backgroundColor: '#1e293b',
      borderBottom: '1px solid #334155',
      padding: '14px 24px',
      flexShrink: 0
    }}>
      {/* Top Row: Title + Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '14px'
      }}>
        {/* Title */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#38bdf8',
              boxShadow: '0 0 10px #38bdf8',
              flexShrink: 0
            }}></div>
            <h1 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.025em', color: '#f8fafc' }}>
              Smart City Road-Defect &amp; Traffic Monitor
            </h1>
            <span style={{
              backgroundColor: '#0f172a',
              color: '#38bdf8',
              border: '1px solid #0284c7',
              fontSize: '10px',
              fontWeight: '600',
              padding: '2px 8px',
              borderRadius: '9999px',
              textTransform: 'uppercase',
              flexShrink: 0
            }}>
              Edge Prototype
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            Automated dashcam defect ingestion • 15m/10min spatial deduplication • Multi-bus cross-verification
            {lastRefreshed && (
              <span style={{ marginLeft: '10px', color: '#475569' }}>
                • Last updated: <span style={{ color: '#64748b' }}>{formatTime(lastRefreshed)}</span>
              </span>
            )}
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Polling Toggle */}
          <button
            onClick={() => setIsPolling(!isPolling)}
            title={isPolling ? 'Pause live polling' : 'Resume live polling'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: isPolling ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.2)',
              color: isPolling ? '#4ade80' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isPolling ? '#22c55e' : '#64748b',
              display: 'inline-block',
              animation: isPolling ? 'pulse 1.5s infinite' : 'none'
            }} />
            {isPolling ? 'Live (3s)' : 'Paused'}
          </button>

          {/* Video Toggle */}
          <button
            onClick={() => setShowVideo(!showVideo)}
            title={showVideo ? 'Hide dashcam video' : 'Show dashcam video'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: showVideo ? 'rgba(56, 189, 248, 0.15)' : '#334155',
              color: showVideo ? '#38bdf8' : '#f8fafc',
              border: showVideo ? '1px solid #38bdf8' : '1px solid #475569',
              transition: 'all 0.2s'
            }}
          >
            <Video size={13} />
            {showVideo ? 'Hide Video' : 'Live Feed'}
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh data now"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: loading ? 'default' : 'pointer',
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: '1px solid #475569',
              opacity: loading ? 0.7 : 1
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          {/* Export Incident Report */}
          <a
            href={`${API_BASE}/reports/csv`}
            download="municipal_incident_report.csv"
            title="Download Municipal Incident & Road Defect Report (CSV)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'none',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            <Download size={13} />
            Export Report
          </a>

          {/* Reset DB */}
          <button
            onClick={onReset}
            title="Clear all records and reset IDs to #1"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            <Trash2 size={13} />
            Reset DB
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px'
      }}>
        {/* Total Verified */}
        <KpiCard
          icon={<Layers size={18} />}
          iconBg="rgba(56, 189, 248, 0.15)"
          iconColor="#38bdf8"
          label="Total Verified Defects"
          value={stats.total_defects || 0}
          valueColor="#f8fafc"
          sub={`${stats.total_raw_events || 0} raw events logged`}
        />

        {/* Multi-Bus */}
        <KpiCard
          icon={<ShieldAlert size={18} />}
          iconBg="rgba(34, 197, 94, 0.15)"
          iconColor="#4ade80"
          label="Multi-Bus Verified"
          value={stats.multi_bus_verified || 0}
          valueColor="#4ade80"
          sub="≥2 buses confirmed"
        />

        {/* High Severity */}
        <KpiCard
          icon={<Activity size={18} />}
          iconBg="rgba(239, 68, 68, 0.15)"
          iconColor="#f87171"
          label="High Severity"
          value={stats.severity_counts?.High || 0}
          valueColor="#f87171"
          sub={`Med: ${stats.severity_counts?.Medium || 0} · Low: ${stats.severity_counts?.Low || 0}`}
        />

        {/* Active Buses */}
        <KpiCard
          icon={<Bus size={18} />}
          iconBg="rgba(249, 115, 22, 0.15)"
          iconColor="#fb923c"
          label="Active Buses"
          value={stats.active_buses ? stats.active_buses.length : 0}
          valueColor="#fb923c"
          sub={stats.active_buses?.slice(0, 3).join(', ') || '—'}
        />
      </div>
    </header>
  );
}

function KpiCard({ icon, iconBg, iconColor, label, value, valueColor, sub }) {
  return (
    <div style={{
      backgroundColor: '#0f172a',
      padding: '11px 14px',
      borderRadius: '8px',
      border: '1px solid #334155',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: 0
    }}>
      <div style={{
        backgroundColor: iconBg,
        color: iconColor,
        padding: '9px',
        borderRadius: '8px',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.04em' }}>
          {label}
        </div>
        <div style={{ fontSize: '22px', fontWeight: '800', color: valueColor, lineHeight: 1.1 }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
