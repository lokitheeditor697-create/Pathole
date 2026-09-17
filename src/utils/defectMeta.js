/**
 * Unified Defect Classification & Metadata Helper
 * Provides standard RDD2022 codes, readable names, badge styles, and descriptions.
 */

export const DEFECT_META_REGISTRY = {
  pothole: {
    key: 'pothole',
    name: 'Pothole',
    code: 'D40',
    fullLabel: 'Pothole (D40)',
    prefix: 'PTH',
    category: 'Surface Void / Cavity',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    textColor: '#fca5a5',
    description: 'Bowl-shaped road depression caused by wear and moisture ingress',
    icon: '🕳️'
  },
  longitudinal_crack: {
    key: 'longitudinal_crack',
    name: 'Longitudinal Crack',
    code: 'D00',
    fullLabel: 'Longitudinal Crack (D00)',
    prefix: 'LCRK',
    category: 'Structural Linear Crack',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: '#f97316',
    textColor: '#fdba74',
    description: 'Cracks running parallel to road centerline along wheel paths',
    icon: '⚡'
  },
  transverse_crack: {
    key: 'transverse_crack',
    name: 'Transverse Crack',
    code: 'D01',
    fullLabel: 'Transverse Crack (D01)',
    prefix: 'TCRK',
    category: 'Thermal / Shrinkage Crack',
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#eab308',
    textColor: '#fde047',
    description: 'Cracks running perpendicular to traffic direction across pavement',
    icon: '➖'
  },
  alligator_crack: {
    key: 'alligator_crack',
    name: 'Alligator Fatigue Crack',
    code: 'D20',
    fullLabel: 'Alligator Fatigue Crack (D20)',
    prefix: 'ACRK',
    category: 'Structural Fatigue',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#a855f7',
    textColor: '#d8b4fe',
    description: 'Interconnected crocodile-skin cracking due to heavy axle loads',
    icon: '🕸️'
  },
  crack: {
    key: 'crack',
    name: 'Surface Crack',
    code: 'D00/D01',
    fullLabel: 'Surface Crack (D00/D01)',
    prefix: 'CRK',
    category: 'Surface Crack',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
    textColor: '#fcd34d',
    description: 'General pavement surface fissure requiring sealing',
    icon: '〰️'
  },
  road_patch: {
    key: 'road_patch',
    name: 'Road Patch Deterioration',
    code: 'D44',
    fullLabel: 'Road Patch / Deterioration (D44)',
    prefix: 'PTCH',
    category: 'Pavement Patch',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3b82f6',
    textColor: '#93c5fd',
    description: 'Previous utility trench or asphalt patch with edge raveling',
    icon: '🩹'
  },
  rutting: {
    key: 'rutting',
    name: 'Rutting / Depression',
    code: 'D30',
    fullLabel: 'Rutting / Wheel Depression (D30)',
    prefix: 'RUT',
    category: 'Deformation',
    color: '#f43f5e',
    bgColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: '#f43f5e',
    textColor: '#fda4af',
    description: 'Permanent wheel-track depression affecting vehicle handling',
    icon: '📉'
  },
  // Road Doctor (RoadGuard 9-Class) specific classes
  minor_pothole: {
    key: 'minor_pothole',
    name: 'Minor Pothole',
    code: 'D40-MIN',
    fullLabel: 'Minor Pothole (D40-MIN)',
    prefix: 'PTH',
    category: 'Surface Void / Cavity',
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#eab308',
    textColor: '#fde047',
    description: 'Shallow road depression (<25mm depth) requiring preventive slurry patching',
    icon: '🕳️'
  },
  moderate_pothole: {
    key: 'moderate_pothole',
    name: 'Moderate Pothole',
    code: 'D40-MOD',
    fullLabel: 'Moderate Pothole (D40-MOD)',
    prefix: 'PTH',
    category: 'Surface Void / Cavity',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: '#f97316',
    textColor: '#fdba74',
    description: 'Medium depth pothole (25-50mm) causing vehicle vibration and tire wear',
    icon: '🕳️'
  },
  major_pothole: {
    key: 'major_pothole',
    name: 'Major Pothole',
    code: 'D40-MAJ',
    fullLabel: 'Major Critical Pothole (D40-MAJ)',
    prefix: 'PTH',
    category: 'Severe Cavity Hazard',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    textColor: '#fca5a5',
    description: 'Severe deep asphalt void (>50mm depth) posing immediate vehicle damage hazard',
    icon: '🚨'
  },
  low_cracking: {
    key: 'low_cracking',
    name: 'Low Surface Cracking',
    code: 'D00-L',
    fullLabel: 'Low Surface Cracking (D00-L)',
    prefix: 'CRK',
    category: 'Surface Crack',
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#eab308',
    textColor: '#fde047',
    description: 'Early hairline pavement fissures requiring seal coating',
    icon: '〰️'
  },
  medium_cracking: {
    key: 'medium_cracking',
    name: 'Medium Cracking',
    code: 'D00-M',
    fullLabel: 'Medium Cracking (D00-M)',
    prefix: 'CRK',
    category: 'Structural Crack',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: '#f97316',
    textColor: '#fdba74',
    description: 'Interconnected crack networks requiring routed mastic joint sealing',
    icon: '⚡'
  },
  high_cracking: {
    key: 'high_cracking',
    name: 'High Severe Cracking',
    code: 'D00-H',
    fullLabel: 'High Severe Cracking (D00-H)',
    prefix: 'CRK',
    category: 'Severe Structural Crack',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    textColor: '#fca5a5',
    description: 'Critical structural cracking and base failure requiring deep milling & resurfacing',
    icon: '💥'
  },
  minor_edge_break: {
    key: 'minor_edge_break',
    name: 'Minor Edge Break',
    code: 'D42-MIN',
    fullLabel: 'Minor Edge Break (D42-MIN)',
    prefix: 'EDG',
    category: 'Pavement Edge Defect',
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#eab308',
    textColor: '#fde047',
    description: 'Shoulder edge raveling and crumbling along pavement boundary',
    icon: '📐'
  },
  moderate_edge_break: {
    key: 'moderate_edge_break',
    name: 'Moderate Edge Break',
    code: 'D42-MOD',
    fullLabel: 'Moderate Edge Break (D42-MOD)',
    prefix: 'EDG',
    category: 'Pavement Edge Defect',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: '#f97316',
    textColor: '#fdba74',
    description: 'Significant pavement edge drop-off and asphalt shear fracture',
    icon: '📐'
  },
  modrate_edge_break: {
    key: 'modrate_edge_break',
    name: 'Moderate Edge Break',
    code: 'D42-MOD',
    fullLabel: 'Moderate Edge Break (D42-MOD)',
    prefix: 'EDG',
    category: 'Pavement Edge Defect',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: '#f97316',
    textColor: '#fdba74',
    description: 'Significant pavement edge drop-off and asphalt shear fracture',
    icon: '📐'
  },
  major_edge_break: {
    key: 'major_edge_break',
    name: 'Major Edge Break',
    code: 'D42-MAJ',
    fullLabel: 'Major Edge Break (D42-MAJ)',
    prefix: 'EDG',
    category: 'Severe Edge Hazard',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    textColor: '#fca5a5',
    description: 'Critical pavement shoulder collapse and sub-base undermining',
    icon: '🚨'
  },
  speed_bump: {
    key: 'speed_bump',
    name: 'Speed Bump / Hump',
    code: 'D60',
    fullLabel: 'Speed Bump / Hump (D60)',
    prefix: 'BMP',
    category: 'Traffic Calming',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#a855f7',
    textColor: '#d8b4fe',
    description: 'Raised asphalt speed breaker or traffic calming hump',
    icon: '🚗'
  },
  speedbump: {
    key: 'speedbump',
    name: 'Speed Bump / Hump',
    code: 'D60',
    fullLabel: 'Speed Bump / Hump (D60)',
    prefix: 'BMP',
    category: 'Traffic Calming',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#a855f7',
    textColor: '#d8b4fe',
    description: 'Raised asphalt speed breaker or traffic calming hump',
    icon: '🚗'
  },
  crack_severe: {
    key: 'crack_severe',
    name: 'Severe Structural Crack',
    code: 'D02',
    fullLabel: 'Severe Structural Crack (D02)',
    prefix: 'SCRK',
    category: 'Severe Structural Crack',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    textColor: '#fca5a5',
    description: 'Wide structural fracture (>10mm aperture) risking immediate water ingress',
    icon: '⚡'
  },
  waterlogging: {
    key: 'waterlogging',
    name: 'Waterlogging / Ponding',
    code: 'D50',
    fullLabel: 'Waterlogging / Drainage Ponding (D50)',
    prefix: 'WLOG',
    category: 'Drainage Hazard',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: '#06b6d4',
    textColor: '#67e8f9',
    description: 'Surface water accumulation risking hydroplaning and sub-base weakening',
    icon: '🌊'
  }
};

export function getDefectMeta(className) {
  if (!className) return DEFECT_META_REGISTRY.pothole;
  const key = String(className).toLowerCase().trim().replace(/[\s-]+/g, '_');
  return (
    DEFECT_META_REGISTRY[key] || {
      key,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      code: 'DST',
      fullLabel: key.replace(/_/g, ' ').toUpperCase(),
      prefix: 'DST',
      category: 'Road Distress',
      color: '#94a3b8',
      bgColor: 'rgba(148, 163, 184, 0.15)',
      borderColor: '#64748b',
      textColor: '#cbd5e1',
      description: 'Pavement distress requiring municipal maintenance',
      icon: '⚠️'
    }
  );
}

export function formatDefectId(idOrTrack, className) {
  const meta = getDefectMeta(className);
  if (typeof idOrTrack === 'string' && idOrTrack.includes('-#')) {
    return idOrTrack;
  }
  const num = typeof idOrTrack === 'number' ? idOrTrack : parseInt(idOrTrack, 10) || 1;
  return `${meta.prefix}-#${String(num).padStart(2, '0')}`;
}
