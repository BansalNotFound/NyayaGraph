"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  fetchAggregateGraph,
  fetchAllCases,
  fetchCaseDetail,
  fetchCaseGraph,
  streamCaseAiAnalysis,
  type ApiCaseSummary,
  type ApiCaseDetail,
  type SseStepEvent,
  type SseToolCallEvent,
} from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import FirPdfModal from "@/components/FirPdfModal";
import { MarkdownView } from "@/components/MarkdownView";
import {
  Search,
  Filter,
  ShieldCheck,
  Building2,
  Calendar,
  Users,
  Scale,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  FileText,
  Network,
  Eye,
  MessageSquare,
  Lock,
  Layers,
  Play,
  Copy,
  Check,
  Bot,
  Hash,
  Send,
  BookOpen,
} from "lucide-react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";

interface CasesExplorerViewProps {
  onOpenChatWithCase?: (caseId: string, firNumber: string) => void;
  onJumpToGlobalGraph?: (nodeId?: string) => void;
}

type LocalSimNode = SimulationNodeDatum & {
  id: string;
  label: string;
  category: string;
  sublabel?: string;
  is_broker?: boolean;
  is_hub?: boolean;
  details?: Record<string, unknown>;
  x?: number;
  y?: number;
};

type LocalSimLink = SimulationLinkDatum<LocalSimNode> & {
  id: string;
  source: string | LocalSimNode;
  target: string | LocalSimNode;
  label?: string;
  source_type?: string;
  is_suspicious?: boolean;
};

const CATEGORY_COLORS: Record<string, string> = {
  HUB: "#f59e0b",
  PERSON: "#38bdf8",
  BANK_ACCOUNT: "#10b981",
  LEGAL_SECTION: "#94a3b8",
  FACT: "#e2e8f0",
  EVIDENCE: "#64748b",
  LOCATION: "#64748b",
};

export default function CasesExplorerView({
  onOpenChatWithCase,
  onJumpToGlobalGraph,
}: CasesExplorerViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [cases, setCases] = useState<ApiCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<ApiCaseDetail | null>(null);

  // Single Case Graph State
  const [caseNodes, setCaseNodes] = useState<LocalSimNode[]>([]);
  const [caseEdges, setCaseEdges] = useState<LocalSimLink[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [expandSyndicate, setExpandSyndicate] = useState(false);
  const [selectedNode, setSelectedNode] = useState<LocalSimNode | null>(null);

  // PDF Preview & AI Case Analysis State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  // SSE streaming analysis state
  const [aiSteps, setAiSteps] = useState<Array<SseStepEvent | SseToolCallEvent>>([]);
  const [aiThinking, setAiThinking] = useState("");
  const [aiTokens, setAiTokens] = useState("");
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisDone, setAiAnalysisDone] = useState(false);
  const [aiEngine, setAiEngine] = useState("");
  const [aiLatency, setAiLatency] = useState<number | null>(null);
  const [customFocusInput, setCustomFocusInput] = useState("");
  const [copiedAnalysis, setCopiedAnalysis] = useState(false);
  const aiAbortRef = useRef<AbortController | null>(null);

  const loadAiAnalysis = useCallback((caseId: string, focus?: string) => {
    // Abort any in-flight SSE stream
    aiAbortRef.current?.abort();
    const ctrl = new AbortController();
    aiAbortRef.current = ctrl;

    setAiAnalysisLoading(true);
    setAiAnalysisDone(false);
    setAiSteps([]);
    setAiThinking("");
    setAiTokens("");
    setAiEngine("");
    setAiLatency(null);

    streamCaseAiAnalysis(
      caseId,
      {
        onStep: (e) => {
          setAiSteps((prev) => [...prev, e]);
        },
        onThinking: (e) => {
          setAiThinking((prev) => prev + e.chunk);
        },
        onToken: (e) => {
          setAiTokens((prev) => prev + e.chunk);
        },
        onDone: (e) => {
          setAiAnalysisLoading(false);
          setAiAnalysisDone(true);
          setAiEngine(e.engine ?? "");
          setAiLatency(e.latency_seconds ?? null);
        },
        onError: (e) => {
          console.error("AI stream error:", e);
          setAiAnalysisLoading(false);
          setAiAnalysisDone(true);
        },
      },
      focus,
      ctrl.signal,
    );
  }, []);

  // ── Fluid One-By-One Case Graph Build Animation State ──
  const [visibleNodeSet, setVisibleNodeSet] = useState<Set<string> | null>(null);
  const [buildPhase, setBuildPhase] = useState<"waiting" | "building" | "settling" | "interactive">("waiting");
  const [isBuildAnimating, setIsBuildAnimating] = useState(true);
  const [revealedNodeCount, setRevealedNodeCount] = useState(1);
  const buildAnimTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Visible nodes and links during progressive reveal
  const visibleNodes = useMemo(() => {
    if (!visibleNodeSet) return caseNodes;
    return caseNodes.filter((n) => visibleNodeSet.has(n.id));
  }, [caseNodes, visibleNodeSet]);

  const visibleEdges = useMemo(() => {
    if (!visibleNodeSet) return caseEdges;
    return caseEdges.filter((l) => {
      const sId = typeof l.source === "object" ? (l.source as any).id : String(l.source);
      const tId = typeof l.target === "object" ? (l.target as any).id : String(l.target);
      return visibleNodeSet.has(sId) && visibleNodeSet.has(tId);
    });
  }, [caseEdges, visibleNodeSet]);

  const hubNode = useMemo(() => {
    return caseNodes.find((n) => n.is_hub || n.id.startsWith("HUB_")) || caseNodes[0] || null;
  }, [caseNodes]);

  const [, setTick] = useState(0);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");

  // Canvas Viewport & Zoom
  const [transform, setTransform] = useState({ x: 450, y: 320, k: 1.0 });
  const [canvasSize, setCanvasSize] = useState({ w: 900, h: 650 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation<LocalSimNode, LocalSimLink> | null>(null);
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const caseNodesRef = useRef<LocalSimNode[]>([]);
  caseNodesRef.current = caseNodes;

  // Fit camera centered on case graph with comfortable bounds
  const fitCaseView = useCallback(
    (nodesToFit?: LocalSimNode[]) => {
      const targetNodes = nodesToFit || caseNodesRef.current;
      const cw = canvasRef.current?.clientWidth || canvasSize.w || 900;
      const ch = canvasRef.current?.clientHeight || canvasSize.h || 650;
      if (!targetNodes.length || cw <= 0 || ch <= 0) return;
      const xs = targetNodes.map((n) => n.x ?? cw / 2);
      const ys = targetNodes.map((n) => n.y ?? ch / 2);
      const minX = Math.min(...xs),
        maxX = Math.max(...xs);
      const minY = Math.min(...ys),
        maxY = Math.max(...ys);
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      const padding = 130;
      const spanX = Math.max(120, maxX - minX + padding);
      const spanY = Math.max(120, maxY - minY + padding);
      const fitK = Math.min(1.15, Math.max(0.40, Math.min(cw / spanX, ch / spanY)));

      setTransform({
        k: fitK,
        x: cw / 2 - midX * fitK,
        y: ch / 2 - midY * fitK,
      });
    },
    [canvasSize.w, canvasSize.h]
  );

  const startBuildAnimation = useCallback((nodesToAnimate: LocalSimNode[]) => {
    buildAnimTimersRef.current.forEach(clearTimeout);
    buildAnimTimersRef.current = [];

    if (!nodesToAnimate || nodesToAnimate.length === 0) {
      setIsBuildAnimating(false);
      setVisibleNodeSet(null);
      setRevealedNodeCount(0);
      setBuildPhase("interactive");
      return;
    }

    const sorted = [...nodesToAnimate].sort((a, b) => {
      const getRank = (n: LocalSimNode) => {
        if (n.is_hub || n.id.startsWith("HUB_")) return 0;
        if (n.is_broker) return 1;
        if (n.category === "PERSON") return 2;
        if (n.category === "ORGANIZATION") return 3;
        if (n.category === "BANK_ACCOUNT") return 4;
        return 5;
      };
      return getRank(a) - getRank(b);
    });

    const total = sorted.length;
    if (total <= 1) {
      setIsBuildAnimating(false);
      setVisibleNodeSet(null);
      setRevealedNodeCount(total);
      setBuildPhase("interactive");
      return;
    }

    const hub = sorted[0];
    setIsBuildAnimating(true);
    setBuildPhase("waiting");
    setVisibleNodeSet(new Set([hub.id]));
    setRevealedNodeCount(1);

    // Initial waiting pulse for the root node: 220ms
    let accumulatedTime = 220;
    buildAnimTimersRef.current.push(
      setTimeout(() => {
        setBuildPhase("building");
      }, accumulatedTime)
    );

    // Progressive node-by-node reveal: ~65ms per node
    const stepDelay = Math.max(55, Math.min(90, Math.floor(1400 / total)));

    for (let i = 1; i < total; i++) {
      accumulatedTime += stepDelay;
      const count = i + 1;
      const currentNodesSlice = sorted.slice(0, count);
      buildAnimTimersRef.current.push(
        setTimeout(() => {
          setRevealedNodeCount(count);
          setVisibleNodeSet(new Set(currentNodesSlice.map((n) => n.id)));
        }, accumulatedTime)
      );
    }

    // Settle phase
    accumulatedTime += 300;
    buildAnimTimersRef.current.push(
      setTimeout(() => {
        setBuildPhase("settling");
      }, accumulatedTime)
    );

    // Interactive phase
    accumulatedTime += 200;
    buildAnimTimersRef.current.push(
      setTimeout(() => {
        setBuildPhase("interactive");
        setIsBuildAnimating(false);
        setVisibleNodeSet(null);
        setRevealedNodeCount(total);
      }, accumulatedTime)
    );
  }, []);

  const skipAnimation = useCallback(() => {
    buildAnimTimersRef.current.forEach(clearTimeout);
    buildAnimTimersRef.current = [];
    setIsBuildAnimating(false);
    setBuildPhase("interactive");
    setVisibleNodeSet(null);
    setRevealedNodeCount(caseNodesRef.current.length);
  }, []);

  const replayAnimation = useCallback(() => {
    startBuildAnimation(caseNodesRef.current);
  }, [startBuildAnimation]);

  // Load all cases on mount
  useEffect(() => {
    fetchAllCases().then((data) => {
      setCases(data || []);
      if (data && data.length > 0) {
        setSelectedCaseId(data[0].case_id);
      }
      setLoading(false);
    });
  }, []);

  // Update canvas dimensions
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const { clientWidth, clientHeight } = canvasRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setCanvasSize({ w: clientWidth, h: clientHeight });
        }
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Synchronized fetch & D3 simulation for isolated case graph
  useEffect(() => {
    if (!selectedCaseId) return;

    let isCancelled = false;
    setGraphLoading(true);
    setSelectedNode(null);
    simRef.current?.stop();

    // Fetch full case detail for metadata
    fetchCaseDetail(selectedCaseId).then((det) => {
      if (!isCancelled) setSelectedCaseDetail(det);
    });

    // Fetch isolated case graph (and aggregate graph if expandSyndicate is on)
    Promise.all([
      fetchCaseGraph(selectedCaseId),
      expandSyndicate ? fetchAggregateGraph() : Promise.resolve(null),
    ])
      .then(([gData, agg]) => {
        if (isCancelled) return;

        if (!gData || !gData.nodes || gData.nodes.length === 0) {
          setCaseNodes([]);
          setCaseEdges([]);
          setGraphLoading(false);
          return;
        }

        const w = canvasSize.w || 900;
        const h = canvasSize.h || 650;
        const nodeMap = new Map<string, LocalSimNode>();
        const hubId = `HUB_${selectedCaseId}`;

        // Add base case nodes
        (gData.nodes || []).forEach((n: any) => {
          const isH = n.id.startsWith("HUB_") || n.id === hubId;
          nodeMap.set(n.id, {
            ...n,
            is_hub: isH,
            x: isH ? w / 2 : w / 2 + (Math.random() - 0.5) * 240,
            y: isH ? h / 2 : h / 2 + (Math.random() - 0.5) * 240,
            vx: 0,
            vy: 0,
          });
        });

        const rawLinksList: any[] = [...(gData.edges || [])];

        // If expandSyndicate is enabled, pull in directly connected bridge edges & nodes
        if (expandSyndicate && agg) {
          const localIds = new Set(nodeMap.keys());
          const bridgeEdges = (agg.edges || []).filter((e: any) => {
            const sId = typeof e.source === "object" ? e.source.id : String(e.source);
            const tId = typeof e.target === "object" ? e.target.id : String(e.target);
            return localIds.has(sId) || localIds.has(tId);
          });

          const neededNodeIds = new Set<string>();
          bridgeEdges.forEach((e: any) => {
            const sId = typeof e.source === "object" ? e.source.id : String(e.source);
            const tId = typeof e.target === "object" ? e.target.id : String(e.target);
            neededNodeIds.add(sId);
            neededNodeIds.add(tId);
          });

          (agg.nodes || []).forEach((n: any) => {
            if (neededNodeIds.has(n.id) && !nodeMap.has(n.id)) {
              nodeMap.set(n.id, {
                ...n,
                is_hub: n.id.startsWith("HUB_"),
                x: w / 2 + (Math.random() - 0.5) * 400,
                y: h / 2 + (Math.random() - 0.5) * 400,
                vx: 0,
                vy: 0,
              });
            }
          });

          rawLinksList.push(...bridgeEdges);
        }

        // CRITICAL INVARIANT: Only keep edges where BOTH source and target exist in nodeMap!
        const validNodes = Array.from(nodeMap.values());
        const validLinks: LocalSimLink[] = [];
        const seenLinks = new Set<string>();

        rawLinksList.forEach((e: any, idx: number) => {
          const sId = typeof e.source === "object" ? (e.source as any).id : String(e.source);
          const tId = typeof e.target === "object" ? (e.target as any).id : String(e.target);

          if (nodeMap.has(sId) && nodeMap.has(tId)) {
            const pairKey = `${sId}->${tId}`;
            if (!seenLinks.has(pairKey)) {
              seenLinks.add(pairKey);
              validLinks.push({
                ...e,
                id: e.id || `edge-${idx}`,
                source: sId,
                target: tId,
              });
            }
          }
        });

        setCaseNodes(validNodes);
        setCaseEdges(validLinks);
        setGraphLoading(false);

        // Run D3 Simulation and pre-settle synchronously for rock-solid stability
        const sim = forceSimulation<LocalSimNode, LocalSimLink>(validNodes)
          .force(
            "link",
            forceLink<LocalSimNode, LocalSimLink>(validLinks)
              .id((d) => d.id)
              .distance((l: any) => (l.is_hub ? 120 : 160))
              .strength(0.7)
          )
          .force("charge", forceManyBody().strength(-340))
          .force("center", forceCenter(w / 2, h / 2).strength(0.5))
          .force("collide", forceCollide().radius(38))
          .alpha(1);

        // Synchronous pre-settle ticks
        for (let i = 0; i < 35; i++) sim.tick();
        sim.stop();

        // Permanently fix coordinates so nodes don't vibrate during fluid pop-in
        validNodes.forEach((n) => {
          if (n.x != null && n.y != null) {
            n.fx = n.x;
            n.fy = n.y;
          }
        });

        simRef.current = sim;
        setCaseNodes(validNodes);
        setCaseEdges(validLinks);
        setGraphLoading(false);

        // Center camera immediately
        fitCaseView(validNodes);

        // Kick off fluid, dot-by-dot sprouting build animation!
        startBuildAnimation(validNodes);
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("Error loading case graph:", err);
          setGraphLoading(false);
          setIsBuildAnimating(false);
          setVisibleNodeSet(null);
        }
      });

    return () => {
      isCancelled = true;
      simRef.current?.stop();
      buildAnimTimersRef.current.forEach(clearTimeout);
      buildAnimTimersRef.current = [];
    };
  }, [selectedCaseId, expandSyndicate, fitCaseView, startBuildAnimation]);

  // Node order lookup for styling
  const nodeOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...caseNodes].sort((a, b) => {
      const getRank = (n: LocalSimNode) => {
        if (n.is_hub || n.id.startsWith("HUB_")) return 0;
        if (n.is_broker) return 1;
        if (n.category === "PERSON") return 2;
        if (n.category === "ORGANIZATION") return 3;
        if (n.category === "BANK_ACCOUNT") return 4;
        return 5;
      };
      return getRank(a) - getRank(b);
    });
    sorted.forEach((n, idx) => map.set(n.id, idx));
    return map;
  }, [caseNodes]);

  // Filtered cases list
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (branchFilter !== "ALL") {
        const ps = (c.police_station || "").toLowerCase();
        if (branchFilter === "BSFB" && !ps.includes("bs&fb") && !ps.includes("bsfb")) return false;
        if (branchFilter === "ACB" && !ps.includes("acb")) return false;
        if (branchFilter === "SCB" && !ps.includes("scb")) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.fir_number.toLowerCase().includes(q) ||
        (c.police_station && c.police_station.toLowerCase().includes(q)) ||
        (c.broker_name && c.broker_name.toLowerCase().includes(q))
      );
    });
  }, [cases, branchFilter, searchQuery]);

  const selectedCase = useMemo(() => {
    return cases.find((c) => c.case_id === selectedCaseId) || cases[0];
  }, [cases, selectedCaseId]);

  return (
    <div
      className={`flex h-full w-full overflow-hidden font-sans select-none transition-colors duration-150 ${
        isDark ? "bg-canvas text-ink" : "bg-canvas text-ink"
      }`}
    >
      {/* ── LEFT PANE: Searchable Case Catalog Sidebar ── */}
      <aside
        className={`w-96 shrink-0 flex flex-col border-r transition-colors ${
          isDark ? "border-line bg-panel-deep" : "border-line bg-panel-deep"
        }`}
      >
        {/* Search & Filter Header */}
        <div
          className={`flex flex-col gap-3 border-b p-4 ${
            isDark ? "border-line" : "border-line"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-ink"}`}>
                CBI FIR Catalog
              </span>
              <span
                className={`rounded-md border px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                  isDark
                    ? "border-line bg-panel text-accent"
                    : "border-line bg-panel text-accent"
                }`}
              >
                500 Ingested Files
              </span>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search
              className={`absolute left-3 top-2.5 size-4 ${
                isDark ? "text-ink-faint" : "text-ink-faint"
              }`}
            />
            <input
              type="text"
              placeholder="Search FIR, CBI Branch, Accused..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-xl border py-2 pl-9 pr-3 text-xs outline-none transition-colors ${
                isDark
                  ? "border-line bg-panel text-ink placeholder-ink-faint focus:border-accent"
                  : "border-line bg-panel text-ink placeholder-ink-faint focus:border-accent"
              }`}
            />
          </div>

          {/* Branch Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium pb-0.5">
            {[
              { id: "ALL", label: "All Cases" },
              { id: "BSFB", label: "BS&FB (Bank Fraud)" },
              { id: "ACB", label: "ACB (Corruption)" },
              { id: "SCB", label: "SCB (Crime)" },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => setBranchFilter(b.id)}
                className={`rounded-lg px-2.5 py-1 text-xs transition-colors whitespace-nowrap cursor-pointer ${
                  branchFilter === b.id
                    ? isDark
                      ? "bg-raised font-bold text-white border border-line-strong"
                      : "bg-charcoal font-bold text-white"
                    : isDark
                    ? "bg-panel text-ink-muted hover:text-white"
                    : "bg-panel text-ink-muted hover:bg-raised"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Case Cards Scroll List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-xs text-zinc-500 font-mono">
              Loading FIR Catalog...
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-xs text-zinc-500 p-4 text-center font-mono">
              No cases matching your query.
            </div>
          ) : (
            filteredCases.map((c) => {
              const isSelected = c.case_id === selectedCaseId;
              return (
                <div
                  key={c.case_id}
                  onClick={() => setSelectedCaseId(c.case_id)}
                  className={`group relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-3.5 transition-all ${
                    isSelected
                      ? isDark
                        ? "border-accent/40 bg-gradient-to-br from-accent/15 to-accent/5 shadow-xs"
                        : "border-accent/40 bg-gradient-to-br from-accent/15 to-accent/5 shadow-xs"
                      : isDark
                      ? "border-line bg-panel hover:border-line-strong hover:bg-raised"
                      : "border-line bg-panel hover:border-line-strong hover:bg-panel"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span
                        className={`font-mono text-xs font-bold ${
                          isSelected
                            ? isDark
                              ? "text-accent"
                              : "text-accent"
                            : isDark
                            ? "text-white"
                            : "text-ink"
                        }`}
                      >
                        FIR {c.fir_number}
                      </span>
                      <span
                        className={`text-[11px] font-medium line-clamp-1 ${
                          isDark ? "text-ink-muted" : "text-ink-muted"
                        }`}
                      >
                        {c.police_station || "CBI SPE"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCaseId(c.case_id);
                          setIsPdfModalOpen(true);
                        }}
                        title="View Scanned FIR PDF"
                        className={`flex items-center gap-1 rounded-md border px-1.5 py-0.2 text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                          isDark
                            ? "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20"
                            : "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20"
                        }`}
                      >
                        <FileText className="size-2.5 text-accent" />
                        <span>PDF</span>
                      </button>
                      <div
                        className={`flex items-center gap-1 rounded-md border px-1.5 py-0.2 text-[10px] font-mono ${
                          isDark
                            ? "border-verified/40 bg-verified/15 text-verified"
                            : "border-verified/40 bg-verified/10 text-verified"
                        }`}
                      >
                        <ShieldCheck className="size-3" />
                        <span>BSA 63(4)</span>
                      </div>
                    </div>
                  </div>

                  {/* Accused / Broker */}
                  {c.broker_name && (
                    <div
                      className={`flex items-center gap-1.5 text-xs ${
                        isDark ? "text-ink" : "text-ink-muted"
                      }`}
                    >
                      <Users className="size-3.5 text-accent shrink-0" />
                      <span className="truncate">
                        Prime Accused: <strong className="font-bold">{c.broker_name}</strong>
                      </span>
                    </div>
                  )}

                  {/* Badges footer */}
                  <div
                    className={`flex items-center justify-between pt-1 border-t text-[10px] font-mono ${
                      isDark ? "border-line text-ink-faint" : "border-line text-ink-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isDark ? "text-white" : "text-ink"}`}>
                        {c.node_count || 0} Entities
                      </span>
                      <span>•</span>
                      <span>{c.edge_count || 0} Links</span>
                    </div>
                    <span>{c.date_time ? c.date_time.split(" ")[0] : "2026-09-12"}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ── RIGHT PANE: Focused Single-Case Isolated Graph & Details ── */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {/* Top Action Bar */}
        <header
          className={`flex h-13 items-center justify-between border-b px-6 transition-colors ${
            isDark
              ? "border-line bg-panel-deep text-white"
              : "border-line bg-panel-deep text-ink"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-xs font-bold ${isDark ? "text-white" : "text-ink"}`}>
                  FIR {selectedCase?.fir_number || "SELECT A CASE"}
                </span>
                <span
                  className={`rounded-md border px-2 py-0.2 text-[10px] font-mono uppercase tracking-wider ${
                    isDark
                      ? "border-line bg-panel text-accent"
                      : "border-line bg-panel text-accent"
                  }`}
                >
                  ISOLATED GRAPH
                </span>
              </div>
              <span className={`text-[11px] line-clamp-1 ${isDark ? "text-ink-muted" : "text-ink-muted"}`}>
                {selectedCase?.police_station}
              </span>
            </div>
          </div>

          {/* Controls & Actions */}
          <div className="flex items-center gap-2.5">
            {/* View Scanned FIR (PDF) */}
            {selectedCase && (
              <button
                onClick={() => setIsPdfModalOpen(true)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                  isDark
                    ? "border-accent/30 bg-accent/10 text-accent hover:bg-accent/15 hover:border-accent/60"
                    : "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 hover:border-accent/60"
                }`}
                title="View authentic scanned CBI FIR PDF"
              >
                <FileText className="size-3.5" />
                <span>View Scanned FIR (PDF)</span>
              </button>
            )}

            {/* AI Forensic Analysis */}
            {selectedCase && (
              <button
                onClick={() => {
                  const next = !showAiAnalysis;
                  setShowAiAnalysis(next);
                  if (next && selectedCaseId && !aiTokens) {
                    loadAiAnalysis(selectedCaseId);
                  }
                }}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                  showAiAnalysis
                    ? isDark
                      ? "border-accent/60 bg-accent/20 text-accent shadow-md"
                      : "border-accent/40 bg-accent/15 text-accent shadow-md"
                    : isDark
                    ? "border-line bg-panel text-ink hover:border-line-strong hover:text-white"
                    : "border-line bg-panel text-ink-muted hover:border-line-strong hover:text-ink"
                }`}
                title="Groq AI Forensic Analysis of Case Description"
              >
                <Sparkles className="size-3.5 text-accent" />
                <span>AI Case Analysis</span>
                <span
                  className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold ${
                    isDark ? "bg-panel-deep text-ink-muted" : "bg-raised text-ink-muted"
                  }`}
                >
                  Groq AI
                </span>
              </button>
            )}

            {/* Expand Syndicate Connections Toggle */}
            <button
              onClick={() => setExpandSyndicate(!expandSyndicate)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                expandSyndicate
                  ? isDark
                    ? "border-accent bg-accent/15 text-accent shadow-xs"
                    : "border-accent bg-accent/15 text-accent shadow-xs"
                  : isDark
                  ? "border-line bg-panel text-ink-muted hover:border-line-strong hover:text-white"
                  : "border-line bg-panel text-ink-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              <Network className="size-3.5 text-accent" />
              <span>{expandSyndicate ? "Syndicate Active" : "Expand Links"}</span>
            </button>

            {/* Jump to Detective Chat */}
            {onOpenChatWithCase && selectedCase && (
              <button
                onClick={() => onOpenChatWithCase(selectedCase.case_id, selectedCase.fir_number)}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-accent-contrast hover:brightness-105 transition-all cursor-pointer shadow-xs"
              >
                <MessageSquare className="size-3.5" />
                <span>AI Copilot</span>
              </button>
            )}

            {/* Jump to Global Overview Graph */}
            {onJumpToGlobalGraph && (
              <button
                onClick={() => onJumpToGlobalGraph(selectedCase?.case_id)}
                title="View in Master Syndicate Graph"
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  isDark
                    ? "border-line bg-panel text-ink-muted hover:border-line-strong hover:text-white"
                    : "border-line bg-panel text-ink-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                <Layers className="size-3.5" />
                <span>Global Graph</span>
              </button>
            )}
          </div>
        </header>

        {/* ── SPLIT MAIN CONTAINER: Canvas (Left) & AI Case Analysis (Right) ── */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Interactive Graph Canvas */}
          <div
            ref={canvasRef}
            className={`relative flex-1 overflow-hidden transition-colors ${
              isDark ? "bg-canvas" : "bg-canvas"
            }`}
          >
          {/* Fluid Build-Out Progress Indicator (Top Center) */}
          {isBuildAnimating && (
            <div
              className={`absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-xs font-semibold shadow-xl backdrop-blur-md transition-all ${
                isDark
                  ? "border-accent/40 bg-panel-deep/95 text-accent"
                  : "border-accent/30 bg-panel/95 text-accent"
              }`}
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-accent" />
              </span>
              <span>
                {buildPhase === "waiting"
                  ? "Initializing Case Evidence Network..."
                  : buildPhase === "building"
                  ? `Sprouting Entities: ${revealedNodeCount}/${caseNodes.length}`
                  : "Settling Case Graph..."}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isDark ? "bg-accent/15 text-accent" : "bg-accent/15 text-accent"
                }`}
              >
                {Math.round((revealedNodeCount / Math.max(1, caseNodes.length)) * 100)}%
              </span>
              <button
                onClick={skipAnimation}
                className={`ml-1 rounded px-2 py-0.5 text-[11px] font-bold transition-colors cursor-pointer ${
                  isDark
                    ? "bg-accent/20 hover:bg-accent/30 text-accent"
                    : "bg-accent/15 hover:bg-accent/20 text-accent"
                }`}
              >
                Skip
              </button>
            </div>
          )}

          {/* Node Fluid Pop-in & Edge Draw-in Animation Styles */}
          <style>{`
            @keyframes nodeIdlePulse {
              0%, 100% {
                transform: scale(1);
                opacity: 0.85;
              }
              50% {
                transform: scale(1.18);
                opacity: 1;
              }
            }
            @keyframes nodeFluidPopIn {
              0% {
                transform: scale(0);
                opacity: 0;
              }
              60% {
                transform: scale(1.24);
                opacity: 1;
              }
              85% {
                transform: scale(0.92);
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }
            @keyframes edgeDrawIn {
              0% {
                opacity: 0;
              }
              100% {
                opacity: 1;
              }
            }
            .node-idle-breathing {
              animation: nodeIdlePulse 1.4s ease-in-out infinite;
              transform-box: fill-box;
              transform-origin: center center;
            }
            .node-pop {
              animation: nodeFluidPopIn 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
              transform-box: fill-box;
              transform-origin: center center;
            }
            .edge-connect {
              animation: edgeDrawIn 0.35s ease-out both;
            }
          `}</style>

          {graphLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-xs text-ink-muted">
                <div className="size-7 animate-spin rounded-full border-2 border-[#a855f7] border-t-transparent" />
                <span>ISOLATING CASE GRAPH…</span>
              </div>
            </div>
          ) : caseNodes.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center text-xs text-ink-muted">
              No graph data found for this case.
            </div>
          ) : (
            <svg
              className="h-full w-full block cursor-grab active:cursor-grabbing select-none"
              onWheel={(e) => {
                e.preventDefault();
                const k2 = Math.min(4.0, Math.max(0.4, transform.k * Math.exp(-e.deltaY * 0.0015)));
                const r = e.currentTarget.getBoundingClientRect();
                const mx = e.clientX - r.left;
                const my = e.clientY - r.top;
                setTransform({
                  k: k2,
                  x: mx - ((mx - transform.x) / transform.k) * k2,
                  y: my - ((my - transform.y) / transform.k) * k2,
                });
              }}
              onPointerDown={(e) => {
                if ((e.target as Element).closest("circle") || (e.target as Element).closest("text")) return;
                panRef.current = { sx: e.clientX, sy: e.clientY, ox: transform.x, oy: transform.y };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (panRef.current) {
                  const { ox, oy, sx, sy } = panRef.current;
                  setTransform((t) => ({
                    ...t,
                    x: ox + (e.clientX - sx),
                    y: oy + (e.clientY - sy),
                  }));
                }
              }}
              onPointerUp={(e) => {
                panRef.current = null;
                try {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                } catch {}
              }}
            >
              <defs>
                <marker
                  id="case-arrow"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5" fill="#52525b" />
                </marker>
                <marker
                  id="case-arrow-bridge"
                  viewBox="0 0 10 10"
                  refX="24"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9" fill="#e5851d" />
                </marker>
              </defs>

              <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
                {/* Edges */}
                {visibleEdges.map((l: any, idx: number) => {
                  const s = typeof l.source === "object" ? l.source : caseNodes.find((n) => n.id === l.source);
                  const t = typeof l.target === "object" ? l.target : caseNodes.find((n) => n.id === l.target);
                  if (!s || !t || s.x == null || s.y == null || t.x == null || t.y == null) return null;

                  const isBridge = l.source_type === "CROSS_CASE";
                  return (
                    <g key={l.id || `edge-${idx}`} className={isBuildAnimating ? "edge-connect" : undefined}>
                      <line
                        x1={s.x}
                        y1={s.y}
                        x2={t.x}
                        y2={t.y}
                        stroke={isBridge ? "#e5851d" : isDark ? "#52525b" : "#c5c0b4"}
                        strokeWidth={isBridge ? 2.5 : 1.6}
                        strokeOpacity={isBridge ? 0.95 : isDark ? 0.7 : 0.55}
                        strokeDasharray={isBridge ? "5 3" : undefined}
                        markerEnd={isBridge ? "url(#case-arrow-bridge)" : "url(#case-arrow)"}
                      />
                      {/* Edge Label (if important or bridge) */}
                      {l.label && (
                        <text
                          x={(s.x + t.x) / 2}
                          y={(s.y + t.y) / 2 - 4}
                          textAnchor="middle"
                          fill={isBridge ? "#f59e0b" : isDark ? "#8c8c96" : "#65666e"}
                          fontSize={9}
                          fontFamily="monospace"
                          className="select-none"
                        >
                          {l.label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {visibleNodes.map((n) => {
                  if (n.x == null || n.y == null) return null;

                  const isHub = n.is_hub;
                  const isSelected = selectedNode?.id === n.id;
                  const color = isHub ? "#a855f7" : n.is_broker ? "#ef4444" : CATEGORY_COLORS[n.category] || "#94a3b8";
                  const r = isHub ? 24 : n.is_broker ? 18 : 14;
                  const isRootInIdle = buildPhase === "waiting" && (n.is_hub || n.id === hubNode?.id);

                  return (
                    <g
                      key={n.id}
                      onClick={() => setSelectedNode(n)}
                      className={`cursor-pointer ${isRootInIdle ? "node-idle-breathing" : isBuildAnimating ? "node-pop" : ""}`}
                      style={{
                        transformBox: "fill-box",
                        transformOrigin: "center center",
                      }}
                    >
                      {/* Selection Glow */}
                      {isSelected && (
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r={r + 8}
                          fill="none"
                          stroke="#e5851d"
                          strokeWidth={2}
                          className="animate-pulse"
                        />
                      )}

                      {/* Primary Circle */}
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={r}
                        fill={color}
                        stroke={isSelected ? "#ffffff" : isHub ? "#f5f3ff" : isDark ? "#18181b" : "#ffffff"}
                        strokeWidth={isHub ? 3 : 2}
                        fillOpacity={0.9}
                      />

                      {/* Crisp Backdrop Pill & Label */}
                      <g className="pointer-events-none select-none">
                        <rect
                          x={n.x - Math.min(n.label.length, 24) * 3.3 - 4}
                          y={n.y + r + 5}
                          width={Math.min(n.label.length, 24) * 6.6 + 8}
                          height={15}
                          rx={3}
                          fill={isDark ? "#0e0e11" : "#ffffff"}
                          fillOpacity={0.92}
                          stroke={isSelected ? "#e5851d" : isDark ? "#27272a" : "#e8e4da"}
                          strokeWidth={isSelected ? 1.2 : 0.8}
                        />
                        <text
                          x={n.x}
                          y={n.y + r + 16}
                          textAnchor="middle"
                          fill={isSelected ? (isDark ? "#ffffff" : "#1c1d22") : isDark ? "#e4e4e7" : "#1c1d22"}
                          fontFamily="Inter, sans-serif"
                          fontSize={isHub ? 11.5 : 10.5}
                          fontWeight={isHub || n.is_broker ? 700 : 500}
                        >
                          {n.label.length > 24 ? `${n.label.slice(0, 22)}…` : n.label}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          {/* Bottom Left Zoom & Animation Controls HUD */}
          <div
            className={`absolute bottom-5 left-5 z-10 flex items-center gap-2 rounded-xl border p-1.5 text-xs shadow-xl backdrop-blur-md transition-colors ${
              isDark
                ? "border-line bg-panel-deep/95 text-ink"
                : "border-line bg-panel/95 text-ink"
            }`}
          >
            <button
              onClick={() => setTransform((t) => ({ ...t, k: Math.min(4.0, t.k * 1.25) }))}
              title="Zoom In"
              className={`flex size-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                isDark ? "hover:bg-raised hover:text-white" : "hover:bg-raised hover:text-ink"
              }`}
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              onClick={() => setTransform((t) => ({ ...t, k: Math.max(0.4, t.k / 1.25) }))}
              title="Zoom Out"
              className={`flex size-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                isDark ? "hover:bg-raised hover:text-white" : "hover:bg-raised hover:text-ink"
              }`}
            >
              <ZoomOut className="size-4" />
            </button>
            <div className={`h-4 w-px ${isDark ? "bg-line" : "bg-line"}`} />
            <button
              onClick={() => fitCaseView()}
              title="Fit Case Network"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                isDark ? "hover:bg-raised hover:text-white" : "hover:bg-raised hover:text-ink"
              }`}
            >
              <Maximize2 className="size-3.5" />
              <span>Fit Case</span>
            </button>
            <div className={`h-4 w-px ${isDark ? "bg-line" : "bg-line"}`} />
            <button
              onClick={replayAnimation}
              title="Replay Case Build Animation"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                isDark ? "hover:bg-raised text-accent hover:text-accent" : "hover:bg-raised text-accent hover:text-accent"
              }`}
            >
              <Play className="size-3.5 text-accent fill-accent" />
              <span>Replay Build</span>
            </button>
          </div>

          {/* Node Details Overlay Panel (Bottom Right) */}
          {selectedNode && (
            <div
              className={`absolute bottom-5 right-5 z-20 w-88 rounded-2xl border p-5 shadow-2xl backdrop-blur-xl space-y-3 transition-colors ${
                isDark
                  ? "border-line bg-panel-deep/98 text-white"
                  : "border-line bg-panel/98 text-ink"
              }`}
            >
              <div
                className={`flex items-start justify-between gap-3 border-b pb-3 ${
                  isDark ? "border-line" : "border-line"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                    {selectedNode.category}
                  </span>
                  <h4
                    className={`text-sm font-bold line-clamp-1 ${
                      isDark ? "text-white" : "text-ink"
                    }`}
                  >
                    {selectedNode.label}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className={`rounded-lg p-1 transition-colors cursor-pointer ${
                    isDark ? "text-ink-muted hover:text-white" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {selectedNode.sublabel && (
                  <div className="flex items-center justify-between">
                    <span className={isDark ? "text-ink-muted" : "text-ink-muted"}>Role:</span>
                    <span className={`font-semibold ${isDark ? "text-white" : "text-ink"}`}>
                      {selectedNode.sublabel}
                    </span>
                  </div>
                )}
                {selectedNode.is_broker && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-rose-950/40 border border-rose-800/40 px-2.5 py-1 text-[11px] font-bold text-rose-300">
                    ⚡ Central Criminal Broker
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── AI FORENSIC ANALYSIS SIDE PANEL (DeepSeek Flash) ── */}
        {showAiAnalysis && (
          <aside
            className={`w-[480px] lg:w-[540px] shrink-0 flex flex-col border-l transition-all duration-200 z-20 ${
              isDark
                ? "border-line bg-panel-deep text-ink"
                : "border-line bg-panel-deep text-ink"
            }`}
          >
            {/* AI Panel Header */}
            <div
              className={`flex items-center justify-between border-b px-4 py-3 shrink-0 ${
                isDark ? "border-line bg-panel" : "border-line bg-panel"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-accent/20 text-accent">
                  <Sparkles className="size-4 text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      AI Case Analysis
                    </h3>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold ${
                        isDark
                          ? "bg-raised text-accent border border-accent/30"
                          : "bg-accent/15 text-accent border border-accent/40"
                      }`}
                    >
                      Groq AI
                    </span>
                  </div>
                  <span className={`text-[10.5px] ${isDark ? "text-ink-muted" : "text-ink-muted"}`}>
                    Live Stream • Case FIR {selectedCase?.fir_number}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => selectedCaseId && loadAiAnalysis(selectedCaseId, customFocusInput)}
                  disabled={aiAnalysisLoading}
                  className={`flex size-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isDark ? "hover:bg-raised text-ink-muted" : "hover:bg-raised text-ink-muted"
                  }`}
                  title="Re-run DeepSeek Analysis"
                >
                  <RefreshCw className={`size-3.5 ${aiAnalysisLoading ? "animate-spin text-accent" : ""}`} />
                </button>

                <button
                  onClick={() => setShowAiAnalysis(false)}
                  className={`flex size-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isDark ? "hover:bg-raised text-ink-muted" : "hover:bg-raised text-ink-muted"
                  }`}
                  title="Close Panel"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Action Toolbar */}
            <div
              className={`flex items-center justify-between border-b px-4 py-2 text-[11px] font-mono shrink-0 ${
                isDark ? "border-line bg-panel-deep text-ink-faint" : "border-line bg-canvas text-ink-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>
                  Status:{" "}
                  <strong className={aiAnalysisLoading ? "text-accent" : aiAnalysisDone ? "text-verified" : "text-zinc-500"}>
                    {aiAnalysisLoading ? "Streaming…" : aiAnalysisDone ? "Complete" : "Idle"}
                  </strong>
                </span>
                {aiLatency != null && (
                  <>
                    <span>•</span>
                    <span>{aiLatency}s</span>
                  </>
                )}
                {aiEngine && (
                  <span className="truncate max-w-[120px] opacity-60">{aiEngine}</span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (aiTokens) {
                      navigator.clipboard.writeText(aiTokens);
                      setCopiedAnalysis(true);
                      setTimeout(() => setCopiedAnalysis(false), 2000);
                    }
                  }}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                    isDark ? "bg-panel hover:bg-raised text-ink" : "bg-panel hover:bg-raised text-ink-muted"
                  }`}
                >
                  {copiedAnalysis ? <Check className="size-3 text-verified" /> : <Copy className="size-3" />}
                  <span>{copiedAnalysis ? "Copied" : "Copy"}</span>
                </button>

                <button
                  onClick={() => setIsPdfModalOpen(true)}
                  className="flex items-center gap-1 rounded-md bg-accent text-accent-contrast px-2 py-0.5 text-[10px] font-bold hover:brightness-105 transition-all cursor-pointer"
                >
                  <FileText className="size-3" />
                  <span>View PDF</span>
                </button>
              </div>
            </div>

            {/* Custom Investigative Focus Bar */}
            <div className={`p-3 border-b shrink-0 ${isDark ? "border-line bg-panel-deep" : "border-line bg-panel"}`}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (selectedCaseId && customFocusInput.trim()) {
                    loadAiAnalysis(selectedCaseId, customFocusInput);
                  }
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  placeholder="Focus prompt (e.g. money trail, shell companies, Sec 106 freeze)..."
                  value={customFocusInput}
                  onChange={(e) => setCustomFocusInput(e.target.value)}
                  className={`flex-1 rounded-xl border py-1.5 px-3 text-xs outline-none transition-colors ${
                    isDark
                      ? "border-line bg-panel text-accent placeholder-ink-faint focus:border-accent"
                      : "border-line bg-panel-deep text-ink placeholder-ink-faint focus:border-accent"
                  }`}
                />
                <button
                  type="submit"
                  disabled={aiAnalysisLoading}
                  className="flex items-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-accent-contrast hover:brightness-105 transition-all cursor-pointer shadow-2xs"
                >
                  <Send className="size-3" />
                  <span>Run</span>
                </button>
              </form>
            </div>

            {/* Scrollable Analysis Narrative Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs leading-relaxed">
              {/* ── LIVE STEP PILLS ── */}
              {(aiAnalysisLoading || aiSteps.length > 0) && (
                <div className={`space-y-1.5 rounded-2xl border p-3 ${
                  isDark ? "border-line bg-panel" : "border-line bg-panel"
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                    isDark ? "text-ink-muted" : "text-ink-muted"
                  }`}>Pipeline</span>
                  {aiSteps.map((s, i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-mono ${
                      isDark ? "bg-panel text-ink" : "bg-panel-deep text-ink-muted"
                    }`}>
                      <span className={`size-1.5 rounded-full shrink-0 ${
                        s.type === 'tool_call' ? 'bg-purple-400' : 'bg-accent'
                      }`} />
                      <span className="truncate">{s.message}</span>
                      {(s as any).progress != null && (
                        <span className={`ml-auto text-[10px] font-bold ${
                          isDark ? "text-accent" : "text-accent"
                        }`}>{(s as any).progress}%</span>
                      )}
                    </div>
                  ))}
                  {aiAnalysisLoading && (
                    <div className="flex items-center gap-2 px-2">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-accent" />
                      </span>
                      <span className={`text-[10.5px] font-mono animate-pulse ${
                        isDark ? "text-accent" : "text-accent"
                      }`}>Groq AI streaming…</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── THINKING DRAWER ── */}
              {aiThinking && (
                <details
                  className={`rounded-2xl border p-3 text-xs transition-colors ${
                    isDark ? "border-accent/40 bg-accent/10 text-accent/80" : "border-accent/40 bg-accent/10 text-accent"
                  }`}
                  open={aiAnalysisLoading}
                >
                  <summary className="font-mono font-bold cursor-pointer select-none">
                    🧠 Groq Reasoning Trace ({aiThinking.length} chars)
                  </summary>
                  <div className="mt-2 text-[11px] font-mono leading-normal whitespace-pre-wrap opacity-90 border-t border-inherit pt-2 max-h-48 overflow-y-auto">
                    {aiThinking}
                  </div>
                </details>
              )}

              {/* ── STREAMING TOKENS / FINAL ANALYSIS ── */}
              {aiAnalysisLoading && !aiTokens && !aiSteps.length && (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <div className="relative flex size-10 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                    <div className="size-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-accent font-mono">Groq AI Initializing…</p>
                    <p className={`text-xs max-w-xs ${isDark ? "text-ink-muted" : "text-ink-muted"}`}>
                      Connecting to Groq forensic pipeline…
                    </p>
                  </div>
                </div>
              )}

              {aiTokens ? (
                <div
                  className={`rounded-2xl border p-4 shadow-xs transition-colors ${
                    isDark ? "border-line bg-panel" : "border-line bg-panel"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-inherit">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-3.5 text-accent" />
                      <h4 className="text-xs font-bold text-accent tracking-wide uppercase font-mono">
                        Forensic Intelligence Report
                      </h4>
                    </div>
                    {aiAnalysisLoading && (
                      <span className="ml-auto text-[10px] font-mono text-accent animate-pulse flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-accent animate-ping" />
                        streaming…
                      </span>
                    )}
                  </div>
                  <MarkdownView content={aiTokens} />
                </div>
              ) : !aiAnalysisLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <BookOpen className="size-8 text-ink-muted" />
                  <p className="text-xs text-ink-muted">
                    Select a case and click &ldquo;AI Case Analysis&rdquo; to stream live Groq AI forensic intelligence.
                  </p>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div
              className={`flex items-center justify-between border-t p-3 text-xs shrink-0 ${
                isDark ? "border-line bg-panel-deep" : "border-line bg-canvas"
              }`}
            >
              <span className={`text-[10px] font-mono ${isDark ? "text-ink-faint" : "text-ink-muted"}`}>
                BSA 2023 Sec 63(4) Evidence Anchored
              </span>
              {onOpenChatWithCase && selectedCase && (
                <button
                  onClick={() => onOpenChatWithCase(selectedCase.case_id, selectedCase.fir_number)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                >
                  <MessageSquare className="size-3" />
                  <span>Ask AI Copilot →</span>
                </button>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── SCANNED FIR PDF PREVIEW MODAL ── */}
      {selectedCase && (
        <FirPdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          caseId={selectedCase.case_id}
          firNumber={selectedCase.fir_number}
          policeStation={selectedCase.police_station}
        />
      )}
    </main>
  </div>
);
}
