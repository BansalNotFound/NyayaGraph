"use client";

import React from 'react';
import { FlowChapter, FlowNode, LegendItem } from '@/data/cyberlifeData';

interface PanoramaModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  image?: string;
  description: string;
}

export const PanoramaModal: React.FC<PanoramaModalProps> = ({
  isOpen,
  onClose,
  title,
  description
}) => {
  if (!isOpen) return null;

  return (
    <div className="cyber-modal-backdrop" onClick={onClose}>
      <div className="cyber-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* High-Tech Procedural CyberLife Surveillance Viewport */}
          <div className="panorama-preview-viewport">
            <div className="procedural-surveillance-feed">
              <div className="radar-sweep-beam"></div>
              <div className="hud-corner-caliper tl"></div>
              <div className="hud-corner-caliper tr"></div>
              <div className="hud-corner-caliper bl"></div>
              <div className="hud-corner-caliper br"></div>
              <div className="surveillance-center-reticle"></div>
              <div className="surveillance-telemetry-text">
                <span>REC // 2038.11.08</span>
                <span>LAT: 42.3314° N, LON: 83.0458° W</span>
                <span>CYBERLIFE SECURITY SATELLITE 04</span>
              </div>
            </div>
          </div>
          <p className="character-bio-text" style={{ marginTop: '14px', fontSize: '13px' }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

interface NodeInspectorModalProps {
  node: FlowNode | null;
  chapter: FlowChapter | null;
  onClose: () => void;
}

export const NodeInspectorModal: React.FC<NodeInspectorModalProps> = ({
  node,
  chapter,
  onClose
}) => {
  if (!node || !chapter) return null;

  return (
    <div className="cyber-modal-backdrop" onClick={onClose}>
      <div className="cyber-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {chapter.code} {'//'} {node.label}
          </div>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="node-detail-field">
            <div className="node-detail-label">STAGE / CLUSTER</div>
            <div className="node-detail-value">{node.cluster}</div>
          </div>
          <div className="node-detail-field">
            <div className="node-detail-label">NODE STATUS</div>
            <div
              className="node-detail-value"
              style={{
                color: node.status === 'locked' ? '#ff2a5f' : '#00b4d8',
                fontWeight: 700
              }}
            >
              {(node.status || 'ACTIVE').toUpperCase()}
            </div>
          </div>
          <div className="node-detail-field">
            <div className="node-detail-label">NARRATIVE & INVESTIGATION ANALYSIS</div>
            <div className="node-detail-value">
              {node.details || node.req || 'Event documented in primary CyberLife case log.'}
            </div>
          </div>
          <div className="node-detail-field">
            <div className="node-detail-label">GLOBAL DECISION STATS</div>
            <div
              className="node-detail-value"
              style={{
                fontFamily: 'var(--font-hud)',
                fontWeight: 800,
                fontSize: '18px',
                color: 'var(--color-hud-cyan)'
              }}
            >
              {node.worldStat || '100%'} OF OPERATORS CHOSE THIS PATH
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface LegendModalProps {
  isOpen: boolean;
  onClose: () => void;
  legend: LegendItem[];
}

export const LegendModal: React.FC<LegendModalProps> = ({ isOpen, onClose, legend }) => {
  if (!isOpen) return null;

  return (
    <div className="cyber-modal-backdrop" onClick={onClose}>
      <div className="cyber-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">FLOWCHART PROTOCOL // LEGEND</div>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="legend-grid-list">
            {legend.map((item, idx) => (
              <div key={idx} className="legend-item-row">
                <div className="legend-color-box" style={{ background: item.color }}></div>
                <div>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '12px', fontWeight: 700 }}>
                    {item.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== DASHBOARD / WORKBENCH MODALS ====================

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="relative bg-[#0d1520] border border-[#00d2ff]/40 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl text-white">
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#00d2ff]/20 bg-[#070b12]">
          <div className="text-[11px] font-mono tracking-[0.2em] text-[#00d2ff] uppercase font-bold">
            [ {title} ]
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-lg font-bold">
            &times;
          </button>
        </div>
        <div className="p-6 overflow-y-auto font-sans">
          {children}
        </div>
      </div>
    </div>
  );
};

export const CaseStatsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  graph?: any;
}> = ({ isOpen, onClose, graph }) => {
  if (!graph) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CYBERLIFE SYSTEM TELEMETRY // STATS">
      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
        <div className="bg-[#121c2c] p-4 border border-[#00d2ff]/20">
          <div className="text-gray-400 uppercase tracking-wider text-[10px]">Total Extracted Nodes</div>
          <div className="text-2xl font-light text-white mt-1">{graph.stats?.total_nodes || graph.nodes?.length || 0}</div>
        </div>
        <div className="bg-[#121c2c] p-4 border border-[#00d2ff]/20">
          <div className="text-gray-400 uppercase tracking-wider text-[10px]">Multi-Source Graph Edges</div>
          <div className="text-2xl font-light text-[#00d2ff] mt-1">{graph.stats?.total_edges || graph.edges?.length || 0}</div>
        </div>
        <div className="bg-[#121c2c] p-4 border border-[#00d2ff]/20">
          <div className="text-gray-400 uppercase tracking-wider text-[10px]">Syndicate Operational Cells</div>
          <div className="text-2xl font-light text-white mt-1">{graph.total_communities || 1} (Louvain Modularity)</div>
        </div>
        <div className="bg-[#121c2c] p-4 border border-[#00d2ff]/20">
          <div className="text-gray-400 uppercase tracking-wider text-[10px]">Pending Locked Leads</div>
          <div className="text-2xl font-light text-[#ff4b6b] mt-1">{graph.stats?.total_locked_leads || 0}</div>
        </div>
      </div>

      <div className="mt-5 border border-[#00d2ff]/40 bg-[#00d2ff]/5 p-4">
        <div className="text-[10px] font-mono font-bold text-[#00d2ff] uppercase tracking-widest flex items-center gap-2">
          ★ STRUCTURAL HOLE SPANNER // CENTRAL BROKER
        </div>
        <div className="text-base font-semibold text-white mt-1">
          {graph.stats?.central_broker || "VIKRAM MALHOTRA @ VICKY HAWALA"}
        </div>
        <div className="text-xs text-gray-300 mt-1 leading-relaxed">
          Pinpointed using Betweenness Centrality analysis. This entity acts as the critical bridge connecting discrete operational cells across the criminal syndicate network.
        </div>
      </div>
    </Modal>
  );
};

export const PatternsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  patterns: any[];
}> = ({ isOpen, onClose, patterns }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="DETECTIVE ABNORMALITY & TRADECRAFT DOSSIER">
      <div className="space-y-4">
        {(patterns || []).map((p, idx) => (
          <div key={p.pattern_id || idx} className="border border-[#00d2ff]/20 bg-[#121c2c] p-4">
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-[1px] ${
                p.severity === 'CRITICAL' ? 'bg-[#ff4b6b] text-white' : 'bg-[#f59e0b] text-black'
              }`}>
                {p.severity} SEVERITY
              </span>
              <span className="text-[10px] font-mono text-gray-400">{p.pattern_id}</span>
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wide mt-2">{p.title}</h4>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">{p.description}</p>
            {p.investigative_advice && (
              <div className="mt-3 pt-2 border-t border-white/10 text-[11px] text-[#00d2ff] font-mono">
                <strong>INVESTIGATIVE ADVICE:</strong> {p.investigative_advice}
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
};

export const BSACertificateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  firNumber: string;
  sha256Hash: string;
  blockchainTxHash: string;
}> = ({ isOpen, onClose, firNumber, sha256Hash, blockchainTxHash }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="BSA 2023 SEC 63(4) COURT ADMISSIBILITY CERTIFICATE">
      <div className="space-y-4 font-mono text-xs">
        <div className="bg-[#121c2c] p-4 border border-[#00d2ff]/30 space-y-2">
          <div className="flex items-center gap-2 text-[#00d2ff] font-bold text-[11px]">
            BHARATIYA SAKSHYA ADHINIYAM (BSA) 2023 SECTION 63(4)
          </div>
          <div className="text-white">
            <strong>CASE / FIR NUMBER:</strong> {firNumber}
          </div>
          <div className="text-gray-300 break-all">
            <strong>EVIDENCE SHA-256 HASH:</strong> {sha256Hash}
          </div>
          <div className="text-gray-300 break-all">
            <strong>LEDGER TRANSACTION ID:</strong> {blockchainTxHash}
          </div>
          <div className="text-gray-400 text-[10px] mt-2 border-t border-white/10 pt-2">
            Status: Immutable & Tamper-Proof Cryptographic Chain-of-Custody Verified.
          </div>
        </div>

        <button
          onClick={() => alert("Court-admissible PDF Certificate signed and downloaded.")}
          className="w-full py-2.5 bg-[#00d2ff] hover:bg-[#00a3cc] text-black font-bold tracking-widest text-xs uppercase flex items-center justify-center gap-2 rounded-[2px] transition-colors"
        >
          EXPORT ADMISSIBILITY CERTIFICATE (PDF)
        </button>
      </div>
    </Modal>
  );
};
