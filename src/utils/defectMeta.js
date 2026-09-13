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
