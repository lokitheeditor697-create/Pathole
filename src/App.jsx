import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import LiveMonitoringView from './components/LiveMonitoringView';
import RoadHealthMapView from './components/RoadHealthMapView';
import DefectInventoryView from './components/DefectInventoryView';
import CaseManagementView from './components/CaseManagementView';
import PatrolFleetView from './components/PatrolFleetView';
import AIPerformanceView from './components/AIPerformanceView';
import AlertTestModal from './components/AlertTestModal';
import OperationalAlertBanner from './components/OperationalAlertBanner';
import ReliabilityDiagnosticsModal from './components/ReliabilityDiagnosticsModal';
import { API_BASE } from './config';
import { DEFAULT_DEFECTS, DEFAULT_ROADS, DEFAULT_SEGMENTS, DEFAULT_VEHICLES } from './gisData';

export default function App() {
  const [activeTab, setActiveTab] = useState('LIVE_MONITORING');
  const [patrolActive, setPatrolActive] = useState(true);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState(null);

  // Core domain states initialized with certified Chennai baseline
  const [metrics, setMetrics] = useState(null);
  const [defects, setDefects] = useState(DEFAULT_DEFECTS);
  const [roads, setRoads] = useState(DEFAULT_ROADS);
  const [segments, setSegments] = useState(DEFAULT_SEGMENTS);
  const [vehicles, setVehicles] = useState(DEFAULT_VEHICLES);
  const [systemStatus, setSystemStatus] = useState(null);

  // AI Model Mode: 'pothole' (7-Class Anomaly) | 'rdd2022' (CRDDC Multi-Damage) | 'potbot' (PotBot Dedicated Pothole 148MB)
  const [aiModelMode, setAiModelMode] = useState('pothole');

  // Connection & GPS Operational Reliability States
  const [serverStatus, setServerStatus] = useState('connected'); // 'connected' | 'reconnecting' | 'disconnected'
  const [latencyMs, setLatencyMs] = useState(14);
  const [lastHeartbeat, setLastHeartbeat] = useState(new Date());
  const [gpsStatus, setGpsStatus] = useState('locked'); // 'locked' | 'degraded' | 'lost'
  const [gpsDetails, setGpsDetails] = useState(null);

  // Simulation test toggles (for operator verification)
  const [simulatedServerOffline, setSimulatedServerOffline] = useState(false);
  const [simulatedGpsLost, setSimulatedGpsLost] = useState(false);

  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const failedPollsRef = useRef(0);

  // Resilient data fetching routine with latency measurement & failure tracking
  const fetchAllData = useCallback(async () => {
    if (simulatedServerOffline) {
      setServerStatus('disconnected');
      return;
    }

    const startTime = performance.now();
    try {
      const endpoints = [
        `${API_BASE}/api/dashboard`,
        `${API_BASE}/api/defects`,
        `${API_BASE}/api/roads`,
        `${API_BASE}/api/segments`,
        `${API_BASE}/api/vehicles`,
        `${API_BASE}/api/system-status`,
      ];

      const results = await Promise.allSettled(
        endpoints.map(async (url) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7500);
          try {
            const res = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
            clearTimeout(timeoutId);
            if (!res.ok) return null;
            return await res.json();
          } catch {
            clearTimeout(timeoutId);
            return null;
          }
        })
      );

      const [dashData, defData, roadsData, segData, vehData, sysData] = results.map(
        (r) => (r.status === 'fulfilled' ? r.value : null)
      );

      // Check if at least one critical municipal endpoint responded
      const hasAnyResponse = Boolean(dashData || defData || roadsData || segData || vehData || sysData);

      if (hasAnyResponse) {
        failedPollsRef.current = 0;
        setServerStatus('connected');
        setLatencyMs(Math.max(4, Math.round(performance.now() - startTime)));
        setLastHeartbeat(new Date());

        if (dashData) setMetrics(dashData);
        if (defData?.defects && Array.isArray(defData.defects)) {
          setDefects(defData.defects);
        }
        if (roadsData && Array.isArray(roadsData) && roadsData.length > 0) {
          setRoads(roadsData);
        }
        if (segData && Array.isArray(segData) && segData.length > 0) {
          setSegments(segData);
        }
        if (vehData?.vehicles && Array.isArray(vehData.vehicles) && vehData.vehicles.length > 0) {
          setVehicles(vehData.vehicles);
        }
        if (sysData) {
          setSystemStatus(sysData);
          if (!simulatedGpsLost) {
            setGpsStatus(sysData.gps_status || (sysData.gps === 'red' ? 'lost' : sysData.gps === 'yellow' ? 'degraded' : 'locked'));
          }
          if (sysData.gps_details) {
            setGpsDetails(sysData.gps_details);
          }
        }
      } else {
        // Double check health endpoint before declaring failure
        let healthOk = false;
        try {
          const hRes = await fetch(`${API_BASE}/api/health`, { cache: 'no-cache' });
          if (hRes.ok) healthOk = true;
        } catch {
          healthOk = false;
        }

        if (healthOk) {
          failedPollsRef.current = 0;
          setServerStatus('connected');
          setLastHeartbeat(new Date());
        } else {
          const isStaticDeployment = typeof window !== 'undefined' && (
            window.location.hostname.includes('hf.space') ||
            window.location.hostname.includes('huggingface.co') ||
            window.location.protocol === 'file:'
          );

          if (isStaticDeployment) {
            setServerStatus('autonomous');
            setLatencyMs(4);
            setLastHeartbeat(new Date());
            setMetrics((prev) => prev || {
              total_defects: DEFAULT_DEFECTS.length,
              critical_defects: DEFAULT_DEFECTS.filter((d) => d.severity === 'Critical').length,
              high_defects: DEFAULT_DEFECTS.filter((d) => d.severity === 'High').length,
              active_buses: DEFAULT_VEHICLES.length,
              average_health_score: 78.4,
              network_length_km: 42.5
            });
          } else {
            failedPollsRef.current += 1;
            if (failedPollsRef.current >= 3) {
              setServerStatus('disconnected');
            } else {
              setServerStatus('reconnecting');
            }
          }
        }
      }

      setLastRefreshed(new Date());
    } catch {
      const isStaticDeployment = typeof window !== 'undefined' && (
        window.location.hostname.includes('hf.space') ||
        window.location.hostname.includes('huggingface.co') ||
        window.location.protocol === 'file:'
      );
      if (isStaticDeployment) {
        setServerStatus('autonomous');
        setLatencyMs(4);
        setLastHeartbeat(new Date());
      } else {
        failedPollsRef.current += 1;
        if (failedPollsRef.current >= 3) {
          setServerStatus('disconnected');
        } else {
          setServerStatus('reconnecting');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [simulatedServerOffline, simulatedGpsLost]);

  // Dedicated explicit retry connection handler
  const handleRetryConnection = useCallback(async () => {
    setLoading(true);
    setSimulatedServerOffline(false);
    failedPollsRef.current = 0;
    setServerStatus('reconnecting');
    try {
      const hRes = await fetch(`${API_BASE}/api/health`, { cache: 'no-cache' });
      if (hRes.ok) {
        setServerStatus('connected');
      }
    } catch {
      // Proceed to full poll
    }
    await fetchAllData();
    setLoading(false);
  }, [fetchAllData]);

  // Polling every 2.5s
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 2500);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Patrol play/pause toggle
  const handleTogglePatrol = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/patrol/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPatrolActive(data.patrol_active);
        return;
      }
    } catch {
      // Offline fallback
    }
    setPatrolActive((prev) => !prev);
  };

  // GPS signal restoration handler
  const handleRestoreGps = async () => {
    setSimulatedGpsLost(false);
    setGpsStatus('locked');
    try {
      await fetch(`${API_BASE}/api/diagnostics/gps-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'locked' })
      });
      fetchAllData();
    } catch {
      // Offline fallback
    }
  };

  // Toggle simulated GPS loss
  const handleToggleSimulatedGps = async () => {
    const nextState = !simulatedGpsLost;
    setSimulatedGpsLost(nextState);
    setGpsStatus(nextState ? 'lost' : 'locked');
    try {
      await fetch(`${API_BASE}/api/diagnostics/gps-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextState ? 'lost' : 'locked' })
      });
      fetchAllData();
    } catch {
      // Offline fallback
    }
  };

  const handleResetDB = async () => {
    const confirmReset = window.confirm(
      "⚠️ RESET PROTOTYPE DATABASE?\n\nThis will clear all detected potholes, video inspections, and reset road corridor health scores to 96% (Clean Baseline).\n\nUse this right before presenting your demo to show a fresh, live detection run from 0!"
    );
    if (!confirmReset) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/db/reset`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setDefects([]);
        await fetchAllData();
        alert("✨ Database Reset Complete!\n\nAll previous detections have been cleared. The system is pristine and ready for your prototype demonstration!");
      } else {
        alert("Failed to reset: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error resetting database: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isStaticDeployment = typeof window !== 'undefined' && (
    window.location.hostname.includes('hf.space') ||
    window.location.hostname.includes('huggingface.co') ||
    window.location.protocol === 'file:'
  );
  const isServerOfflineEffective = (serverStatus === 'disconnected' && !isStaticDeployment) || simulatedServerOffline;
  const isGpsLostEffective = gpsStatus === 'lost' || simulatedGpsLost;
  const isGpsDegradedEffective = gpsStatus === 'degraded' && !simulatedGpsLost;

  return (
    <div className="app-container">
      {/* Top Universal Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
        patrolActive={patrolActive}
        onTogglePatrol={handleTogglePatrol}
        onOpenAlertModal={() => setIsAlertModalOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onRefresh={() => {
          setLoading(true);
          fetchAllData();
        }}
        onResetDB={handleResetDB}
        loading={loading}
        lastRefreshed={lastRefreshed}
        metrics={metrics}
        serverStatus={serverStatus}
        latencyMs={latencyMs}
        gpsStatus={gpsStatus}
        gpsDetails={gpsDetails}
        simulatedServerOffline={simulatedServerOffline}
        simulatedGpsLost={simulatedGpsLost}
        aiModelMode={aiModelMode}
        setAiModelMode={setAiModelMode}
      />

      {/* Operational Reliability Notification Banner (Appears if connection or GPS is lost) */}
      <OperationalAlertBanner
        isServerOffline={isServerOfflineEffective}
        isGpsLost={isGpsLostEffective}
        isGpsDegraded={isGpsDegradedEffective}
        reconnecting={loading || serverStatus === 'reconnecting'}
        onRetryConnection={handleRetryConnection}
        onRestoreGps={handleRestoreGps}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        simulatedOffline={simulatedServerOffline}
        onRestoreServer={handleRetryConnection}
      />

      {/* Main Viewport Container */}
      <main className="main-viewport" style={{ flex: 1, position: 'relative', overflowY: 'auto' }}>
        {activeTab === 'LIVE_MONITORING' && (
          <LiveMonitoringView
            defects={defects}
            vehicles={vehicles}
            patrolActive={patrolActive}
            aiModelMode={aiModelMode}
            setAiModelMode={setAiModelMode}
            onOpenAlertModal={() => setIsAlertModalOpen(true)}
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
            onRefreshData={fetchAllData}
            onSelectDefect={(d) => {
              setSelectedDefect(d);
              setActiveTab('ROAD_HEALTH_MAP');
            }}
            onSwitchToMap={() => setActiveTab('ROAD_HEALTH_MAP')}
            gpsStatus={isGpsLostEffective ? 'lost' : isGpsDegradedEffective ? 'degraded' : 'locked'}
            serverConnected={!isServerOfflineEffective}
          />
        )}

        {activeTab === 'ROAD_HEALTH_MAP' && (
          <RoadHealthMapView
            roads={roads}
            segments={segments}
            defects={defects}
            vehicles={vehicles}
            initialSelectedDefect={selectedDefect}
            onOpenAlertModal={() => setIsAlertModalOpen(true)}
          />
        )}

        {activeTab === 'DEFECT_INVENTORY' && (
          <DefectInventoryView
            defects={defects}
            onOpenAlertModal={() => setIsAlertModalOpen(true)}
          />
        )}

        {activeTab === 'CASES' && (
          <CaseManagementView
            onOpenAlertModal={() => setIsAlertModalOpen(true)}
            onRefreshAllData={fetchAllData}
          />
        )}

        {activeTab === 'PATROL_FLEET' && (
          <PatrolFleetView
            vehicles={vehicles}
            gpsStatus={isGpsLostEffective ? 'lost' : isGpsDegradedEffective ? 'degraded' : 'locked'}
            serverConnected={!isServerOfflineEffective}
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          />
        )}

        {activeTab === 'AI_PERFORMANCE' && (
          <AIPerformanceView
            aiModelMode={aiModelMode}
            setAiModelMode={setAiModelMode}
          />
        )}
      </main>

      {/* Alert Test Modal */}
      <AlertTestModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
      />

      {/* Operational Reliability & Redundancy Diagnostics Modal */}
      <ReliabilityDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        serverStatus={serverStatus}
        latencyMs={latencyMs}
        lastHeartbeat={lastHeartbeat}
        gpsStatus={gpsStatus}
        gpsDetails={gpsDetails}
        systemStatus={systemStatus}
        simulatedServerOffline={simulatedServerOffline}
        onToggleSimulatedServer={() => {
          setSimulatedServerOffline((prev) => !prev);
          if (simulatedServerOffline) {
            setServerStatus('connected');
            fetchAllData();
          } else {
            setServerStatus('disconnected');
          }
        }}
        simulatedGpsLost={simulatedGpsLost}
        onToggleSimulatedGps={handleToggleSimulatedGps}
        onForceRefresh={() => {
          setLoading(true);
          fetchAllData();
        }}
      />
    </div>
  );
}
