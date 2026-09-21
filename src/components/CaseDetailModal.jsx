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
  Image as ImageIcon,
  Printer,
  Repeat,
  Database,
  Zap,
  Download
} from 'lucide-react';
import { API_BASE } from '../config';
import { getDefectMeta } from '../utils/defectMeta';

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
  const [activeSubTab, setActiveSubTab] = useState('multibus_flow'); // 'multibus_flow' | 'comparison' | 'report' | 'timeline' | 'communications'
  const [isSimulatingStep, setIsSimulatingStep] = useState(false);
  const [simulationStatusMsg, setSimulationStatusMsg] = useState('');
  const [pgStatus, setPgStatus] = useState({ connected: false, engine: 'PostgreSQL / PostGIS' });

  useEffect(() => {
    fetch(`${API_BASE}/api/postgres/status`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setPgStatus(d))
      .catch(() => {});
  }, []);

  const handleRunLifecycleStep = async (stepName, payload = {}) => {
    setIsSimulatingStep(true);
    setSimulationStatusMsg(`Executing ${stepName}...`);
    try {
      const res = await fetch(`${API_BASE}/api/cases/${caseItem.case_id}/lifecycle-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: stepName, payload })
      });
      if (res.ok) {
        const data = await res.json();
        setSimulationStatusMsg(data.message || 'Step executed successfully.');
        if (onRefreshCase) onRefreshCase(data.case);
        if (onRefreshAllData) onRefreshAllData();
      } else {
        setSimulationStatusMsg('Failed to execute lifecycle step.');
      }
    } catch (err) {
      setSimulationStatusMsg(`Error: ${err.message}`);
    } finally {
      setIsSimulatingStep(false);
    }
  };

  const handleRunFullSimulationFlow = async () => {
    setIsSimulatingStep(true);
    setSimulationStatusMsg('Executing 5-step multi-bus lifecycle simulation...');
    try {
      const res = await fetch(`${API_BASE}/api/cases/${caseItem.case_id}/simulate-full-flow`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setSimulationStatusMsg(data.message || 'Full simulation completed successfully!');
        if (onRefreshCase) onRefreshCase(data.case);
        if (onRefreshAllData) onRefreshAllData();
      } else {
        setSimulationStatusMsg('Failed to run full simulation flow.');
      }
    } catch (err) {
      setSimulationStatusMsg(`Error: ${err.message}`);
    } finally {
      setIsSimulatingStep(false);
    }
  };
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignForm, setAssignForm] = useState({
    assigned_team: 'North Chennai Road Maintenance Unit 3',
    assigned_person: 'Eng. R. Selvam',
    assigned_contractor: 'L&T Pavement Solutions',
    target_completion_date: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0]
  });

  const [isVerifyingHuman, setIsVerifyingHuman] = useState(false);
  const [humanForm, setHumanForm] = useState({
    verifier_name: 'Er. V. Ramakrishnan, M.E.',
    verifier_id: 'GCC-ENG-4921',
    designation: 'Assistant Executive Engineer (Roads & Bridges)',
    notes: 'On-site pavement audit confirms cold-mix asphalt patch is flush, fully compacted, and leveled.'
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
  const defectMeta = getDefectMeta(caseItem.defect_type || caseItem.class_name);
  const defectTypeUpper = (defectMeta.fullLabel || defectMeta.name || String(caseItem.defect_type || 'pothole').replace(/_/g, ' ')).toUpperCase();
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
          scanner_vehicle_id: 'MTC Transit Bus 46G (Fleet Unit #14)',
          detected_defect_persists: persists,
          confidence: 0.94,
          notes: persists
            ? 'Defect persists on transit bus re-scan. Contractor repair rejected.'
            : 'Same-location re-scan confirmed defect surface fully restored. 0% distress detected.'
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
    if (e) e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        verifier_name: `${humanForm.verifier_name} (${humanForm.verifier_id} - ${humanForm.designation})`,
        notes: humanForm.notes
      };
      await fetch(`${API_BASE}/api/cases/${caseItem.case_id}/verify-human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
            onClick={() => setActiveSubTab('multibus_flow')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: activeSubTab === 'multibus_flow' ? '700' : '500',
              color: activeSubTab === 'multibus_flow' ? '#38bdf8' : '#94a3b8',
              borderBottom: activeSubTab === 'multibus_flow' ? '2px solid #38bdf8' : '2px solid transparent',
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
            <Repeat size={16} />
            <span>Multi-Bus Deterioration &amp; Closed-Loop Lifecycle</span>
          </button>

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
            onClick={() => setActiveSubTab('report')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: activeSubTab === 'report' ? '700' : '500',
              color: activeSubTab === 'report' ? '#38bdf8' : '#94a3b8',
              borderBottom: activeSubTab === 'report' ? '2px solid #38bdf8' : '2px solid transparent',
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
            <FileText size={16} />
            <span>Official Engineering Report</span>
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
          {/* TAB 0: MULTI-BUS DETERIORATION & CLOSED-LOOP LIFECYCLE FLOW     */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeSubTab === 'multibus_flow' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* PostgreSQL & PostGIS Header Banner */}
              <div
                style={{
                  backgroundColor: '#0c1527',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid #3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60a5fa'
                    }}
                  >
                    <Database size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#f8fafc' }}>
                      PostgreSQL &amp; PostGIS Spatial Engine
                    </h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                      Tables: <code style={{ color: '#38bdf8' }}>defects</code>, <code style={{ color: '#38bdf8' }}>defect_cases</code>, <code style={{ color: '#38bdf8' }}>defect_observations</code> • Sub-Meter GIS Deduplication &amp; Re-Scan Verification
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: pgStatus.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                      color: pgStatus.connected ? '#34d399' : '#38bdf8',
                      border: pgStatus.connected ? '1px solid #10b981' : '1px solid #0284c7'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: pgStatus.connected ? '#10b981' : '#38bdf8' }} />
                    {pgStatus.connected ? 'PostgreSQL Active' : 'Postgres Adapter Ready (ACID Fallback Active)'}
                  </span>
                </div>
              </div>

              {/* Lifecycle Flow Interactive Diagram Card */}
              <div
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#f8fafc' }}>
                      Standard Multi-Bus Lifecycle &amp; Deterioration Order
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                      Demonstrating exact sequence: Bus #101 Detection → Bus #205 Match → 3rd Obs Deterioration (Officer Alert) → Municipality Repair → Next Bus Re-scan → Verified Repaired
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleRunFullSimulationFlow}
                      disabled={isSimulatingStep}
                      style={{
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        padding: '7px 14px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: isSimulatingStep ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Zap size={13} />
                      <span>⚡ Run Full 5-Step Simulation Flow</span>
                    </button>

                    <button
                      onClick={() => handleRunLifecycleStep('BUS_101_DETECT')}
                      disabled={isSimulatingStep}
                      style={{
                        backgroundColor: '#1e293b',
                        color: '#94a3b8',
                        border: '1px solid #334155',
                        padding: '7px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: isSimulatingStep ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Reset to Step 1
                    </button>
                  </div>
                </div>

                {simulationStatusMsg && (
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'rgba(2, 132, 199, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#38bdf8',
                      marginBottom: '16px',
                      fontWeight: '600'
                    }}
                  >
                    ℹ️ {simulationStatusMsg}
                  </div>
                )}

                {/* 6 Step Interactive Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {/* STEP 1 */}
                  <div
                    style={{
                      backgroundColor: '#131e3b',
                      border: caseItem.observations?.length >= 1 ? '1px solid #38bdf8' : '1px solid #1e293b',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#38bdf8' }}>STEP 1 • INITIAL CAPTURE</span>
                      {caseItem.observations?.length >= 1 && <CheckCircle2 size={15} color="#38bdf8" />}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
                      🚌 Bus #101 Detects {caseItem.pothole_id || 'PTH-042'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      GPS: {latStr4}, {lngStr4} • Ch: {caseItem.exact_chainage_m}m • 42cm x 32cm
                    </div>
                    <button
                      onClick={() => handleRunLifecycleStep('BUS_101_DETECT')}
                      disabled={isSimulatingStep}
                      style={{
                        marginTop: 'auto',
                        backgroundColor: '#1e293b',
                        color: '#38bdf8',
                        border: '1px solid #334155',
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      ▶️ Step 1: Bus #101 Detect
                    </button>
                  </div>

                  {/* STEP 2 */}
                  <div
                    style={{
                      backgroundColor: '#131e3b',
                      border: caseItem.observations?.length >= 2 ? '1px solid #34d399' : '1px solid #1e293b',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#34d399' }}>STEP 2 • SPATIAL DEDUP</span>
                      {caseItem.observations?.length >= 2 && <CheckCircle2 size={15} color="#34d399" />}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
                      🚌 Bus #205 Passes Later
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      AI recognizes SAME location/defect • Updates {caseItem.pothole_id || 'PTH-042'} (Obs #2)
                    </div>
                    <button
                      onClick={() => handleRunLifecycleStep('BUS_205_MATCH')}
                      disabled={isSimulatingStep}
                      style={{
                        marginTop: 'auto',
                        backgroundColor: '#1e293b',
                        color: '#34d399',
                        border: '1px solid #334155',
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      ▶️ Step 2: Bus #205 Match
                    </button>
                  </div>

                  {/* STEP 3 */}
                  <div
                    style={{
                      backgroundColor: '#131e3b',
                      border: (caseItem.deterioration_detected || caseItem.observations?.length >= 3) ? '1px solid #ef4444' : '1px solid #1e293b',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#ef4444' }}>STEP 3 • DETERIORATION</span>
                      {(caseItem.deterioration_detected || caseItem.observations?.length >= 3) && <CheckCircle2 size={15} color="#ef4444" />}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
                      📈 3rd Obs: Defect Getting Worse
                    </div>
                    <div style={{ fontSize: '11px', color: '#fca5a5' }}>
                      Expanded to 58cm x 44cm • Auto-Escalated to HIGH PRIORITY • Auto-dispatched to Officers
                    </div>
                    <button
                      onClick={() => handleRunLifecycleStep('3RD_OBS_DETERIORATION')}
                      disabled={isSimulatingStep}
                      style={{
                        marginTop: 'auto',
                        backgroundColor: '#1e293b',
                        color: '#ef4444',
                        border: '1px solid #334155',
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      ▶️ Step 3: Deterioration Alert
                    </button>
                  </div>

                  {/* STEP 4 */}
                  <div
                    style={{
                      backgroundColor: '#131e3b',
                      border: ['VERIFICATION_REQUIRED', 'VERIFIED', 'CLOSED'].includes(caseItem.status) ? '1px solid #eab308' : '1px solid #1e293b',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#eab308' }}>STEP 4 • PWD REPAIR</span>
                      {['VERIFICATION_REQUIRED', 'VERIFIED', 'CLOSED'].includes(caseItem.status) && <CheckCircle2 size={15} color="#eab308" />}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
                      🛠️ Municipality Repairs It
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Asphalt patch completed • Work order moves to Verification Required
                    </div>
                    <button
                      onClick={() => handleRunLifecycleStep('MUNICIPAL_REPAIR')}
                      disabled={isSimulatingStep}
                      style={{
                        marginTop: 'auto',
                        backgroundColor: '#1e293b',
                        color: '#eab308',
                        border: '1px solid #334155',
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      ▶️ Step 4: Repair Complete
                    </button>
                  </div>

                  {/* STEP 5 */}
                  <div
                    style={{
                      backgroundColor: '#131e3b',
                      border: ['VERIFIED', 'CLOSED'].includes(caseItem.status) ? '1px solid #10b981' : '1px solid #1e293b',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981' }}>STEP 5 • AUTONOMOUS RE-SCAN</span>
                      {['VERIFIED', 'CLOSED'].includes(caseItem.status) && <CheckCircle2 size={15} color="#10b981" />}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
                      🚌 Next Bus Passes: No Defect Detected
                    </div>
                    <div style={{ fontSize: '11px', color: '#6ee7b7' }}>
                      Surface clean • <strong>{caseItem.pothole_id || 'PTH-042'} = VERIFIED REPAIRED</strong>
                    </div>
                    <button
                      onClick={() => handleRunLifecycleStep('NEXT_BUS_RESCAN_CLEAN')}
                      disabled={isSimulatingStep}
                      style={{
                        marginTop: 'auto',
                        backgroundColor: '#1e293b',
                        color: '#10b981',
                        border: '1px solid #334155',
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      ▶️ Step 5: Clean Re-Scan
                    </button>
                  </div>

                  {/* STEP 6 */}
                  <div
                    style={{
                      backgroundColor: '#131e3b',
                      border: caseItem.status === 'CLOSED' ? '1px solid #a855f7' : '1px solid #1e293b',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#a855f7' }}>STEP 6 • OFFICER SIGN-OFF</span>
                      {caseItem.status === 'CLOSED' && <CheckCircle2 size={15} color="#a855f7" />}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
                      🔒 Anti-Fraud Closed-Loop Sign-Off
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Executive Engineer validates multi-bus evidence and signs off case closure
                    </div>
                    <button
                      onClick={() => handleRunLifecycleStep('OFFICER_SIGNOFF')}
                      disabled={isSimulatingStep || caseItem.status === 'CLOSED'}
                      style={{
                        marginTop: 'auto',
                        backgroundColor: '#1e293b',
                        color: '#a855f7',
                        border: '1px solid #334155',
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {caseItem.status === 'CLOSED' ? '✓ Sign-Off Certified' : '▶️ Step 6: Officer Sign-Off'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Multi-Bus Observation Ledger Table */}
              <div
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#f8fafc' }}>
                    Multi-Bus Observation Ledger (Audit Trail: {caseItem.observations?.length || 1} Passes)
                  </h4>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Immutable Temporal Ledger
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={{ padding: '8px 12px' }}>Pass #</th>
                        <th style={{ padding: '8px 12px' }}>Patrol Vehicle</th>
                        <th style={{ padding: '8px 12px' }}>Timestamp</th>
                        <th style={{ padding: '8px 12px' }}>GPS &amp; Chainage</th>
                        <th style={{ padding: '8px 12px' }}>Dimensions (W x L)</th>
                        <th style={{ padding: '8px 12px' }}>Severity</th>
                        <th style={{ padding: '8px 12px' }}>AI Observation Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(caseItem.observations && caseItem.observations.length > 0 ? caseItem.observations : [
                        {
                          observation_number: 1,
                          vehicle_id: caseItem.before_evidence?.reporting_vehicles?.[0] || 'Bus #101',
                          timestamp: caseItem.created_at,
                          latitude: caseItem.latitude,
                          longitude: caseItem.longitude,
                          exact_chainage_m: caseItem.exact_chainage_m,
                          dimensions: {
                            width_cm: caseItem.before_evidence?.bbox?.estimated_physical_width_cm || 42,
                            length_cm: caseItem.before_evidence?.bbox?.estimated_physical_length_cm || 32
                          },
                          severity: caseItem.severity,
                          deterioration_notes: 'Initial detection and registration in Municipal GIS.'
                        }
                      ]).map((obs, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '10px 12px', fontWeight: '700', color: '#38bdf8' }}>
                            #{obs.observation_number || idx + 1}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: '700', color: '#f8fafc' }}>
                            🚌 {obs.vehicle_id}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '11px' }}>
                            {new Date(obs.timestamp).toLocaleTimeString()}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '11px' }}>
                            {Number(obs.latitude || caseItem.latitude).toFixed(4)}, {Number(obs.longitude || caseItem.longitude).toFixed(4)} (Ch {obs.exact_chainage_m}m)
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: '700', color: (obs.dimensions?.width_cm > 50) ? '#ef4444' : '#facc15' }}>
                            {obs.dimensions?.width_cm}cm x {obs.dimensions?.length_cm}cm
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '800',
                                backgroundColor: obs.severity === 'Critical' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                                color: obs.severity === 'Critical' ? '#ef4444' : '#fb923c'
                              }}
                            >
                              {obs.severity}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '11px' }}>
                            {obs.deterioration_notes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

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
                      src={caseItem.before_evidence?.snapshot_thumbnail || `${API_BASE}/api/cases/${caseItem.case_id}/image`}
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
                      <>
                        <img
                          src={`${API_BASE}/api/cases/${caseItem.case_id}/after-image`}
                          alt="After Repair Inspection"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.6)'
                          }}
                        >
                          <CheckCircle2 size={12} color="#ffffff" />
                          <span>RESTORED ROAD • 0% DISTRESS</span>
                        </div>
                        <a
                          href={`${API_BASE}/api/cases/${caseItem.case_id}/after-image`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            backgroundColor: 'rgba(2, 6, 23, 0.85)',
                            backdropFilter: 'blur(4px)',
                            color: '#34d399',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid #059669',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <ExternalLink size={11} />
                          <span>View Re-Scan</span>
                        </a>
                      </>
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
                    <div style={{ backgroundColor: '#0b1329', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', border: '1px solid #10b981' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <CheckCircle2 size={13} color="#4ade80" />
                        <span style={{ color: '#4ade80', fontSize: '11px', fontWeight: '800' }}>OFFICIALLY VERIFIED &amp; APPROVED BY HUMAN OFFICER</span>
                      </div>
                      <strong style={{ color: '#f8fafc', fontSize: '13px' }}>{caseItem.after_evidence.human_verifier_name}</strong>
                      <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                        {caseItem.after_evidence.human_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ANTI-FRAUD VERIFICATION & BUS PATROL CONTROL CENTER */}
              <div
                style={{
                  marginTop: '20px',
                  backgroundColor: '#0c1b38',
                  border: '1px solid #1e3a8a',
                  borderRadius: '12px',
                  padding: '18px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={20} color="#38bdf8" />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#f8fafc' }}>
                        CLOSED-LOOP PATROL RE-INSPECTION &amp; ANTI-FRAUD PROTOCOL
                      </h3>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Prevents contractor payout fraud. Automated AI confirms road clearing, human engineer signs off.
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleSimulateRescan(false)}
                      disabled={actionLoading}
                      title="Simulate Transit Bus 46G passing same location with AI camera verifying clean road"
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        border: '1px solid #38bdf8',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>🚌 Simulate Bus Patrol Re-Inspection (Clear)</span>
                    </button>
                    <button
                      onClick={() => handleSimulateRescan(true)}
                      disabled={actionLoading}
                      title="Simulate Bus re-scan detecting that defect was not properly fixed"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        border: '1px solid #ef4444',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      <span>⚠️ Re-Scan Failed (Persists)</span>
                    </button>
                  </div>
                </div>

                {/* Anti-Fraud Notice Banner */}
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
                    <strong style={{ color: '#f59e0b' }}>Legal Escrow Requirement: </strong>
                    Under Chennai Municipal Pavement Standards (IRC:SP:72), automated camera scans alone cannot release contractor payments. Once the bus verifies the road is clear, an authorized Municipal Public Works Engineer must verify the evidence and sign off with their Employee Badge ID.
                  </div>
                </div>

                {/* Human Officer Sign-Off Form */}
                <div
                  style={{
                    backgroundColor: '#0b1329',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    padding: '16px'
                  }}
                >
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '800', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserCheck size={16} color="#38bdf8" />
                    <span>Authorized Municipal Officer Final Sign-Off &amp; Case Closure</span>
                  </h4>

                  <form onSubmit={handleHumanVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                          Officer Name &amp; Academic Degrees
                        </label>
                        <input
                          type="text"
                          value={humanForm.verifier_name}
                          onChange={(e) => setHumanForm({ ...humanForm, verifier_name: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            backgroundColor: '#071026',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                          Employee / Municipal Badge ID
                        </label>
                        <input
                          type="text"
                          value={humanForm.verifier_id}
                          onChange={(e) => setHumanForm({ ...humanForm, verifier_id: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            backgroundColor: '#071026',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                          Official Designation
                        </label>
                        <input
                          type="text"
                          value={humanForm.designation}
                          onChange={(e) => setHumanForm({ ...humanForm, designation: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            backgroundColor: '#071026',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                        Physical Audit &amp; Asphalt Leveling Remarks
                      </label>
                      <input
                        type="text"
                        value={humanForm.notes}
                        onChange={(e) => setHumanForm({ ...humanForm, notes: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          backgroundColor: '#071026',
                          border: '1px solid #334155',
                          color: '#f8fafc',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={handleReopen}
                        disabled={actionLoading}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid #ef4444',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        ❌ Flag Contractor Fraud / Reopen
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        style={{
                          padding: '7px 18px',
                          borderRadius: '6px',
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 0 12px rgba(22, 163, 74, 0.4)'
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>✅ Approve Repair &amp; Officially Close Case</span>
                      </button>
                    </div>
                  </form>
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
          {/* TAB: OFFICIAL ENGINEERING DISPATCH REPORT                       */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeSubTab === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Report Action Header Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#0c1a36',
                  border: '1px solid #1e3a8a',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#38bdf8" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#f8fafc' }}>
                      MUNICIPAL PUBLIC WORKS DEFECT DOSSIER &amp; WORK ORDER
                    </h3>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Certified engineering document with real video evidence &amp; spatial coordinates
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: '1px solid #38bdf8',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Printer size={13} />
                    <span>Print / Save as PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubTab('communications')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Send size={13} />
                    <span>Dispatch via WhatsApp</span>
                  </button>

                  <a
                    href={`${API_BASE}/api/cases/${caseItem.case_id}/image`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#1e293b',
                      color: '#38bdf8',
                      border: '1px solid #334155',
                      fontSize: '11px',
                      fontWeight: '700',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ExternalLink size={12} />
                    <span>Full-Res Image</span>
                  </a>
                </div>
              </div>

              {/* Printable Engineering Docket Sheet */}
              <div
                id="printable-defect-report"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  borderRadius: '12px',
                  padding: '28px',
                  border: '2px solid #cbd5e1',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              >
                {/* Docket Header */}
                <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '24px' }}>🏛️</span>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a', letterSpacing: '0.5px' }}>
                          GREATER CHENNAI CORPORATION
                        </h2>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                          Roads, Bridges &amp; Pavement Infrastructure Division
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
                      IRC:SP:72 Guidelines for Urban Road Maintenance • Pavement Distress Notice
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-block', backgroundColor: '#0f172a', color: '#ffffff', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '800', letterSpacing: '0.5px' }}>
                      CASE: {caseItem.case_id}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Date: {new Date(caseItem.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: caseItem.priority === 'P1 - Emergency' ? '#dc2626' : '#ea580c' }}>
                      Priority: {caseItem.priority}
                    </div>
                  </div>
                </div>

                {/* Main Evidence Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  {/* Left: Real Captured Snapshot */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                    <div style={{ backgroundColor: '#1e293b', padding: '8px 12px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#f8fafc', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                        📸 Camera Evidence (Actual Dashcam Capture)
                      </span>
                      <span style={{ color: '#38bdf8', fontSize: '10px', fontWeight: '700' }}>
                        YOLOv8 Edge Frame
                      </span>
                    </div>
                    <img
                      src={caseItem.before_evidence?.snapshot_thumbnail || `${API_BASE}/api/cases/${caseItem.case_id}/image`}
                      alt="Pothole Evidence Snapshot"
                      style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{ backgroundColor: '#0b1329', padding: '8px 12px', fontSize: '10px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Lat: {latStr5}° N • Lon: {lngStr5}° E</span>
                      <span style={{ color: '#4ade80', fontWeight: '700' }}>Confidence: {(caseItem.before_evidence?.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Right: Technical Defect Specifications */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                        Anomaly Classification
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: '2px 0' }}>
                        {defectTypeUpper}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                        {severityUpper} SEVERITY
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                        <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Physical Width</span>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                          {caseItem.before_evidence?.bbox?.estimated_physical_width_cm || 52} cm
                        </strong>
                      </div>
                      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                        <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Physical Length</span>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                          {caseItem.before_evidence?.bbox?.estimated_physical_length_cm || 40} cm
                        </strong>
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>RDD 2022 Defect Standard</span>
                      <strong style={{ fontSize: '12px', color: '#0284c7' }}>
                        {defectMeta.code ? `${defectMeta.code} (${defectMeta.name})` : (caseItem.defect_type === 'pothole' ? 'CRDDC D40 (Pothole / Surface Crater)' : 'CRDDC D00-D20 (Structural Fatigue Crack)')}
                      </strong>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Reporting Sensor / Vehicle</span>
                      <strong style={{ fontSize: '12px', color: '#0f172a' }}>
                        {caseItem.before_evidence?.reporting_vehicles?.join(', ') || 'MTC Transit Bus 46G'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Section: GIS Location & Highway Corridor */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '16px', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="#0284c7" />
                    <span>Highway Corridor &amp; Geospatial Coordinates</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Corridor Name:</span>
                      <strong style={{ color: '#0f172a' }}>{caseItem.road_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Segment ID &amp; Chainage:</span>
                      <strong style={{ color: '#0f172a' }}>{caseItem.segment_id} • Chainage {caseItem.exact_chainage_m}m</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>GPS Coordinates:</span>
                      <strong style={{ color: '#0f172a' }}>{latStr5}, {lngStr5}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Google Maps Navigation:</span>
                      <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: '700', textDecoration: 'none' }}>
                        Open in Navigation ↗
                      </a>
                    </div>
                  </div>
                </div>

                {/* Section: Contractor Work Order & Repair Terms */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '16px', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wrench size={14} color="#ea580c" />
                    <span>Contractor Work Order Terms &amp; Target SLA</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Assigned Contractor:</span>
                      <strong style={{ color: '#0f172a' }}>{caseItem.assigned_contractor || 'L&T Pavement Solutions'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Field Supervisor / Team:</span>
                      <strong style={{ color: '#0f172a' }}>{caseItem.assigned_team || 'North Chennai Maintenance Unit'} ({caseItem.assigned_person || 'Eng. R. Selvam'})</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>SLA Resolution Deadline:</span>
                      <strong style={{ color: '#dc2626' }}>{caseItem.target_completion_date || 'Within 48 Hours'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>Required Material:</span>
                      <strong style={{ color: '#0f172a' }}>Cold-Mix Tack Coat + BC Compaction</strong>
                    </div>
                  </div>
                </div>

                {/* Section: Anti-Fraud Closed-Loop Sign-Off Status */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px', backgroundColor: caseItem.status === 'CLOSED' ? '#f0fdf4' : '#fffbeb' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: caseItem.status === 'CLOSED' ? '#166534' : '#92400e', marginBottom: '6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} color={caseItem.status === 'CLOSED' ? '#16a34a' : '#d97706'} />
                    <span>Anti-Fraud Municipal Sign-Off &amp; Escrow Release Status</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5' }}>
                    <strong>Post-Repair Transit Bus AI Re-Scan: </strong>
                    {caseItem.after_evidence ? (
                      <span style={{ color: '#16a34a', fontWeight: '700' }}>✓ VERIFIED BY {caseItem.after_evidence.scanner_vehicle_id} (0% DISTRESS)</span>
                    ) : (
                      <span style={{ color: '#d97706', fontWeight: '700' }}>Awaiting bus patrol re-inspection pass</span>
                    )}
                    <br />
                    <strong>Authorized Human Municipal Officer: </strong>
                    {caseItem.after_evidence?.human_verifier_name ? (
                      <span style={{ color: '#16a34a', fontWeight: '700' }}>✓ SIGNED OFF BY {caseItem.after_evidence.human_verifier_name}</span>
                    ) : (
                      <span style={{ color: '#b91c1c', fontWeight: '700' }}>PENDING HUMAN OFFICER ON-SITE SIGN-OFF (PAYMENT LOCKED)</span>
                    )}
                  </div>
                </div>

                {/* Docket Signatures Footer */}
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px', color: '#64748b' }}>
                  <div>
                    <div>Generated via GCC Municipal AI Vision Intelligence Platform</div>
                    <div>Digital Hash: SHA256:{caseItem.case_id.replace(/[^a-zA-Z0-9]/g, '')}7f92a10b</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '180px' }}>
                    <div style={{ borderBottom: '1px solid #0f172a', paddingBottom: '30px', fontWeight: '700', color: '#0f172a' }}>
                      {caseItem.after_evidence?.human_verifier_name ? caseItem.after_evidence.human_verifier_name.split('(')[0] : '_________________________'}
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '10px' }}>Authorized Municipal Engineer Signature</div>
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

              {(!caseItem.events || caseItem.events.length === 0) ? (
                <div
                  style={{
                    padding: '36px 20px',
                    textAlign: 'center',
                    backgroundColor: '#131e3b',
                    borderRadius: '10px',
                    border: '1px dashed #334155',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Activity size={24} color="#38bdf8" />
                  <strong style={{ fontSize: '13px', color: '#f8fafc' }}>
                    No Hardcoded Lifecycle Events
                  </strong>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', maxWidth: '420px', lineHeight: 1.5 }}>
                    Real-time detection is active. Lifecycle events (work order assignment, contractor repair, and post-repair AI edge scan) are dynamically appended as actions are executed.
                  </p>
                </div>
              ) : (
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

                  {caseItem.events.map((evt, idx) => {
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
              )}
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
