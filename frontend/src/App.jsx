import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MapComponent from './components/MapComponent';
import DefectsSidePanel from './components/DefectsSidePanel';
import DefectBarChart from './components/DefectBarChart';
import LiveVideoPanel from './components/LiveVideoPanel';
import { API_BASE } from './config';

export default function App() {
  const [defects, setDefects] = useState([]);
  const [busPositions, setBusPositions] = useState([]);
  const [showVideo, setShowVideo] = useState(true);
  const [stats, setStats] = useState({
    total_defects: 0,
    multi_bus_verified: 0,
    total_raw_events: 0,
    severity_counts: {},
    type_counts: {},
    active_buses: []
  });
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [isPolling, setIsPolling] = useState(true);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [resetting, setResetting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, statsRes, busRes] = await Promise.all([
        fetch(`${API_BASE}/events`),
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/bus_positions`)
      ]);

      if (!eventsRes.ok) throw new Error(`Events HTTP ${eventsRes.status}`);
      const eventsData = await eventsRes.json();
      setDefects(eventsData.defects || []);

      if (statsRes.ok) setStats(await statsRes.json());
      if (busRes.ok) {
        const busData = await busRes.json();
        setBusPositions(busData.buses || []);
      }

      setApiError(null);
      setLastRefreshed(new Date());
    } catch (err) {
      setApiError(err.message || 'Cannot reach backend at http://127.0.0.1:8000');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (!isPolling) return;
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [isPolling, fetchData]);

  const handleReset = () => setResetting(true);

  const confirmReset = async () => {
    try {
      await fetch(`${API_BASE}/events`, { method: 'DELETE' });
      setSelectedDefect(null);
      setBusPositions([]);
      setResetting(false);
      setLoading(true);
      await fetchData();
    } catch (err) {
      alert(`Failed to reset: ${err.message}`);
      setResetting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      minHeight: 0,
      overflow: 'hidden',
      backgroundColor: '#0f172a'
    }}>
      {/* Header */}
      <Header
        stats={stats}
        isPolling={isPolling}
        setIsPolling={setIsPolling}
        showVideo={showVideo}
        setShowVideo={setShowVideo}
        onRefresh={() => { setLoading(true); fetchData(); }}
        onReset={handleReset}
        loading={loading}
        lastRefreshed={lastRefreshed}
        busPositions={busPositions}
      />

      {/* Error Banner */}
      {apiError && (
        <div style={{
          backgroundColor: '#7f1d1d',
          color: '#fca5a5',
          padding: '7px 20px',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0
        }}>
          <span>
            ⚠ <strong>Backend Unreachable.</strong> Run:{' '}
            <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: '3px' }}>
              python -m uvicorn backend.main:app --port 8000
            </code>{' '}({apiError})
          </span>
          <button onClick={fetchData} style={{
            background: 'transparent', border: '1px solid #fca5a5',
            color: '#fca5a5', borderRadius: '4px', padding: '2px 10px',
            fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap'
          }}>Retry</button>
        </div>
      )}

      {/* Main Layout — fill remaining height */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Left column: Map + Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>

          {/* Map — flex 1 takes most space */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <MapComponent
              defects={defects}
              busPositions={busPositions}
              selectedDefect={selectedDefect}
              onSelectDefect={setSelectedDefect}
            />
            {/* Live Video floats over the map */}
            <LiveVideoPanel
              isOpen={showVideo}
              onClose={() => setShowVideo(false)}
            />
          </div>

          {/* Analytics Bar — fixed height below map */}
          <div style={{ flexShrink: 0 }}>
            <DefectBarChart stats={stats} defects={defects} />
          </div>
        </div>

        {/* Right column: Side Panel — scrolls independently */}
        <div style={{
          width: '360px',
          minWidth: '300px',
          maxWidth: '400px',
          flexShrink: 0,
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <DefectsSidePanel
            defects={defects}
            selectedDefect={selectedDefect}
            onSelectDefect={setSelectedDefect}
          />
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {resetting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '28px 32px',
            maxWidth: '420px', width: '90%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🗑️</div>
            <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>
              Reset Database?
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.7', marginBottom: '20px' }}>
              This will permanently delete{' '}
              <strong style={{ color: '#f87171' }}>{stats.total_defects} verified defects</strong> and{' '}
              <strong style={{ color: '#f87171' }}>{stats.total_raw_events} raw events</strong>.
              <br />
              Pothole IDs will restart from{' '}
              <strong style={{ color: '#4ade80' }}>#1</strong>.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setResetting(false)} style={{
                padding: '9px 22px', borderRadius: '7px',
                border: '1px solid #475569', backgroundColor: '#334155',
                color: '#f8fafc', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
              }}>Cancel</button>
              <button onClick={confirmReset} style={{
                padding: '9px 22px', borderRadius: '7px',
                border: '1px solid rgba(239,68,68,0.5)',
                backgroundColor: 'rgba(239,68,68,0.2)',
                color: '#f87171', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
              }}>Reset &amp; Restart from #1</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
