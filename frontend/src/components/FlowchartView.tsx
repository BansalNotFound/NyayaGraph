"use client";

import React, { useState, useRef, useMemo } from "react";
import type { FlowChapter, FlowNode } from "@/data/cyberlifeData";
import { useTheme } from "@/context/ThemeContext";
import {
  Search,
  Filter,
  ShieldAlert,
  Building2,
  Users,
  FileText,
  Scale,
  CreditCard,
  Network,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Bot,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  ArrowRight,
  LayoutGrid,
  GitBranch,
} from "lucide-react";

interface FlowchartViewProps {
  chapters: FlowChapter[];
  onSelectNode?: (node: FlowNode, chapter: FlowChapter) => void;
  onOpenLegend?: () => void;
  onJumpToChat?: (caseId?: string, firLabel?: string) => void;
  onJumpToCase?: (caseId?: string) => void;
}

export const FlowchartView: React.FC<FlowchartViewProps> = ({
  chapters,
  onJumpToChat,
  onJumpToCase,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Currently selected case / chapter
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    chapters[0]?.id || ""
  );
  const [caseSearchQuery, setCaseSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"pipeline" | "canvas">("pipeline");

  // Selected node for slide-over inspector
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);

  // Canvas zoom & pan state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filtered chapters for the dropdown / combobox
  const filteredChapters = useMemo(() => {
    if (!caseSearchQuery.trim()) return chapters;
    const q = caseSearchQuery.toLowerCase();
    return chapters.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.character.toLowerCase().includes(q)
    );
  }, [chapters, caseSearchQuery]);

  const activeChapter = useMemo(() => {
    return chapters.find((c) => c.id === selectedChapterId) || chapters[0];
  }, [chapters, selectedChapterId]);

  // Map nodes of active chapter into 5 statutory CBI procedural stages
  const proceduralStages = useMemo(() => {
    if (!activeChapter) return [];

    const nodes = activeChapter.nodes || [];

    // Categorize nodes
    const legalNodes: FlowNode[] = [];
    const entityNodes: FlowNode[] = [];
    const financeNodes: FlowNode[] = [];
    const evidenceNodes: FlowNode[] = [];
    const remainingNodes: FlowNode[] = [];

    nodes.forEach((n) => {
      const lbl = (n.label || "").toLowerCase();
      const details = (n.details || "").toLowerCase();

      if (
        n.type === "locked" ||
        lbl.includes("sec") ||
        lbl.includes("ipc") ||
        lbl.includes("act") ||
        lbl.includes("offence")
      ) {
        legalNodes.push(n);
      } else if (n.type === "parallelogram-thumbnail" || n.sceneTheme || lbl.includes("broker")) {
        entityNodes.unshift(n); // broker first
      } else if (
        lbl.includes("bank") ||
        lbl.includes("account") ||
        lbl.includes("branch") ||
        lbl.includes("pvt") ||
        lbl.includes("ltd") ||
        details.includes("account")
      ) {
        financeNodes.push(n);
      } else if (
        lbl.includes("cdr") ||
        lbl.includes("phone") ||
        lbl.includes("device") ||
        lbl.includes("ledger") ||
        details.includes("hash")
      ) {
        evidenceNodes.push(n);
      } else {
        entityNodes.push(n);
      }
    });

    return [
      {
        id: "stage-1",
        number: "01",
        title: "FIR Registration & Sections",
        subtitle: "Statutory Mandate & Invoked Offence Codes",
        icon: Scale,
        nodes: legalNodes.length > 0 ? legalNodes : nodes.slice(0, 3),
        status: "COMPLETED",
      },
      {
        id: "stage-2",
        number: "02",
        title: "Syndicate Hierarchy & Actors",
        subtitle: "Named Accused, Promoters & Prime Brokers",
        icon: Users,
        nodes: entityNodes.length > 0 ? entityNodes : nodes.slice(3, 8),
        status: "ACTIVE",
      },
      {
        id: "stage-3",
        number: "03",
        title: "Financial & Mule Network",
        subtitle: "Bank Accounts, Shell Companies & Laundering Routes",
        icon: CreditCard,
        nodes: financeNodes.length > 0 ? financeNodes : nodes.slice(8, 12),
        status: "ACTIVE",
      },
      {
        id: "stage-4",
        number: "04",
        title: "Forensic Discovery & Seizures",
        subtitle: "BSA 2023 Sec 63(4) Cryptographic Evidence Ledger",
        icon: ShieldAlert,
        nodes: evidenceNodes.length > 0 ? evidenceNodes : nodes.slice(12, 16),
        status: "VERIFIED",
      },
      {
        id: "stage-5",
        number: "05",
        title: "Judicial Chargesheet Filing",
        subtitle: "Cognizance, Special CBI Court & Asset Attachment",
        icon: FileText,
        nodes: remainingNodes.length > 0 ? remainingNodes : nodes.slice(16),
        status: "PENDING",
      },
    ];
  }, [activeChapter]);

  // Canvas dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".canvas-node-card")) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  if (!activeChapter) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-canvas text-zinc-500 font-mono text-xs">
        No case flowchart chapters found.
      </div>
    );
  }

  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden font-sans select-none transition-colors duration-150 ${
        isDark ? "bg-canvas text-ink" : "bg-canvas text-ink"
      }`}
    >
      {/* ── TOP CONTROL & FILTER BAR ── */}
      <div
        className={`flex h-14 shrink-0 items-center justify-between border-b px-5 z-20 transition-colors ${
          isDark ? "border-line bg-panel-deep" : "border-line bg-panel-deep"
        }`}
      >
        {/* Left: Searchable FIR Selector Dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Search
              className={`absolute left-2.5 size-3.5 ${
                isDark ? "text-ink-faint" : "text-ink-faint"
              }`}
            />
            <input
              type="text"
              placeholder="Search 500 Ingested FIRs..."
              value={caseSearchQuery}
              onChange={(e) => setCaseSearchQuery(e.target.value)}
              className={`h-8 w-44 rounded-xl border pl-8 pr-2.5 text-xs outline-none transition-colors ${
                isDark
                  ? "border-line bg-panel text-ink placeholder-ink-faint focus:border-accent"
                  : "border-line bg-panel text-ink placeholder-ink-faint focus:border-accent"
              }`}
            />
          </div>

          <select
            value={selectedChapterId}
            onChange={(e) => {
              setSelectedChapterId(e.target.value);
              setSelectedNode(null);
            }}
            className={`h-8 max-w-[280px] truncate rounded-xl border px-3 text-xs font-mono outline-none cursor-pointer transition-colors ${
              isDark
                ? "border-line bg-panel text-ink focus:border-accent"
                : "border-line bg-panel text-ink focus:border-accent"
            }`}
          >
            {filteredChapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.code} — {ch.title}
              </option>
            ))}
          </select>

          {/* Active Case Badges */}
          <div className="hidden xl:flex items-center gap-2">
            <span
              className={`rounded-lg border px-2 py-0.5 text-[11px] font-mono ${
                isDark
                  ? "border-line bg-panel text-ink-muted"
                  : "border-line bg-panel text-ink-muted"
              }`}
            >
              {activeChapter.completionNote || "19 NODES // 18 EDGES"}
            </span>
            <span
              className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium ${
                isDark
                  ? "border-line bg-panel text-ink"
                  : "border-line bg-panel text-ink-muted"
              }`}
            >
              Broker: <strong className="font-bold">{activeChapter.character}</strong>
            </span>
            <span
              className={`rounded-lg border px-2 py-0.5 text-[11px] font-mono ${
                isDark
                  ? "border-verified/40 bg-verified/15 text-verified"
                  : "border-verified/40 bg-verified/10 text-verified"
              }`}
            >
              BSA SEC 63(4) CERTIFIED
            </span>
          </div>
        </div>

        {/* Right: View Mode Toggle & Cross-Navigation Actions */}
        <div className="flex items-center gap-3">
          {/* Pipeline vs Canvas Mode */}
          <div
            className={`flex items-center rounded-xl border p-0.5 transition-colors ${
              isDark ? "border-line bg-panel-deep" : "border-line bg-raised"
            }`}
          >
            <button
              onClick={() => setActiveTab("pipeline")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "pipeline"
                  ? isDark
                    ? "bg-raised text-white shadow-xs border border-line-strong"
                    : "bg-panel text-ink shadow-xs border border-line"
                  : isDark
                  ? "text-ink-muted hover:text-white"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <GitBranch className="size-3.5 text-accent" />
              <span>Procedural Pipeline</span>
            </button>
            <button
              onClick={() => setActiveTab("canvas")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "canvas"
                  ? isDark
                    ? "bg-raised text-white shadow-xs border border-line-strong"
                    : "bg-panel text-ink shadow-xs border border-line"
                  : isDark
                  ? "text-ink-muted hover:text-white"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <LayoutGrid className="size-3.5" />
              <span>Network Canvas</span>
            </button>
          </div>

          <div className={`h-4 w-px ${isDark ? "bg-line" : "bg-line"}`} />

          {/* Jump to AI Copilot */}
          <button
            onClick={() => onJumpToChat?.(activeChapter.code, activeChapter.code)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              isDark
                ? "border-line bg-panel text-ink hover:bg-raised hover:text-white"
                : "border-line bg-panel text-ink-muted hover:bg-[#faf8f2] hover:text-ink"
            }`}
          >
            <Bot className="size-3.5 text-accent" />
            <span>Interrogate Case</span>
          </button>
        </div>
      </div>

      {/* ── CASE CONTEXT STRIP ── */}
      <div
        className={`flex items-center justify-between border-b px-6 py-2.5 text-xs transition-colors ${
          isDark
            ? "border-line bg-panel-deep text-ink-muted"
            : "border-line bg-raised text-ink-muted"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono">CASE DOCKET:</span>
          <span className={`font-mono font-bold ${isDark ? "text-accent" : "text-accent"}`}>
            {activeChapter.code}
          </span>
          <span>•</span>
          <span className={`font-bold ${isDark ? "text-white" : "text-ink"}`}>
            {activeChapter.title}
          </span>
          <span>•</span>
          <span className="line-clamp-1">{activeChapter.description}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span>COMMUNITIES: {activeChapter.clusters?.length || 3}</span>
          <span>•</span>
          <span>NODES: {activeChapter.nodes?.length || 19}</span>
        </div>
      </div>

      {/* ── MAIN WORKSPACE CONTENT ── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* 1. PROCEDURAL PIPELINE VIEW (STATUTORY STAGES) */}
        {activeTab === "pipeline" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                {proceduralStages.map((stage) => {
                  const Icon = stage.icon;
                  return (
                    <div
                      key={stage.id}
                      className={`flex flex-col rounded-2xl border p-4 transition-colors ${
                        isDark ? "border-line bg-panel" : "border-line bg-panel"
                      }`}
                    >
                      {/* Stage Header */}
                      <div
                        className={`flex items-center justify-between border-b pb-3 ${
                          isDark ? "border-line" : "border-line"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex size-6 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                              isDark ? "bg-panel-deep text-accent" : "bg-panel-deep text-accent"
                            }`}
                          >
                            {stage.number}
                          </span>
                          <Icon className="size-4 text-accent" />
                        </div>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-semibold ${
                            stage.status === "COMPLETED"
                              ? isDark
                                ? "bg-panel-deep text-white"
                                : "bg-panel-deep text-ink"
                              : stage.status === "ACTIVE"
                              ? isDark
                                ? "bg-[#332512] text-accent"
                                : "bg-accent/15 text-accent"
                              : isDark
                              ? "bg-verified/15 text-verified"
                              : "bg-verified/10 text-verified"
                          }`}
                        >
                          {stage.status}
                        </span>
                      </div>

                      <div className="mt-2.5">
                        <h4 className={`text-xs font-bold leading-tight ${isDark ? "text-white" : "text-ink"}`}>
                          {stage.title}
                        </h4>
                        <p className={`text-[11px] line-clamp-1 mt-0.5 ${isDark ? "text-ink-muted" : "text-ink-muted"}`}>
                          {stage.subtitle}
                        </p>
                      </div>

                      {/* Stage Nodes List */}
                      <div className="mt-4 flex-1 space-y-2 overflow-y-auto max-h-[580px] pr-1">
                        {stage.nodes.length === 0 ? (
                          <div className="py-6 text-center text-[11px] text-zinc-600 font-mono">
                            No entities logged in this stage.
                          </div>
                        ) : (
                          stage.nodes.map((node) => {
                            const isSelected = selectedNode?.id === node.id;
                            const isBroker =
                              node.type === "parallelogram-thumbnail" ||
                              node.sceneTheme ||
                              (node.label || "").toLowerCase().includes("broker");

                            return (
                              <div
                                key={node.id}
                                onClick={() => setSelectedNode(node)}
                                className={`group cursor-pointer rounded-xl border p-3 transition-all ${
                                  isSelected
                                    ? isDark
                                      ? "border-accent bg-raised shadow-xs"
                                      : "border-accent bg-[#fffdfa] shadow-xs"
                                    : isDark
                                    ? "border-line bg-panel-deep hover:border-line-strong hover:bg-panel"
                                    : "border-line bg-panel-deep hover:border-line-strong hover:bg-panel"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div
                                    className={`flex items-center gap-1.5 font-medium text-xs ${
                                      isDark ? "text-zinc-200" : "text-ink"
                                    }`}
                                  >
                                    <span className={isDark ? "text-zinc-500" : "text-ink-muted"}>
                                      {node.icon || "▪"}
                                    </span>
                                    <span className="line-clamp-1 font-mono">
                                      {node.label || "Unnamed Entity"}
                                    </span>
                                  </div>
                                  {isBroker && (
                                    <span className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent border border-accent/30">
                                      HUB
                                    </span>
                                  )}
                                </div>

                                {node.details && (
                                  <p
                                    className={`mt-1.5 line-clamp-2 text-[11px] font-sans leading-relaxed ${
                                      isDark ? "text-zinc-400" : "text-ink-muted"
                                    }`}
                                  >
                                    {node.details}
                                  </p>
                                )}

                                <div
                                  className={`mt-2 flex items-center justify-between border-t pt-1.5 text-[10px] font-mono ${
                                    isDark ? "border-line text-zinc-500" : "border-line text-ink-muted"
                                  }`}
                                >
                                  <span>Influence: {node.worldStat || "80%"}</span>
                                  <span
                                    className={`flex items-center gap-0.5 ${
                                      isDark ? "text-zinc-400 group-hover:text-zinc-200" : "text-ink-muted group-hover:text-ink"
                                    }`}
                                  >
                                    Inspect <ChevronRight className="size-3" />
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. INTERACTIVE NETWORK CANVAS */}
        {activeTab === "canvas" && (
          <div
            className={`relative flex-1 overflow-hidden transition-colors ${
              isDark ? "bg-canvas" : "bg-canvas"
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Canvas Zoom Controls */}
            <div
              className={`absolute left-5 top-5 z-20 flex items-center gap-1 rounded-xl border p-1 shadow-md backdrop-blur-md transition-colors ${
                isDark
                  ? "border-line bg-panel-deep/95 text-zinc-400"
                  : "border-line bg-panel/95 text-ink"
              }`}
            >
              <button
                onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
                title="Zoom In"
                className={`rounded p-1.5 transition-colors ${
                  isDark ? "text-zinc-400 hover:bg-zinc-800 hover:text-white" : "text-ink-muted hover:bg-raised hover:text-ink"
                }`}
              >
                <ZoomIn className="size-3.5" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
                title="Zoom Out"
                className={`rounded p-1.5 transition-colors ${
                  isDark ? "text-zinc-400 hover:bg-zinc-800 hover:text-white" : "text-ink-muted hover:bg-raised hover:text-ink"
                }`}
              >
                <ZoomOut className="size-3.5" />
              </button>
              <button
                onClick={() => {
                  setZoom(1.0);
                  setPan({ x: 0, y: 0 });
                }}
                title="Reset View"
                className={`rounded p-1.5 transition-colors ${
                  isDark ? "text-zinc-400 hover:bg-zinc-800 hover:text-white" : "text-ink-muted hover:bg-raised hover:text-ink"
                }`}
              >
                <RotateCcw className="size-3.5" />
              </button>
              <span
                className={`px-2 font-mono text-[11px] ${
                  isDark ? "text-zinc-400" : "text-ink-muted"
                }`}
              >
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Transform Container */}
            <div
              className="absolute left-0 top-0 transition-transform duration-75 ease-out"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
                width: `${activeChapter.canvasWidth || 2400}px`,
                height: `${activeChapter.canvasHeight || 800}px`,
              }}
            >
              {/* Clusters as Clean Bounding Frames */}
              {activeChapter.clusters?.map((cluster) => (
                <div
                  key={cluster.id}
                  className={`absolute rounded-xl border pointer-events-none ${
                    isDark ? "border-line bg-panel-deep/30" : "border-line bg-accent/15"
                  }`}
                  style={{
                    left: `${cluster.x}px`,
                    top: `${cluster.y}px`,
                    width: `${cluster.w}px`,
                    height: `${cluster.h}px`,
                  }}
                >
                  <div
                    className={`absolute -top-3 left-4 rounded border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
                      isDark ? "border-line bg-panel-deep text-ink-muted" : "border-line bg-panel text-ink-muted"
                    }`}
                  >
                    {cluster.label}
                  </div>
                </div>
              ))}

              {/* SVG Connectors */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{
                  width: `${activeChapter.canvasWidth || 2400}px`,
                  height: `${activeChapter.canvasHeight || 800}px`,
                }}
              >
                <defs>
                  <marker
                    id="minimal-arrow"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L0,6 L6,3 z" fill={isDark ? "#52525b" : "#94a3b8"} />
                  </marker>
                </defs>

                {activeChapter.connections?.map((conn, idx) => {
                  const fromNode = activeChapter.nodes.find((n) => n.id === conn.from);
                  const toNode = activeChapter.nodes.find((n) => n.id === conn.to);
                  if (!fromNode || !toNode) return null;

                  const x1 = fromNode.x + (fromNode.w || 240);
                  const y1 = fromNode.y + (fromNode.h || 40) / 2;
                  const x2 = toNode.x;
                  const y2 = toNode.y + (toNode.h || 40) / 2;
                  const midX = (x1 + x2) / 2;

                  return (
                    <path
                      key={idx}
                      d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={isDark ? "#3f3f46" : "#cbd0db"}
                      strokeWidth="1.5"
                      markerEnd="url(#minimal-arrow)"
                    />
                  );
                })}
              </svg>

              {/* Node Cards on Canvas */}
              {activeChapter.nodes?.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const isBroker =
                  node.type === "parallelogram-thumbnail" ||
                  node.sceneTheme ||
                  (node.label || "").toLowerCase().includes("broker");

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`canvas-node-card absolute cursor-pointer rounded-xl border p-2.5 transition-all select-none ${
                      isSelected
                        ? isDark
                          ? "border-accent bg-raised shadow-md ring-1 ring-accent"
                          : "border-accent bg-panel shadow-md ring-1 ring-accent"
                        : isDark
                        ? "border-line bg-panel-deep/95 hover:border-line-strong hover:bg-panel"
                        : "border-line bg-panel/95 hover:border-line-strong hover:bg-[#faf8f2]"
                    }`}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: `${node.w || 220}px`,
                      minHeight: `${node.h || 44}px`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`text-xs ${isDark ? "text-zinc-500" : "text-ink-muted"}`}>
                          {node.icon || "▪"}
                        </span>
                        <span
                          className={`font-mono text-xs font-semibold truncate ${
                            isDark ? "text-zinc-200" : "text-ink"
                          }`}
                        >
                          {node.label}
                        </span>
                      </div>
                      {isBroker && (
                        <span className="rounded bg-accent/10 px-1 text-[9px] font-bold text-accent border border-accent/30">
                          HUB
                        </span>
                      )}
                    </div>

                    {node.details && (
                      <p
                        className={`mt-1 line-clamp-1 text-[10px] ${
                          isDark ? "text-zinc-400" : "text-ink-muted"
                        }`}
                      >
                        {node.details}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 3. SLIDE-OVER ENTITY INSPECTOR DRAWER ── */}
        {selectedNode && (
          <aside
            className={`w-80 xl:w-96 border-l flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-150 transition-colors ${
              isDark
                ? "border-line bg-panel-deep text-white"
                : "border-line bg-panel text-ink"
            }`}
          >
            {/* Drawer Header */}
            <div
              className={`flex h-13 shrink-0 items-center justify-between border-b px-5 ${
                isDark ? "border-line" : "border-line"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-accent" />
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-ink"}`}>
                  Entity Inspector
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className={`text-xs font-mono p-1 transition-colors cursor-pointer ${
                  isDark ? "text-ink-muted hover:text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                ✕ Close
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Entity Title & Type */}
              <div
                className={`rounded-2xl border p-4 space-y-2 ${
                  isDark
                    ? "border-line bg-panel"
                    : "border-line bg-panel-deep"
                }`}
              >
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase ${
                    isDark
                      ? "border-line bg-panel-deep text-accent"
                      : "border-line bg-panel text-accent"
                  }`}
                >
                  {selectedNode.type}
                </span>
                <h3 className={`font-mono text-sm font-bold ${isDark ? "text-white" : "text-ink"}`}>
                  {selectedNode.label}
                </h3>
                <div className="flex items-center gap-2 pt-1 font-mono text-xs">
                  <span className={isDark ? "text-ink-muted" : "text-ink-muted"}>Influence Centrality:</span>
                  <span className="font-semibold text-verified">
                    {selectedNode.worldStat || "85%"}
                  </span>
                </div>
              </div>

              {/* Forensic Details */}
              <div className="space-y-2">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? "text-[#8a8c98]" : "text-ink-muted"
                  }`}
                >
                  Case Docket Attributes
                </span>
                <div
                  className={`rounded-2xl border p-3.5 text-xs leading-relaxed font-mono whitespace-pre-wrap ${
                    isDark
                      ? "border-line bg-panel text-ink"
                      : "border-line bg-panel-deep text-ink-muted"
                  }`}
                >
                  {selectedNode.details || "No explicit secondary facts logged."}
                </div>
              </div>

              {/* Requirement / Investigation Status */}
              <div className="space-y-2">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? "text-[#8a8c98]" : "text-ink-muted"
                  }`}
                >
                  Investigation Status
                </span>
                <div
                  className={`rounded-2xl border p-3 text-xs space-y-1.5 font-mono ${
                    isDark
                      ? "border-line bg-panel text-ink"
                      : "border-line bg-panel-deep text-ink-muted"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className={isDark ? "text-ink-muted" : "text-ink-muted"}>Status:</span>
                    <span className={`font-semibold uppercase ${isDark ? "text-white" : "text-ink"}`}>
                      {selectedNode.status || "Active"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? "text-ink-muted" : "text-ink-muted"}>Cluster Community:</span>
                    <span>{selectedNode.cluster || "Default"}</span>
                  </div>
                  {selectedNode.req && (
                    <div className="mt-2 rounded-xl bg-accent/10 p-2 text-[11px] text-accent border border-accent/30">
                      ⚠️ {selectedNode.req}
                    </div>
                  )}
                </div>
              </div>

              {/* Cross-View AI Action */}
              <div className="pt-2">
                <button
                  onClick={() =>
                    onJumpToChat?.(
                      activeChapter.code,
                      `${activeChapter.code} (re: ${selectedNode.label})`
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-accent-contrast hover:brightness-105 transition-all shadow-xs cursor-pointer"
                >
                  <Bot className="size-4" />
                  <span>Interrogate Entity in AI Copilot</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
