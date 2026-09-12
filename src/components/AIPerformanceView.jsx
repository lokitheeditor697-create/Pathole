import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid
} from 'recharts';
import { Cpu } from 'lucide-react';
import { API_BASE } from '../config';

export default function AIPerformanceView() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/model-performance`)
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data);
      })
      .catch(() => {});
  }, []);

  const chartData = metrics?.classes?.map((cls) => {
    const p = metrics.per_class_metrics[cls];
    return {
      class: cls.replace('_', ' '),
      mAP50: Math.round(p.mAP50 * 100),
      precision: Math.round(p.precision * 100),
      recall: Math.round(p.recall * 100),
      samples: p.samples || 800,
    };
  }) || [];

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
      {/* Header Banner */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            padding: '10px',
            borderRadius: '10px'
          }}>
            <Cpu size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>
                YOLOv8-road-v1 Model Governance
              </h2>
              <span style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '9999px',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                PRODUCTION READY
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Fine-tuned on RDD2022 + Chennai Municipal Patrols with Route-Based Validation Splitting.
            </p>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'right' }}>
          <div>Framework: <strong style={{ color: '#f8fafc' }}>Ultralytics YOLOv8 / PyTorch</strong></div>
          <div>Total Trained Images: <strong style={{ color: '#38bdf8' }}>6,420 frames</strong></div>
        </div>
      </div>

      {/* Global Metrics KPI Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        <MetricCard label="mAP @ 50" value="89.4%" sub="Mean Average Precision" color="#38bdf8" />
        <MetricCard label="mAP @ 50-95" value="68.2%" sub="Strict IoU Thresholds" color="#818cf8" />
        <MetricCard label="Precision" value="88.7%" sub="Positive Predictive Value" color="#4ade80" />
        <MetricCard label="Recall" value="91.2%" sub="Defect Capture Coverage" color="#facc15" />
        <MetricCard label="F1 Score" value="89.9%" sub="Harmonic Mean" color="#fb923c" />
      </div>

      {/* Chart: Per-Class Accuracy Metrics */}
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
              Per-Class Validation Accuracy (%) across 7 Phase 1 Defect Classes
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Evaluated on isolated test routes to prevent consecutive dashcam frame leakage.
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="class" stroke="#94a3b8" fontSize={11} angle={-15} textAnchor="end" />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[70, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#f8fafc'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="mAP50" fill="#38bdf8" name="mAP @ 50 (%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="precision" fill="#4ade80" name="Precision (%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recall" fill="#facc15" name="Recall (%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Confusion Matrix & Dataset Architecture Table */}
      <div className="ai-metrics-grid">
        {/* Confusion Matrix */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '10px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
            Confusion Matrix (Validation Split)
          </h3>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
            Diagonal highlights strong class discrimination with minimal cross-crack confusion.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
              textAlign: 'center'
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Ground Truth</th>
                  {metrics?.classes?.map((c) => (
                    <th key={c} style={{ padding: '6px' }}>{c.slice(0, 4)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics?.confusion_matrix?.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '6px', textAlign: 'left', fontWeight: '600', color: '#cbd5e1' }}>
                      {metrics.classes[i]?.replace('_', ' ')}
                    </td>
                    {row.map((val, j) => {
                      const isDiag = i === j;
                      return (
                        <td
                          key={j}
                          style={{
                            padding: '6px',
                            backgroundColor: isDiag ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                            color: isDiag ? '#38bdf8' : val > 10 ? '#f87171' : '#64748b',
                            fontWeight: isDiag ? '700' : 'normal'
                          }}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dataset Governance Card */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '10px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
            Dataset &amp; Split Governance
          </h3>

          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '11px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Training Set (80%):</span>
              <strong style={{ color: '#4ade80' }}>5,136 frames</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Validation Set (10%):</span>
              <strong style={{ color: '#38bdf8' }}>642 frames</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Test Holdout (10%):</span>
              <strong style={{ color: '#fb923c' }}>642 frames</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Negative Asphalt Ratio:</span>
              <strong style={{ color: '#f8fafc' }}>12.0% clean pavement</strong>
            </div>
          </div>

          <div style={{
            fontSize: '11px',
            color: '#94a3b8',
            lineHeight: 1.5,
            borderLeft: '3px solid #0284c7',
            paddingLeft: '10px'
          }}>
            <strong>Leakage Prevention:</strong> Consecutive dashcam video frames share identical background features.
            Data splits are partitioned by transit route corridors rather than random frame sampling.
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{
      backgroundColor: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: '8px',
      padding: '12px 14px'
    }}>
      <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: '800', color: color, margin: '2px 0' }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{sub}</div>
    </div>
  );
}
