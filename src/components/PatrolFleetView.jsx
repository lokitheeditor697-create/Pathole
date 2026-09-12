import React from 'react';
import { Bus, Radio, HardDrive, Cpu, MapPin, Wifi, WifiOff } from 'lucide-react';

export default function PatrolFleetView({
  vehicles = [],
  gpsStatus = 'locked',
  serverConnected = true,
  onOpenDiagnostics
}) {
  const isGpsLost = gpsStatus === 'lost';
  const isGpsDegraded = gpsStatus === 'degraded';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      backgroundColor: '#090d16',
      padding: '20px',
      gap: '20px'
    }}>
      {/* Overview Header */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>
              Active Transit Bus Patrol Fleet
            </h2>
            {onOpenDiagnostics && (
              <button
                onClick={onOpenDiagnostics}
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Reliability Center
              </button>
            )}
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Edge AI Dashcam units continuously scanning corridors with offline-first disk buffering &amp; central sync.
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          backgroundColor: '#1e293b',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid #334155',
          alignItems: 'center'
        }}>
          {/* Municipal Server Link Status */}
          <div>
            <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
              SERVER TELEMETRY
            </span>
            <div style={{
              fontSize: '13px',
              fontWeight: '800',
              color: serverConnected ? '#4ade80' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {serverConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{serverConnected ? 'ONLINE' : 'DISCONNECTED'}</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: '#334155' }} />

          {/* GNSS Positioning Status */}
          <div>
            <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
              GNSS STATUS
            </span>
            <div style={{
              fontSize: '13px',
              fontWeight: '800',
              color: isGpsLost ? '#f87171' : isGpsDegraded ? '#fbbf24' : '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Radio size={13} className={isGpsLost ? 'animate-pulse' : ''} />
              <span>{isGpsLost ? 'DEAD RECKONING' : isGpsDegraded ? 'DEGRADED (2D)' : '3D RTK LOCK'}</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: '#334155' }} />

          <div>
            <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
              ONLINE UNITS
            </span>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#4ade80' }}>
              {vehicles.filter((v) => v.status === 'Online').length} / {vehicles.length}
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {vehicles.map((v) => {
          const isOnline = v.status === 'Online';

          return (
            <div
              key={v.vehicle_id}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    padding: '8px',
                    borderRadius: '8px'
                  }}>
                    <Bus size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#f8fafc' }}>
                      {v.vehicle_id}
                    </h3>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {v.plate_number} • {v.type}
                    </span>
                  </div>
                </div>

                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: isOnline ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  color: isOnline ? '#4ade80' : '#facc15',
                  border: `1px solid ${isOnline ? '#22c55e' : '#eab308'}`,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: '700'
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: isOnline ? '#22c55e' : '#facc15'
                  }} />
                  {v.status}
                </span>
              </div>

              {/* Edge Specs Grid */}
              <div style={{
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={12} color="#38bdf8" />
                  <span style={{ color: '#64748b' }}>Edge Processor:</span>
                  <strong style={{ color: '#f8fafc', marginLeft: 'auto' }}>{v.edge_device}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Radio size={12} color="#38bdf8" />
                  <span style={{ color: '#64748b' }}>Dashcam Sensor:</span>
                  <strong style={{ color: '#f8fafc', marginLeft: 'auto' }}>{v.camera}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HardDrive size={12} color={v.buffer_queue > 0 ? '#f59e0b' : '#4ade80'} />
                  <span style={{ color: '#64748b' }}>Offline Disk Buffer:</span>
                  <strong style={{
                    color: v.buffer_queue > 0 ? '#f59e0b' : '#4ade80',
                    marginLeft: 'auto'
                  }}>
                    {v.buffer_queue === 0 ? 'Buffer Clear (0 queued)' : `${v.buffer_queue} queued`}
                  </strong>
                </div>
              </div>

              {/* Location & Speed */}
              <div style={{
                fontSize: '11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                color: '#94a3b8'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={12} color="#38bdf8" />
                  <span>Current Road: <strong style={{ color: '#f8fafc' }}>{v.current_road}</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '18px' }}>
                  <span>Segment: <strong style={{ color: '#38bdf8' }}>{v.current_segment}</strong></span>
                  <span>Speed: <strong style={{ color: '#4ade80' }}>{v.speed_kmh} km/h</strong></span>
                </div>
                <div style={{ paddingLeft: '18px', fontSize: '10px', color: isGpsLost ? '#f87171' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isGpsLost ? (
                    <>
                      <Radio size={10} color="#ef4444" className="animate-pulse" />
                      <span style={{ fontWeight: '700' }}>GPS Lost: DR Mode ({v.latitude?.toFixed(5)}, {v.longitude?.toFixed(5)})</span>
                    </>
                  ) : (
                    <span>GPS: {v.latitude?.toFixed(6)}, {v.longitude?.toFixed(6)} [3D RTK]</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
