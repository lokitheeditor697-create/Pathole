import React, { useState } from 'react';
import {
  Layers,
  MapPin,
  Bus,
  BarChart3,
  Video,
  Bell,
  RefreshCw,
  Pause,
  Play,
  Activity,
  RotateCcw,
  ClipboardList,
  HardDrive,
  Radio,
  Download,
  ShieldCheck,
  Lock,
  Unlock,
  X,
  KeyRound,
  AlertCircle,
  Zap,
  Bot,
  Crosshair,
  Globe,
  Shield
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
  onResetDB,
  loading,
  lastRefreshed,
  metrics = {},
  serverStatus = 'connected',
  latencyMs = 12,
  gpsStatus = 'locked',
  gpsDetails,
  onOpenDiagnostics,
  simulatedServerOffline = false,
  simulatedGpsLost = false,
  aiModelMode = 'pothole',
  setAiModelMode = () => {}
}) {
  const isAutonomous = serverStatus === 'autonomous';
  const isServerOnline = (serverStatus === 'connected' || isAutonomous) && !simulatedServerOffline;
  const isGpsLocked = gpsStatus === 'locked' && !simulatedGpsLost;
  const isGpsLost = gpsStatus === 'lost' || simulatedGpsLost;
  const isGpsDegraded = gpsStatus === 'degraded' && !simulatedGpsLost;

  // Admin security modal state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(() => {
    try { return sessionStorage.getItem('gcc_admin_unlocked') === '1'; } catch { return false; }
  });
  const [adminError, setAdminError] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleAdminUnlock = async () => {
    if (!adminKeyInput.trim()) { setAdminError('Enter the admin key to continue.'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/db/reset`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKeyInput.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ _validate_only: true })
      });
      // If 200 or resetted, key was correct
      if (res.ok) {
        sessionStorage.setItem('gcc_admin_unlocked', '1');
        sessionStorage.setItem('gcc_admin_key', adminKeyInput.trim());
        setAdminUnlocked(true);
        setShowAdminModal(false);
        setAdminKeyInput('');
        setAdminError('');
        // Re-trigger the actual desired action
        if (onResetDB) {
          // Admin just unlocked and chose to reset - call it properly
        }
      } else {
        setAdminError('Invalid admin key. Access denied.');
      }
    } catch {
      setAdminError('Connection error. Ensure server is running.');
    }
  };

  const handleAdminReset = () => {
    if (!adminUnlocked) {
      setShowAdminModal(true);
      return;
    }
    onResetDB && onResetDB();
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('gcc_admin_unlocked');
    sessionStorage.removeItem('gcc_admin_key');
    setAdminUnlocked(false);
  };

  const formatTime = (date) => {
    if (!date) return '—';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };


  const navItems = [
    { id: 'LIVE_MONITORING', label: 'Live Monitoring', icon: Video },
    { id: 'ROAD_HEALTH_MAP', label: 'Google Road Map', icon: MapPin },
    { id: 'DEFECT_INVENTORY', label: 'Defect Inventory', icon: Layers },
    { id: 'CASES', label: 'Municipal Cases', icon: ClipboardList, badge: metrics?.pending_verifications },
    { id: 'PATROL_FLEET', label: 'Patrol Fleet', icon: Bus },
    { id: 'AI_PERFORMANCE', label: 'AI Model & Metrics', icon: BarChart3 },
  ];

  return (
    <>
    <header className="app-header">
      {/* ── Tier 1: Brand, Telemetry Capsule & Quick Controls (46px) ────────── */}
      <div className="header-top-row">
        {/* Brand & Identity */}
        <div className="header-brand-group">
          <div className="header-icon-wrapper pulse-glow" style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
            <Activity size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="header-brand-title">
                AI Road Intelligence
              </h1>
              <span style={{
                fontSize: '9px',
                fontWeight: '800',
                letterSpacing: '0.04em',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '1px 6px',
                borderRadius: '9999px',
                textTransform: 'uppercase'
              }}>
                Phase 1 &amp; 2
              </span>
              {lastRefreshed && (
                <span className="hide-on-mobile" style={{ fontSize: '10px', color: '#64748b' }}>
                  • Synced {formatTime(lastRefreshed)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Unified System Telemetry Capsule */}
        <div
          className="header-telemetry-capsule"
          onClick={onOpenDiagnostics}
          title="Click to open Municipal Reliability & Diagnostics Center"
        >
          {/* Server Link Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isAutonomous ? '#38bdf8' : isServerOnline ? '#22c55e' : '#ef4444',
                boxShadow: isAutonomous ? '0 0 6px #38bdf8' : isServerOnline ? '0 0 6px #22c55e' : '0 0 6px #ef4444'
              }}
              className={!isServerOnline ? 'animate-ping' : ''}
            />
            <span style={{ color: isServerOnline ? '#cbd5e1' : '#f87171' }}>
              {isAutonomous ? 'Edge AI' : isServerOnline ? 'Server' : 'Offline'}
            </span>
            <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
              {isServerOnline ? `${latencyMs}ms` : 'FAIL'}
            </span>
          </div>

          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

          {/* GPS Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Radio size={11} color={isGpsLocked ? '#38bdf8' : isGpsLost ? '#ef4444' : '#f59e0b'} />
            <span style={{ color: isGpsLocked ? '#38bdf8' : isGpsLost ? '#f87171' : '#fde047' }}>
              {isGpsLocked ? 'GPS 3D RTK' : isGpsLost ? 'DR Mode' : 'GPS Degraded'}
            </span>
          </div>

          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

          {/* Subsystems Quick Dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <StatusMiniDot label="Cam" status={systemStatus?.camera || 'green'} />
            <StatusMiniDot label="YOLO" status={systemStatus?.ai_model || 'green'} />
            <StatusMiniDot label="DB" status={systemStatus?.database || 'green'} />
          </div>
        </div>

        {/* Right: Patrol Toggle, Alerts & Utilities */}
        <div className="header-actions-group">
          {/* Patrol Play/Pause */}
          <button
            onClick={onTogglePatrol}
            className="header-action-btn"
            style={{
              backgroundColor: patrolActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: patrolActive ? '#4ade80' : '#f87171',
              border: `1px solid ${patrolActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}
            title={patrolActive ? 'Pause transit patrol fleet' : 'Resume transit patrol fleet'}
          >
            {patrolActive ? <Pause size={12} /> : <Play size={12} />}
            <span>{patrolActive ? 'Patrol Live' : 'Patrol Paused'}</span>
          </button>

          {/* Test Alerts */}
          <button
            onClick={onOpenAlertModal}
            className="header-action-btn"
            title="Dispatch test WhatsApp, Telegram or Email alerts"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}
          >
            <Bell size={12} />
            <span>Test Alerts</span>
          </button>

          {/* Quick Utility Icon Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Export CSV */}
            <a
              href={`${API_BASE}/api/reports/csv`}
              download="phase1_road_defects_report.csv"
              className="header-action-icon-btn"
              title="Export Defect Inventory CSV"
            >
              <Download size={13} />
            </a>

            {/* DB Backup */}
            <a
              href={`${API_BASE}/api/db/export`}
              download="municipal_pavement_db.json"
              className="header-action-icon-btn hide-on-mobile"
              title="Download Persistent JSON DB Backup"
            >
              <HardDrive size={13} />
            </a>

            {/* Security Portal Badge */}
            <button
              onClick={() => adminUnlocked ? handleAdminLogout() : setShowAdminModal(true)}
              className="header-action-icon-btn hide-on-mobile"
              title={adminUnlocked ? 'Admin Mode Active — Click to lock' : 'Secure Portal — Click to unlock Admin Mode'}
              style={{
                color: adminUnlocked ? '#4ade80' : '#94a3b8',
                border: adminUnlocked ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '6px',
                padding: '3px 7px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: '700',
                background: adminUnlocked ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
              }}
            >
              {adminUnlocked ? <Unlock size={11} /> : <Lock size={11} />}
              <span>{adminUnlocked ? 'ADMIN' : 'LOCK'}</span>
            </button>

            {/* Reset Database — requires admin unlock */}
            {onResetDB && (
              <button
                onClick={handleAdminReset}
                disabled={loading}
                className="header-action-icon-btn hide-on-mobile"
                title={adminUnlocked ? 'Reset Database (Admin Mode Active)' : 'Reset Database — Admin Authentication Required'}
                style={{ color: adminUnlocked ? '#f87171' : '#64748b' }}
              >
                <RotateCcw size={13} />
              </button>
            )}

            {/* Sync / Refresh */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="header-action-icon-btn"
              title="Sync all data"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tier 2: Navigation Tabs & Seamless AI Model Switcher (40px) ───── */}
      <div className="header-nav-row">
        {/* Left: Nav Tabs */}
        <div className="header-nav-tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="header-nav-tab-btn"
                style={{
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  backgroundColor: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                  borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                  borderRadius: '6px 6px 0 0'
                }}
              >
                <Icon size={14} color={isActive ? '#38bdf8' : '#94a3b8'} />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span
                    style={{
                      backgroundColor: '#ec4899',
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: '800',
                      padding: '1px 5px',
                      borderRadius: '9999px',
                      marginLeft: '2px',
                      boxShadow: '0 0 6px rgba(236, 72, 153, 0.5)'
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Integrated AI Model Switcher Pill (Strict Single-Engine Pipeline) */}
        <div
          className="hide-on-mobile"
          title="Strict Single-Model Pipeline: Exactly one neural network scans video frames at any given moment to prevent duplicate detections and overlapping instances."
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#080f1e',
            border: '1px solid #1a2540',
            borderRadius: '7px',
            padding: '3px 4px',
            gap: '2px'
          }}
        >
          <span style={{ fontSize: '9px', color: '#475569', fontWeight: '700', letterSpacing: '0.06em', padding: '0 6px', textTransform: 'uppercase' }}>
            Model
          </span>

          {[
            { mode: 'multitask', icon: Zap, label: 'Multi-Task', badge: 'SIH', color: '#a78bfa' },
            { mode: 'roadguard', icon: Shield, label: 'Road Doctor', badge: '9-Class', color: '#4ade80' },
            { mode: 'pothole', icon: Crosshair, label: '7-Class', badge: 'YOLOv8m', color: '#38bdf8' },
            { mode: 'rdd2022', icon: Globe, label: 'CRDDC', badge: 'YOLOv8s', color: '#2dd4bf' },
            { mode: 'potbot', icon: Bot, label: 'PotBot', badge: '148MB', color: '#c084fc' },
          ].map(({ mode, icon: Icon, label, badge, color }) => {
            const isActive = aiModelMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setAiModelMode(mode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 9px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  border: isActive ? `1px solid rgba(255,255,255,0.1)` : '1px solid transparent',
                  borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
                  background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                  color: isActive ? '#f1f5f9' : '#64748b',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.07)' : 'none',
                }}
              >
                {isActive && (
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                )}
                <Icon size={12} color={isActive ? color : '#475569'} />
                <span>{label}</span>
                <span style={{
                  fontSize: '9px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : '#0f1929',
                  color: isActive ? '#cbd5e1' : '#475569',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  fontWeight: '600'
                }}>{badge}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>

      {/* ── Admin Authentication Modal ──────────────────────────────────────── */}
      {showAdminModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(5, 10, 25, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#0d1628',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '32px',
            width: '360px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={18} color="#38bdf8" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9' }}>Secure Admin Portal</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>GCC Road Intelligence Platform</div>
                </div>
              </div>
              <button onClick={() => { setShowAdminModal(false); setAdminError(''); setAdminKeyInput(''); }}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px', lineHeight: '1.6' }}>
                Enter the <strong style={{ color: '#38bdf8' }}>Admin Security Key</strong> to unlock privileged operations (DB reset, alert configuration). This session will be securely stored until you log out.
              </div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <KeyRound size={10} style={{ display: 'inline', marginRight: '4px' }} />
                Admin Key
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={adminKeyInput}
                  onChange={e => { setAdminKeyInput(e.target.value); setAdminError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAdminUnlock()}
                  placeholder="Enter admin key..."
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 36px 10px 12px',
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${adminError ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '8px', color: '#f1f5f9', fontSize: '13px', outline: 'none',
                    fontFamily: 'monospace',
                  }}
                />
                <button onClick={() => setShowKey(v => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  {showKey ? <Lock size={13} /> : <Unlock size={13} />}
                </button>
              </div>
              {adminError && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AlertCircle size={12} />
                  {adminError}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowAdminModal(false); setAdminError(''); setAdminKeyInput(''); }}
                style={{ flex: 1, padding: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleAdminUnlock}
                style={{ flex: 2, padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#0284c7', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 8px rgba(2,132,199,0.25), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
                <Unlock size={13} />
                Authenticate
              </button>
            </div>

            {/* Security Notice */}
            <div style={{ marginTop: '16px', padding: '10px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.12)' }}>
              <div style={{ fontSize: '10px', color: '#6ee7b7', lineHeight: '1.5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={11} style={{ flexShrink: 0 }} />
                <span><strong>Security Notice:</strong> Admin sessions are scoped to this browser tab only and are automatically cleared on tab close.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatusMiniDot({ label, status }) {
  const isGreen = status === 'green';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#94a3b8' }}>
      <span style={{
        width: '5px',
        height: '5px',
        borderRadius: '50%',
        backgroundColor: isGreen ? '#22c55e' : '#ef4444'
      }} />
      <span>{label}</span>
    </div>
  );
}
