import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  UserCheck,
  Wrench,
  RotateCcw,
  Smartphone,
  ShieldCheck,
  MapPin,
  Calendar,
  Layers,
  FileText,
  Activity,
  User,
  ArrowRight,
  Sparkles,
  Users,
  ExternalLink,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { API_BASE } from '../config';

const STATUS_COLORS = {
  DETECTED: { bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8', text: '#38bdf8' },
  REPORTED: { bg: 'rgba(99, 102, 241, 0.15)', border: '#6366f1', text: '#818cf8' },
  ACKNOWLEDGED: { bg: 'rgba(234, 179, 8, 0.15)', border: '#eab308', text: '#fde047' },
  ASSIGNED: { bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316', text: '#fb923c' },
  WORK_IN_PROGRESS: { bg: 'rgba(234, 88, 12, 0.15)', border: '#ea580c', text: '#fdba74' },
  REPAIR_COMPLETED: { bg: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', text: '#c084fc' },
  VERIFICATION_REQUIRED: { bg: 'rgba(236, 72, 153, 0.18)', border: '#ec4899', text: '#f472b6' },
  VERIFIED: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#34d399' },
  CLOSED: { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#4ade80' },
  REOPENED: { bg: 'rgba(239, 68, 68, 0.18)', border: '#ef4444', text: '#f87171' },
};

const SEVERITY_COLORS = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#22c55e'
};

export default function CaseDetailModal({
  isOpen,
  onClose,
  caseItem,
  onRefreshCase,
  onRefreshAllData
}) {
  const [activeSubTab, setActiveSubTab] = useState('comparison'); // 'comparison' | 'timeline' | 'communications'
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignForm, setAssignForm] = useState({
    assigned_team: 'North Chennai Road Maintenance Unit 3',
    assigned_person: 'Eng. R. Selvam',
    assigned_contractor: 'L&T Pavement Solutions',
    target_completion_date: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0]
  });

  const [isVerifyingHuman, setIsVerifyingHuman] = useState(false);
  const [humanForm, setHumanForm] = useState({
    verifier_name: 'Chief Eng. V. Ramakrishnan (Greater Chennai Corp)',
    notes: 'On-site pavement audit confirms cold-mix patch is flush and properly compacted.'
  });

  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsappForm, setWhatsappForm] = useState({
    sender: '+91 98400 00000',
    recipient: '+91 98400 12345',
    custom_message: ''
  });
  const [whatsappResult, setWhatsappResult] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch(`${API_BASE}/api/alerts/config`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data && (data.whatsapp_sender || data.whatsapp_recipient)) {
            setWhatsappForm((prev) => ({
              ...prev,
              sender: data.whatsapp_sender || prev.sender,
              recipient: data.whatsapp_recipient || prev.recipient
            }));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !caseItem) return null;

  const statusStyle = STATUS_COLORS[caseItem.status] || STATUS_COLORS.REPORTED;
  const sevColor = SEVERITY_COLORS[caseItem.severity] || '#38bdf8';

  const latNum = typeof caseItem.latitude === 'number' ? caseItem.latitude : Number(caseItem.latitude) || 13.0827;
  const lngNum = typeof caseItem.longitude === 'number' ? caseItem.longitude : Number(caseItem.longitude) || 80.2707;
  const latStr5 = latNum.toFixed(5);
  const lngStr5 = lngNum.toFixed(5);
  const latStr4 = latNum.toFixed(4);
  const lngStr4 = lngNum.toFixed(4);
  const mapsUrl = `https://maps.google.com/?q=${latStr5},${lngStr5}`;
  const defectTypeUpper = String(caseItem.defect_type || 'pothole').replace(/_/g, ' ').toUpperCase();
  const severityUpper = String(caseItem.severity || 'Medium').toUpperCase();

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleAcknowledge = async () => {
    setActionLoading(true);
    try {
      await fetch(`${API_BASE}/api/cases/${caseItem.case_id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'GCC Operations Room' })
      });
      onRefreshCase(caseItem.case_id);
      if (onRefreshAllData) onRefreshAllData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await fetch(`${API_BASE}/api/cases/${caseItem.case_id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...assignForm, actor: 'Works Division Superintendent' })
      });
      setIsAssigning(false);
      onRefreshCase(caseItem.case_id);
      if (onRefreshAllData) onRefreshAllData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartWork = async () => {
    setActionLoading(true);
    try {
      await fetch(`${API_BASE}/api/cases/${caseItem.case_id}/start-work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: caseItem.assigned_person || 'Field Supervisor' })
      });
      onRefreshCase(caseItem.case_id);
      if (onRefreshAllData) onRefreshAllData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRepairComplete = async () => {
    setActionLoading(true);
    try {
      await fetch(`${API_BASE}/api/cases/${caseItem.case_id}/repair-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: caseItem.assigned_person || 'Field Contractor' })
      });
      onRefreshCase(caseItem.case_id);
      if (onRefreshAllData) onRefreshAllData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateRescan = async (persists = false) => {
    setActionLoading(true);
    try {
      await fetch(`${API_BASE}/api/cases/${caseItem.case_id}/verify-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanner_vehicle_id: 'V001 (Inspection Van)',
          detected_defect_persists: persists,
          confidence: 0.92,
          notes: persists
            ? 'Defect still detected on re-scan. Discrepancy logged.'
            : 'Same-location re-scan confirmed defect surface restored.'
        })
      });
      onRefreshCase(caseItem.case_id);
      if (onRefreshAllData) onRefreshAllData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleHumanVerifySubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await fetch(`${API_BASE}/api/cases/${caseItem.case_id}/verify-human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(humanForm)
      });
      setIsVerifyingHuman(false);
      onRefreshCase(caseItem.case_id);
      if (onRefreshAllData) onRefreshAllData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async () => {
    const reason = window.prompt('Enter reason for reopening case:', 'Post-repair audit identified uneven pavement or recurring crater.');
    if (!reason) return;
    setActionLoading(true);
    try {
      await fetch(`${API_BASE}/api/cases/${caseItem.case_id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, actor: 'Audit Engineer' })
      });
      onRefreshCase(caseItem.case_id);
      if (onRefreshAllData) onRefreshAllData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendWhatsApp = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/cases/${caseItem.case_id}/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsappForm)
      });
      const data = await res.json();
      setWhatsappResult(data);
      onRefreshCase(caseItem.case_id);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1020px',
          maxHeight: '92vh',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Activity size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
                  {caseItem.case_id}
                </h2>
                {caseItem.pothole_id && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#1e293b',
                      color: '#94a3b8',
                      border: '1px solid #334155'
                    }}
                  >
                    Track: {caseItem.pothole_id}
                  </span>
                )}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    backgroundColor: statusStyle.bg,
                    border: `1px solid ${statusStyle.border}`,
                    color: statusStyle.text,
                    textTransform: 'uppercase'
                  }}
                >
                  {caseItem.status.replace(/_/g, ' ')}
                </span>
                {caseItem.recurrence_count > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid #ef4444',
                      color: '#f87171'
                    }}
                  >
                    ⚠️ Recurrent ({caseItem.recurrence_count}x)
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>{caseItem.road_name} • Chainage {caseItem.exact_chainage_m}m • Severity:{' '}
                <strong style={{ color: sevColor }}>{caseItem.severity}</strong></span>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#38bdf8',
                    textDecoration: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '1px 7px',
                    borderRadius: '4px'
                  }}
                  title="Open exact pothole coordinates in Google Maps"
                >
                  <MapPin size={11} color="#38bdf8" />
                  <span>Google Maps</span>
                  <ExternalLink size={10} color="#38bdf8" />
                </a>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Sub-Tabs Bar */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #1e293b',
            backgroundColor: '#0c152e',
            padding: '0 24px',
            gap: '8px'
          }}
        >
          <button
            onClick={() => setActiveSubTab('comparison')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: activeSubTab === 'comparison' ? '700' : '500',
              color: activeSubTab === 'comparison' ? '#38bdf8' : '#94a3b8',
              borderBottom: activeSubTab === 'comparison' ? '2px solid #38bdf8' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShieldCheck size={16} />
            <span>Before &amp; After Verification</span>
          </button>

          <button
            onClick={() => setActiveSubTab('timeline')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: activeSubTab === 'timeline' ? '700' : '500',
              color: activeSubTab === 'timeline' ? '#38bdf8' : '#94a3b8',
              borderBottom: activeSubTab === 'timeline' ? '2px solid #38bdf8' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={16} />
            <span>Lifecycle Timeline ({caseItem.events?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('communications')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: activeSubTab === 'communications' ? '700' : '500',
              color: activeSubTab === 'communications' ? '#38bdf8' : '#94a3b8',
              borderBottom: activeSubTab === 'communications' ? '2px solid #38bdf8' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Smartphone size={16} />
            <span>WhatsApp &amp; Alerts ({caseItem.communications?.length || 0})</span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 1: BEFORE & AFTER VISUAL VERIFICATION                      */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeSubTab === 'comparison' && (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: '20px'
                }}
              >
                {/* BEFORE REPAIR CARD */}
                <div
                  style={{
                    backgroundColor: '#131e3b',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#ef4444'
                        }}
                      />
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#f8fafc', textTransform: 'uppercase' }}>
                        Before Repair (Initial AI Detection)
                      </h3>
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {new Date(caseItem.before_evidence?.detected_at || caseItem.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Real Captured Frame or High-Res AI Evidence Canvas */}
                  <div
                    style={{
                      height: '200px',
                      backgroundColor: '#0a0f1d',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <img
                      src={`${API_BASE}/api/cases/${caseItem.case_id}/image`}
                      alt={`Defect ${caseItem.case_id}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <a
                      href={`${API_BASE}/api/cases/${caseItem.case_id}/image`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        backgroundColor: 'rgba(2, 6, 23, 0.8)',
                        backdropFilter: 'blur(4px)',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #334155',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Open full resolution image in new tab"
                    >
                      <ExternalLink size={11} />
                      <span>Full Resolution</span>
                    </a>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '10px',
                        fontSize: '10px',
                        color: '#94a3b8',
                        backgroundColor: 'rgba(2, 6, 23, 0.8)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      Lat: {caseItem.latitude.toFixed(5)} • Lon: {caseItem.longitude.toFixed(5)}
                    </div>
                  </div>

                  {/* Metadata Specs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div style={{ backgroundColor: '#0b1329', padding: '8px 12px', borderRadius: '6px' }}>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Vision Model</span>
                      <strong style={{ color: '#cbd5e1' }}>{caseItem.before_evidence?.model_version || 'YOLOv8m-road-v1'}</strong>
                    </div>
                    <div style={{ backgroundColor: '#0b1329', padding: '8px 12px', borderRadius: '6px' }}>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Reporting Sensor</span>
                      <strong style={{ color: '#cbd5e1' }}>
                        {caseItem.before_evidence?.reporting_vehicles?.join(', ') || 'MTC Transit Bus'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* AFTER REPAIR CARD */}
                <div
                  style={{
                    backgroundColor: '#131e3b',
                    border: caseItem.after_evidence ? '1px solid #10b981' : '1px dashed #334155',
                    borderRadius: '12px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: caseItem.after_evidence ? '#10b981' : '#64748b'
                        }}
                      />
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#f8fafc', textTransform: 'uppercase' }}>
                        After Repair (Same-Location Re-Scan)
                      </h3>
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {caseItem.after_evidence
                        ? new Date(caseItem.after_evidence.scanned_at).toLocaleString()
                        : 'Awaiting Re-scan'}
                    </span>
                  </div>

                  {/* Canvas for Post-Repair */}
                  <div
                    style={{
                      height: '200px',
                      backgroundColor: '#0a0f1d',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0.15,
                        backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                        backgroundSize: '8px 8px'
                      }}
                    />

                    {caseItem.after_evidence ? (
                      <div
                        style={{
                          width: '180px',
                          height: '120px',
                          border: '2px dashed #10b981',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          borderRadius: '6px',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: '-12px',
                            left: '6px',
                            backgroundColor: '#10b981',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '1px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          RESTORED SURFACE • 0% DISTRESS
                        </span>
                        <CheckCircle2 size={26} color="#34d399" />
                        <p style={{ margin: '6px 0 0 0', fontSize: '11px', fontWeight: '700', color: '#a7f3d0' }}>
                          Pavement Patch Intact
                        </p>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        <Clock size={32} style={{ margin: '0 auto 8px auto', opacity: 0.6 }} />
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>
                          Pending Same-Location Verification
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>
                          Trigger patrol scan or simulation below to verify absence of distress
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Safety Certified Statement Box */}
                  <div
                    style={{
                      backgroundColor: caseItem.after_evidence ? 'rgba(16, 185, 129, 0.1)' : '#0b1329',
                      border: caseItem.after_evidence ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '10px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <ShieldCheck size={14} color={caseItem.after_evidence ? '#34d399' : '#94a3b8'} />
                      <span style={{ fontSize: '11px', fontWeight: '700', color: caseItem.after_evidence ? '#34d399' : '#94a3b8' }}>
                        AI Post-Repair Verification Phrasing:
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', fontStyle: 'italic', color: '#e2e8f0' }}>
                      "{caseItem.after_evidence?.ai_verification_statement || 'Original defect was not detected during post-repair AI inspection'}"
                    </p>
                  </div>

                  {/* Human Sign-Off Summary */}
                  {caseItem.after_evidence?.human_verifier_name && (
                    <div style={{ backgroundColor: '#0b1329', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Human Engineer Sign-Off</span>
                      <strong style={{ color: '#4ade80' }}>{caseItem.after_evidence.human_verifier_name}</strong>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                        {caseItem.after_evidence.human_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Maintenance Assignment & Contractor Information */}
              <div
                style={{
                  marginTop: '20px',
                  backgroundColor: '#131e3b',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  padding: '18px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#f8fafc' }}>
                    MUNICIPAL CONTRACTOR &amp; WORK CREW ASSIGNMENT
                  </h3>
                  {caseItem.status === 'ACKNOWLEDGED' && (
                    <button
                      onClick={() => setIsAssigning(true)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Assign Field Crew
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '12px' }}>
                  <div style={{ backgroundColor: '#0b1329', padding: '10px', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Assigned Contractor</span>
                    <strong style={{ color: '#e2e8f0' }}>{caseItem.assigned_contractor || 'Pending Assignment'}</strong>
                  </div>
                  <div style={{ backgroundColor: '#0b1329', padding: '10px', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Field Team / Supervisor</span>
                    <strong style={{ color: '#e2e8f0' }}>
                      {caseItem.assigned_team ? `${caseItem.assigned_team} (${caseItem.assigned_person || ''})` : 'Pending'}
                    </strong>
                  </div>
                  <div style={{ backgroundColor: '#0b1329', padding: '10px', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>SLA Target Date</span>
                    <strong style={{ color: '#e2e8f0' }}>{caseItem.target_completion_date || 'Standard 48h SLA'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 2: LIFECYCLE TIMELINE                                      */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeSubTab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#f8fafc' }}>
                  Municipal Case Event History &amp; Audit Trail
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Total Events: {caseItem.events?.length || 0}
                </span>
              </div>

              <div style={{ position: 'relative', paddingLeft: '24px' }}>
                {/* Vertical Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    bottom: '10px',
                    left: '7px',
                    width: '2px',
                    backgroundColor: '#1e293b'
                  }}
                />

                {caseItem.events?.map((evt, idx) => {
                  const toColor = STATUS_COLORS[evt.to_status]?.text || '#38bdf8';
                  return (
                    <div
                      key={evt.id || idx}
                      style={{
                        position: 'relative',
                        marginBottom: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      {/* Node Bullet */}
                      <span
                        style={{
                          position: 'absolute',
                          left: '-24px',
                          top: '4px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: '#0f172a',
                          border: `3px solid ${toColor}`,
                          boxShadow: `0 0 8px ${toColor}`
                        }}
                      />

                      <div
                        style={{
                          backgroundColor: '#131e3b',
                          border: '1px solid #1e293b',
                          borderRadius: '8px',
                          padding: '12px 16px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13px', color: '#f8fafc' }}>{evt.action}</strong>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: STATUS_COLORS[evt.to_status]?.bg || 'rgba(56, 189, 248, 0.1)',
                                color: toColor
                              }}
                            >
                              {evt.to_status}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                          {evt.notes || `Case transition logged by ${evt.actor}`}
                        </p>
                        <span style={{ fontSize: '10px', color: '#475569', display: 'block', marginTop: '4px' }}>
                          Actor: {evt.actor}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 3: WHATSAPP & COMMUNICATIONS                               */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeSubTab === 'communications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* WhatsApp Quick Dispatch Form */}
              <div
                style={{
                  backgroundColor: '#131e3b',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  padding: '18px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Smartphone size={18} color="#22c55e" />
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#f8fafc' }}>
                      Dispatch WhatsApp Work Order to Field Team / Friend
                    </h3>
                  </div>
                  <span style={{ fontSize: '11px', color: '#4ade80', backgroundColor: 'rgba(34, 197, 94, 0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                    Direct WhatsApp &amp; Meta API Ready
                  </span>
                </div>

                {/* Captured Evidence Snapshot Banner */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    backgroundColor: '#071026',
                    border: '1px solid #1e293b',
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '16px'
                  }}
                >
                  <img
                    src={`${API_BASE}/api/cases/${caseItem.case_id}/image`}
                    alt="Defect Evidence"
                    style={{
                      width: '120px',
                      height: '75px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '1px solid #334155',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '12px', fontWeight: '800' }}>
                      <Camera size={14} color="#38bdf8" />
                      <span>AI Video Capture Evidence Attached</span>
                    </div>
                    <p style={{ margin: '3px 0 6px 0', fontSize: '11px', color: '#94a3b8' }}>
                      Exact defect image snapshot extracted by YOLOv8 vision engine is included in the dispatch alert for the field engineer.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <a
                        href={`${API_BASE}/api/cases/${caseItem.case_id}/image`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#38bdf8',
                          fontSize: '11px',
                          fontWeight: '700',
                          textDecoration: 'none'
                        }}
                      >
                        <ExternalLink size={11} />
                        <span>View Full Image</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/api/cases/${caseItem.case_id}/image`;
                          navigator.clipboard.writeText(url);
                          alert('Defect image link copied to clipboard!');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#a855f7',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        📋 Copy Image Link
                      </button>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSendWhatsApp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                        Your Number (Sender / Municipal Control)
                      </label>
                      <input
                        type="text"
                        placeholder="+91 98400 00000"
                        value={whatsappForm.sender}
                        onChange={(e) => setWhatsappForm({ ...whatsappForm, sender: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#0b1329',
                          border: '1px solid #334155',
                          color: '#f8fafc',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#4ade80', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                        Friend's Number (Receiver / Field Crew)
                      </label>
                      <input
                        type="text"
                        placeholder="+91 98400 12345"
                        value={whatsappForm.recipient}
                        onChange={(e) => setWhatsappForm({ ...whatsappForm, recipient: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#0b1329',
                          border: '1px solid #334155',
                          color: '#f8fafc',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                      Optional Custom Dispatch Note / Instructions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Urgent repair required before evening peak transit."
                      value={whatsappForm.custom_message}
                      onChange={(e) => setWhatsappForm({ ...whatsappForm, custom_message: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#0b1329',
                        border: '1px solid #334155',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                    />
                  </div>

                  {/* Live WhatsApp Message Preview */}
                  <div
                    style={{
                      backgroundColor: '#071026',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '12px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#94a3b8',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    <div style={{ color: '#22c55e', fontWeight: 'bold', marginBottom: '6px' }}>
                      📱 Live Message Preview (to {whatsappForm.recipient}):
                    </div>
                    {`🏛️ *GCC MUNICIPAL ROAD INTELLIGENCE*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n🚨 *DEFECT CASE ALERT:* ${caseItem.case_id} (${caseItem.pothole_id || "Defect"})\n*Defect Type:* ${defectTypeUpper} [${severityUpper}]\n*Corridor:* ${caseItem.road_name}\n*Location:* Ch ${caseItem.exact_chainage_m}m (${latStr4}, ${lngStr4})\n📍 *Google Maps:* ${mapsUrl}\n🖼️ *Defect Photo:* ${window.location.origin}/api/cases/${caseItem.case_id}/image\n*Status:* ${caseItem.status}\n*Priority:* ${caseItem.priority}\n${caseItem.assigned_team ? `*Crew:* ${caseItem.assigned_team}\n` : ""}${whatsappForm.custom_message ? `*Notes:* ${whatsappForm.custom_message}\n` : ""}*Sender:* ${whatsappForm.sender}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n_Greater Chennai Corporation Pavement Division_`}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Tip: Click "Share to WhatsApp Group" to pick any team group or chat directly.
                    </span>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Direct wa.me WhatsApp Button to Individual Friend */}
                      <button
                        type="button"
                        onClick={() => {
                          const cleanNum = whatsappForm.recipient.replace(/[^0-9]/g, '');
                          const imageLink = `${window.location.origin}/api/cases/${caseItem.case_id}/image`;
                          const previewText = `🏛️ GCC MUNICIPAL ROAD INTELLIGENCE\n🚨 DEFECT CASE ALERT: ${caseItem.case_id} (${caseItem.pothole_id || "Defect"})\nDefect: ${defectTypeUpper} [${severityUpper}]\nRoad: ${caseItem.road_name}\nChainage: ${caseItem.exact_chainage_m}m (${latStr4}, ${lngStr4})\n📍 Google Maps: ${mapsUrl}\n🖼️ Defect Photo: ${imageLink}\nStatus: ${caseItem.status} | Priority: ${caseItem.priority}\n${whatsappForm.custom_message ? `Notes: ${whatsappForm.custom_message}\n` : ""}Sender: ${whatsappForm.sender}`;
                          window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(previewText)}`, '_blank');
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#25D366',
                          color: '#000000',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 0 12px rgba(37, 211, 102, 0.3)'
                        }}
                      >
                        <Smartphone size={14} color="#000" />
                        <span>Send to Friend</span>
                      </button>

                      {/* Share to WhatsApp Group */}
                      <button
                        type="button"
                        onClick={() => {
                          const imageLink = `${window.location.origin}/api/cases/${caseItem.case_id}/image`;
                          const previewText = `🏛️ GCC MUNICIPAL ROAD INTELLIGENCE\n🚨 DEFECT CASE ALERT: ${caseItem.case_id} (${caseItem.pothole_id || "Defect"})\nDefect: ${defectTypeUpper} [${severityUpper}]\nRoad: ${caseItem.road_name}\nChainage: ${caseItem.exact_chainage_m}m (${latStr4}, ${lngStr4})\n📍 Google Maps: ${mapsUrl}\n🖼️ Defect Photo: ${imageLink}\nStatus: ${caseItem.status} | Priority: ${caseItem.priority}\n${whatsappForm.custom_message ? `Notes: ${whatsappForm.custom_message}\n` : ""}Sender: ${whatsappForm.sender}`;
                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(previewText)}`, '_blank');
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#128C7E',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 0 12px rgba(18, 140, 126, 0.35)'
                        }}
                      >
                        <Users size={14} color="#fff" />
                        <span>Share to WhatsApp Group</span>
                      </button>

                      {/* Server Gateway Dispatch */}
                      <button
                        type="submit"
                        disabled={actionLoading}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Send size={14} />
                        <span>{actionLoading ? 'Dispatching...' : 'Dispatch Gateway Alert'}</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* WhatsApp Dispatch Result Box */}
                {whatsappResult && (
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(34, 197, 94, 0.12)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <CheckCircle2 size={16} color="#4ade80" />
                      <strong style={{ color: '#4ade80' }}>
                        WhatsApp Dispatch Successful {whatsappResult.simulated ? '(Demonstration Mode)' : '(Live Meta API)'}
                      </strong>
                    </div>
                    <p style={{ margin: 0, color: '#e2e8f0', fontSize: '11px' }}>
                      Message ID: <code>{whatsappResult.messageId}</code> • Summary: {whatsappResult.summary}
                    </p>
                  </div>
                )}
              </div>

              {/* Communication Logs */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '700', color: '#cbd5e1' }}>
                  Dispatched Communication Audit ({caseItem.communications?.length || 0})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {caseItem.communications?.map((comm) => (
                    <div
                      key={comm.id}
                      style={{
                        backgroundColor: '#131e3b',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: comm.channel === 'whatsapp' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                              color: comm.channel === 'whatsapp' ? '#4ade80' : '#38bdf8',
                              textTransform: 'uppercase'
                            }}
                          >
                            {comm.channel}
                          </span>
                          <strong style={{ color: '#f8fafc' }}>{comm.recipient}</strong>
                        </div>
                        <p style={{ margin: '4px 0 0 0', color: '#94a3b8' }}>{comm.summary}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
                          {new Date(comm.timestamp).toLocaleString()}
                        </span>
                        <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: '700' }}>
                          {comm.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Inline Assignment Modal Drawer */}
          {isAssigning && (
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: '#1e293b',
                border: '1px solid #38bdf8',
                borderRadius: '8px'
              }}
            >
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#38bdf8' }}>
                Assign Municipal Field Repair Crew
              </h4>
              <form onSubmit={handleAssignSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#94a3b8' }}>Assigned Contractor</label>
                  <input
                    type="text"
                    value={assignForm.assigned_contractor}
                    onChange={(e) => setAssignForm({ ...assignForm, assigned_contractor: e.target.value })}
                    style={{ width: '100%', padding: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#94a3b8' }}>Team Name / Division</label>
                  <input
                    type="text"
                    value={assignForm.assigned_team}
                    onChange={(e) => setAssignForm({ ...assignForm, assigned_team: e.target.value })}
                    style={{ width: '100%', padding: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#94a3b8' }}>Site Supervisor / Engineer</label>
                  <input
                    type="text"
                    value={assignForm.assigned_person}
                    onChange={(e) => setAssignForm({ ...assignForm, assigned_person: e.target.value })}
                    style={{ width: '100%', padding: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#94a3b8' }}>Target Completion Date</label>
                  <input
                    type="date"
                    value={assignForm.target_completion_date}
                    onChange={(e) => setAssignForm({ ...assignForm, target_completion_date: e.target.value })}
                    style={{ width: '100%', padding: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAssigning(false)}
                    style={{ padding: '6px 12px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{ padding: '6px 14px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    Confirm Assignment
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Inline Human Sign-Off Drawer */}
          {isVerifyingHuman && (
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: '#1e293b',
                border: '1px solid #22c55e',
                borderRadius: '8px'
              }}
            >
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#4ade80' }}>
                Chief Municipal Engineer Final Sign-Off &amp; Case Closure
              </h4>
              <form onSubmit={handleHumanVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#94a3b8' }}>Certified Engineer Name &amp; Designation</label>
                  <input
                    type="text"
                    value={humanForm.verifier_name}
                    onChange={(e) => setHumanForm({ ...humanForm, verifier_name: e.target.value })}
                    style={{ width: '100%', padding: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#94a3b8' }}>Quality &amp; Durability Inspection Remarks</label>
                  <textarea
                    rows={2}
                    value={humanForm.notes}
                    onChange={(e) => setHumanForm({ ...humanForm, notes: e.target.value })}
                    style={{ width: '100%', padding: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsVerifyingHuman(false)}
                    style={{ padding: '6px 12px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{ padding: '6px 14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    Certify &amp; Close Case
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer Controls (State-Aware Municipal Operator Toolbar) */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #1e293b',
            backgroundColor: '#0b1329',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Operator Lifecycle Actions:</span>
            {caseItem.status === 'REPORTED' && (
              <button
                onClick={handleAcknowledge}
                disabled={actionLoading}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#eab308',
                  color: '#000',
                  fontWeight: '700',
                  fontSize: '11px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Acknowledge Case
              </button>
            )}

            {caseItem.status === 'ACKNOWLEDGED' && (
              <button
                onClick={() => setIsAssigning(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '11px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Assign Field Team
              </button>
            )}

            {caseItem.status === 'ASSIGNED' && (
              <button
                onClick={handleStartWork}
                disabled={actionLoading}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#ea580c',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '11px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Start Work (In Progress)
              </button>
            )}

            {caseItem.status === 'WORK_IN_PROGRESS' && (
              <button
                onClick={handleRepairComplete}
                disabled={actionLoading}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#a855f7',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '11px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Mark Repair Completed → Verification Required
              </button>
            )}

            {caseItem.status === 'VERIFICATION_REQUIRED' && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleSimulateRescan(false)}
                  disabled={actionLoading}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#10b981',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '11px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Simulate Patrol Re-Scan (Defect Absent)
                </button>
                <button
                  onClick={() => handleSimulateRescan(true)}
                  disabled={actionLoading}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid #ef4444',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Simulate Re-Scan (Persisting)
                </button>
              </div>
            )}

            {(caseItem.status === 'VERIFIED' || caseItem.status === 'VERIFICATION_REQUIRED') && (
              <button
                onClick={() => setIsVerifyingHuman(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#16a34a',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '11px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Human Sign-Off &amp; Close
              </button>
            )}

            {caseItem.status === 'CLOSED' && (
              <button
                onClick={handleReopen}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#334155',
                  color: '#f87171',
                  border: '1px solid #ef4444',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Reopen Case
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setActiveSubTab('communications')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Smartphone size={13} />
              <span>WhatsApp Alert</span>
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                border: '1px solid #334155',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
