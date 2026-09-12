import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function LeafletRoadHealthMap({
  segments = [],
  selectedSegment,
  onSelectSegment,
  defects = [],
  selectedDefect,
  onSelectDefect,
  vehicles = [],
  _selectedVehicle,
  onSelectVehicle,
  onDispatchWorkOrder,
  onOpenAlertModal
}) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylinesLayerRef = useRef(null);
  const defectsLayerRef = useRef(null);
  const vehiclesLayerRef = useRef(null);

  // Helper for segment health color
  const getGradeColor = (pci) => {
    if (pci >= 85) return '#22c55e'; // Good
    if (pci >= 65) return '#eab308'; // Fair
    if (pci >= 40) return '#f97316'; // Poor
    return '#ef4444'; // Critical
  };

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(containerRef.current, {
      center: [13.0827, 80.2330],
      zoom: 13,
      zoomControl: false
    });

    // High performance CartoDB Voyager Tile Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    polylinesLayerRef.current = L.layerGroup().addTo(map);
    defectsLayerRef.current = L.layerGroup().addTo(map);
    vehiclesLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Road Segments
  useEffect(() => {
    if (!mapInstanceRef.current || !polylinesLayerRef.current) return;
    const layer = polylinesLayerRef.current;
    layer.clearLayers();

    segments.forEach((seg) => {
      const isSelected = selectedSegment?.segment_id === seg.segment_id;
      const color = getGradeColor(seg.current_health_score);

      const polyline = L.polyline(
        [
          [seg.start_lat, seg.start_lon],
          [seg.end_lat, seg.end_lon]
        ],
        {
          color: color,
          weight: isSelected ? 8 : 5,
          opacity: isSelected ? 1.0 : 0.85
        }
      );

      polyline.on('mouseover', () => {
        polyline.setStyle({ weight: isSelected ? 9 : 7, opacity: 1.0 });
      });

      polyline.on('mouseout', () => {
        polyline.setStyle({ weight: isSelected ? 8 : 5, opacity: isSelected ? 1.0 : 0.85 });
      });

      polyline.on('click', () => {
        if (onSelectSegment) onSelectSegment(seg);
      });

      layer.addLayer(polyline);
    });
  }, [segments, selectedSegment, onSelectSegment]);

  // Update Defects
  useEffect(() => {
    if (!mapInstanceRef.current || !defectsLayerRef.current) return;
    const layer = defectsLayerRef.current;
    layer.clearLayers();

    defects.forEach((d) => {
      const isMulti = d.is_multi_bus_verified;
      const isCrit = d.severity === 'Critical';
      const markerColor = isMulti ? '#22c55e' : isCrit ? '#ef4444' : '#f59e0b';
      const iconEmoji = d.class_name === 'pothole' ? '🕳️' : d.class_name.includes('crack') ? '⚡' : '💧';

      const customIcon = L.divIcon({
        className: 'leaflet-custom-marker',
        html: `
          <div style="position: relative; width: 26px; height: 26px; cursor: pointer;">
            <div style="
              position: absolute;
              inset: 0;
              border-radius: 50%;
              background-color: ${markerColor}44;
              ${isMulti || isCrit ? 'animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;' : ''}
            "></div>
            <div style="
              position: absolute;
              top: 4px;
              left: 4px;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background-color: ${markerColor};
              border: 2px solid #ffffff;
              box-shadow: 0 0 10px ${markerColor};
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
            ">
              ${iconEmoji}
            </div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([d.latitude, d.longitude], { icon: customIcon });

      marker.on('click', () => {
        if (onSelectDefect) onSelectDefect(d);
      });

      const popupContent = document.createElement('div');
      popupContent.style.fontFamily = 'ui-sans-serif, system-ui, sans-serif';
      popupContent.style.fontSize = '12px';
      popupContent.style.color = '#0f172a';
      popupContent.style.padding = '4px';
      popupContent.style.maxWidth = '250px';

      popupContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: 4px;
            background-color: ${d.severity === 'Critical' ? '#fee2e2' : '#fef3c7'};
            color: ${d.severity === 'Critical' ? '#b91c1c' : '#b45309'};
          ">
            ${d.severity} Defect
          </span>
          <span style="font-size: 10px; color: #64748b; font-weight: 700;">
            ${d.detection_id || ''}
          </span>
        </div>
        <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 800; text-transform: capitalize;">
          ${(d.class_name || '').replace(/_/g, ' ')}
        </h4>
        <div style="font-size: 11px; color: #475569; line-height: 1.5; margin-bottom: 8px;">
          <div>Corridor: <b>${d.road_name || 'EVR Periyar Salai'}</b></div>
          <div>Chainage: <b>${d.exact_chainage_m || 340}m</b></div>
          <div>Dimensions: <b>${d.bbox?.estimated_physical_width_cm || 52} × ${d.bbox?.estimated_physical_length_cm || 38} cm</b></div>
          <div>Multi-Bus: <b style="color: ${d.is_multi_bus_verified ? '#16a34a' : '#64748b'};">${d.is_multi_bus_verified ? 'Verified (2+)' : 'Pending'}</b></div>
        </div>
        <div id="popup-actions" style="display: flex; gap: 6px;"></div>
      `;

      const actionsContainer = popupContent.querySelector('#popup-actions');
      if (actionsContainer && onDispatchWorkOrder) {
        const btnWork = document.createElement('button');
        btnWork.innerText = 'Issue Work Order';
        btnWork.style.flex = '1';
        btnWork.style.backgroundColor = '#0284c7';
        btnWork.style.color = '#ffffff';
        btnWork.style.border = 'none';
        btnWork.style.padding = '5px 8px';
        btnWork.style.borderRadius = '4px';
        btnWork.style.fontSize = '10px';
        btnWork.style.fontWeight = '700';
        btnWork.style.cursor = 'pointer';
        btnWork.onclick = () => onDispatchWorkOrder(d);
        actionsContainer.appendChild(btnWork);

        if (onOpenAlertModal) {
          const btnAlert = document.createElement('button');
          btnAlert.innerText = 'Alert';
          btnAlert.style.backgroundColor = '#ef4444';
          btnAlert.style.color = '#ffffff';
          btnAlert.style.border = 'none';
          btnAlert.style.padding = '5px 8px';
          btnAlert.style.borderRadius = '4px';
          btnAlert.style.fontSize = '10px';
          btnAlert.style.fontWeight = '700';
          btnAlert.style.cursor = 'pointer';
          btnAlert.onclick = onOpenAlertModal;
          actionsContainer.appendChild(btnAlert);
        }
      }

      marker.bindPopup(popupContent);
      layer.addLayer(marker);
    });
  }, [defects, onSelectDefect, onDispatchWorkOrder, onOpenAlertModal]);

  // Update Patrol Vehicles
  useEffect(() => {
    if (!mapInstanceRef.current || !vehiclesLayerRef.current) return;
    const layer = vehiclesLayerRef.current;
    layer.clearLayers();

    vehicles.forEach((v) => {
      const customIcon = L.divIcon({
        className: 'leaflet-vehicle-marker',
        html: `
          <div style="
            background-color: #0284c7;
            color: #ffffff;
            border-radius: 14px;
            padding: 3px 9px;
            font-size: 11px;
            font-weight: 800;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 12px rgba(2, 132, 199, 0.8);
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            white-space: nowrap;
          ">
            <span>🚌 ${v.vehicle_id}</span>
            <span style="font-size: 9px; opacity: 0.9; background-color: #0369a1; padding: 1px 4px; border-radius: 8px;">
              ${v.speed_kmh} km/h
            </span>
          </div>
        `,
        iconSize: [110, 26],
        iconAnchor: [55, 13]
      });

      const marker = L.marker([v.latitude, v.longitude], { icon: customIcon });

      marker.on('click', () => {
        if (onSelectVehicle) onSelectVehicle(v);
      });

      marker.bindPopup(`
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; color: #0f172a; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 800;">🚌 ${v.vehicle_id} (${v.plate_number})</h4>
          <div style="font-size: 11px; color: #475569; line-height: 1.5;">
            <div>Speed: <b>${v.speed_kmh} km/h</b> (Heading: ${v.heading_deg}°)</div>
            <div>Edge AI: <b>${v.edge_device}</b></div>
            <div>Corridor: <b>${v.current_road}</b></div>
            <div>Segment: <b>${v.current_segment}</b></div>
          </div>
        </div>
      `);

      layer.addLayer(marker);
    });
  }, [vehicles, onSelectVehicle]);

  // Pan to selected defect or segment
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (selectedDefect?.latitude && selectedDefect?.longitude) {
      mapInstanceRef.current.panTo([selectedDefect.latitude, selectedDefect.longitude]);
    } else if (selectedSegment?.start_lat) {
      mapInstanceRef.current.panTo([
        (selectedSegment.start_lat + selectedSegment.end_lat) / 2,
        (selectedSegment.start_lon + selectedSegment.end_lon) / 2
      ]);
    }
  }, [selectedDefect, selectedSegment]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#090d16'
      }}
    />
  );
}
