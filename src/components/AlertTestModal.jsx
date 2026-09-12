import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ShieldAlert,
  Settings,
  Save,
  Check
} from 'lucide-react';
import { API_BASE } from '../config';

export default function AlertTestModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Live values from process.env / .env
  const [config, setConfig] = useState({
    telegram_target: '@BotFather Bot Hook',
    telegram_chat_id: '',
    telegram_configured: false,
    dispatch_email: 'roadmaintenance@chennaicorp.gov.in',
    gmail_sender: '',
    gmail_configured: false,
    trigger_criteria: 'Critical Defect or Multi-Bus Verification'
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    telegram_target: '',
    telegram_chat_id: '',
    dispatch_email: '',
    gmail_user: '',
    trigger_criteria: ''
  });

  const fetchEnvConfig = useCallback(async () => {
    setFetchingConfig(true);
    try {
      const res = await fetch(`${API_BASE}/api/alerts/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setEditForm({
          telegram_target: data.telegram_target || '',
          telegram_chat_id: data.telegram_chat_id || '',
          dispatch_email: data.dispatch_email || '',
          gmail_user: data.gmail_sender || '',
          trigger_criteria: data.trigger_criteria || 'Critical Defect or Multi-Bus Verification'
        });
      }
    } catch (err) {
      console.warn('Could not fetch alert env config:', err);
    } finally {
      setFetchingConfig(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchEnvConfig();
      setResult(null);
      setError(null);
      setSaveSuccess(false);
      setIsEditing(false);
    }
  }, [isOpen, fetchEnvConfig]);

  if (!isOpen) return null;

  const handleSaveEnv = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/alerts/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_target: editForm.telegram_target,
          telegram_chat_id: editForm.telegram_chat_id,
          dispatch_email: editForm.dispatch_email,
          gmail_user: editForm.gmail_user,
          trigger_criteria: editForm.trigger_criteria
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.active_config) {
          setConfig((prev) => ({
            ...prev,
            ...data.active_config
          }));
        }
        setSaveSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to save environment variables');
      }
    } catch (err) {
      setError(err.message || 'Error updating .env configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/alerts/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: config.telegram_target,
          email: config.dispatch_email,
          criteria: config.trigger_criteria
        })
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to dispatch alert test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '540px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
        animation: 'fadeIn 0.15s ease-out'
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="#38bdf8" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
              Phase 1 Push Alert &amp; Dispatch Gateway Test
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
            Trigger an instantaneous end-to-end alert verification. The backend tests the automated
            <strong> Telegram Bot Push Alert</strong> and generates the <strong>Gmail SMTP Municipal Incident Ticket</strong>.
          </p>

          {/* Details Container - Loaded directly from .env */}
          <div style={{
            backgroundColor: '#1e293b',
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid #334155',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Configuration (.env)
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: isEditing ? '#f87171' : '#38bdf8',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <Settings size={12} />
                <span>{isEditing ? 'Cancel Edit' : 'Edit .env Values'}</span>
              </button>
            </div>

            {!isEditing ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#64748b' }}>Telegram Target:</span>
                    <span style={{
                      fontSize: '9px',
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: '700'
                    }}>
                      ENV
                    </span>
                  </div>
                  <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: '600' }}>
                    {fetchingConfig ? 'Loading...' : config.telegram_target}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#64748b' }}>Dispatch Email:</span>
                    <span style={{
                      fontSize: '9px',
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: '700'
                    }}>
                      ENV
                    </span>
                  </div>
                  <span style={{
                    color: '#38bdf8',
                    fontFamily: 'monospace',
                    fontWeight: '600',
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {fetchingConfig ? 'Loading...' : config.dispatch_email}
                  </span>
                </div>

                {config.gmail_sender && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#64748b' }}>Sender (Gmail):</span>
                      <span style={{
                        fontSize: '9px',
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontWeight: '700'
                      }}>
                        ENV
                      </span>
                    </div>
                    <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>
                      {config.gmail_sender}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#64748b' }}>Trigger Criteria:</span>
                    <span style={{
                      fontSize: '9px',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: '700'
                    }}>
                      ENV
                    </span>
                  </div>
                  <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                    {config.trigger_criteria}
                  </span>
                </div>
              </>
            ) : (
              /* Inline Edit Form for Environment Variables */
              <form onSubmit={handleSaveEnv} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', marginBottom: '3px' }}>
                    TELEGRAM_TARGET (Handle or Description)
                  </label>
                  <input
                    type="text"
                    value={editForm.telegram_target}
                    onChange={(e) => setEditForm({ ...editForm, telegram_target: e.target.value })}
                    placeholder="@BotFather Bot Hook"
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '6px 8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', marginBottom: '3px' }}>
                    ALERT_RECIPIENTS (Comma-separated emails)
                  </label>
                  <input
                    type="text"
                    value={editForm.dispatch_email}
                    onChange={(e) => setEditForm({ ...editForm, dispatch_email: e.target.value })}
                    placeholder="roadmaintenance@chennaicorp.gov.in"
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '6px 8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', marginBottom: '3px' }}>
                    GMAIL_USER (Sender Account)
                  </label>
                  <input
                    type="text"
                    value={editForm.gmail_user}
                    onChange={(e) => setEditForm({ ...editForm, gmail_user: e.target.value })}
                    placeholder="pwd.chennaicorp@gmail.com"
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '6px 8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600' }}>
                      ALERT_TRIGGER_CRITERIA
                    </label>
                    <span style={{ fontSize: '10px', color: '#38bdf8' }}>Official Rule Definition</span>
                  </div>
                  <select
                    value={editForm.trigger_criteria}
                    onChange={(e) => setEditForm({ ...editForm, trigger_criteria: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="MULTI_BUS_VERIFIED">
                      MULTI_BUS_VERIFIED (Recommended) — ≥2 distinct buses within 15m & 10 min
                    </option>
                    <option value="HIGH_SEVERITY">
                      HIGH_SEVERITY — Any High/Critical severity immediately + multi-bus
                    </option>
                    <option value="ALL_VERIFIED">
                      ALL_VERIFIED — Every detected defect (High, Med, Low)
                    </option>
                    <option value="CRITICAL_ONLY">
                      CRITICAL_ONLY — All 4 route buses confirm (≥4 consensus)
                    </option>
                  </select>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                    {editForm.trigger_criteria === 'MULTI_BUS_VERIFIED' && 'Eliminates 100% of single-camera false alarms (shadows, manholes). Best for production municipal deployments.'}
                    {editForm.trigger_criteria === 'HIGH_SEVERITY' && 'Fires alerts on any High or Critical defect immediately. Best for Monsoon season or high-risk highways.'}
                    {editForm.trigger_criteria === 'ALL_VERIFIED' && 'Fires alerts for all defects. Best for testing and engineering inspection.'}
                    {editForm.trigger_criteria === 'CRITICAL_ONLY' && 'Requires ≥4 bus confirmations before notifying officials. Best for high-traffic major intersections.'}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      backgroundColor: '#334155',
                      color: '#94a3b8',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 14px',
                      borderRadius: '4px',
                      backgroundColor: '#22c55e',
                      color: '#000000',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: loading ? 'default' : 'pointer'
                    }}
                  >
                    <Save size={12} />
                    <span>Save to .env</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {saveSuccess && (
            <div style={{
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid #22c55e',
              color: '#4ade80',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Check size={14} />
              <span>Details saved to .env and active runtime environment.</span>
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '10px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid #22c55e',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontWeight: '700', marginBottom: '8px' }}>
                <CheckCircle2 size={16} />
                <span>Alert Gateway Test Executed</span>
              </div>
              <div style={{ color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Telegram status: <strong style={{ color: '#f8fafc' }}>{result.telegram?.status || 'dispatched'}</strong> ({result.target || config.telegram_target})</div>
                <div>Gmail Ticket: <strong style={{ color: '#f8fafc' }}>{result.gmail?.status || 'dispatched'}</strong> ➔ {result.gmail?.recipients || config.dispatch_email}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#334155',
                color: '#e2e8f0',
                border: 'none',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            <button
              onClick={handleTriggerTest}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '6px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: '700',
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
              }}
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{loading ? 'Transmitting...' : 'Dispatch Test Alert'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
