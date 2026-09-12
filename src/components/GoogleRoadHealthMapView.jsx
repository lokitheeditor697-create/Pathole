import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import {
  Layers,
  CheckCircle2,
  Car,
  X,
  ExternalLink,
  Key,
  Search,
  Wrench,
  Globe
} from 'lucide-react';
import { API_BASE } from '../config';
import LeafletRoadHealthMap from './LeafletRoadHealthMap';
import { DEFAULT_SEGMENTS, DEFAULT_DEFECTS, DEFAULT_VEHICLES } from '../gisData';

// ─────────────────────────────────────────────────────────────────────────────
// Polylines Layer for 100m Corridor Segments
// ─────────────────────────────────────────────────────────────────────────────
function RoadSegmentsLayer({ segments, selectedSegment, onSelectSegment }) {
  const map = useMap();
  const polylinesRef = useRef([]);

  useEffect(() => {
    if (!map) return;

    // Clear existing polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    // Helper to get grade color
    const getGradeColor = (pci) => {
      if (pci >= 85) return '#22c55e'; // Good
      if (pci >= 65) return '#eab308'; // Fair
      if (pci >= 40) return '#f97316'; // Poor
      return '#ef4444'; // Critical
    };

    segments.forEach((seg) => {
      const isSelected = selectedSegment?.segment_id === seg.segment_id;
      const color = getGradeColor(seg.current_health_score);

      const polyline = new window.google.maps.Polyline({
        path: [
          { lat: seg.start_lat, lng: seg.start_lon },
          { lat: seg.end_lat, lng: seg.end_lon }
        ],
        geodesic: true,
        strokeColor: color,
        strokeOpacity: isSelected ? 1.0 : 0.85,
        strokeWeight: isSelected ? 8 : 5,
        zIndex: isSelected ? 200 : 100,
        map: map
      });

      // Hover and Click events
      polyline.addListener('mouseover', () => {
        polyline.setOptions({ strokeWeight: isSelected ? 9 : 7, strokeOpacity: 1.0 });
      });

      polyline.addListener('mouseout', () => {
        polyline.setOptions({ strokeWeight: isSelected ? 8 : 5, strokeOpacity: isSelected ? 1.0 : 0.85 });
      });

      polyline.addListener('click', () => {
        onSelectSegment(seg);
        map.panTo({
          lat: (seg.start_lat + seg.end_lat) / 2,
          lng: (seg.start_lon + seg.end_lon) / 2
        });
      });

      polylinesRef.current.push(polyline);
    });

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, segments, selectedSegment, onSelectSegment]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Traffic Layer Component
// ─────────────────────────────────────────────────────────────────────────────
function GoogleTrafficLayer({ active }) {
  const map = useMap();
  const trafficLayerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new window.google.maps.TrafficLayer();
    }

    if (active) {
      trafficLayerRef.current.setMap(map);
    } else {
      trafficLayerRef.current.setMap(null);
    }

    return () => {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    };
  }, [map, active]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Google Maps Road Health Map Component
// ─────────────────────────────────────────────────────────────────────────────
export default function GoogleRoadHealthMapView({
  _roads = [],
  segments = [],
  defects = [],
  vehicles = [],
  initialSelectedDefect = null,
  onOpenAlertModal
}) {
  // Read API Key from env or localStorage
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('GMP_API_KEY') || envKey || '');
  // Default to reliable zero-config Leaflet OpenStreetMap engine
  const [mapEngine, setMapEngine] = useState('leaflet');
  const [tempKeyInput, setTempKeyInput] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Catch Google Maps auth failure gracefully and revert to Leaflet
  useEffect(() => {
    window.gm_authFailure = () => {
      console.warn('Google Maps API key rejected or invalid domain. Switching to OpenStreetMap.');
      setMapEngine('leaflet');
    };
  }, []);

  // Ensure non-empty baseline data so segments/defects/vehicles always render
  const activeSegments = useMemo(() => {
    return (segments && segments.length > 0) ? segments : DEFAULT_SEGMENTS;
  }, [segments]);

  const activeDefects = useMemo(() => {
    return (defects && defects.length > 0) ? defects : DEFAULT_DEFECTS;
  }, [defects]);

  const activeVehicles = useMemo(() => {
    return (vehicles && vehicles.length > 0) ? vehicles : DEFAULT_VEHICLES;
  }, [vehicles]);

  // Filters & State
  const [filterGrade, setFilterGrade] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTraffic, setShowTraffic] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [selectedDefect, setSelectedDefect] = useState(initialSelectedDefect);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [workOrderNotice, setWorkOrderNotice] = useState(null);
  const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);

  useEffect(() => {
    if (initialSelectedDefect) {
      setSelectedDefect(initialSelectedDefect);
    }
  }, [initialSelectedDefect]);

  // Chennai Municipal Center
  const defaultCenter = useMemo(() => ({ lat: 13.0827, lng: 80.2330 }), []);

  // Filtered Segments
  const filteredSegments = useMemo(() => {
    return activeSegments.filter((seg) => {
      // Grade filter
      if (filterGrade === 'CRITICAL' && seg.current_health_score >= 40) return false;
      if (filterGrade === 'POOR' && (seg.current_health_score < 40 || seg.current_health_score >= 65)) return false;
      if (filterGrade === 'GOOD' && seg.current_health_score < 65) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSeg = seg.segment_id.toLowerCase().includes(q);
        const matchesRoad = seg.road_name?.toLowerCase().includes(q) || seg.road_id?.toLowerCase().includes(q);
        if (!matchesSeg && !matchesRoad) return false;
      }

      return true;
    });
  }, [activeSegments, filterGrade, searchQuery]);

  // Handle work order dispatch
  const handleDispatchWorkOrder = async (defect) => {
    try {
      const res = await fetch(`${API_BASE}/api/work_orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          road_id: defect.road_id || 'R001',
          segment_id: defect.segment_id || 'R001-S002',
          defect_id: defect.detection_id || `DET-${defect.id}`,
          priority: defect.severity === 'Critical' ? 'Urgent' : defect.severity === 'High' ? 'High' : 'Medium',
          crew_assigned: 'Zone 5 Asphalt Emergency Response Team',
          estimated_repair_hours: 4.5,
          sla_deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setWorkOrderNotice(`Work order ${data.work_order.order_id} issued successfully!`);
        setTimeout(() => setWorkOrderNotice(null), 4500);
      }
    } catch (e) {
      console.warn('Work order notice:', e);
    }
  };

  const handleSaveApiKey = (key) => {
    const clean = key.trim();
    setApiKey(clean);
    localStorage.setItem('GMP_API_KEY', clean);
    if (clean) {
      setMapEngine('google');
    }
    setShowKeyModal(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 'calc(100vh - 150px)', overflow: 'hidden' }}>
      {/* Map Engine Switch: Leaflet (Free Zero-Key) vs Google Maps */}
      {mapEngine === 'leaflet' ? (
        <LeafletRoadHealthMap
          segments={filteredSegments}
          selectedSegment={selectedSegment}
          onSelectSegment={(seg) => {
            setSelectedSegment(seg);
            setSelectedDefect(null);
          }}
          defects={activeDefects}
          selectedDefect={selectedDefect}
          onSelectDefect={(d) => {
            setSelectedDefect(d);
            setSelectedVehicle(null);
          }}
          vehicles={activeVehicles}
          selectedVehicle={selectedVehicle}
          onSelectVehicle={(v) => {
            setSelectedVehicle(v);
            setSelectedDefect(null);
          }}
          onDispatchWorkOrder={handleDispatchWorkOrder}
          onOpenAlertModal={onOpenAlertModal}
        />
      ) : !apiKey ? (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#090d16',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '520px',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '32px 24px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid #38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#38bdf8'
            }}>
              <Key size={26} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginBottom: '8px' }}>
              Google Maps Platform Key Required
            </h3>

            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
              To activate Google Maps satellite imagery and live traffic, obtain an instant 1-click zero-cost <b>Maps Demo Key</b> (no billing account or credit card required), or continue with OpenStreetMap.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)'
                }}
              >
                <span>Get Free 1-Click Maps Demo Key</span>
                <ExternalLink size={15} />
              </a>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowKeyModal(true)}
                  style={{
                    flex: 1,
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Enter / Paste API Key
                </button>

                <button
                  onClick={() => setMapEngine('leaflet')}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    color: '#22c55e',
                    border: '1px solid #22c55e',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Switch to OpenStreetMap
                </button>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'left', backgroundColor: '#131d2e', padding: '10px 14px', borderRadius: '6px' }}>
              <b>💡 3 Quick Steps:</b>
              <ol style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: 1.5 }}>
                <li>Click <b>Get Free 1-Click Maps Demo Key</b></li>
                <li>Sign in with your Google account (no card needed)</li>
                <li>Copy the generated key and click <b>Enter / Paste API Key</b></li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        /* Google Maps API Provider */
        <APIProvider apiKey={apiKey} solutionChannel="gmp_mcp_codeassist_v1_aistudio">
          <Map
          mapId="ROAD_HEALTH_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          defaultCenter={defaultCenter}
          defaultZoom={13}
          style={{ width: '100%', height: '100%' }}
          gestureHandling="greedy"
          fullscreenControl={true}
          streetViewControl={true}
          mapTypeControl={true}
          zoomControl={true}
        >
          {/* Road Segment Polylines */}
          <RoadSegmentsLayer
            segments={filteredSegments}
            selectedSegment={selectedSegment}
            onSelectSegment={(seg) => {
              setSelectedSegment(seg);
              setSelectedDefect(null);
            }}
          />

          {/* Google Live Traffic Layer */}
          <GoogleTrafficLayer active={showTraffic} />

          {/* Defect Markers (AdvancedMarkerElement) */}
          {activeDefects.map((d) => {
            const isMulti = d.is_multi_bus_verified;
            const isCrit = d.severity === 'Critical';
            const markerColor = isMulti ? '#22c55e' : isCrit ? '#ef4444' : '#f59e0b';

            return (
              <AdvancedMarker
                key={d.id}
                position={{ lat: d.latitude, lng: d.longitude }}
                title={`${d.class_name} (${d.severity})`}
                onClick={() => {
                  setSelectedDefect(d);
                  setSelectedVehicle(null);
                }}
              >
                <div style={{ position: 'relative', width: '26px', height: '26px', cursor: 'pointer' }}>
                  {/* Pulsing ring for multi-bus verification or critical */}
                  <div style={{
                    position: 'absolute',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: `${markerColor}44`,
                    animation: isMulti || isCrit ? 'ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none'
                  }} />
                  {/* Center Dot */}
                  <div style={{
                    position: 'absolute',
                    top: '5px',
                    left: '5px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: markerColor,
                    border: '2px solid #ffffff',
                    boxShadow: `0 0 10px ${markerColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px'
                  }}>
                    {d.class_name === 'pothole' ? '🕳️' : d.class_name.includes('crack') ? '⚡' : '💧'}
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Transit Fleet Markers */}
          {activeVehicles.map((v) => (
            <AdvancedMarker
              key={v.vehicle_id}
              position={{ lat: v.latitude, lng: v.longitude }}
              title={`Patrol Vehicle ${v.vehicle_id}`}
              onClick={() => {
                setSelectedVehicle(v);
                setSelectedDefect(null);
              }}
              zIndex={1500}
            >
              <div style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                borderRadius: '14px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: '800',
                border: '2px solid #ffffff',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.9)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}>
                <span>🚌 {v.vehicle_id}</span>
                <span style={{ fontSize: '9px', opacity: 0.9, backgroundColor: '#0369a1', padding: '1px 4px', borderRadius: '8px' }}>
                  {v.speed_kmh} km/h
                </span>
              </div>
            </AdvancedMarker>
          ))}

          {/* InfoWindow for Selected Defect */}
          {selectedDefect && (
            <InfoWindow
              position={{ lat: selectedDefect.latitude, lng: selectedDefect.longitude }}
              onCloseClick={() => setSelectedDefect(null)}
            >
              <div style={{
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                fontSize: '12px',
                color: '#0f172a',
                padding: '4px',
                maxWidth: '260px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: selectedDefect.severity === 'Critical' ? '#fee2e2' : '#fef3c7',
                    color: selectedDefect.severity === 'Critical' ? '#b91c1c' : '#b45309'
                  }}>
                    {selectedDefect.severity} Defect
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>
                    {selectedDefect.detection_id}
                  </span>
                </div>

                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', textTransform: 'capitalize' }}>
                  {selectedDefect.class_name.replace(/_/g, ' ')}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', margin: '6px 0', fontSize: '11px', color: '#475569' }}>
                  <div>Confidence: <b>{(selectedDefect.confidence * 100).toFixed(1)}%</b></div>
                  <div>Chainage: <b>{selectedDefect.exact_chainage_m}m</b></div>
                  <div>Dimensions: <b>{selectedDefect.bbox?.estimated_physical_width_cm} × {selectedDefect.bbox?.estimated_physical_length_cm} cm</b></div>
                  <div>Multi-Bus: <b style={{ color: selectedDefect.is_multi_bus_verified ? '#16a34a' : '#64748b' }}>{selectedDefect.is_multi_bus_verified ? 'Verified (2+)' : 'Pending'}</b></div>
                </div>

                <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleDispatchWorkOrder(selectedDefect)}
                    style={{
                      flex: 1,
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Wrench size={12} />
                    <span>Issue Work Order</span>
                  </button>
                  {onOpenAlertModal && (
                    <button
                      onClick={onOpenAlertModal}
                      style={{
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        padding: '5px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Alert
                    </button>
                  )}
                </div>
              </div>
            </InfoWindow>
          )}

          {/* InfoWindow for Selected Vehicle */}
          {selectedVehicle && (
            <InfoWindow
              position={{ lat: selectedVehicle.latitude, lng: selectedVehicle.longitude }}
              onCloseClick={() => setSelectedVehicle(null)}
            >
              <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '12px', color: '#0f172a', padding: '4px' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '800' }}>
                  🚌 {selectedVehicle.vehicle_id} ({selectedVehicle.plate_number})
                </h4>
                <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.5 }}>
                  <div>Type: <b>{selectedVehicle.type}</b></div>
                  <div>Speed: <b>{selectedVehicle.speed_kmh} km/h</b> (Heading: {selectedVehicle.heading_deg}°)</div>
                  <div>Edge AI: <b>{selectedVehicle.edge_device}</b></div>
                  <div>Active Road: <b>{selectedVehicle.current_road}</b></div>
                  <div>Segment: <b>{selectedVehicle.current_segment}</b></div>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
      )}

      {/* Floating Menu Toggle Option Button */}
      <button
        onClick={() => setIsMapMenuOpen((prev) => !prev)}
        style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: isMapMenuOpen ? '#0284c7' : 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(10px)',
          color: '#ffffff',
          border: isMapMenuOpen ? '1px solid #38bdf8' : '1px solid #334155',
          padding: '8px 14px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          transition: 'all 0.15s ease'
        }}
        title="Toggle Road Health & Defect Filter Menu"
      >
        <Layers size={14} color={isMapMenuOpen ? '#ffffff' : '#38bdf8'} />
        <span>{isMapMenuOpen ? 'Hide Menu ✕' : 'Map Menu & Filters ☰'}</span>
        <span style={{
          backgroundColor: isMapMenuOpen ? 'rgba(0,0,0,0.3)' : '#1e293b',
          color: '#38bdf8',
          padding: '1px 6px',
          borderRadius: '4px',
          fontSize: '10px'
        }}>
          {filteredSegments.length}
        </span>
      </button>

      {/* Floating Header & Corridor Controls (Top-Left) */}
      {isMapMenuOpen && (
        <div style={{
          position: 'absolute',
          top: '56px',
          left: '14px',
          zIndex: 1200,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: 'calc(100vw - 28px)',
          maxWidth: '380px',
          maxHeight: 'calc(100vh - 140px)',
          overflowY: 'auto'
        }}>
          {/* Main Filter & Google Traffic Card */}
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '12px 16px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)'
          }}>
            {/* Title Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={15} color="#38bdf8" />
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Corridor Road Health
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700' }}>
                  {filteredSegments.length} Segments
                </span>
                <button
                  onClick={() => setIsMapMenuOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Close Menu"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

          {/* Map Engine Selector Pills */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            <button
              onClick={() => setMapEngine('google')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                backgroundColor: mapEngine === 'google' ? '#0284c7' : '#1e293b',
                color: mapEngine === 'google' ? '#ffffff' : '#94a3b8',
                border: mapEngine === 'google' ? '1px solid #38bdf8' : '1px solid #334155',
                borderRadius: '6px',
                padding: '5px 8px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <span>🗺️ Google Maps</span>
              {apiKey && <span style={{ fontSize: '9px', backgroundColor: '#22c55e', color: '#000', borderRadius: '3px', padding: '0 4px', fontWeight: '800' }}>PRO</span>}
            </button>
            <button
              onClick={() => setMapEngine('leaflet')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                backgroundColor: mapEngine === 'leaflet' ? '#059669' : '#1e293b',
                color: mapEngine === 'leaflet' ? '#ffffff' : '#94a3b8',
                border: mapEngine === 'leaflet' ? '1px solid #10b981' : '1px solid #334155',
                borderRadius: '6px',
                padding: '5px 8px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <span>🌐 OpenStreetMap</span>
              <span style={{ fontSize: '9px', backgroundColor: '#10b981', color: '#000', borderRadius: '3px', padding: '0 4px', fontWeight: '800' }}>FREE</span>
            </button>
          </div>

          {/* Search Corridor / Road */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <Search size={13} style={{ position: 'absolute', top: '7px', left: '8px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search segment (e.g. R001) or road..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '4px 8px 4px 26px',
                fontSize: '11px',
                outline: 'none'
              }}
            />
          </div>

          {/* Filter Pills & Traffic Layer Toggle */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'CRITICAL', label: 'Crit (<40)' },
                { id: 'POOR', label: 'Poor (40-64)' },
                { id: 'GOOD', label: 'Good (65+)' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterGrade(f.id)}
                  style={{
                    backgroundColor: filterGrade === f.id ? '#0284c7' : '#1e293b',
                    color: filterGrade === f.id ? '#ffffff' : '#94a3b8',
                    border: '1px solid #334155',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Google Live Traffic Button */}
            <button
              onClick={() => setShowTraffic((prev) => !prev)}
              style={{
                backgroundColor: showTraffic ? 'rgba(34, 197, 94, 0.2)' : '#1e293b',
                color: showTraffic ? '#22c55e' : '#94a3b8',
                border: showTraffic ? '1px solid #22c55e' : '1px solid #334155',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Car size={11} />
              <span>Traffic {showTraffic ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* PCI Color Scale Legend */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid #1e293b',
            fontSize: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#22c55e' }} />
              <span style={{ color: '#94a3b8' }}>85-100</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#eab308' }} />
              <span style={{ color: '#94a3b8' }}>65-84</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#f97316' }} />
              <span style={{ color: '#94a3b8' }}>40-64</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#ef4444' }} />
              <span style={{ color: '#94a3b8' }}>&lt;40</span>
            </div>
          </div>
        </div>

        {/* Map Engine & API Key Status Badge */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px'
        }}>
          {mapEngine === 'leaflet' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                <Globe size={13} />
                <span style={{ fontWeight: '700' }}>
                  OpenStreetMap Active (Zero Key Needed)
                </span>
              </div>

              <button
                onClick={() => setShowKeyModal(true)}
                style={{
                  backgroundColor: '#1e293b',
                  color: '#38bdf8',
                  border: '1px solid #334155',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Google Key
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: apiKey ? '#22c55e' : '#eab308' }}>
                <Key size={13} />
                <span style={{ fontWeight: '700' }}>
                  {apiKey ? 'Google Maps Connected' : 'Google Maps Demo / Key Needed'}
                </span>
              </div>

              <button
                onClick={() => setShowKeyModal(true)}
                style={{
                  backgroundColor: '#1e293b',
                  color: '#38bdf8',
                  border: '1px solid #334155',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {apiKey ? 'Change Key' : 'Configure Key'}
              </button>
            </>
          )}
        </div>
      </div>
      )}

      {/* Segment Details Inspector Card (Right Drawer) */}
      {selectedSegment && (
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: 'calc(100vw - 32px)',
          maxWidth: '340px',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          zIndex: 1200,
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '16px',
          boxShadow: '0 20px 30px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                Google Maps Corridor Segment
              </div>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '800', color: '#f8fafc' }}>
                {selectedSegment.segment_id}
              </h3>
              <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '600' }}>
                {selectedSegment.road_name} ({selectedSegment.road_id})
              </div>
            </div>

            <button
              onClick={() => setSelectedSegment(null)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* PCI Score Block */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e293b',
            borderRadius: '8px',
            padding: '12px 14px',
            border: '1px solid #334155'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>
                Pavement Condition Index (PCI)
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: '900',
                color: selectedSegment.current_health_score >= 85 ? '#22c55e' : selectedSegment.current_health_score >= 65 ? '#eab308' : selectedSegment.current_health_score >= 40 ? '#f97316' : '#ef4444'
              }}>
                {selectedSegment.current_health_score} / 100
              </div>
            </div>

            <div style={{
              backgroundColor: selectedSegment.current_health_score >= 85 ? '#22c55e22' : selectedSegment.current_health_score >= 65 ? '#eab30822' : '#ef444422',
              color: selectedSegment.current_health_score >= 85 ? '#22c55e' : selectedSegment.current_health_score >= 65 ? '#eab308' : '#ef4444',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: '800',
              fontSize: '12px',
              textTransform: 'uppercase'
            }}>
              {selectedSegment.health_grade}
            </div>
          </div>

          {/* Segment Attributes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            fontSize: '11px'
          }}>
            <div style={{ backgroundColor: '#1e293b', padding: '8px', borderRadius: '6px' }}>
              <span style={{ color: '#64748b' }}>Corridor Chainage</span>
              <div style={{ color: '#f8fafc', fontWeight: '700', marginTop: '2px' }}>
                {selectedSegment.start_chainage_m}m - {selectedSegment.end_chainage_m}m
              </div>
            </div>

            <div style={{ backgroundColor: '#1e293b', padding: '8px', borderRadius: '6px' }}>
              <span style={{ color: '#64748b' }}>Daily Traffic</span>
              <div style={{ color: '#f8fafc', fontWeight: '700', marginTop: '2px' }}>
                {selectedSegment.traffic_volume_vpd?.toLocaleString() || 45000} VPD
              </div>
            </div>

            <div style={{ backgroundColor: '#1e293b', padding: '8px', borderRadius: '6px' }}>
              <span style={{ color: '#64748b' }}>Active Defects</span>
              <div style={{ color: '#ef4444', fontWeight: '700', marginTop: '2px' }}>
                {selectedSegment.active_defect_count} Unresolved
              </div>
            </div>

            <div style={{ backgroundColor: '#1e293b', padding: '8px', borderRadius: '6px' }}>
              <span style={{ color: '#64748b' }}>Corridor Length</span>
              <div style={{ color: '#f8fafc', fontWeight: '700', marginTop: '2px' }}>
                {selectedSegment.length_meters} meters
              </div>
            </div>
          </div>

          {/* Active Defects List on this Segment */}
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '6px' }}>
              Segment Defect Log:
            </div>
            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {defects.filter((d) => d.segment_id === selectedSegment.segment_id).length === 0 ? (
                <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '6px' }}>
                  No active defects recorded for this 100m segment.
                </div>
              ) : (
                defects
                  .filter((d) => d.segment_id === selectedSegment.segment_id)
                  .map((d) => (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDefect(d)}
                      style={{
                        backgroundColor: '#1e293b',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        border: '1px solid #334155'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#f8fafc', textTransform: 'capitalize' }}>
                          {d.class_name.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          Chainage: {d.exact_chainage_m}m · Conf: {(d.confidence * 100).toFixed(0)}%
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: d.severity === 'Critical' ? '#ef444422' : '#f59e0b22',
                          color: d.severity === 'Critical' ? '#ef4444' : '#f59e0b'
                        }}>
                          {d.severity}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Quick Municipal Action */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => {
                const firstDefect = defects.find((d) => d.segment_id === selectedSegment.segment_id);
                if (firstDefect) {
                  handleDispatchWorkOrder(firstDefect);
                } else {
                  alert(`Dispatched maintenance inspection patrol to segment ${selectedSegment.segment_id}`);
                }
              }}
              style={{
                flex: 1,
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '9px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Wrench size={13} />
              <span>Issue Corridor Repair Order</span>
            </button>
          </div>
        </div>
      )}

      {/* Work Order Issued Toast */}
      {workOrderNotice && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#059669',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '800',
          boxShadow: '0 12px 25px rgba(0,0,0,0.6)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <span>{workOrderNotice}</span>
        </div>
      )}

      {/* Google Maps API Key Configuration Modal */}
      {showKeyModal && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#f8fafc' }}>
                  Google Maps Platform Configuration
                </h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Enter your Google Maps Platform API key or get an instant zero-cost <b>Maps Demo Key</b> for prototyping (no billing setup required):
            </p>

            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid #38bdf8',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#38bdf8',
                fontSize: '12px',
                fontWeight: '700',
                textDecoration: 'none',
                marginBottom: '16px'
              }}
            >
              <span>Get Free Google Maps Demo Key (1-Click)</span>
              <ExternalLink size={14} />
            </a>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                API Key:
              </label>
              <input
                type="text"
                placeholder="AIzaSy..."
                defaultValue={apiKey}
                onChange={(e) => setTempKeyInput(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowKeyModal(false)}
                style={{
                  backgroundColor: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveApiKey(tempKeyInput || apiKey)}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Save & Reload Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
