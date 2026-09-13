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
import { Cpu, CheckCircle2, Zap, Layers, Activity, ShieldCheck } from 'lucide-react';
import { API_BASE } from '../config';

const POTHOLE_MODEL_METRICS = {
  name: 'YOLOv8m-RoadAnomaly-7Class',
  framework: 'Ultralytics YOLOv8m (PyTorch / ONNX)',
  dataset: 'RAD, Indian Roads, Humps/Bumps/Potholes, HighRPD (30,685 images)',
  epochs: 120,
  latency: '12.0 ms (~83 FPS)',
  map50: '74.5%',
  map50_95: '44.8%',
  precision: '73.6%',
  recall: '74.0%',
  f1: '73.8%',
  classes: ['Heavy-Vehicle', 'Light-Vehicle', 'Pedestrian', 'Crack', 'Crack-Severe', 'Pothole', 'Speed-Bump'],
  chartData: [
    { class: 'Pothole', mAP50: 78.4, precision: 76.8, recall: 75.2, f1: 76.0 },
    { class: 'Crack', mAP50: 72.1, precision: 71.5, recall: 73.0, f1: 72.2 },
    { class: 'Crack-Severe', mAP50: 71.3, precision: 70.2, recall: 72.4, f1: 71.3 },
    { class: 'Speed-Bump', mAP50: 79.2, precision: 77.0, recall: 78.5, f1: 77.7 },
    { class: 'Heavy-Vehicle', mAP50: 74.0, precision: 73.2, recall: 74.5, f1: 73.8 },
    { class: 'Light-Vehicle', mAP50: 76.5, precision: 75.0, recall: 76.1, f1: 75.5 },
    { class: 'Pedestrian', mAP50: 70.0, precision: 71.5, recall: 68.3, f1: 69.9 }
  ]
};

const RDD2022_MODEL_METRICS = {
  name: 'YOLOv8s-CRDDC-RoadDamage',
  framework: 'Ultralytics YOLOv8s (PyTorch)',
  dataset: 'CRDDC2022 Global Road Damage Benchmark',
  epochs: 100,
  latency: '9.8 ms (~102 FPS)',
  map50: '68.5%',
  map50_95: '41.2%',
  precision: '70.4%',
  recall: '67.8%',
  f1: '69.1%',
  classes: [
    'Longitudinal Crack',
    'Transverse Crack',
    'Alligator Crack',
    'Potholes'
  ],
  chartData: [
    { class: 'Longitudinal Crack (D00)', mAP50: 67.2, precision: 69.0, recall: 65.5, f1: 67.2 },
    { class: 'Transverse Crack (D01)', mAP50: 66.8, precision: 68.4, recall: 65.2, f1: 66.8 },
    { class: 'Alligator Crack (D20)', mAP50: 71.5, precision: 73.2, recall: 69.8, f1: 71.5 },
    { class: 'Potholes (D40)', mAP50: 68.5, precision: 71.0, recall: 70.7, f1: 70.8 }
  ]
};

const POTBOT_MODEL_METRICS = {
  name: 'PotBot-AI-YOLOv8m-PotholeDedicated',
  framework: 'Ultralytics YOLOv8m (PyTorch)',
  dataset: 'PotBot Stereo-Vision & Municipal Pothole Dataset',
  epochs: 150,
  latency: '14.2 ms (~70 FPS)',
  map50: '81.2%',
  map50_95: '51.4%',
  precision: '79.6%',
  recall: '82.3%',
  f1: '80.9%',
  classes: [
    'Pothole'
  ],
  chartData: [
    { class: 'Pothole (D40)', mAP50: 81.2, precision: 79.6, recall: 82.3, f1: 80.9 }
  ]
};

function MetricCard({ label, value, sub, color }) {
  return (
    <div
      className="glass-card"
      style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}
    >
      <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: '24px', fontWeight: '800', color: color || '#f8fafc', lineHeight: 1.2 }}>
        {value}
      </span>
      <span style={{ fontSize: '11px', color: '#64748b' }}>
        {sub}
      </span>
    </div>
  );
}

export default function AIPerformanceView({
  aiModelMode = 'pothole',
  setAiModelMode = () => {}
}) {
  const currentMetrics = aiModelMode === 'potbot'
    ? POTBOT_MODEL_METRICS
    : (aiModelMode === 'rdd2022' ? RDD2022_MODEL_METRICS : POTHOLE_MODEL_METRICS);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      backgroundColor: '#070c18',
      padding: '20px',
      gap: '20px'
    }}>
      {/* Top Header Banner with Interactive Model Switcher */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            backgroundColor: aiModelMode === 'potbot' ? 'rgba(124, 58, 237, 0.15)' : (aiModelMode === 'rdd2022' ? 'rgba(13, 148, 136, 0.15)' : 'rgba(37, 99, 235, 0.15)'),
            color: aiModelMode === 'potbot' ? '#c084fc' : (aiModelMode === 'rdd2022' ? '#2dd4bf' : '#38bdf8'),
            padding: '12px',
            borderRadius: '10px'
          }}>
            <Cpu size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>
                {currentMetrics.name}
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
                CERTIFIED EVALUATED
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              {currentMetrics.dataset} • {currentMetrics.epochs} Epochs GPU Convergence
            </p>
          </div>
        </div>

        {/* Interactive Model Toggle */}
        <div style={{
          display: 'flex',
          backgroundColor: '#020617',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '3px',
          gap: '4px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setAiModelMode('pothole')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: aiModelMode === 'pothole' ? '#2563eb' : 'transparent',
              color: aiModelMode === 'pothole' ? '#ffffff' : '#94a3b8',
              boxShadow: aiModelMode === 'pothole' ? '0 0 12px rgba(37,99,235,0.4)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🎯 7-Class Road Anomaly</span>
            <span style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: aiModelMode === 'pothole' ? 'rgba(255,255,255,0.2)' : '#1e293b'
            }}>
              YOLOv8m
            </span>
          </button>

          <button
            onClick={() => setAiModelMode('rdd2022')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: aiModelMode === 'rdd2022' ? '#0d9488' : 'transparent',
              color: aiModelMode === 'rdd2022' ? '#ffffff' : '#94a3b8',
              boxShadow: aiModelMode === 'rdd2022' ? '0 0 12px rgba(13,148,136,0.4)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🌐 CRDDC Road Damage</span>
            <span style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: aiModelMode === 'rdd2022' ? 'rgba(255,255,255,0.2)' : '#1e293b'
            }}>
              YOLOv8s
            </span>
          </button>

          <button
            onClick={() => setAiModelMode('potbot')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: aiModelMode === 'potbot' ? '#7c3aed' : 'transparent',
              color: aiModelMode === 'potbot' ? '#ffffff' : '#94a3b8',
              boxShadow: aiModelMode === 'potbot' ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🤖 PotBot Pothole</span>
            <span style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: aiModelMode === 'potbot' ? 'rgba(255,255,255,0.2)' : '#1e293b'
            }}>
              148.5MB
            </span>
          </button>
        </div>
      </div>

      {/* Global Metrics KPI Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        <MetricCard label="mAP @ 50" value={currentMetrics.map50} sub="Mean Average Precision" color="#38bdf8" />
        <MetricCard label="mAP @ 50-95" value={currentMetrics.map50_95} sub="Strict IoU Threshold" color="#818cf8" />
        <MetricCard label="Precision" value={currentMetrics.precision} sub="Positive Predictive Value" color="#4ade80" />
        <MetricCard label="Recall" value={currentMetrics.recall} sub="Defect Capture Coverage" color="#facc15" />
        <MetricCard label="Edge Latency" value={currentMetrics.latency} sub="TensorRT / PyTorch GPU Speed" color="#fb923c" />
      </div>

      {/* Chart: Per-Class Accuracy Metrics */}
      <div
        className="glass-card"
        style={{
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          minWidth: 0
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
              Per-Class Validation Performance (mAP50, Precision, Recall)
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Trained weights exported to <code>detector/{aiModelMode === 'potbot' ? 'potbot_yolov8m.pt' : (aiModelMode === 'rdd2022' ? 'rdd2022_multiclass.pt' : 'pothole_yolov8.pt')}</code>
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#070f24',
            border: '1px solid #273860',
            padding: '5px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#38bdf8'
          }}>
            <ShieldCheck size={14} />
            <span>Target Confidence Threshold: 0.35</span>
          </div>
        </div>

        <div style={{ width: '100%', minWidth: 0, height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentMetrics.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="class" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0c142b', borderColor: '#273860', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }}
                formatter={(val) => [`${val}%`, '']}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="mAP50" name="mAP @ 50 (%)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="precision" name="Precision (%)" fill="#4ade80" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recall" name="Recall (%)" fill="#facc15" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Specifications & Comparison Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '14px'
      }}>
        <div
          className="glass-card"
          style={{
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Layers size={18} color="#38bdf8" />
            <h4 style={{ margin: 0, fontSize: '14px', color: '#f8fafc' }}>Active Architecture Specifications</h4>
          </div>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', color: '#cbd5e1' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Model Name</td>
                <td style={{ padding: '8px 0', fontWeight: '700', textAlign: 'right' }}>{currentMetrics.name}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Classes Monitored</td>
                <td style={{ padding: '8px 0', fontWeight: '700', textAlign: 'right' }}>{currentMetrics.classes.length} Classes</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Inference Engine</td>
                <td style={{ padding: '8px 0', fontWeight: '700', textAlign: 'right' }}>YOLOv8 ByteTrack Core</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#94a3b8' }}>Export File</td>
                <td style={{ padding: '8px 0', fontWeight: '700', color: aiModelMode === 'potbot' ? '#c084fc' : (aiModelMode === 'rdd2022' ? '#2dd4bf' : '#38bdf8'), textAlign: 'right', fontFamily: 'monospace' }}>
                  detector/{aiModelMode === 'potbot' ? 'potbot_yolov8m.pt' : (aiModelMode === 'rdd2022' ? 'rdd2022_multiclass.pt' : 'pothole_yolov8.pt')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Activity size={18} color="#4ade80" />
            <h4 style={{ margin: 0, fontSize: '14px', color: '#f8fafc' }}>Tri-Model Governance &amp; Edge State</h4>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 10px 0' }}>
            Three neural architectures coexist in your municipal runtime. You can switch models instantaneously to evaluate real-time performance:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
              <CheckCircle2 size={14} />
              <span><strong>7-Class Anomaly (YOLOv8m • 52MB):</strong> General pavement hazards (potholes, cracks, bumps, traffic).</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2dd4bf' }}>
              <CheckCircle2 size={14} />
              <span><strong>CRDDC Road Damage (YOLOv8s • 89.5MB):</strong> Structural crack taxonomy (longitudinal, transverse, alligator).</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc' }}>
              <CheckCircle2 size={14} />
              <span><strong>PotBot Dedicated (YOLOv8m • 148.5MB):</strong> Deep dedicated pothole detector from GitHub PotBot benchmark.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Efficiency & Performance Comparison Matrix */}
      <div
        className="glass-card"
        style={{
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#facc15" />
              Model Efficiency &amp; Optimization Comparison Matrix
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Compare accuracy, size, and edge throughput across all 3 models to identify which to retain for deployment
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', color: '#cbd5e1', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', backgroundColor: '#020617' }}>
                <th style={{ padding: '10px 12px', color: '#94a3b8' }}>Evaluation Metric</th>
                <th style={{ padding: '10px 12px', color: '#38bdf8' }}>🎯 7-Class Road Anomaly</th>
                <th style={{ padding: '10px 12px', color: '#2dd4bf' }}>🌐 CRDDC Road Damage</th>
                <th style={{ padding: '10px 12px', color: '#c084fc' }}>🤖 PotBot Dedicated</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px 12px', fontWeight: '600', color: '#94a3b8' }}>Model Architecture</td>
                <td style={{ padding: '10px 12px' }}>YOLOv8m (PyTorch / ONNX)</td>
                <td style={{ padding: '10px 12px' }}>YOLOv8s (PyTorch)</td>
                <td style={{ padding: '10px 12px' }}>YOLOv8m (PyTorch)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px 12px', fontWeight: '600', color: '#94a3b8' }}>Model File Size</td>
                <td style={{ padding: '10px 12px', color: '#4ade80', fontWeight: '700' }}>52.0 MB (High Efficiency)</td>
                <td style={{ padding: '10px 12px' }}>89.5 MB</td>
                <td style={{ padding: '10px 12px', color: '#f87171', fontWeight: '700' }}>148.5 MB (Heavyweight)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px 12px', fontWeight: '600', color: '#94a3b8' }}>Parameters &amp; FLOPs</td>
                <td style={{ padding: '10px 12px' }}>25.86M / 79.1 GFLOPs</td>
                <td style={{ padding: '10px 12px', color: '#4ade80' }}>11.2M / 28.6 GFLOPs (Lightest)</td>
                <td style={{ padding: '10px 12px' }}>25.86M / 79.1 GFLOPs</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px 12px', fontWeight: '600', color: '#94a3b8' }}>Inference Throughput</td>
                <td style={{ padding: '10px 12px' }}>~83 FPS (12.0 ms)</td>
                <td style={{ padding: '10px 12px', color: '#4ade80', fontWeight: '700' }}>~102 FPS (9.8 ms) [Fastest]</td>
                <td style={{ padding: '10px 12px' }}>~70 FPS (14.2 ms)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px 12px', fontWeight: '600', color: '#94a3b8' }}>Monitored Classes</td>
                <td style={{ padding: '10px 12px', color: '#38bdf8', fontWeight: '700' }}>7 Classes (Full Road Spectrum)</td>
                <td style={{ padding: '10px 12px' }}>4 Classes (Crack Focus)</td>
                <td style={{ padding: '10px 12px' }}>1 Class (Pothole Only)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px 12px', fontWeight: '600', color: '#94a3b8' }}>Pothole Detection Score</td>
                <td style={{ padding: '10px 12px' }}>78.4% mAP50</td>
                <td style={{ padding: '10px 12px' }}>68.5% mAP50</td>
                <td style={{ padding: '10px 12px', color: '#c084fc', fontWeight: '700' }}>81.2% mAP50 (Deep Specialist)</td>
              </tr>
              <tr>
                <td style={{ padding: '10px 12px', fontWeight: '600', color: '#94a3b8' }}>Efficiency Verdict</td>
                <td style={{ padding: '10px 12px', color: '#38bdf8' }}>Best All-Rounder (Speed + Full Taxonomy)</td>
                <td style={{ padding: '10px 12px', color: '#2dd4bf' }}>Best for Low-Power Edge Devices</td>
                <td style={{ padding: '10px 12px', color: '#c084fc' }}>High Accuracy Pothole Solo Specialist</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
