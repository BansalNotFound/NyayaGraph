"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  streamChatMessage,
  fetchAllCases,
  type ChatCitation,
  type ApiCaseSummary,
  type SseStepEvent,
  type SseToolCallEvent,
  type SseNodesRetrievedEvent,
} from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import { MarkdownView } from "@/components/MarkdownView";
import {
  Send,
  ShieldCheck,
  Building2,
  FileText,
  RotateCcw,
  Bot,
  User,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Layers,
  Scale,
  Search,
  Terminal,
  Zap,
} from "lucide-react";

interface DetectiveChatViewProps {
  initialCaseId?: string | null;
  initialFirNumber?: string | null;
  onJumpToCase?: (caseId: string) => void;
  onJumpToGraph?: (nodeId?: string) => void;
}

interface RetrievedNode {
  id: string;
  label: string;
  category: string;
  role: string;
  case_id?: string;
  fir_number?: string;
}

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string; // accumulates streaming tokens
  timestamp: string;
  engine?: string;
  latency?: number;
  citations?: ChatCitation[];
  focusedCaseId?: string;
  // SSE extras
  steps?: Array<SseStepEvent | SseToolCallEvent>;
  thinking?: string;
  retrievedNodes?: RetrievedNode[];
  isStreaming?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  PERSON: "#38bdf8",
  BANK_ACCOUNT: "#10b981",
  PHONE: "#a78bfa",
  IMEI: "#f472b6",
  VEHICLE: "#fb923c",
  UPI_ID: "#34d399",
  LOCATION: "#64748b",
  LEGAL_SECTION: "#94a3b8",
  EVIDENCE: "#fbbf24",
  ORGANIZATION: "#f59e0b",
  FACT: "#e2e8f0",
};

const FORENSIC_PRESETS = [
  // ── BANK FRAUD & FINANCIAL CRIMES ──
  {
    icon: Building2,
    title: "Consortium Bank Fraud",
    desc: "Credit line diversion & defaulted bank consortiums in Bangalore BS&FB",
    query: "Analyze bank consortium credit line fraud cases in Bangalore (BS&FB). List the banks defrauded, total amount diverted, named accused, and the shell account network used for fund routing.",
    category: "Financial",
  },
  {
    icon: Building2,
    title: "NCS Sugars Credit Fraud",
    desc: "Working capital default & godown stock manipulation — RC0782026E0004",
    query: "Provide a complete forensic breakdown of the NCS Sugars fraud case RC0782026E0004. How was the consortium credit line misused, what was the godown stock manipulation scheme, and who are the prime accused?",
    category: "Financial",
  },
  {
    icon: Building2,
    title: "R L Jewels Bullion Diversion",
    desc: "Multi-hop bullion routing & paper trail across RC0782026E0001",
    query: "Trace the bullion diversion scheme in R L Jewels Pvt Ltd (RC0782026E0001). Identify all bank accounts involved, the paper trail hops, and the beneficial owners behind the fund movement.",
    category: "Financial",
  },
  {
    icon: Building2,
    title: "Ashapura Garments Mule Accounts",
    desc: "Canara Bank 14 mule accounts — freezing & fund trail analysis",
    query: "Analyze the Ashapura Garments money mule network (RC0782026E0003). List all 14 Canara Bank mule accounts, their transaction volumes, and the persons controlling them.",
    category: "Financial",
  },
  // ── ACCUSED PROFILING ──
  {
    icon: User,
    title: "Prime Accused Dossier",
    desc: "Cross-case profiling of Anowar Hussain — broker & conspiracy links",
    query: "Profile prime accused Anowar Hussain across all CBI cases. List every FIR he appears in, his role (broker/accused/abettor), linked entities, bank accounts, phone numbers, and any co-conspirators.",
    category: "Accused",
  },
  {
    icon: User,
    title: "Public Servant Corruption Network",
    desc: "PC Act accused — bribery trails & asset disproportionality",
    query: "Identify all public servants named as accused across CBI cases who are charged under Prevention of Corruption Act Sections 7 and 13. List their designations, bribe amounts, and disproportionate asset trails.",
    category: "Accused",
  },
  {
    icon: User,
    title: "Corporate Promoter Conspiracy",
    desc: "Directors & promoters as co-conspirators in bank fraud syndicates",
    query: "List all corporate promoters and directors who appear as co-accused in CBI bank fraud cases. Show their linked companies, shared accused connections, and total financial exposure.",
    category: "Accused",
  },
  // ── LEGAL & STATUTORY ──
  {
    icon: Scale,
    title: "IPC 420 & 120-B Network",
    desc: "Cheating & criminal conspiracy — cross-case pattern analysis",
    query: "Which CBI FIRs invoke both IPC Section 420 (cheating) and Section 120-B (criminal conspiracy)? Identify the common accused across these cases and map the conspiracy network.",
    category: "Legal",
  },
  {
    icon: Scale,
    title: "PC Act & Corruption Audit",
    desc: "Sections 7 & 13(2) PC Act invocations across all branches",
    query: "Audit all FIRs invoking PC Act Sections 7 and 13(2). Which government departments are implicated, what are the bribe amounts, and are there common accused between cases?",
    category: "Legal",
  },
  {
    icon: ShieldCheck,
    title: "BSA 2023 Evidence Audit",
    desc: "Section 63(4) cryptographic hash trail & electronic evidence",
    query: "Audit the BSA 2023 Section 63(4) cryptographic evidence hash trail across all cases. Which cases have verified digital evidence chains, any hash mismatches, and what electronic records are flagged for court?",
    category: "Legal",
  },
  {
    icon: Scale,
    title: "BNSS Procedural Compliance",
    desc: "Section 94 search warrants & Section 173 custodial compliance",
    query: "Review BNSS Section 94 search and seizure warrants issued across all active cases. Are all warrants properly backed by court orders? Flag any procedural violations or expired warrants.",
    category: "Legal",
  },
  // ── MISSING PERSONS & UIDB ──
  {
    icon: Search,
    title: "Unidentified Person Analysis",
    desc: "SCRB UIDB — biometric correlation & cross-district matching",
    query: "From the SCRB UIDB database, analyze all unidentified persons with approximate age between 25-45 years from Madhya Pradesh. Are there any cross-district patterns suggesting trafficking or organized crime links?",
    category: "Missing",
  },
  {
    icon: Search,
    title: "Missing Persons Hotspot",
    desc: "Police station-wise missing/unidentified clustering in MP",
    query: "Which police stations in Madhya Pradesh have the highest number of unidentified body cases in the UIDB registry? Identify geographic clusters that may indicate organized criminal activity or trafficking routes.",
    category: "Missing",
  },
  // ── CYBER CRIME ──
  {
    icon: Zap,
    title: "Digital Arrest Extortion Ring",
    desc: "VoIP SIP trunk intercept & escrow gateway — cyber extortion network",
    query: "Analyze the Digital Arrest extortion case (FIR 112/2026 Noida). Trace the VoIP SIP trunk infrastructure, escrow payment gateways, and identify the masterminds behind the fake CBI/ED impersonation calls.",
    category: "Cyber",
  },
  {
    icon: Zap,
    title: "IMEI & Phone Network Trace",
    desc: "Burner phone clusters & IMEI swaps linked to accused",
    query: "Trace all phone numbers and IMEI devices linked to named accused across CBI cases. Identify IMEI swaps, SIM clusters, tower dump overlaps, and communication patterns between co-accused.",
    category: "Cyber",
  },
  {
    icon: Zap,
    title: "UPI & Digital Payments Trail",
    desc: "Hawala-linked UPI IDs, wallets & crypto on-ramps",
    query: "Map all UPI IDs, mobile wallets, and cryptocurrency on-ramp transactions linked to CBI fraud cases. Identify the hawala nodes, layering accounts, and ultimate beneficiaries of diverted funds.",
    category: "Cyber",
  },
  // ── SHELL COMPANIES & MONEY LAUNDERING ──
  {
    icon: Layers,
    title: "Shell Company Network Map",
    desc: "Cross-jurisdictional shell entities & beneficial ownership tracing",
    query: "Identify all shell companies and paper entities appearing across CBI cases. Map beneficial ownership chains, registered office overlaps, shared directors, and trace how funds are laundered through these entities.",
    category: "Financial",
  },
  {
    icon: Layers,
    title: "Cross-Case Crime Syndicates",
    desc: "Multi-jurisdictional shared entity bridges across CBI branches",
    query: "Identify entities (persons, companies, bank accounts, phones) that appear in more than two CBI cases across different branches. Build a syndicate graph showing shared nodes and the full criminal network.",
    category: "Financial",
  },
  {
    icon: Layers,
    title: "Money Laundering Layering",
    desc: "PMLA predicate offences & three-stage laundering detection",
    query: "Detect three-stage money laundering patterns (placement, layering, integration) across all CBI bank fraud cases. Which cases show PMLA predicate offence linkages and what are the estimated laundered amounts?",
    category: "Financial",
  },
  // ── INTELLIGENCE & OPERATIONS ──
  {
    icon: ShieldCheck,
    title: "Look Out Circular Status",
    desc: "Active LOCs, border alerts & absconding accused tracking",
    query: "List all accused persons under active Look Out Circulars (LOC) across CBI cases. Which accused are absconding, have exit restrictions, or are under Interpol coordination? What is their last known location?",
    category: "Intelligence",
  },
  {
    icon: ShieldCheck,
    title: "Asset Attachment Status",
    desc: "Bank debit freezes, property attachments & escrow orders",
    query: "Summarize all asset attachment and bank account freeze orders across active CBI cases. What is the total value of attached assets, which orders are pending court confirmation, and what assets remain unattached?",
    category: "Intelligence",
  },
  {
    icon: Building2,
    title: "Bank Branch Exposure Report",
    desc: "Branch-wise NPA exposure & complicit bank official assessment",
    query: "Generate a bank branch exposure report across all CBI consortium fraud cases. Which branches show highest NPA exposure, are any bank officials named as accused or co-conspirators, and what is the total defrauded amount per branch?",
    category: "Intelligence",
  },
  {
    icon: FileText,
    title: "FIR Timeline & Case Progress",
    desc: "Investigation milestones, chargesheet status & court proceedings",
    query: "Provide a chronological timeline of all CBI cases — from FIR registration to charge sheet filing and current court stage. Which cases are pending charge sheet beyond 60 days, and what are the next critical investigation deadlines?",
    category: "Intelligence",
  },
  {
    icon: Search,
    title: "Full Case Summary: RC0782026E0004",
    desc: "Complete forensic brief — NCS Sugars consortium fraud dossier",
    query: "Generate a complete executive forensic summary for CBI case RC0782026E0004 (NCS Sugars). Include: accused list with roles, defrauded banks and amounts, IPC/PC Act sections, evidence status, LOC/arrest status, asset attachment, and next investigation steps.",
    category: "Intelligence",
  },
];

// ── In-Chat Animated Node Network ──────────────────────────────────────────
function NodeSproutCanvas({
  nodes,
  isDark,
}: {
  nodes: RetrievedNode[];
  isDark: boolean;
}) {
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Clear previous timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setVisible(new Set());

    const total = Math.min(nodes.length, 12);
    for (let i = 0; i < total; i++) {
      const t = setTimeout(() => {
        setVisible((prev) => new Set([...prev, i]));
      }, 180 + i * 130);
      timersRef.current.push(t);
    }
    return () => timersRef.current.forEach(clearTimeout);
  }, [nodes]);

  const displayNodes = nodes.slice(0, 12);
  const cols = Math.min(4, displayNodes.length);
  const rows = Math.ceil(displayNodes.length / cols);
  const W = 220;
  const H = rows * 52 + 16;

  return (
    <div
      className={`mt-3 rounded-2xl border p-3 ${
        isDark ? "border-line bg-canvas" : "border-line bg-canvas"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="size-3.5 text-accent" />
        <span
          className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
            isDark ? "text-ink-muted" : "text-ink-muted"
          }`}
        >
          {nodes.length} Network Nodes Retrieved
        </span>
        <span
          className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${
            isDark ? "bg-accent/15 text-accent" : "bg-accent/15 text-accent"
          }`}
        >
          LIVE
        </span>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <defs>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {displayNodes.map((node, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = (W / cols) * col + W / cols / 2;
          const cy = 24 + row * 52;
          const color = CATEGORY_COLORS[node.category] || "#a1a1aa";
          const isVis = visible.has(i);

          return (
            <g key={node.id} style={{ opacity: isVis ? 1 : 0, transition: "opacity 0.3s" }}>
              {/* Connection line to center (hub effect) for first node */}
              {i > 0 && i < 4 && visible.has(0) && isVis && (
                <line
                  x1={W / cols / 2}
                  y1={24}
                  x2={cx}
                  y2={cy}
                  stroke={color}
                  strokeWidth="0.5"
                  strokeOpacity="0.25"
                  strokeDasharray="3 3"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={i === 0 ? 9 : 7}
                fill={color}
                fillOpacity={0.18}
                stroke={color}
                strokeWidth={i === 0 ? 1.5 : 1}
                filter="url(#nodeGlow)"
                style={
                  isVis
                    ? {
                        animation: "nodePop 0.35s cubic-bezier(0.16,1,0.3,1) both",
                        transformBox: "fill-box",
                        transformOrigin: "center",
                      }
                    : {}
                }
              />
              <text
                x={cx}
                y={cy + 17}
                textAnchor="middle"
                fontSize="7"
                fill={isDark ? "#dcdde4" : "#33353e"}
                fontFamily="monospace"
              >
                {(node.label || "").slice(0, 14)}
              </text>
              <text
                x={cx}
                y={cy + 25}
                textAnchor="middle"
                fontSize="6"
                fill={color}
                fillOpacity={0.8}
                fontFamily="monospace"
              >
                {node.category}
              </text>
            </g>
          );
        })}
      </svg>

      <style>{`
        @keyframes nodePop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.3); opacity: 1; }
          85% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Step Pills ──────────────────────────────────────────────────────────────
function StepPills({
  steps,
  isStreaming,
  isDark,
}: {
  steps: Array<SseStepEvent | SseToolCallEvent>;
  isStreaming: boolean;
  isDark: boolean;
}) {
  if (!isStreaming && steps.length === 0) return null;
  return (
    <div
      className={`mb-2 space-y-1.5 rounded-xl border p-2.5 ${
        isDark ? "border-line bg-canvas" : "border-line bg-panel"
      }`}
    >
      <span
        className={`text-[9px] font-bold uppercase tracking-widest font-mono ${
          isDark ? "text-ink-muted" : "text-ink-muted"
        }`}
      >
        Pipeline
      </span>
      {steps.map((s, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[10.5px] font-mono ${
            isDark ? "bg-panel text-ink" : "bg-panel-deep text-ink-muted"
          }`}
        >
          <span
            className={`size-1.5 rounded-full shrink-0 ${
              s.type === "tool_call" ? "bg-purple-400" : "bg-accent"
            }`}
          />
          <span className="truncate">{s.message}</span>
          {(s as any).progress != null && (
            <span
              className={`ml-auto text-[10px] font-bold ${
                isDark ? "text-accent" : "text-accent"
              }`}
            >
              {(s as any).progress}%
            </span>
          )}
        </div>
      ))}
      {isStreaming && (
        <div className="flex items-center gap-2 px-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-accent/100" />
          </span>
          <span
            className={`text-[10px] font-mono animate-pulse ${
              isDark ? "text-accent" : "text-accent"
            }`}
          >
            Groq AI streaming…
          </span>
        </div>
      )}
    </div>
  );
}

export default function DetectiveChatView({
  initialCaseId,
  initialFirNumber,
  onJumpToCase,
  onJumpToGraph,
}: DetectiveChatViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [casesList, setCasesList] = useState<ApiCaseSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("ALL");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch cases for selector
  useEffect(() => {
    fetchAllCases().then((data) => {
      if (data && data.length > 0) setCasesList(data);
    });
  }, []);

  // Handle external case pre-selection
  useEffect(() => {
    if (initialCaseId) {
      setSelectedCaseId(initialCaseId);
      if (initialFirNumber) {
        setInput(
          `Provide a forensic summary of FIR ${initialFirNumber}: list named accused, defrauded institutions, and invoked penal sections.`
        );
      }
    }
  }, [initialCaseId, initialFirNumber]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome-1",
          role: "assistant",
          content:
            "### CBI Central Intelligence & Forensic Copilot\n\n" +
            "Connected to the active **CBI Case Knowledge Base** (SQLite Registry, ChromaDB Vector Embeddings, BSA 2023 Evidence Ledger) powered by **Groq AI (llama-3.3-70b-versatile)** with ultra-low latency streaming.\n\n" +
            "**Investigative Scope & Capabilities:**\n" +
            "• **FIR Dossiers**: Interrogate 500+ ingested CBI case files (e.g. `RC0232024A0012`)\n" +
            "• **Accused Entities**: Profile named accused, public servants, corporate promoters, and prime brokers\n" +
            "• **Financial & Banking Conduits**: Trace bank consortium defaults and shell accounts\n" +
            "• **Statutory Offence Codes**: Audit `IPC 420`, `IPC 120-B`, `PC Act Sec 7`, `Sec 13(2)`\n" +
            "• **Cryptographic Verification**: Verify under **BSA 2023 Section 63(4)**\n\n" +
            "Select a forensic preset or enter your inquiry below. Live streaming with node visualization enabled.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          engine: "Groq AI • llama-3.3-70b-versatile",
        },
      ]);
    }
  }, [messages.length]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const updateStreamingMsg = useCallback(
    (
      msgId: string,
      updater: (prev: MessageItem) => Partial<MessageItem>
    ) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, ...updater(m) } : m))
      );
    },
    []
  );

  const handleSend = useCallback(
    async (queryText?: string) => {
      const q = (queryText || input).trim();
      if (!q || loading) return;

      // Abort any in-flight SSE
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const userMsg: MessageItem = {
        id: `user-${Date.now()}`,
        role: "user",
        content: q,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const aiMsgId = `ai-${Date.now()}`;
      const aiMsg: MessageItem = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        engine: "Groq AI • llama-3.3-70b-versatile",
        steps: [],
        thinking: "",
        retrievedNodes: [],
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setInput("");
      setLoading(true);

      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const caseParam = selectedCaseId !== "ALL" ? selectedCaseId : undefined;

      streamChatMessage(
        q,
        caseParam,
        historyPayload,
        {
          onStep: (e) => {
            updateStreamingMsg(aiMsgId, (m) => ({
              steps: [...(m.steps || []), e],
            }));
          },
          onThinking: (e) => {
            updateStreamingMsg(aiMsgId, (m) => ({
              thinking: (m.thinking || "") + e.chunk,
            }));
          },
          onNodesRetrieved: (e) => {
            updateStreamingMsg(aiMsgId, () => ({
              retrievedNodes: e.nodes,
            }));
          },
          onToken: (e) => {
            updateStreamingMsg(aiMsgId, (m) => ({
              content: m.content + e.chunk,
            }));
          },
          onDone: (e) => {
            updateStreamingMsg(aiMsgId, () => ({
              isStreaming: false,
              engine: e.engine || "Groq AI",
              latency: e.latency_seconds,
              citations: e.citations || [],
            }));
            setLoading(false);
          },
          onError: (e) => {
            const errMsg =
              e instanceof Error ? e.message : (e as any)?.message || "Stream error";
            updateStreamingMsg(aiMsgId, (m) => ({
              content:
                m.content ||
                `⚠️ **Stream Error**: ${errMsg}\n\nPlease check that the backend server is running on port 8000.`,
              isStreaming: false,
            }));
            setLoading(false);
          },
        },
        ctrl.signal
      );
    },
    [input, loading, messages, selectedCaseId, updateStreamingMsg]
  );

  const copyMessage = (idx: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setSelectedCaseId("ALL");
    setLoading(false);
  };

  const activeCaseObj = casesList.find((c) => c.case_id === selectedCaseId);

  return (
    <div
      className={`flex h-full w-full overflow-hidden font-sans select-none transition-colors duration-150 ${
        isDark ? "bg-canvas text-ink" : "bg-canvas text-ink"
      }`}
    >
      {/* ── 1. LEFT WORKBENCH SIDEBAR ── */}
      <aside
        className={`w-80 xl:w-88 shrink-0 border-r flex flex-col justify-between overflow-hidden transition-colors ${
          isDark ? "border-line bg-panel-deep" : "border-line bg-panel-deep"
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Sidebar Header */}
          <div
            className={`flex h-13 shrink-0 items-center justify-between border-b px-4 ${
              isDark ? "border-line" : "border-line"
            }`}
          >
            <div className="flex items-center gap-2">
              <Terminal className={`size-4 ${isDark ? "text-accent" : "text-accent"}`} />
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isDark ? "text-white" : "text-ink"
                }`}
              >
                Investigation Console
              </span>
            </div>
            <button
              onClick={clearChat}
              title="Reset Session"
              className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
                isDark
                  ? "border-line bg-panel text-ink-muted hover:text-white"
                  : "border-line bg-panel text-ink-muted hover:text-ink"
              }`}
            >
              <RotateCcw className="size-3" />
              <span>New</span>
            </button>
          </div>

          {/* Active Case Context Filter */}
          <div
            className={`p-4 border-b space-y-2 ${
              isDark ? "border-line bg-panel/40" : "border-line bg-panel-deep"
            }`}
          >
            <div
              className={`flex items-center justify-between text-[11px] font-mono ${
                isDark ? "text-ink-muted" : "text-ink-muted"
              }`}
            >
              <span className="uppercase font-bold tracking-wider">Case Scope:</span>
              {selectedCaseId !== "ALL" && (
                <button
                  onClick={() => setSelectedCaseId("ALL")}
                  className="hover:underline cursor-pointer"
                >
                  Reset to All
                </button>
              )}
            </div>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className={`w-full truncate rounded-xl border px-2.5 py-1.5 text-xs font-mono outline-none cursor-pointer transition-colors ${
                isDark
                  ? "border-line bg-panel-deep text-ink focus:border-accent"
                  : "border-line bg-panel text-ink focus:border-accent"
              }`}
            >
              <option value="ALL">🌐 All Cases (Global Syndicate Graph)</option>
              {casesList.map((c) => (
                <option key={c.case_id} value={c.case_id}>
                  FIR {c.fir_number} — {c.police_station}
                </option>
              ))}
            </select>
            {activeCaseObj && (
              <div
                className={`rounded-xl border p-2 text-[11px] font-mono space-y-1 ${
                  isDark
                    ? "border-line bg-panel-deep text-ink-muted"
                    : "border-line bg-panel text-ink-muted"
                }`}
              >
                <div className="flex justify-between">
                  <span>Entities:</span>
                  <span className={`font-semibold ${isDark ? "text-white" : "text-ink"}`}>
                    {activeCaseObj.node_count} nodes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Date Logged:</span>
                  <span>
                    {activeCaseObj.date_time ? activeCaseObj.date_time.split(" ")[0] : "—"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Investigation Presets */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                  isDark ? "text-ink-muted" : "text-ink-muted"
                }`}
              >
                Forensic Inquiry Presets
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isDark ? "bg-accent/15 text-accent" : "bg-accent/10 text-accent"}`}>
                {FORENSIC_PRESETS.length} queries
              </span>
            </div>

            {(["Financial", "Accused", "Legal", "Missing", "Cyber", "Intelligence"] as const).map((cat) => {
              const catPresets = FORENSIC_PRESETS.filter((p) => (p as any).category === cat);
              if (catPresets.length === 0) return null;

              const catColors: Record<string, string> = {
                Financial: "bg-amber-500/15 text-amber-400",
                Accused: "bg-red-500/15 text-red-400",
                Legal: "bg-blue-500/15 text-blue-400",
                Missing: "bg-orange-500/15 text-orange-400",
                Cyber: "bg-purple-500/15 text-purple-400",
                Intelligence: "bg-emerald-500/15 text-emerald-400",
              };

              return (
                <div key={cat} className="space-y-1.5">
                  {/* Category Header */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className={`text-[9.5px] font-bold font-mono uppercase tracking-widest px-2 py-0.5 rounded-md ${catColors[cat]}`}>
                      {cat}
                    </span>
                    <div className={`flex-1 h-px ${isDark ? "bg-line" : "bg-line"}`} />
                  </div>

                  {catPresets.map((preset, idx) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={`${cat}-${idx}`}
                        onClick={() => handleSend(preset.query)}
                        disabled={loading}
                        className={`w-full text-left rounded-xl border p-2.5 transition-all cursor-pointer disabled:opacity-50 group ${
                          isDark
                            ? "border-line bg-panel hover:border-accent/40 hover:bg-raised"
                            : "border-line bg-panel hover:border-accent/30 hover:bg-panel"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Icon className={`size-3.5 shrink-0 mt-0.5 text-accent group-hover:scale-110 transition-transform`} />
                          <div className="min-w-0">
                            <span
                              className={`block text-[11.5px] font-bold leading-tight ${
                                isDark ? "text-white" : "text-ink"
                              }`}
                            >
                              {preset.title}
                            </span>
                            <p
                              className={`mt-0.5 text-[10px] line-clamp-2 leading-relaxed ${
                                isDark ? "text-ink-muted" : "text-ink-muted"
                              }`}
                            >
                              {preset.desc}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div
          className={`border-t p-4 font-mono text-[10px] space-y-1 ${
            isDark
              ? "border-line bg-panel-deep text-ink-faint"
              : "border-line bg-raised text-ink-muted"
          }`}
        >
          <div className="flex justify-between">
            <span>AI ENGINE:</span>
            <span className={`font-semibold flex items-center gap-1 ${isDark ? "text-white" : "text-ink"}`}>
              <Zap className="size-2.5 text-accent" />
              Groq AI (llama-3.3-70b)
            </span>
          </div>
          <div className="flex justify-between">
            <span>STREAM:</span>
            <span className="text-verified font-semibold">SSE Enabled</span>
          </div>
          <div className="flex justify-between">
            <span>REGISTRY:</span>
            <span>500 Ingested FIRs Active</span>
          </div>
        </div>
      </aside>

      {/* ── 2. MAIN CHAT TERMINAL ── */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Sub-Header */}
        <div
          className={`flex h-13 shrink-0 items-center justify-between border-b px-6 transition-colors ${
            isDark
              ? "border-line bg-panel-deep text-white"
              : "border-line bg-panel-deep text-ink"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-7 items-center justify-center rounded-xl bg-charcoal text-white">
              <Bot className="size-4 text-accent" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider">
                AI Detective Terminal
              </span>
              <span
                className={`flex items-center gap-1 rounded-md border px-1.5 py-0.2 text-[10px] font-mono ${
                  isDark
                    ? "border-verified/40 bg-verified/15 text-verified"
                    : "border-verified/40 bg-verified/10 text-verified"
                }`}
              >
                <span className="size-1.5 rounded-full bg-verified/100" />
                ONLINE
              </span>
              {selectedCaseId !== "ALL" && (
                <span
                  className={`rounded-md border px-2 py-0.2 text-[10px] font-mono ${
                    isDark
                      ? "border-line bg-panel text-ink"
                      : "border-line bg-panel text-ink"
                  }`}
                >
                  CONTEXT: FIR {activeCaseObj?.fir_number || selectedCaseId}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <Zap className="size-3 text-accent" />
              GROQ SSE STREAMING
            </span>
            <span>•</span>
            <span>TOP_K: 8</span>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl xl:max-w-5xl mx-auto space-y-6">
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id || idx}
                  className={`flex w-full gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-xl border mt-1 shadow-2xs ${
                        isDark
                          ? "bg-raised text-white border-line-strong"
                          : "bg-panel-deep text-ink border-line"
                      }`}
                    >
                      <Bot className="size-4 text-accent" />
                    </div>
                  )}

                  <div
                    className={`flex flex-col gap-1 ${isUser ? "items-end max-w-[80%]" : "items-start max-w-[92%]"}`}
                  >
                    {/* Step pills — only shown on assistant messages */}
                    {!isUser && (m.steps?.length || m.isStreaming) ? (
                      <StepPills
                        steps={m.steps || []}
                        isStreaming={!!m.isStreaming}
                        isDark={isDark}
                      />
                    ) : null}

                    {/* Node Sprouting Animation */}
                    {!isUser && m.retrievedNodes && m.retrievedNodes.length > 0 && (
                      <NodeSproutCanvas nodes={m.retrievedNodes} isDark={isDark} />
                    )}

                    {/* Main message bubble */}
                    <div
                      className={`flex flex-col gap-2 rounded-2xl p-4.5 text-sm leading-relaxed ${
                        isUser
                          ? isDark
                            ? "bg-raised text-white border border-line-strong shadow-sm"
                            : "bg-charcoal text-white shadow-sm"
                          : isDark
                          ? "border border-line bg-panel text-ink shadow-sm"
                          : "border border-line bg-panel text-ink shadow-xs"
                      }`}
                    >
                      {/* Header (Assistant) */}
                      {!isUser && (
                        <div
                          className={`flex items-center justify-between border-b pb-2 text-xs font-mono ${
                            isDark ? "border-line text-ink-muted" : "border-line text-ink-muted"
                          }`}
                        >
                          <span className="font-medium flex items-center gap-1.5">
                            {m.isStreaming && (
                              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                            )}
                            {m.engine || "Groq AI • llama-3.3-70b-versatile"}
                          </span>
                          <div className="flex items-center gap-3">
                            {m.latency && (
                              <span className="text-[11px] text-ink-muted">{m.latency}s latency</span>
                            )}
                            {!m.isStreaming && (
                              <button
                                onClick={() => copyMessage(idx, m.content)}
                                className="flex items-center gap-1 text-[11px] hover:underline cursor-pointer"
                                title="Copy response"
                              >
                                {copiedIndex === idx ? (
                                  <Check className="size-3.5 text-verified" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                                <span>{copiedIndex === idx ? "Copied" : "Copy"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Thinking Drawer */}
                      {!isUser && m.thinking && (
                        <details
                          className={`rounded-xl border p-2 text-xs ${
                            isDark
                              ? "border-accent/40 bg-accent/10 text-accent/80"
                              : "border-accent/40 bg-accent/10 text-accent"
                          }`}
                          open={!!m.isStreaming}
                        >
                          <summary className="font-mono text-[10px] font-bold cursor-pointer select-none">
                            🧠 Groq Reasoning Trace ({m.thinking.length} chars)
                          </summary>
                          <div className="mt-1.5 text-[10px] font-mono leading-normal whitespace-pre-wrap opacity-90 border-t border-inherit pt-1.5 max-h-36 overflow-y-auto">
                            {m.thinking}
                          </div>
                        </details>
                      )}

                      {/* Message content */}
                      {m.content ? (
                        <MarkdownView content={m.content} tone={isUser ? "dark" : "auto"} />
                      ) : m.isStreaming ? (
                        <div className="flex items-center gap-1.5">
                          <div className="size-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
                          <div className="size-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
                          <div className="size-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
                        </div>
                      ) : null}

                      {/* Citations */}
                      {m.citations && m.citations.length > 0 && (
                        <div
                          className={`mt-3.5 flex flex-col gap-2 border-t pt-3 ${
                            isDark ? "border-line" : "border-line"
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                              isDark ? "text-ink-muted" : "text-ink-muted"
                            }`}
                          >
                            Evidence References ({m.citations.length} Retrieved Dockets):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {m.citations.map((cit, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={() => cit.case_id && onJumpToCase && onJumpToCase(cit.case_id)}
                                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                                  isDark
                                    ? "border-line bg-panel-deep text-ink hover:bg-raised"
                                    : "border-line bg-panel-deep text-ink hover:bg-raised"
                                }`}
                              >
                                <FileText className="size-3.5 text-accent" />
                                <span>FIR {cit.fir_number || cit.case_id}</span>
                                {cit.similarity_score && (
                                  <span className="text-[10px] text-verified font-sans font-medium">
                                    ({cit.similarity_score}%)
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div
                        className={`text-[10px] font-mono self-end pt-1 ${
                          isDark ? "text-ink-faint" : "text-ink-faint"
                        }`}
                      >
                        {m.timestamp}
                      </div>
                    </div>
                  </div>

                  {isUser && (
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-xl border mt-1 shadow-2xs ${
                        isDark
                          ? "bg-raised text-white border-line-strong"
                          : "bg-charcoal text-white border-charcoal"
                      }`}
                    >
                      <User className="size-4" />
                    </div>
                  )}
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom Input Area */}
        <div
          className={`border-t p-4 transition-colors ${
            isDark ? "border-line bg-panel-deep" : "border-line bg-panel-deep"
          }`}
        >
          <div className="max-w-4xl xl:max-w-5xl mx-auto flex flex-col gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className={`flex items-center gap-2 rounded-2xl border p-2 transition-colors ${
                isDark
                  ? "border-line bg-panel focus-within:border-accent"
                  : "border-line bg-panel focus-within:border-accent"
              }`}
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask AI Detective about CBI FIRs, accused syndicates, banks, evidence..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className={`flex-1 bg-transparent px-3 py-1 text-sm outline-none font-sans ${
                  isDark ? "text-white placeholder-ink-faint" : "text-ink placeholder-ink-faint"
                }`}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-contrast hover:brightness-105 disabled:opacity-40 transition-all cursor-pointer font-bold shadow-xs"
              >
                <Send className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
