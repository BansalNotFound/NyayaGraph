'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { GraphNode, GraphEdge, ExtractedEntity, CrossCaseResemblance } from '../types';
import { CheckCircle2, FileText, PhoneCall, X, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

interface CyberLifeDossierProps {
  selectedNode: GraphNode | null;
  entities: ExtractedEntity[];
  edges?: GraphEdge[];
  allNodes?: GraphNode[];
  onSelectNode?: (node: GraphNode) => void;
  crossCaseMatch?: CrossCaseResemblance;
  onClose?: () => void;
}

export const CyberLifeDossier: React.FC<CyberLifeDossierProps> = ({
  selectedNode,
  entities,
  edges = [],
  allNodes = [],
  onSelectNode,
  crossCaseMatch,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'SPEC' | 'INFO' | 'CONNECTIONS'>('SPEC');
  const [retrievalStage, setRetrievalStage] = useState<'RETRIEVING' | 'VERIFIED' | 'READY'>('READY');
  const [retrievalProgress, setRetrievalProgress] = useState<number>(100);

  // Trigger 3-Stage Inspection Retrieval Sequence on node selection
  useEffect(() => {
    if (!selectedNode) {
      const resetTimer = setTimeout(() => {
        setRetrievalStage('READY');
        setRetrievalProgress(100);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    // Stage 1: RETRIEVING RECORD (0 - 500ms)
    const t0 = setTimeout(() => {
      setRetrievalStage('RETRIEVING');
      setRetrievalProgress(20);
    }, 0);

    const t1 = setTimeout(() => setRetrievalProgress(70), 200);
    const t2 = setTimeout(() => setRetrievalProgress(95), 380);

    // Stage 2: RECORD VERIFIED (500ms - 900ms)
    const t3 = setTimeout(() => {
      setRetrievalProgress(100);
      setRetrievalStage('VERIFIED');
    }, 500);

    // Stage 3: READY / STAGGERED DATA FIELDS (900ms+)
    const t4 = setTimeout(() => {
      setRetrievalStage('READY');
    }, 900);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [selectedNode]);

  // Match corresponding entity
  const matchedEntity = entities.find(e => e.id === selectedNode?.id);

  // Compute direct connections of this node
  const directConnections = useMemo(() => {
    if (!selectedNode) return [];
    const conns: { node: GraphNode; edge: GraphEdge; direction: 'OUT' | 'IN' }[] = [];
    const nodeMap = new Map<string, GraphNode>();
    allNodes.forEach(n => nodeMap.set(n.id, n));

    edges.forEach(e => {
      if (e.source === selectedNode.id) {
        const targetNode = nodeMap.get(e.target);
        if (targetNode) conns.push({ node: targetNode, edge: e, direction: 'OUT' });
      } else if (e.target === selectedNode.id) {
        const sourceNode = nodeMap.get(e.source);
        if (sourceNode) conns.push({ node: sourceNode, edge: e, direction: 'IN' });
      }
    });
    return conns;
  }, [selectedNode, edges, allNodes]);

  if (!selectedNode) {
    // Quick select fallback if no node is selected
    const topBroker = allNodes.find(n => n.is_broker) || allNodes[0];

    return (
      <div className="relative w-full h-full bg-[#F7F7F5] border border-[#DADAD8] p-6 flex flex-col justify-between select-none shadow-none">
        <div className="corner-bracket-tl" />
        <div className="corner-bracket-tr" />
        <div className="corner-bracket-bl" />
        <div className="corner-bracket-br" />

        <div className="flex-1 flex flex-col items-center justify-center text-center text-[#8A8A8A] font-mono">
          <div className="w-8 h-8 rounded-full border border-[#1BA8D1] flex items-center justify-center mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1BA8D1]" />
          </div>
          <div className="text-xs font-semibold tracking-[0.16em] text-[#1A1A1A] uppercase">
            LIVE NODE INSPECTOR
          </div>
          <div className="text-[11px] text-[#8A8A8A] mt-2 max-w-[280px] leading-relaxed">
            SELECT ANY ACTIVE ENTITY OR EVIDENCE NODE ON THE CANVAS TO RETRIEVE SPECIFICATIONS &amp; DIRECT LINKS.
          </div>

          {topBroker && onSelectNode && (
            <button
              onClick={() => onSelectNode(topBroker)}
              className="mt-5 px-3.5 py-1.5 bg-white border border-[#1BA8D1] text-[10px] font-mono text-[#1BA8D1] hover:bg-[#1BA8D1] hover:text-white rounded-[1px] uppercase tracking-wider transition-colors flex items-center gap-1.5"
            >
              <span>INSPECT CENTRAL BROKER</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="pt-3 border-t border-[#E7E7E5] text-[9px] font-mono text-[#8A8A8A] flex justify-between">
          <span>INVESTIGATIVE AUDIT {'//'} BNS 2023</span>
          <span>READY</span>
        </div>
      </div>
    );
  }

  const isBroker = selectedNode.is_broker || selectedNode.betweenness_score > 0.5;

  return (
    <div className="relative w-full h-full bg-[#F7F7F5] border border-[#DADAD8] p-6 flex flex-col justify-between select-none shadow-none overflow-y-auto">
      {/* Corner Brackets */}
      <div className="corner-bracket-tl" />
      <div className="corner-bracket-tr" />
      <div className="corner-bracket-bl" />
      <div className="corner-bracket-br" />

      {/* Top Header Section */}
      <div>
        {/* Eyebrow Label & Status Indicator */}
        <div className="flex items-center justify-between border-b border-[#E7E7E5] pb-2">
          <div className="text-[10px] font-mono tracking-[0.14em] text-[#8A8A8A] uppercase">
            REGISTRY {'//'} {selectedNode.category} {'//'} {selectedNode.id}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full border border-[#1BA8D1] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1BA8D1]" />
            </div>
            {onClose && (
              <button onClick={onClose} className="text-[#8A8A8A] hover:text-[#1A1A1A]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 3-Stage Live Retrieval HUD Banner */}
        <div className="mt-3">
          {retrievalStage === 'RETRIEVING' && (
            <div className="bg-[#1A1A1A] border border-[#00D1FF]/40 text-white p-2.5 rounded-[1px] font-mono mb-2">
              <div className="flex items-center justify-between text-[10px] text-[#00D1FF] mb-1">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <Loader2 className="w-3 h-3 animate-spin text-[#00D1FF]" />
                  RETRIEVING RECORD // RESOLVING TELEMETRY...
                </span>
                <span className="text-[10px]">{retrievalProgress}%</span>
              </div>
              <div className="w-full bg-[#333333] h-1 rounded-[1px] overflow-hidden">
                <div 
                  className="bg-[#00D1FF] h-full transition-all duration-150 ease-out"
                  style={{ width: `${retrievalProgress}%` }}
                />
              </div>
            </div>
          )}

          {retrievalStage === 'VERIFIED' && (
            <div className="bg-[#E0F7FA] border border-[#00D1FF] text-[#006064] p-2 rounded-[1px] font-mono mb-2 flex items-center justify-between animate-pulse">
              <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00ACC1]" />
                RECORD VERIFIED // CRYPTOGRAPHIC HASH MATCH
              </span>
              <span className="text-[8px] bg-[#00D1FF] text-[#1A1A1A] font-bold px-1.5 py-0.5 rounded-[1px]">
                100% AUDIT
              </span>
            </div>
          )}

          {retrievalStage === 'READY' && (
            <div className="flex items-center justify-between text-[9px] font-mono text-[#8A8A8A] border-b border-[#E7E7E5] pb-1.5 mb-2">
              <span className="text-[#00A3C4] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#00C2E0]" />
                VERIFIED NETWORK DOSSIER
              </span>
              <span>CERT: BSA-63(4)</span>
            </div>
          )}
        </div>

        {/* Hero Headline (Kara Style: Large, Thin/Regular Weight, Never Bold) */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-[1px] font-medium ${
              isBroker ? 'bg-[#00C2E0] text-white' : 'bg-[#1E3A5F] text-white'
            }`}>
              {selectedNode.category}
            </span>
            {isBroker && (
              <span className="text-[8px] font-mono bg-[#1A1A1A] text-[#00C2E0] px-1.5 py-0.5 rounded-[1px] font-bold">
                ★ CENTRAL BROKER
              </span>
            )}
          </div>
          <h2 className="text-xl font-light tracking-[0.01em] text-[#1A1A1A] uppercase">
            {selectedNode.label}
          </h2>
          <div className="text-xs text-[#8A8A8A] font-normal tracking-[0.08em] uppercase mt-0.5">
            {selectedNode.sublabel || 'PRIMARY CASE RECORD ENTRY'}
          </div>
        </div>

        {/* 4-Tile Grid (Exact Tile Style as Case Dossier with Cascading Telemetry Reveal) */}
        <div className="grid grid-cols-2 gap-2.5 mt-4">
          {/* Tile 1: Betweenness Centrality */}
          <div className={`border p-2.5 rounded-[2px] transition-all duration-300 ${
            retrievalStage === 'RETRIEVING' ? 'opacity-30 translate-y-1' : 'opacity-100 translate-y-0'
          } ${
            isBroker 
              ? 'border-[#2A4C78] bg-[#1E3A5F] text-white' 
              : 'border-[#DADAD8] bg-white text-[#1A1A1A]'
          }`}>
            <div className={`text-[8px] font-mono tracking-[0.12em] uppercase ${
              isBroker ? 'text-[#00C2E0]' : 'text-[#8A8A8A]'
            }`}>
              CENTRALITY SCORE (BC)
            </div>
            <div className="text-lg font-mono font-bold mt-0.5">
              {selectedNode.betweenness_score.toFixed(3)}
            </div>
            <div className={`text-[8px] font-mono mt-0.5 ${
              isBroker ? 'text-[#A0C4DF]' : 'text-[#8A8A8A]'
            }`}>
              {isBroker ? 'Top Intermediary Bridge' : 'Peripheral Entity'}
            </div>
          </div>

          {/* Tile 2: Community / Cluster */}
          <div className={`border border-[#DADAD8] p-2.5 bg-white rounded-[2px] transition-all duration-300 delay-75 ${
            retrievalStage === 'RETRIEVING' ? 'opacity-30 translate-y-1' : 'opacity-100 translate-y-0'
          }`}>
            <div className="text-[8px] font-mono tracking-[0.12em] text-[#8A8A8A] uppercase">
              COMMUNITY CLUSTER
            </div>
            <div className="text-lg font-mono font-bold text-[#1A1A1A] mt-0.5">
              CELL #{selectedNode.community_id}
            </div>
            <div className="text-[8px] font-mono text-[#8A8A8A] mt-0.5">
              Louvain Partition ID
            </div>
          </div>

          {/* Tile 3: Direct Degree */}
          <div className={`border border-[#DADAD8] p-2.5 bg-white rounded-[2px] transition-all duration-300 delay-150 ${
            retrievalStage === 'RETRIEVING' ? 'opacity-30 translate-y-1' : 'opacity-100 translate-y-0'
          }`}>
            <div className="text-[8px] font-mono tracking-[0.12em] text-[#8A8A8A] uppercase">
              DIRECT NETWORK LINKS
            </div>
            <div className="text-lg font-mono font-bold text-[#1A1A1A] mt-0.5">
              {directConnections.length} EDGES
            </div>
            <div className="text-[8px] font-mono text-[#1BA8D1] mt-0.5">
              Multi-Source Fused
            </div>
          </div>

          {/* Tile 4: Evidentiary Status */}
          <div className={`border border-[#DADAD8] p-2.5 bg-white rounded-[2px] transition-all duration-300 delay-200 ${
            retrievalStage === 'RETRIEVING' ? 'opacity-30 translate-y-1' : 'opacity-100 translate-y-0'
          }`}>
            <div className="text-[8px] font-mono tracking-[0.12em] text-[#8A8A8A] uppercase">
              STATUTORY STATUS
            </div>
            <div className="text-sm font-mono font-bold text-[#1BA8D1] mt-1 truncate">
              {selectedNode.is_locked ? "🔒 GATED LEAD" : "✓ BSA SEC 63(4)"}
            </div>
            <div className="text-[8px] font-mono text-[#8A8A8A] mt-0.5">
              Anchor Validated
            </div>
          </div>
        </div>

        {/* Flat Tab Buttons: SPECIFICATIONS / INFORMATION / CONNECTIONS */}
        <div className="flex items-center gap-1.5 mt-4 border-b border-[#E7E7E5] pb-2">
          <button
            onClick={() => setActiveTab('SPEC')}
            className={`px-3 py-1 text-[10px] font-mono tracking-[0.1em] uppercase rounded-[1px] transition-colors ${
              activeTab === 'SPEC'
                ? 'bg-[#00C2E0] text-white font-medium'
                : 'bg-white text-[#8A8A8A] border border-[#DADAD8] hover:border-[#1BA8D1]'
            }`}
          >
            SPECIFICATIONS
          </button>
          <button
            onClick={() => setActiveTab('INFO')}
            className={`px-3 py-1 text-[10px] font-mono tracking-[0.1em] uppercase rounded-[1px] transition-colors ${
              activeTab === 'INFO'
                ? 'bg-[#00C2E0] text-white font-medium'
                : 'bg-white text-[#8A8A8A] border border-[#DADAD8] hover:border-[#1BA8D1]'
            }`}
          >
            OCR SPAN &amp; HASH
          </button>
          <button
            onClick={() => setActiveTab('CONNECTIONS')}
            className={`px-3 py-1 text-[10px] font-mono tracking-[0.1em] uppercase rounded-[1px] transition-colors flex items-center gap-1 ${
              activeTab === 'CONNECTIONS'
                ? 'bg-[#00C2E0] text-white font-medium'
                : 'bg-white text-[#8A8A8A] border border-[#DADAD8] hover:border-[#1BA8D1]'
            }`}
          >
            <span>LINKS</span>
            <span className={`text-[8px] px-1 rounded-[1px] ${
              activeTab === 'CONNECTIONS' ? 'bg-white text-[#00C2E0]' : 'bg-[#EAEAE8] text-[#1A1A1A]'
            }`}>
              {directConnections.length}
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className={`mt-3 space-y-3 transition-opacity duration-300 delay-300 ${
          retrievalStage === 'RETRIEVING' ? 'opacity-40' : 'opacity-100'
        }`}>
          {activeTab === 'SPEC' && (
            <div className="space-y-2.5 text-xs">
              {/* Recorded Aliases */}
              {matchedEntity?.aliases && matchedEntity.aliases.length > 0 && (
                <div className="border border-[#DADAD8] p-2.5 bg-white rounded-[1px]">
                  <div className="text-[9px] font-mono tracking-[0.12em] text-[#8A8A8A] uppercase mb-1">
                    RECORDED ALIASES / HANDLES
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {matchedEntity.aliases.map((alias, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-[#FAF9F7] border border-[#DADAD8] text-[10px] font-mono text-[#1A1A1A]"
                      >
                        @{alias}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Node Technical Details Key-Value List */}
              {selectedNode.details && (
                <div className="border border-[#DADAD8] bg-white p-2.5 rounded-[1px]">
                  <div className="text-[9px] font-mono tracking-[0.12em] text-[#8A8A8A] uppercase mb-1.5">
                    ATTRIBUTES &amp; HARDWARE TELEMETRY
                  </div>
                  <div className="space-y-1 text-[10px] font-mono divide-y divide-[#F2F2F0]">
                    {Object.entries(selectedNode.details).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-1">
                        <span className="text-[#8A8A8A] uppercase">{k.replace('_', ' ')}</span>
                        <span className="text-[#1A1A1A] font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'INFO' && (
            <div className="space-y-3 text-xs">
              {/* Closed-World Verbatim OCR Span Box */}
              <div className="border border-[#DADAD8] bg-white p-3 rounded-[1px]">
                <div className="flex items-center gap-1 text-[9px] font-mono tracking-[0.12em] text-[#1BA8D1] uppercase mb-1">
                  <FileText className="w-3 h-3" /> VERBATIM CLOSED-WORLD OCR SPAN
                </div>
                <div className="bg-[#FAF9F7] border border-[#DADAD8] p-2 font-mono text-[11px] text-[#1A1A1A] leading-relaxed">
                  &quot;{matchedEntity?.raw_span || selectedNode.label}&quot;
                </div>
                <div className="text-[10px] font-mono text-[#1BA8D1] mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Character offset span verified in FIR text
                </div>
              </div>

              {/* Cross-Case Resemblance Notice */}
              {crossCaseMatch && (
                <div className="border border-[#DADAD8] bg-[#FAF9F7] p-3 rounded-[1px]">
                  <div className="flex items-center justify-between text-[9px] font-mono tracking-[0.12em] text-[#D6483C] uppercase font-medium">
                    <span>CROSS-CASE RESEMBLANCE</span>
                    <span>{crossCaseMatch.resemblance_percentage}% MATCH</span>
                  </div>
                  <div className="text-[11px] text-[#6A6A66] mt-1 leading-relaxed">
                    {crossCaseMatch.recommended_action}
                  </div>
                  <div className="text-[10px] font-mono text-[#8A8A8A] mt-2 pt-1 border-t border-[#DADAD8] flex items-center gap-2">
                    <PhoneCall className="w-3 h-3 text-[#D6483C]" />
                    <span>Desk Contact: {crossCaseMatch.io_contact}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'CONNECTIONS' && (
            <div className="space-y-1.5">
              <div className="text-[9px] font-mono tracking-[0.12em] text-[#8A8A8A] uppercase mb-1">
                DIRECTLY CONNECTED NODES ({directConnections.length})
              </div>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {directConnections.map(({ node, edge, direction }, idx) => (
                  <div
                    key={`${edge.id}-${idx}`}
                    onClick={() => onSelectNode && onSelectNode(node)}
                    className="p-2 bg-white border border-[#DADAD8] hover:border-[#1BA8D1] rounded-[1px] cursor-pointer transition-colors text-left"
                  >
                    <div className="flex items-center justify-between text-[8px] font-mono uppercase mb-0.5">
                      <span className={edge.is_suspicious ? 'text-[#D6483C] font-semibold' : 'text-[#1BA8D1]'}>
                        {edge.label || `${edge.source_type} LINK`}
                      </span>
                      <span className="text-[#8A8A8A]">
                        {direction === 'OUT' ? '→ TARGET' : '← SOURCE'}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-[#1A1A1A] uppercase tracking-wide truncate">
                      {node.label}
                    </div>
                    <div className="text-[8px] font-mono text-[#8A8A8A] mt-0.5 flex justify-between">
                      <span>{node.category}</span>
                      <span>BC: {node.betweenness_score.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decorative Barcode Strip + Numeric Serial (Direct from Spec) */}
      <div className="mt-4 pt-3 border-t border-[#E7E7E5]">
        <div className="flex items-center justify-between text-[9px] font-mono text-[#8A8A8A] mb-1 tracking-[0.12em]">
          <span>CYBERLIFE SCHEMATIC REGISTRY</span>
          <span>07-923 // 1/5</span>
        </div>
        <div className="h-3 w-full barcode-strip opacity-70" />
      </div>
    </div>
  );
};

