import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  MapPin,
  Send,
  Download
} from 'lucide-react';
import { API_BASE } from '../config';
import { getDefectMeta } from '../utils/defectMeta';

const PHASE1_CLASSES = [
  'ALL',
  'pothole',
  'longitudinal_crack',
  'transverse_crack',
  'alligator_crack',
  'road_patch',
  'rutting',
  'waterlogging',
];

export default function DefectInventoryView({ defects = [], onOpenAlertModal }) {
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [filterVerification, setFilterVerification] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = defects.filter((d) => {
    if (selectedClass !== 'ALL' && d.class_name !== selectedClass) return false;
    if (selectedSeverity !== 'ALL' && d.severity !== selectedSeverity) return false;
    if (filterVerification === 'VERIFIED' && !d.is_multi_bus_verified) return false;
    if (filterVerification === 'PENDING' && d.is_multi_bus_verified) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const idStr = String(d.detection_id || '').toLowerCase();
      const classStr = String(d.class_name || '').toLowerCase();
      const segStr = String(d.segment_id || '').toLowerCase();
      const busStr = Array.isArray(d.bus_ids)
        ? d.bus_ids.join(' ').toLowerCase()
        : String(d.bus_ids || '').toLowerCase();
      const match = idStr.includes(q) || classStr.includes(q) || segStr.includes(q) || busStr.includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      backgroundColor: '#070c18',
      padding: '20px',
      gap: '16px'
    }}>
      {/* Top Filter Bar */}
      <div
        className="glass-card"
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>
              Phase 1 Road Defect Registry
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Catalog of all verified road anomalies classified by YOLOv8-road-v1 across 100m GIS corridors.
            </p>
          </div>

          <a
            href={`${API_BASE}/api/reports/csv`}
            download="phase1_road_defects.csv"
            className="btn-primary"
            style={{
              padding: '7px 14px',
              fontSize: '12px'
            }}
          >
            <Download size={13} />
            <span>Download CSV Report</span>
          </a>
        </div>

        {/* Filters Controls Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#070f24',
            border: '1px solid #273860',
            borderRadius: '8px',
            padding: '7px 12px',
            flex: '1 1 200px'
          }}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by ID, class, segment, or bus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: '#f8fafc',
                fontSize: '12px',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          {/* Class Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Class:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{
                backgroundColor: '#070f24',
                color: '#f8fafc',
                border: '1px solid #273860',
                borderRadius: '8px',
                padding: '7px 10px',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {PHASE1_CLASSES.map((c) => {
                if (c === 'ALL') return <option key="ALL" value="ALL">🔍 All 7 Distress Types</option>;
                const meta = getDefectMeta(c);
                return (
                  <option key={c} value={c}>
                    {meta.icon} {meta.fullLabel}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Severity Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              style={{
                backgroundColor: '#070f24',
                color: '#f8fafc',
                border: '1px solid #273860',
                borderRadius: '8px',
                padding: '7px 10px',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Verification Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Status:</span>
            <select
              value={filterVerification}
              onChange={(e) => setFilterVerification(e.target.value)}
              style={{
                backgroundColor: '#070f24',
                color: '#f8fafc',
                border: '1px solid #273860',
                borderRadius: '8px',
                padding: '7px 10px',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Status</option>
              <option value="VERIFIED">Multi-Bus Verified (≥2)</option>
              <option value="PENDING">Pending Cross-Bus Confirmation</option>
            </select>
          </div>

          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#38bdf8', fontWeight: '700' }}>
            {filtered.length} of {defects.length} Defects
          </span>
        </div>
      </div>

      {/* Defect Cards Grid */}
      {filtered.length === 0 ? (
        <div
          className="glass-card"
          style={{
            borderStyle: 'dashed',
            padding: '48px 24px',
            textAlign: 'center',
            color: '#94a3b8'
          }}
        >
          <CheckCircle2 size={36} color="#22c55e" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ margin: '0 0 6px 0', color: '#f8fafc', fontSize: '15px' }}>
            No Defects Currently in Registry
          </h3>
          <p style={{ margin: '0 auto', fontSize: '12px', maxWidth: '440px', lineHeight: 1.5 }}>
            All predefined mock data has been removed. Scan real road footage, stream live dashcam, or upload pavement media in the Live Monitoring tab to log genuine YOLOv8 detections.
          </p>
        </div>
      ) : (
        <div className="responsive-card-grid">
          {filtered.map((defect) => {
            const meta = getDefectMeta(defect.class_name);
            const isMulti = Boolean(defect.is_multi_bus_verified);
            const sevColor =
              defect.severity === 'Critical'
                ? '#ef4444'
                : defect.severity === 'High'
                ? '#f97316'
                : defect.severity === 'Medium'
                ? '#eab308'
                : '#3b82f6';

            const busDisplay = Array.isArray(defect.bus_ids)
              ? defect.bus_ids.join(', ')
              : String(defect.bus_ids || 'Fleet Camera');

            const widthCm = defect.bbox?.estimated_physical_width_cm ?? '—';
            const lengthCm = defect.bbox?.estimated_physical_length_cm ?? '—';
            const pixelArea = defect.bbox?.pixel_area ? defect.bbox.pixel_area.toLocaleString() : '—';
            const latStr = typeof defect.latitude === 'number' ? defect.latitude.toFixed(6) : '—';
            const lngStr = typeof defect.longitude === 'number' ? defect.longitude.toFixed(6) : '—';
            const confStr = typeof defect.confidence === 'number' ? `${(defect.confidence * 100).toFixed(1)}%` : '—';

            return (
              <div
                key={defect.id || defect.detection_id}
                className="glass-card"
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative',
                  borderColor: isMulti ? 'rgba(34, 197, 94, 0.4)' : meta.borderColor ? `${meta.borderColor}44` : 'rgba(255, 255, 255, 0.08)'
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}>
                        {defect.detection_id}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        backgroundColor: `${sevColor}22`,
                        color: sevColor,
                        border: `1px solid ${sevColor}44`,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: '700'
                      }}>
                        {defect.severity}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        backgroundColor: meta.bgColor,
                        color: meta.textColor,
                        border: `1px solid ${meta.borderColor}55`,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: '800'
                      }}>
                        {meta.code}
                      </span>
                    </div>
                    <h3 style={{ margin: '6px 0 0 0', fontSize: '15px', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{meta.icon}</span>
                      <span>{meta.name}</span>
                    </h3>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {meta.category} · {meta.description}
                    </div>
                  </div>

                  {isMulti ? (
                    <div style={{
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      color: '#4ade80',
                      border: '1px solid #22c55e',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle2 size={12} />
                      <span>2+ BUSES VERIFIED</span>
                    </div>
                  ) : (
                    <div style={{
                      backgroundColor: 'rgba(100, 116, 139, 0.15)',
                      color: '#94a3b8',
                      border: '1px solid #334155',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}>
                      Single-Bus Sight
                    </div>
                  )}
                </div>

                {/* Physical Dimension vs Bounding Box */}
                <div style={{
                  backgroundColor: '#070f24',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  fontSize: '11px'
                }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>EST. PHYSICAL SIZE</span>
                    <strong style={{ color: '#38bdf8', fontSize: '12px' }}>
                      {widthCm} cm × {lengthCm} cm
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>BBOX PIXEL AREA</span>
                    <strong style={{ color: '#f8fafc' }}>
                      {pixelArea} px²
                    </strong>
                  </div>
                </div>

                {/* Location & Chainage block */}
                <div style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={12} color="#38bdf8" />
                    <span>Road Segment: <strong style={{ color: '#f8fafc' }}>{defect.segment_id}</strong> (Chainage: {defect.exact_chainage_m}m)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '18px' }}>
                    <span>Coordinates: {latStr}, {lngStr}</span>
                    <span>Confidence: <strong style={{ color: '#4ade80' }}>{confStr}</strong></span>
                  </div>
                </div>

                {/* Reporting Fleet Buses */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '11px'
                }}>
                  <span style={{ color: '#64748b' }}>
                    Reporting Fleet: <strong style={{ color: '#f8fafc' }}>{busDisplay}</strong>
                  </span>
                  <button
                    onClick={onOpenAlertModal}
                    style={{
                      backgroundColor: 'rgba(56, 189, 248, 0.1)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Send size={11} />
                    <span>Dispatch Ticket</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
