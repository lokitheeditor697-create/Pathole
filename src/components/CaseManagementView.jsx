import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  ShieldCheck,
  RefreshCw,
  Eye,
  ExternalLink,
  ChevronRight,
  Download,
  Activity,
  Layers,
  Sparkles,
  Smartphone,
  X,
  MapPin
} from 'lucide-react';
import CaseDetailModal from './CaseDetailModal';
import { API_BASE } from '../config';
import { DEFAULT_CASES } from '../gisData';

const STATUS_CONFIG = {
  DETECTED: { label: 'Detected', bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8', text: '#38bdf8' },
  REPORTED: { label: 'Reported', bg: 'rgba(99, 102, 241, 0.15)', border: '#6366f1', text: '#818cf8' },
  ACKNOWLEDGED: { label: 'Acknowledged', bg: 'rgba(234, 179, 8, 0.15)', border: '#eab308', text: '#fde047' },
  ASSIGNED: { label: 'Assigned', bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316', text: '#fb923c' },
  WORK_IN_PROGRESS: { label: 'In Progress', bg: 'rgba(234, 88, 12, 0.15)', border: '#ea580c', text: '#fdba74' },
  REPAIR_COMPLETED: { label: 'Repair Done', bg: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', text: '#c084fc' },
  VERIFICATION_REQUIRED: { label: 'Verification Needed', bg: 'rgba(236, 72, 153, 0.2)', border: '#ec4899', text: '#f472b6' },
  VERIFIED: { label: 'AI Verified', bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#34d399' },
  CLOSED: { label: 'Closed', bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#4ade80' },
  REOPENED: { label: 'Reopened', bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', text: '#f87171' },
};

const SEVERITY_COLORS = {
  Critical: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: '#ef4444' },
  High: { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: '#f97316' },
  Medium: { bg: 'rgba(234, 179, 8, 0.15)', text: '#fde047', border: '#eab308' },
  Low: { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: '#22c55e' }
};

export default function CaseManagementView({ onOpenAlertModal, onRefreshAllData }) {
  const [cases, setCases] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [activeModalCase, setActiveModalCase] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');

  const fetchCasesData = async () => {
    setLoading(true);
    try {
      const [casesRes, anRes] = await Promise.all([
        fetch(`${API_BASE}/api/cases`).catch(() => null),
        fetch(`${API_BASE}/api/cases/analytics`).catch(() => null)
      ]);
      if (casesRes && casesRes.ok) {
        const cData = await casesRes.json();
        setCases(Array.isArray(cData) ? cData : (cData?.cases || DEFAULT_CASES));
      } else {
        setCases(DEFAULT_CASES);
      }
      if (anRes && anRes.ok) {
        const aData = await anRes.json();
        setAnalytics(aData);
      } else {
        // Compute basic client analytics from cases
        const total = DEFAULT_CASES.length;
        const critical = DEFAULT_CASES.filter(c => c.severity === 'Critical').length;
        const high = DEFAULT_CASES.filter(c => c.severity === 'High').length;
        setAnalytics({
          total_cases: total,
          by_severity: { Critical: critical, High: high, Medium: 1, Low: 0 },
          by_status: { VERIFICATION_REQUIRED: 1, ASSIGNED: 1, REPORTED: 1 },
          verification_needed: 1,
          pending_verifications: 1
        });
      }
    } catch (e) {
      console.warn('Backend offline, using autonomous municipal cases fallback:', e);
      setCases(DEFAULT_CASES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCasesData();
  }, []);

  const handleOpenCase = (c) => {
    setActiveModalCase(c);
  };

  const handleRefreshSingleCase = async (caseId) => {
    try {
      const res = await fetch(`${API_BASE}/api/cases/${caseId}`);
      if (res.ok) {
        const updated = await res.json();
        setActiveModalCase(updated);
        setCases((prev) => prev.map((item) => (item.case_id === caseId ? updated : item)));
        // Refresh analytics
        const anRes = await fetch(`${API_BASE}/api/cases/analytics`);
        if (anRes.ok) setAnalytics(await anRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered cases list
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) return false;
      if (selectedSeverity !== 'ALL' && c.severity !== selectedSeverity) return false;
      if (selectedPriority !== 'ALL' && c.priority !== selectedPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const caseIdStr = String(c.case_id || '').toLowerCase();
        const potholeIdStr = String(c.pothole_id || '').toLowerCase();
        const roadNameStr = String(c.road_name || '').toLowerCase();
        const defectTypeStr = String(c.defect_type || '').toLowerCase();
        const contractorStr = String(c.assigned_contractor || '').toLowerCase();
        const teamStr = String(c.assigned_team || '').toLowerCase();
        const matches =
          caseIdStr.includes(q) ||
          potholeIdStr.includes(q) ||
          roadNameStr.includes(q) ||
          defectTypeStr.includes(q) ||
          contractorStr.includes(q) ||
          teamStr.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [cases, selectedStatus, selectedSeverity, selectedPriority, searchQuery]);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* View Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Municipal Defect Lifecycle &amp; Closed-Loop Verification
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}
            >
              Phase 2 Active
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Closed-loop management from vision detection to contractor assignment, same-location AI verification &amp; engineer sign-off.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={fetchCasesData}
            disabled={loading}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              backgroundColor: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid #334155',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Total Cases */}
        <div className="kpi-card kpi-card-blue">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Case Registry
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <ClipboardList size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#f8fafc', lineHeight: 1.1 }}>
            {analytics?.total_cases ?? cases.length}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {analytics?.active_cases || 0} currently active cases
          </span>
        </div>

        {/* Work In Progress */}
        <div className="kpi-card kpi-card-orange">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#fdba74', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Field Work in Progress
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(249, 115, 22, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fb923c'
              }}
            >
              <Wrench size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#fdba74', lineHeight: 1.1 }}>
            {analytics?.work_in_progress_count || 0}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Active repair teams deployed
          </span>
        </div>

        {/* Verification Required (Pulsing Target) */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'VERIFICATION_REQUIRED' ? 'ALL' : 'VERIFICATION_REQUIRED')}
          className="kpi-card kpi-card-pink"
          style={{ cursor: 'pointer', borderColor: selectedStatus === 'VERIFICATION_REQUIRED' ? '#ec4899' : undefined }}
          title="Click to filter verification targets"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Verification Needed
              </span>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#ec4899',
                  animation: 'pulse 1.5s infinite'
                }}
              />
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(236, 72, 153, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ec4899'
              }}
            >
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#f472b6', lineHeight: 1.1 }}>
            {analytics?.verification_required_count || 0}
          </div>
          <span style={{ fontSize: '11px', color: '#fbcfe8' }}>
            Awaiting same-location re-scan
          </span>
        </div>

        {/* Closed & Verified */}
        <div className="kpi-card kpi-card-emerald">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Verified &amp; Closed
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4ade80'
              }}
            >
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#4ade80', lineHeight: 1.1 }}>
            {analytics?.closed_count || 0}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {analytics?.repair_verification_rate_percent || 100}% compliance rate
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="glass-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#070f24',
              border: '1px solid #273860',
              borderRadius: '8px',
              padding: '7px 12px',
              flex: 1
            }}
          >
            <Search size={15} color="#64748b" />
            <input
              type="text"
              placeholder="Search by Case ID, road corridor, contractor, defect..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '13px',
                outline: 'none',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Status Select */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              backgroundColor: '#070f24',
              border: '1px solid #273860',
              borderRadius: '8px',
              color: '#cbd5e1',
              padding: '8px 12px',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Statuses ({cases.length})</option>
            <option value="VERIFICATION_REQUIRED">Verification Needed</option>
            <option value="WORK_IN_PROGRESS">Work in Progress</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="REPORTED">Reported</option>
            <option value="VERIFIED">AI Verified</option>
            <option value="CLOSED">Closed</option>
            <option value="REOPENED">Reopened</option>
          </select>

          {/* Severity Select */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            style={{
              backgroundColor: '#070f24',
              border: '1px solid #273860',
              borderRadius: '8px',
              color: '#cbd5e1',
              padding: '8px 12px',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Priority Select */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{
              backgroundColor: '#070f24',
              border: '1px solid #273860',
              borderRadius: '8px',
              color: '#cbd5e1',
              padding: '8px 12px',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Priorities</option>
            <option value="P1 - Emergency">P1 - Emergency</option>
            <option value="P2 - High Priority">P2 - High Priority</option>
            <option value="P3 - Standard">P3 - Standard</option>
          </select>

          {/* Result Count Pill */}
          <div
            style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#94a3b8',
              backgroundColor: '#070f24',
              border: '1px solid #273860',
              padding: '6px 10px',
              borderRadius: '8px',
              whiteSpace: 'nowrap'
            }}
          >
            {filteredCases.length} / {cases.length}
          </div>
        </div>
      </div>

      {/* Case Data Table (Desktop & Tablet) */}
      <div
        className="hide-on-mobile glass-card"
        style={{
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0b1329', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 18px' }}>Case Dossier</th>
                <th style={{ padding: '12px 18px' }}>Defect &amp; Severity</th>
                <th style={{ padding: '12px 18px' }}>Corridor Location</th>
                <th style={{ padding: '12px 18px' }}>Lifecycle Status</th>
                <th style={{ padding: '12px 18px' }}>Priority</th>
                <th style={{ padding: '12px 18px' }}>Assigned Contractor / Crew</th>
                <th style={{ padding: '12px 18px' }}>SLA Target</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((c) => {
                const sConf = STATUS_CONFIG[c.status] || STATUS_CONFIG.REPORTED;
                const sevConf = SEVERITY_COLORS[c.severity] || SEVERITY_COLORS.Medium;
                const isVerificationPending = c.status === 'VERIFICATION_REQUIRED';

                return (
                  <tr
                    key={c.case_id}
                    onClick={() => handleOpenCase(c)}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      backgroundColor: isVerificationPending ? 'rgba(236, 72, 153, 0.04)' : 'transparent'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#131e3b')}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = isVerificationPending ? 'rgba(236, 72, 153, 0.04)' : 'transparent')
                    }
                  >
                    {/* Case Dossier ID */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: '#38bdf8', fontSize: '13px' }}>{c.case_id}</strong>
                        {c.pothole_id && (
                          <span style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#020617', padding: '1px 5px', borderRadius: '4px', border: '1px solid #334155' }}>
                            {c.pothole_id}
                          </span>
                        )}
                        {c.recurrence_count > 0 && (
                          <span
                            title={`${c.recurrence_count} previous repairs recorded at this spot`}
                            style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              backgroundColor: 'rgba(239, 68, 68, 0.2)',
                              color: '#f87171',
                              padding: '1px 5px',
                              borderRadius: '4px'
                            }}
                          >
                            ⚠️ Recurrent
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Defect & Severity */}
                    <td style={{ padding: '14px 18px' }}>
                      <div>
                        <span style={{ fontWeight: '600', color: '#f8fafc', display: 'block' }}>
                          {c.defect_type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: '3px',
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: sevConf.bg,
                            color: sevConf.text,
                            border: `1px solid ${sevConf.border}`
                          }}
                        >
                          {c.severity}
                        </span>
                      </div>
                    </td>

                    {/* Corridor */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ color: '#cbd5e1' }}>{c.road_name}</div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Ch: {c.exact_chainage_m}m • {c.segment_id}
                      </span>
                    </td>

                    {/* Lifecycle Status */}
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          backgroundColor: sConf.bg,
                          border: `1px solid ${sConf.border}`,
                          color: sConf.text,
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em'
                        }}
                      >
                        {sConf.label}
                      </span>
                    </td>

                    {/* Priority */}
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: c.priority === 'P1 - Emergency' ? '#f87171' : c.priority === 'P2 - High Priority' ? '#fb923c' : '#94a3b8'
                        }}
                      >
                        {c.priority}
                      </span>
                    </td>

                    {/* Contractor / Team */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ color: '#e2e8f0', fontSize: '12px' }}>
                        {c.assigned_contractor || 'Unassigned'}
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {c.assigned_team || 'Pending crew dispatch'}
                      </span>
                    </td>

                    {/* SLA Target */}
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                        {c.target_completion_date || 'Standard 48h'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCase(c);
                        }}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          backgroundColor: isVerificationPending ? '#ec4899' : '#1e293b',
                          color: isVerificationPending ? '#fff' : '#38bdf8',
                          border: isVerificationPending ? 'none' : '1px solid #334155',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {isVerificationPending ? (
                          <>
                            <ShieldCheck size={13} />
                            <span>Verify Scan</span>
                          </>
                        ) : (
                          <>
                            <Eye size={13} />
                            <span>View Dossier</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No municipal defect cases match the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Mobile Cards (Smartphone View) */}
      <div className="show-on-mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredCases.map((c) => {
          const sConf = STATUS_CONFIG[c.status] || STATUS_CONFIG.REPORTED;
          const sevConf = SEVERITY_COLORS[c.severity] || SEVERITY_COLORS.Medium;
          const isVerificationPending = c.status === 'VERIFICATION_REQUIRED';

          return (
            <div
              key={`m-${c.case_id}`}
              onClick={() => handleOpenCase(c)}
              className="glass-card"
              style={{
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                borderLeft: `4px solid ${sConf.border || '#38bdf8'}`
              }}
            >
              {/* Header: ID, Recurrence & Status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ color: '#38bdf8', fontSize: '13px' }}>{c.case_id}</strong>
                  {c.pothole_id && (
                    <span style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#020617', padding: '1px 5px', borderRadius: '4px', border: '1px solid #334155' }}>
                      {c.pothole_id}
                    </span>
                  )}
                  {c.recurrence_count > 0 && (
                    <span style={{ fontSize: '9px', fontWeight: '700', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '1px 4px', borderRadius: '4px' }}>
                      ⚠️ Recurrent
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    backgroundColor: sConf.bg,
                    border: `1px solid ${sConf.border}`,
                    color: sConf.text,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  {sConf.label}
                </span>
              </div>

              {/* Defect & Severity */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '13px' }}>
                  {c.defect_type.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: sevConf.bg,
                    color: sevConf.text,
                    border: `1px solid ${sevConf.border}`
                  }}
                >
                  {c.severity}
                </span>
              </div>

              {/* Road Corridor */}
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                <span style={{ color: '#94a3b8' }}>📍 </span>
                {c.road_name}
                <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
                  Ch: {c.exact_chainage_m}m
                </span>
              </div>

              {/* Contractor & Action footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', marginTop: '2px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {c.assigned_contractor || 'Unassigned'}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCase(c);
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    backgroundColor: isVerificationPending ? '#ec4899' : '#1e293b',
                    color: isVerificationPending ? '#fff' : '#38bdf8',
                    border: isVerificationPending ? 'none' : '1px solid #334155',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {isVerificationPending ? (
                    <>
                      <ShieldCheck size={12} />
                      <span>Verify</span>
                    </>
                  ) : (
                    <>
                      <Eye size={12} />
                      <span>Dossier</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {filteredCases.length === 0 && (
          <div className="glass-card" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
            No municipal defect cases match the selected filter criteria.
          </div>
        )}
      </div>

      {/* Case Detail Modal */}
      {activeModalCase && (
        <CaseDetailModal
          isOpen={Boolean(activeModalCase)}
          onClose={() => setActiveModalCase(null)}
          caseItem={activeModalCase}
          onRefreshCase={handleRefreshSingleCase}
          onRefreshAllData={() => {
            fetchCasesData();
            if (onRefreshAllData) onRefreshAllData();
          }}
        />
      )}
    </div>
  );
}
