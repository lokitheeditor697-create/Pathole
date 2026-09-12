import React from 'react';
import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';

export default function DefectBarChart({ stats, defects = [] }) {
  const typeCounts = stats.type_counts || {};
  const severityCounts = stats.severity_counts || {};
  const totalDefects = stats.total_defects || 0;
  const multiVerified = stats.multi_bus_verified || 0;

  const typeEntries = Object.entries(typeCounts);
  const maxTypeCount = Math.max(...Object.values(typeCounts), 1);

  const highCount = severityCounts['High'] || 0;
  const medCount = severityCounts['Medium'] || 0;
  const lowCount = severityCounts['Low'] || 0;

  // Average confidence across all defects
  const avgConf = defects.length > 0
    ? defects.reduce((sum, d) => sum + d.confidence, 0) / defects.length
    : 0;

  return (
    <div style={{
      backgroundColor: '#1e293b',
      borderTop: '1px solid #334155',
      padding: '12px 18px',
      flexShrink: 0
    }}>
      {/* Row header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={16} color="#38bdf8" />
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>
            Detection Analytics
          </span>
        </div>
        <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: '#64748b' }}>
          <span>
            <strong style={{ color: '#38bdf8' }}>{totalDefects}</strong> total
          </span>
          <span>
            <strong style={{ color: '#4ade80' }}>{multiVerified}</strong> multi-bus
          </span>
          {avgConf > 0 && (
            <span>
              avg conf <strong style={{ color: '#f8fafc' }}>{(avgConf * 100).toFixed(1)}%</strong>
            </span>
          )}
        </div>
      </div>

      {totalDefects === 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#475569',
          padding: '8px 0'
        }}>
          <AlertTriangle size={14} style={{ opacity: 0.5 }} />
          No defect data yet — start the detector to begin ingesting road events.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          {/* Type Distribution */}
          <div style={{
            backgroundColor: '#0f172a',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              By Defect Type
            </div>
            {typeEntries.length === 0 ? (
              <div style={{ fontSize: '11px', color: '#334155' }}>No data</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {typeEntries.map(([type, count]) => {
                  const pct = Math.round((count / maxTypeCount) * 100);
                  return (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                        <span style={{ textTransform: 'capitalize', color: '#f8fafc', fontWeight: '600' }}>{type}</span>
                        <span style={{ color: '#38bdf8', fontWeight: '700' }}>{count}</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          backgroundColor: '#38bdf8',
                          borderRadius: '3px',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Severity Distribution */}
          <div style={{
            backgroundColor: '#0f172a',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Severity Split
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {[
                { label: 'High (≥70%)', color: '#ef4444', count: highCount },
                { label: 'Medium (55–69%)', color: '#f97316', count: medCount },
                { label: 'Low (<55%)', color: '#22c55e', count: lowCount },
              ].map(sev => {
                const pct = totalDefects > 0 ? Math.round((sev.count / totalDefects) * 100) : 0;
                return (
                  <div key={sev.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                      <span style={{ color: sev.color, fontWeight: '600' }}>{sev.label}</span>
                      <span style={{ color: '#f8fafc', fontWeight: '700' }}>
                        {sev.count} <span style={{ color: '#475569', fontSize: '10px' }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: sev.color,
                        borderRadius: '3px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verification Breakdown */}
          <div style={{
            backgroundColor: '#0f172a',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Verification Status
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {[
                { label: '✓ Multi-Bus Confirmed', color: '#4ade80', count: multiVerified },
                { label: '? Single Bus (Pending)', color: '#f59e0b', count: totalDefects - multiVerified },
              ].map(v => {
                const pct = totalDefects > 0 ? Math.round((v.count / totalDefects) * 100) : 0;
                return (
                  <div key={v.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                      <span style={{ color: v.color, fontWeight: '600' }}>{v.label}</span>
                      <span style={{ color: '#f8fafc', fontWeight: '700' }}>
                        {v.count} <span style={{ color: '#475569', fontSize: '10px' }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: v.color,
                        borderRadius: '3px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
              {/* Average confidence gauge */}
              {avgConf > 0 && (
                <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                    <span style={{ color: '#38bdf8', fontWeight: '600' }}>Avg Confidence</span>
                    <span style={{ color: '#f8fafc', fontWeight: '700' }}>{(avgConf * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.round(avgConf * 100)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                      borderRadius: '3px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
