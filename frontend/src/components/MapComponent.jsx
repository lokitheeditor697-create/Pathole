import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';
import { API_BASE } from '../config';

// Distinct colors for up to 8 buses
const BUS_COLORS = [
  '#f59e0b', // amber - BUS_A
  '#06b6d4', // cyan  - BUS_B
  '#a855f7', // violet - BUS_C
  '#ec4899', // pink  - BUS_D
  '#84cc16', // lime  - BUS_E
  '#f97316', // orange - BUS_F
  '#3b82f6', // blue  - BUS_G
  '#14b8a6', // teal  - BUS_H
];

function getBusColor(busId, allBusIds) {
  const idx = allBusIds.indexOf(busId);
  return BUS_COLORS[idx % BUS_COLORS.length];
}

export default function MapComponent({ defects, busPositions = [], selectedDefect, onSelectDefect }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});         // defect pins
  const busMarkersRef = useRef({});      // bus icons
  const routeLayersRef = useRef({});     // bus route polylines
  const userMarkerRef = useRef(null);
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  // All known bus IDs for consistent color assignment
  const allBusIds = busPositions.map(b => b.bus_id).sort();

  // ------- User Geolocation -------
  const locateUser = useCallback((zoomLevel = 16) => {
    if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const map = mapInstanceRef.current;
        if (!map) return;
        setUserCoords({ latitude, longitude });
        map.flyTo([latitude, longitude], zoomLevel, { duration: 1.2 });

        const userIcon = L.divIcon({
          className: '',
          html: `
            <div style="position:relative;width:24px;height:24px;">
              <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(14,165,233,0.3);animation:pulse 1.5s infinite ease-out;"></div>
              <div style="position:absolute;top:4px;left:4px;width:16px;height:16px;border-radius:50%;background:#0284c7;border:2.5px solid #fff;box-shadow:0 0 10px #38bdf8;"></div>
            </div>`,
          iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -16]
        });

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        } else {
          userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 3000 })
            .addTo(map)
            .bindPopup(`
              <div style="font-size:12px;min-width:190px;">
                <strong style="color:#38bdf8;">📱 Your Device (Browser GPS)</strong><br/>
                <span style="color:#94a3b8;font-size:11px;">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</span><br/>
                <span style="color:#64748b;font-size:10px;">±${Math.round(accuracy)}m accuracy</span><br/>
                <span style="color:#f59e0b;font-size:10px;">💡 Defect pins = transit bus detections</span>
              </div>`);
        }
        setLocating(false);
      },
      (err) => { console.warn('Geolocation error:', err.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ------- Init Leaflet -------
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [13.1000, 80.2300], // Mid-point between Kodungaiyur and DG Vaishnav College
      zoom: 13,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
    locateUser(14);
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [locateUser]);

  // ------- Render Real MTC Bus Routes & Landmarks -------
  useEffect(() => {
    let isCancelled = false;

    fetch(`${API_BASE}/bus_routes`)
      .then(res => res.json())
      .then(data => {
        if (isCancelled || !data || !data.routes) return;
        const map = mapInstanceRef.current;
        if (!map) return;

        map.whenReady(() => {
          if (isCancelled || !mapInstanceRef.current) return;

          // Clear existing route layers
          Object.values(routeLayersRef.current).forEach(layer => {
            try { map.removeLayer(layer); } catch (e) {}
          });
          routeLayersRef.current = {};

          Object.entries(data.routes).forEach(([busId, route]) => {
            if (!route.waypoints || route.waypoints.length < 2) return;
            const polyline = L.polyline(route.waypoints, {
              color: route.color || '#38bdf8',
              weight: 3.5,
              opacity: 0.65,
              dashArray: '6, 6'
            }).addTo(map);

            polyline.bindPopup(`
              <div style="font-size:12px;font-family:inherit;min-width:180px;">
                <strong style="color:${route.color};font-size:14px;">🚌 ${busId}</strong>
                <div style="color:#94a3b8;font-size:11px;margin-top:2px;">${route.route_name}</div>
              </div>
            `);

            routeLayersRef.current[busId] = polyline;
          });
        });
      })
      .catch(err => console.warn('Could not load bus routes:', err));

    return () => {
      isCancelled = true;
    };
  }, []);

  // ------- Defect Pins -------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove stale markers
    const currentIds = new Set(defects.map(d => d.id));
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(Number(id))) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    defects.forEach(defect => {
      const isHigh = defect.severity === 'High';
      const isMed = defect.severity === 'Medium';
      const severityClass = isHigh ? 'pin-high' : isMed ? 'pin-medium' : 'pin-low';
      const pinHtml = `
        <div class="custom-pin ${severityClass}">
          ${defect.bus_count > 1 ? `<span style="font-size:11px;font-weight:900;">${defect.bus_count}×</span>` : '!'}
        </div>`;

      const icon = L.divIcon({ className: '', html: pinHtml, iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -14] });
      const popupHtml = buildPopup(defect);

      if (markersRef.current[defect.id]) {
        markersRef.current[defect.id].setLatLng([defect.latitude, defect.longitude]);
        markersRef.current[defect.id].setIcon(icon);
        markersRef.current[defect.id].setPopupContent(popupHtml);
      } else {
        const marker = L.marker([defect.latitude, defect.longitude], { icon }).addTo(map).bindPopup(popupHtml);
        marker.on('click', () => { if (onSelectDefect) onSelectDefect(defect); });
        markersRef.current[defect.id] = marker;
      }
    });

    if (defects.length > 0 && !selectedDefect) {
      const group = L.featureGroup(Object.values(markersRef.current));
      if (Object.keys(markersRef.current).length > 0) {
        map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 15 });
      }
    }
  }, [defects, selectedDefect, userCoords, onSelectDefect]);

  // ------- Bus Live Position Icons -------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove buses that disappeared
    const activeBusIds = new Set(busPositions.map(b => b.bus_id));
    Object.keys(busMarkersRef.current).forEach(bid => {
      if (!activeBusIds.has(bid)) {
        map.removeLayer(busMarkersRef.current[bid]);
        delete busMarkersRef.current[bid];
      }
    });

    busPositions.forEach(bus => {
      const color = getBusColor(bus.bus_id, allBusIds);
      const isActive = bus.active !== false;

      // Extract short route number from bus_id (e.g. "MTC 46G" -> "46G", "BUS_A" -> "A")
      const routeNum = bus.bus_id.includes(' ')
        ? bus.bus_id.split(' ').pop()
        : bus.bus_id.replace('BUS_', '');

      // Compact bus badge showing route number
      const busHtml = `
        <div style="
          min-width:36px;height:28px;
          background:${color};
          border-radius:7px;
          border:2px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.5);
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:900;
          color:#fff;
          padding:0 5px;
          opacity:${isActive ? 1 : 0.45};
          cursor:pointer;
          white-space:nowrap;
          letter-spacing:0.02em;
        ">🚌 ${routeNum}</div>`;

      const icon = L.divIcon({
        className: '',
        html: busHtml,
        iconSize: [52, 28],
        iconAnchor: [26, 14],
        popupAnchor: [0, -16]
      });

      const lastSeen = bus.last_seen
        ? new Date(bus.last_seen * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '—';

      const popupHtml = `
        <div style="font-size:12px;min-width:210px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:7px;border-bottom:1px solid #334155;padding-bottom:5px;">
            <span style="font-size:16px;">🚌</span>
            <div>
              <strong style="color:${color};font-size:15px;">${bus.bus_id}</strong>
              <div style="font-size:10px;color:#64748b;margin-top:1px;">MTC Chennai Bus Service</div>
            </div>
            <span style="margin-left:auto;font-size:10px;padding:2px 6px;border-radius:3px;
              background:${isActive ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.2)'};
              color:${isActive ? '#4ade80' : '#94a3b8'};font-weight:700;white-space:nowrap;">
              ${isActive ? '● ACTIVE' : '○ IDLE'}
            </span>
          </div>
          <div style="color:#94a3b8;font-size:11px;margin-bottom:3px;">
            📍 GPS: <strong style="color:#f8fafc;">${bus.latitude.toFixed(5)}, ${bus.longitude.toFixed(5)}</strong>
          </div>
          <div style="color:#64748b;font-size:10px;">🕐 Last event: ${lastSeen}</div>
        </div>`;

      if (busMarkersRef.current[bus.bus_id]) {
        busMarkersRef.current[bus.bus_id].setLatLng([bus.latitude, bus.longitude]);
        busMarkersRef.current[bus.bus_id].setIcon(icon);
        busMarkersRef.current[bus.bus_id].setPopupContent(popupHtml);
      } else {
        const marker = L.marker([bus.latitude, bus.longitude], { icon, zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup(popupHtml);
        busMarkersRef.current[bus.bus_id] = marker;
      }
    });
  }, [busPositions, allBusIds]);

  // ------- Pan to Selected Defect -------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedDefect) return;
    map.flyTo([selectedDefect.latitude, selectedDefect.longitude], 17, { duration: 1.0 });
    const marker = markersRef.current[selectedDefect.id];
    if (marker) marker.openPopup();
  }, [selectedDefect]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Locate Button */}
      <div style={{ position: 'absolute', top: '12px', left: '56px', zIndex: 1000, display: 'flex', gap: '8px' }}>
        <button
          onClick={() => locateUser(15)}
          disabled={locating}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            backgroundColor: 'rgba(15,23,42,0.9)',
            color: '#38bdf8',
            border: '1px solid #0284c7',
            padding: '7px 12px', borderRadius: '7px',
            fontSize: '12px', fontWeight: '700',
            cursor: locating ? 'default' : 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <Crosshair size={14} className={locating ? 'animate-spin' : ''} />
          {locating ? 'Locating...' : '🎯 My GPS'}
        </button>

        {userCoords && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            backgroundColor: 'rgba(15,23,42,0.85)',
            border: '1px solid #334155',
            padding: '6px 10px', borderRadius: '7px',
            fontSize: '10px', color: '#94a3b8',
            backdropFilter: 'blur(4px)'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#0284c7', flexShrink: 0 }}></span>
            <span>📱 {userCoords.latitude.toFixed(4)}, {userCoords.longitude.toFixed(4)}</span>
          </div>
        )}
      </div>

      {/* Bus Legend (bottom-right) */}
      {busPositions.length > 0 && (
        <div style={{
          position: 'absolute', bottom: '24px', right: '12px', zIndex: 1000,
          backgroundColor: 'rgba(15,23,42,0.9)',
          border: '1px solid #334155', borderRadius: '8px',
          padding: '8px 12px', backdropFilter: 'blur(6px)',
          display: 'flex', flexDirection: 'column', gap: '4px',
          maxWidth: '180px'
        }}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>
            🚌 Live Buses
          </div>
          {busPositions.map(bus => {
            const color = getBusColor(bus.bus_id, allBusIds);
            const isActive = bus.active !== false;
            return (
              <div key={bus.bus_id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '2px',
                  backgroundColor: color, flexShrink: 0,
                  opacity: isActive ? 1 : 0.4
                }}></span>
                <span style={{ color: isActive ? color : '#475569', fontWeight: '600' }}>{bus.bus_id}</span>
                <span style={{ color: '#334155', fontSize: '9px', marginLeft: 'auto' }}>
                  {isActive ? '●' : '○'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Severity Legend (bottom-left) */}
      <div style={{
        position: 'absolute', bottom: '24px', left: '12px', zIndex: 1000,
        backgroundColor: 'rgba(15,23,42,0.85)',
        border: '1px solid #334155',
        padding: '8px 12px', borderRadius: '8px',
        display: 'flex', flexDirection: 'column', gap: '5px',
        fontSize: '11px', backdropFilter: 'blur(4px)'
      }}>
        <div style={{ fontWeight: '700', color: '#64748b', textTransform: 'uppercase', fontSize: '9px', marginBottom: '1px' }}>
          Defect Severity
        </div>
        {[
          { color: '#ef4444', label: 'High (≥ 70%)' },
          { color: '#f97316', label: 'Medium (55–69%)' },
          { color: '#22c55e', label: 'Low (< 55%)' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }}></span>
            <span style={{ color: '#cbd5e1' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildPopup(defect) {
  const sevColor = defect.severity === 'High' ? '#f87171' : defect.severity === 'Medium' ? '#fb923c' : '#4ade80';
  const sevBg = defect.severity === 'High' ? 'rgba(239,68,68,0.15)' : defect.severity === 'Medium' ? 'rgba(249,115,22,0.15)' : 'rgba(34,197,94,0.15)';
  return `
    <div style="min-width:220px;font-family:inherit;font-size:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;border-bottom:1px solid #334155;padding-bottom:5px;">
        <strong style="font-size:14px;color:#f8fafc;text-transform:capitalize;">
          ${defect.defect_type} #${defect.id}
        </strong>
        <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:${sevBg};color:${sevColor};">
          ${defect.severity.toUpperCase()}
        </span>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;color:#cbd5e1;">
        <div><span style="color:#94a3b8;">Confidence:</span> <strong style="color:#f8fafc;">${(defect.confidence * 100).toFixed(1)}%</strong></div>
        <div><span style="color:#94a3b8;">Buses:</span>
          <span style="color:#38bdf8;font-weight:600;"> ${defect.bus_count} (${defect.total_detections} reports)</span>
        </div>
        <div style="font-family:monospace;font-size:10px;background:#0f172a;padding:2px 5px;border-radius:3px;color:#60a5fa;">
          ${defect.bus_ids}
        </div>
        <div style="font-size:10px;color:#64748b;">📍 ${defect.latitude.toFixed(6)}, ${defect.longitude.toFixed(6)}</div>
        <div style="font-size:10px;color:#475569;">🕐 ${new Date(defect.last_detected).toLocaleTimeString()}</div>
      </div>
    </div>`;
}
