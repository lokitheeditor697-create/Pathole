import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Crosshair, CheckCircle2, HelpCircle, Clock, MapPin } from 'lucide-react';

export default function DefectsSidePanel({
  defects,
  selectedDefect,
  onSelectDefect
}) {
  const [filterMode, setFilterMode] = useState('ALL');

  const filteredDefects = defects.filter(d => {
    if (filterMode === 'ALL') return true;
    if (filterMode === 'CONFIRMED') return d.bus_count >= 2;
    if (filterMode === 'UNCONFIRMED') return d.bus_count === 1;
    return d.severity.toUpperCase() === filterMode;
  });

  const confirmedCount = defects.filter(d => d.bus_count >= 2).length;

  // Compute a stable sequential rank (1-based) by sort: highest bus_count first, then by id asc
  // This means rank does NOT use raw DB id, so after reset it reflects the display order
  const sortedIds = [...defects]
    .sort((a, b) => b.bus_count - a.bus_count || a.id - b.id)
    .map(d => d.id);
  const rankMap = {};
  sortedIds.forEach((id, idx) => { rankMap[id] = idx + 1; });

  const formatTime = (isoStr) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#1e293b',
      borderLeft: '1px solid #334155',
      overflow: 'hidden'
    }}>
      {/* Panel Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
              Detected Road Hazards
            </h2>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {confirmedCount > 0 ? (
                <span style={{ color: '#4ade80' }}>✓ {confirmedCount} Confirmed Multi-Bus Alerts</span>
              ) : (
                <span>No confirmed alerts yet — run a second bus</span>
              )}
            </div>
          </div>
          <span style={{
            fontSize: '12px',
            backgroundColor: '#0f172a',
            padding: '3px 10px',
            borderRadius: '12px',
            color: '#38bdf8',
            fontWeight: '700',
            border: '1px solid #334155',
            flexShrink: 0
          }}>
            {filteredDefects.length} / {defects.length}
          </span>
        </div>

        {/* Cross-Bus Info Banner */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e40af40',
          borderLeft: '3px solid #3b82f6',
          borderRadius: '6px',
          padding: '8px 10px',
          fontSize: '11px',
          color: '#94a3b8',
          lineHeight: '1.5',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start'
        }}>
          <ShieldAlert size={14} color="#60a5fa" style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>
            <strong style={{ color: '#60a5fa' }}>Cross-Bus Verification:</strong>{' '}
            Only hazards confirmed by ≥2 buses trigger repair alerts.{' '}
            <span style={{ color: '#475569' }}>Single-bus sightings stay pending.</span>
          </span>
        </div>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {[
            { id: 'ALL', label: `All (${defects.length})`, color: '#38bdf8' },
            { id: 'CONFIRMED', label: `✓ Verified (${confirmedCount})`, color: '#4ade80' },
            { id: 'HIGH', label: 'High', color: '#ef4444' },
            { id: 'MEDIUM', label: 'Med', color: '#f97316' },
            { id: 'LOW', label: 'Low', color: '#22c55e' }
          ].map(btn => {
            const isActive = filterMode === btn.id;
            return (
              <button
                key={btn.id}
                onClick={() => setFilterMode(btn.id)}
                style={{
                  flex: btn.id === 'CONFIRMED' ? '1 1 100%' : '1 1 auto',
                  padding: '5px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  borderRadius: '5px',
                  border: isActive ? `1px solid ${btn.color}` : '1px solid #334155',
                  backgroundColor: isActive ? `${btn.color}20` : '#0f172a',
                  color: isActive ? btn.color : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Defect List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {filteredDefects.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '180px',
            color: '#475569',
            fontSize: '13px',
            textAlign: 'center',
            padding: '20px',
            gap: '8px'
          }}>
            <AlertTriangle size={28} style={{ opacity: 0.4 }} />
            <div>No defects match this filter.</div>
            <div style={{ fontSize: '11px', color: '#334155' }}>
              {filterMode === 'CONFIRMED'
                ? 'Send events from a second bus to confirm pending detections.'
                : 'Adjust the filter or run the detector to ingest new data.'}
            </div>
          </div>
        ) : (
          filteredDefects.map((defect, idx) => {
            const isSelected = selectedDefect && selectedDefect.id === defect.id;
            const isConfirmed = defect.bus_count >= 2;
            const isHigh = defect.severity === 'High';
            const isMedium = defect.severity === 'Medium';

            const sevColor = isHigh ? '#ef4444' : isMedium ? '#f97316' : '#22c55e';
            const sevBg = isHigh ? 'rgba(239,68,68,0.12)' : isMedium ? 'rgba(249,115,22,0.12)' : 'rgba(34,197,94,0.12)';
            // Use sequential rank in display label
            const displayNum = rankMap[defect.id] || (idx + 1);

            return (
              <div
                key={defect.id}
                onClick={() => onSelectDefect(defect)}
                style={{
                  backgroundColor: isSelected ? '#1e3a5f' : '#0f172a',
                  border: isSelected
                    ? `2px solid ${sevColor}`
                    : isConfirmed
                    ? '1px solid #1d4ed8'
                    : '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '11px 12px 11px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: isSelected ? `0 0 0 1px ${sevColor}40` : 'none'
                }}
              >
                {/* Severity accent bar */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: '3px',
                  backgroundColor: sevColor,
                  borderRadius: '8px 0 0 8px'
                }} />

                {/* Title Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isConfirmed
                      ? <CheckCircle2 size={14} color="#4ade80" />
                      : <HelpCircle size={14} color="#64748b" />
                    }
                    <strong style={{ fontSize: '14px', textTransform: 'capitalize', color: '#f8fafc' }}>
                      {defect.defect_type.charAt(0).toUpperCase() + defect.defect_type.slice(1)} #{displayNum}
                    </strong>
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: sevBg,
                    color: sevColor,
                    border: `1px solid ${sevColor}40`
                  }}>
                    {defect.severity}
                  </span>
                </div>

                {/* Confidence + Bus Verification Row */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  {/* Confidence badge */}
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #334155'
                  }}>
                    Conf: <strong style={{ color: '#f8fafc' }}>{(defect.confidence * 100).toFixed(1)}%</strong>
                  </span>

                  {/* Bus count badge */}
                  <span
                    title={`bus_count = ${defect.bus_count} unique buses; total_detections = ${defect.total_detections} total observations`}
                    style={{
                      fontSize: '11px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: isConfirmed ? 'rgba(34,197,94,0.12)' : '#1e293b',
                      color: isConfirmed ? '#4ade80' : '#64748b',
                      border: `1px solid ${isConfirmed ? 'rgba(34,197,94,0.3)' : '#334155'}`,
                      cursor: 'help'
                    }}
                  >
                    {isConfirmed ? '✓' : '?'} {defect.bus_count} bus{defect.bus_count > 1 ? 'es' : ''} · {defect.total_detections} obs
                  </span>
                </div>

                {/* Bus IDs */}
                <div style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#60a5fa',
                  backgroundColor: '#0a1628',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  marginBottom: '6px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {defect.bus_ids}
                </div>

                {/* Footer: GPS + Time + Map link */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '10px',
                  color: '#475569'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <MapPin size={10} />
                    {defect.latitude.toFixed(5)}, {defect.longitude.toFixed(5)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={10} />
                      {formatTime(defect.last_detected)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#38bdf8' }}>
                      <Crosshair size={10} />
                      Pan
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
