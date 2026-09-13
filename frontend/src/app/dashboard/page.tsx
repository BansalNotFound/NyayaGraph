'use client';

import React, { useState, useEffect } from 'react';
import { CASE_LIST, CASES_DATABASE } from '../../lib/casesData';
import { CaseListItem, CaseProcessingResult, GraphNode } from '../../types';
import { fetchAllCases, fetchCaseDetail, fetchAggregateGraph, ApiCaseSummary } from '../../lib/api';
import { DetroitCanvas } from '../../components/DetroitCanvas';
import { CyberLifeDossier } from '../../components/CyberLifeDossier';
import { DetectiveHUD } from '../../components/DetectiveHUD';
import { CaseStatsModal, PatternsModal, BSACertificateModal } from '../../components/Modals';
import { DetroitBrand } from '../../components/DetroitBrand';
import { StatusDiode } from '../../components/StatusDiode';
import Link from 'next/link';
import { 
  Search, Maximize2, ArrowLeft, Check, Activity, ShieldAlert,
  ChevronRight, ArrowUpRight, RefreshCw, Network
} from 'lucide-react';

interface RecommendedAction {
  id: string;
  text: string;
  category: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

const DEFAULT_ACTIONS: Record<string, RecommendedAction[]> = {
  "CASE_CBI_RC0782026E0004": [
    {
      id: "act_cbi_1",
      text: "Execute Section 94 BNSS search warrant at 405, Minar Apartments, Basheer Bagh, Hyderabad",
      category: "STATUTORY SEARCH",
      priority: "CRITICAL"
    },
    {
      id: "act_cbi_2",
      text: "Issue Section 106 BNSS debit freeze across State Bank of India & Canara Bank consortium escrow lines",
      category: "FINANCIAL FREEZE",
      priority: "CRITICAL"
    },
    {
      id: "act_cbi_3",
      text: "Summon statutory stock verification auditors for fabricated sugar godown certificates",
      category: "FORENSIC AUDIT",
      priority: "HIGH"
    },
    {
      id: "act_cbi_4",
      text: "Coordinate cross-case seizure on Indirapuram Hawala vault linking Case 112/2026",
      category: "CROSS-CASE LINK",
      priority: "HIGH"
    }
  ],
  "CASE_CBI_RC0782026E0001": [
    {
      id: "act_cbi1_1",
      text: "Summon prime accused Mr. Ishwaral Shankarlal Jain under Section 173 BNSS",
      category: "INTERROGATION",
      priority: "CRITICAL"
    },
    {
      id: "act_cbi1_2",
      text: "Attach hypothecated factory plant and movable assets under Section 107 BNSS",
      category: "ASSET ATTACHMENT",
      priority: "CRITICAL"
    }
  ],
  "CASE_CBI_RC0782026E0003": [
    {
      id: "act_cbi3_1",
      text: "Forensic audit on export invoices sanctioned by accused Mr. Sandeep R Vedant",
      category: "FINANCIAL AUDIT",
      priority: "CRITICAL"
    },
    {
      id: "act_cbi3_2",
      text: "Issue Look Out Circular (LOC) across major international airports",
      category: "BORDER SECURITY",
      priority: "HIGH"
    }
  ],
  "CASE_2026_NOIDA_112": [
    {
      id: "act_1",
      text: "Trace Yes Bank Escrow A/C 9876543210123 (BC:0.22) to downstream sub-mule hops",
      category: "FINANCIAL FORENSICS",
      priority: "CRITICAL"
    },
    {
      id: "act_2",
      text: "Issue Section 106 BNSS notice to nodal bank officer for urgent debit freeze on Dev Enterprises",
      category: "STATUTORY NOTICE",
      priority: "CRITICAL"
    },
    {
      id: "act_3",
      text: "Subpoena SIP dialer server session logs for Rahul Sharma @ Pandit (+91-98991-87654)",
      category: "TELECOM CDR",
      priority: "HIGH"
    },
    {
      id: "act_4",
      text: "Cross-reference Indirapuram Hawala Vault against past seizure in FIR 45/2024 PS Surajpur",
      category: "CROSS-CASE LINK",
      priority: "HIGH"
    }
  ],
  "CASE_2024_SURAJPUR_45": [
    {
      id: "act_2024_1",
      text: "Summon bail surety for Accused Vikram Malhotra @ Vicky Hawala",
      category: "COURT COMPLIANCE",
      priority: "CRITICAL"
    },
    {
      id: "act_2024_2",
      text: "Extract Telegram encrypted channel 'AlphaSettlement' session metadata",
      category: "CYBER FORENSICS",
      priority: "HIGH"
    }
  ]
};

const CASE_TIMELINES: Record<string, { time: string; event: string; status: string }[]> = {
  "CASE_CBI_RC0782026E0004": [
    { time: "20/07 10:30", event: "CBI REGISTRATION (BNSS 173)", status: "VERIFIED" },
    { time: "20/07 11:15", event: "SANCTION AUDIT REVIEW", status: "VERIFIED" },
    { time: "20/07 12:45", event: "EMPTY GODOWN INSPECTION", status: "IPC 467/471" },
    { time: "20/07 14:00", event: "CONSORTIUM LOAN FREEZE", status: "₹84.50 CR" },
    { time: "20/07 16:30", event: "HAWALA VAULT CORRELATION", status: "CROSS-CASE" }
  ],
  "CASE_CBI_RC0782026E0001": [
    { time: "15/05 09:00", event: "CBI ARCHIVE CASE LOGGED", status: "VERIFIED" },
    { time: "15/05 11:30", event: "UNLIMITED-OCR EXTRACTED", status: "27 NODES" },
    { time: "15/05 14:00", event: "PROMOTER IDENTIFIED", status: "CENTRAL BROKER" }
  ],
  "CASE_CBI_RC0782026E0003": [
    { time: "12/06 10:00", event: "CBI ARCHIVE CASE LOGGED", status: "VERIFIED" },
    { time: "12/06 12:00", event: "UNLIMITED-OCR EXTRACTED", status: "22 NODES" },
    { time: "12/06 15:30", event: "EXPORT CREDIT FRAUD", status: "VERIFIED" }
  ],
  "CASE_2026_NOIDA_112": [
    { time: "10/02 14:15", event: "COERCIVE CALL INITIATED", status: "VERIFIED" },
    { time: "10/02 14:45", event: "SKYPE DIGITAL ARREST", status: "VERIFIED" },
    { time: "10/02 15:45", event: "FD LIQUIDATION ₹14.5L", status: "UTR20260210001" },
    { time: "10/02 16:05", event: "MULE ESCROW LAYERING", status: "3 SUB-HOPS" },
    { time: "10/02 16:35", event: "P2P CRYPTO OFFRAMP", status: "USDT ESCROW" }
  ],
  "CASE_2024_SURAJPUR_45": [
    { time: "18/06 14:00", event: "FEDEX CUSTOMS SPOOF", status: "IVR DIALER" },
    { time: "18/06 15:30", event: "NARCOTICS COERCION", status: "VERIFIED" },
    { time: "18/06 16:45", event: "TRANSFER ₹28.7L", status: "CANARA BANK" },
    { time: "18/06 18:00", event: "65% ESCROW RECOVERY", status: "FROZEN" }
  ]
};

export default function InvestigatorConsole() {
  const [casesList, setCasesList] = useState<CaseListItem[]>(CASE_LIST);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(CASE_LIST[0].case_id);
  const [currentCase, setCurrentCase] = useState<CaseProcessingResult>(
    CASES_DATABASE[CASE_LIST[0].case_id] || CASES_DATABASE["CASE_2026_NOIDA_112"]
  );
  const [isLiveApi, setIsLiveApi] = useState<boolean>(false);
  const [isLoadingCase, setIsLoadingCase] = useState<boolean>(false);
  const [fullScreenGraph, setFullScreenGraph] = useState<boolean>(false);
  const [showGraphLegend, setShowGraphLegend] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({
    "act_cbi_2": true,
  });
  const [expandEntities, setExpandEntities] = useState<boolean>(false);

  // Aggregate Master Syndicate Graph state
  const [aggregateMode, setAggregateMode] = useState<boolean>(false);
  const [aggregateGraphData, setAggregateGraphData] = useState<any>(null);

  // Modals state
  const [statsOpen, setStatsOpen] = useState<boolean>(false);
  const [patternsOpen, setPatternsOpen] = useState<boolean>(false);
  const [certOpen, setCertOpen] = useState<boolean>(false);

  // 1. Fetch live cases on mount
  useEffect(() => {
    async function loadLiveCases() {
      const apiCases = await fetchAllCases();
      if (apiCases && apiCases.length > 0) {
        setIsLiveApi(true);
        const mappedList: CaseListItem[] = apiCases.map((c: ApiCaseSummary) => {
          const isCbi = c.case_id.includes('CBI');
          return {
            case_id: c.case_id,
            fir_number: c.fir_number,
            title: isCbi 
              ? `CBI Bank Consortium Fraud (${c.fir_number})` 
              : (c.fir_number === '112/2026' ? 'CBI Skype Digital Arrest & FD Extortion' : `FIR ${c.fir_number} Cyber Fraud`),
            police_station: c.police_station,
            date_time: c.date_time || '2026-07-20 10:30',
            threat_level: isCbi ? 'CRITICAL' : 'HIGH',
            accused_count: c.node_count || (isCbi ? 12 : 4),
            bns_sections: isCbi ? 'IPC 120-B, 409, 420, 467, 468, 471 & PC Act 13(2)' : 'BNS 318(4), 319(2) & 66D IT Act',
            defrauded_amount: isCbi ? '₹84,50,00,000' : '₹14,50,000',
            central_broker: c.broker_name || 'Mr. Narayanam Nageswara Rao'
          };
        });
        setCasesList(mappedList);
      }
    }
    loadLiveCases();
  }, []);

  // 2. Fetch live case details and graph when selectedCaseId changes
  useEffect(() => {
    let isCancelled = false;
    async function loadCaseDetail() {
      setIsLoadingCase(true);
      const detail = await fetchCaseDetail(selectedCaseId);
      if (!isCancelled && detail) {
        setCurrentCase(detail as any);
        if (detail.graph && detail.graph.nodes && detail.graph.nodes.length > 0) {
          const broker = detail.graph.nodes.find((n: any) => n.is_broker) || detail.graph.nodes[0];
          setSelectedNode(broker);
        }
      } else if (!isCancelled && CASES_DATABASE[selectedCaseId]) {
        setCurrentCase(CASES_DATABASE[selectedCaseId]);
        const initialNodes = CASES_DATABASE[selectedCaseId].graph.nodes;
        setSelectedNode(initialNodes.find((n: any) => n.is_broker) || initialNodes[0] || null);
      }
      setIsLoadingCase(false);
    }
    loadCaseDetail();
    return () => { isCancelled = true; };
  }, [selectedCaseId]);

  // Toggle Master Aggregate Syndicate Graph
  const handleToggleAggregate = async () => {
    if (!aggregateMode) {
      setIsLoadingCase(true);
      const agg = await fetchAggregateGraph();
      if (agg) {
        setAggregateGraphData(agg);
        setAggregateMode(true);
        setFullScreenGraph(true);
        if (agg.nodes && agg.nodes.length > 0) {
          setSelectedNode(agg.nodes[0]);
        }
      }
      setIsLoadingCase(false);
    } else {
      setAggregateMode(false);
    }
  };

  // Filtered cases list
  const filteredCases = casesList.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.fir_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.police_station.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Active nodes & edges to render (either single case or aggregate master network)
  const graphNodesToRender = aggregateMode && aggregateGraphData 
    ? aggregateGraphData.nodes 
    : (currentCase.graph?.nodes || []);

  const graphEdgesToRender = aggregateMode && aggregateGraphData 
    ? aggregateGraphData.edges 
    : (currentCase.graph?.edges || []);

  // Rank entities by Betweenness Centrality score for the Priority Queue Strip
  const rankedEntities = [...graphNodesToRender]
    .filter(n => n.category === 'PERSON' || n.category === 'PHONE' || n.category === 'BANK_ACCOUNT' || n.category === 'EVIDENCE')
    .sort((a, b) => (b.betweenness_score || 0) - (a.betweenness_score || 0));

  const displayedEntities = expandEntities ? rankedEntities : rankedEntities.slice(0, 4);
  const remainingCount = rankedEntities.length - 4;

  // Recommended actions for current case
  const actionsList = DEFAULT_ACTIONS[selectedCaseId] || DEFAULT_ACTIONS["CASE_CBI_RC0782026E0004"] || DEFAULT_ACTIONS["CASE_2026_NOIDA_112"];

  // Timeline events for current case
  const timelineEvents = CASE_TIMELINES[selectedCaseId] || CASE_TIMELINES["CASE_CBI_RC0782026E0004"] || CASE_TIMELINES["CASE_2026_NOIDA_112"];

  const handleSelectCase = (caseId: string) => {
    setAggregateMode(false);
    setSelectedCaseId(caseId);
  };

  const handleOpenGraph = (caseId: string) => {
    handleSelectCase(caseId);
    setFullScreenGraph(true);
  };

  const handleFocusNode = (node: GraphNode) => {
    setSelectedNode(node);
    setFullScreenGraph(true);
  };

  const toggleAction = (id: string) => {
    setCompletedActions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="min-h-screen bg-[#F2F2F0] text-[#1A1A1A] flex flex-col justify-between select-none font-sans">
      {/* =========================================================================
          1. TOP MAIN NAV BAR
          ========================================================================= */}
      <header className="h-14 border-b border-[#DADAD8] bg-[#F2F2F0] px-8 flex items-center justify-between">
        {/* Left Wordmark Lockup */}
        <div className="flex items-center gap-6">
          <DetroitBrand subtitle="BECOME HUMAN // CYBERLIFE" size="sm" href="/" />

          <div className="h-4 w-[1px] bg-[#DADAD8]" />

          <div className="text-xs font-mono tracking-[0.12em] text-[#8A8A8A] uppercase">
            NYAYAGRAPH-GN : DIEGETIC SCHEMATIC WORKBENCH
          </div>
        </div>

        {/* Center: Nav links spaced apart (~40px gap) */}
        <nav className="flex items-center gap-10 text-xs font-mono tracking-[0.12em] uppercase">
          <Link 
            href="/"
            className="text-[#8A8A8A] hover:text-[#1A1A1A] transition-colors"
          >
            OVERVIEW
          </Link>
          <button 
            onClick={() => setFullScreenGraph(false)}
            className={`px-3 py-1 rounded-full transition-colors ${
              !fullScreenGraph 
                ? 'bg-[#FFFFFF] text-[#1A1A1A] font-medium border border-[#DADAD8]' 
                : 'text-[#8A8A8A] hover:text-[#1A1A1A]'
            }`}
          >
            CASES CONSOLE
          </button>
          <button 
            onClick={() => setFullScreenGraph(true)}
            className={`px-3 py-1 rounded-full transition-colors ${
              fullScreenGraph 
                ? 'bg-[#FFFFFF] text-[#1A1A1A] font-medium border border-[#DADAD8]' 
                : 'text-[#8A8A8A] hover:text-[#1A1A1A]'
            }`}
          >
            KNOWLEDGE GRAPH
          </button>
          <button 
            onClick={() => setPatternsOpen(true)}
            className="text-[#8A8A8A] hover:text-[#1A1A1A] transition-colors"
          >
            PATTERNS
          </button>
          <button 
            onClick={() => setCertOpen(true)}
            className="text-[#8A8A8A] hover:text-[#1A1A1A] transition-colors"
          >
            BSA 63(4)
          </button>
        </nav>

        {/* Right Status */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[8px] font-mono text-[#8A8A8A] uppercase tracking-[0.12em]">STATUS</div>
            <div className="text-[11px] font-mono font-medium text-[#00D1FF] tracking-wider">INVESTIGATOR ACTIVE</div>
          </div>
          <StatusDiode size="md" interactive={true} />
        </div>
      </header>

      {/* =========================================================================
          2. TOP STATUS BAR (STANDARDIZED 48PX METRICS STRIP)
          ========================================================================= */}
      <div className="h-12 border-b border-[#DADAD8] bg-[#FAF9F7] px-8 flex items-center justify-between text-xs font-mono uppercase">
        {/* Left 4 stats cluster with 32px gap */}
        <div className="flex items-center gap-8">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[10px] text-[#8A8A8A] font-mono tracking-[0.14em]">ACTIVE CASES:</span>
            <span className="text-[14px] font-bold text-[#1A1A1A] font-mono">4</span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[10px] text-[#8A8A8A] font-mono tracking-[0.14em]">TOTAL LOSS TRACKED:</span>
            <span className="text-[14px] font-bold text-[#1A1A1A] font-mono">₹94,40,000</span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[10px] text-[#8A8A8A] font-mono tracking-[0.14em]">ENTITIES FLAGGED:</span>
            <span className="text-[14px] font-bold text-[#1A1A1A] font-mono">18</span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[10px] text-[#8A8A8A] font-mono tracking-[0.14em]">OPEN ALERTS:</span>
            {/* Saturated focus metric */}
            <span className="text-[14px] font-bold text-[#00C2E0] font-mono">4 CRITICAL</span>
          </div>
        </div>

        {/* Right Statutory Framework note with clear vertical divider */}
        <div className="border-l border-[#DADAD8] pl-8 h-6 flex items-center gap-2.5 text-[#737373]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1BA8D1] flex-shrink-0" />
          <span className="text-[10px] font-mono tracking-[0.14em]">STATUTORY FRAMEWORK // BNS 2023 & BSA SEC 63(4)</span>
        </div>
      </div>

      {/* =========================================================================
          3. MAIN INVESTIGATOR WORKBENCH
          ========================================================================= */}
      {!fullScreenGraph ? (
        /* MODE A: WORKING INVESTIGATOR CONSOLE */
        <main className="flex-1 p-6 grid grid-cols-12 gap-6 max-w-[1780px] mx-auto w-full h-[calc(100vh-144px)]">
          
          {/* =====================================================================
              LEFT COLUMN: CASE DIRECTORY
              ===================================================================== */}
          <aside className="col-span-4 flex flex-col bg-[#F7F7F5] border border-[#DADAD8] p-5 h-full relative">
            <div className="corner-bracket-tl" />
            <div className="corner-bracket-tr" />
            <div className="corner-bracket-bl" />
            <div className="corner-bracket-br" />

            {/* Header & Filter */}
            <div className="border-b border-[#DADAD8] pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-[0.14em] text-[#8A8A8A] uppercase font-semibold">
                  CASE DIRECTORY ({filteredCases.length})
                </span>
                <span className="text-[10px] font-mono text-[#1BA8D1]">
                  ACTIVE INVESTIGATIONS
                </span>
              </div>

              <div className="relative mt-2.5">
                <Search className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="FILTER FIR / POLICE STATION..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DADAD8] pl-9 pr-3 py-1.5 text-xs font-mono text-[#1A1A1A] placeholder:text-[#B8B8B6] focus:outline-none focus:border-[#1BA8D1] rounded-[1px]"
                />
              </div>
            </div>

            {/* Cases Scrollable List */}
            <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
              {filteredCases.map((item) => {
                const isSelected = selectedCaseId === item.case_id;
                return (
                  <div
                    key={item.case_id}
                    onClick={() => handleSelectCase(item.case_id)}
                    className={`p-3.5 border cursor-pointer transition-colors rounded-[2px] ${
                      isSelected
                        ? 'bg-[#FFFFFF] border-[#1BA8D1]'
                        : 'bg-[#FFFFFF] border-[#DADAD8] hover:border-[#8A8A8A]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-medium text-[#1BA8D1] tracking-wider uppercase">
                        FIR NO: {item.fir_number}
                      </span>
                      <span className={`text-[8px] font-mono font-medium px-1.5 py-0.5 rounded-[1px] ${
                        item.threat_level === 'CRITICAL' ? 'bg-[#D6483C] text-white' : 'bg-[#1E3A5F] text-white'
                      }`}>
                        {item.threat_level}
                      </span>
                    </div>

                    <h3 className="text-xs font-medium text-[#1A1A1A] uppercase tracking-[0.04em] line-clamp-1">
                      {item.title}
                    </h3>

                    <div className="text-[10px] text-[#8A8A8A] font-mono mt-0.5 truncate">
                      {item.police_station}
                    </div>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#E7E7E5] text-[9px] font-mono">
                      <div className="flex items-center gap-2 text-[#7A7A78]">
                        <span>{item.accused_count} ACCUSED</span>
                        <span className="text-[#C5C5C2]">•</span>
                        <span className="font-medium text-[#4A4A4A]">LOSS: {item.defrauded_amount || "₹14.5L"}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenGraph(item.case_id);
                        }}
                        className="text-[#1BA8D1] hover:text-[#00C2E0] hover:underline font-medium ml-auto"
                      >
                        DIAGRAM →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* =====================================================================
              CENTER/RIGHT: ACTIONABLE INVESTIGATOR WORKBENCH PANEL
              ===================================================================== */}
          <section className="col-span-8 bg-[#F7F7F5] border border-[#DADAD8] p-6 h-full flex flex-col justify-between relative overflow-y-auto">
            <div className="corner-bracket-tl" />
            <div className="corner-bracket-tr" />
            <div className="corner-bracket-bl" />
            <div className="corner-bracket-br" />

            <div>
              {/* Top Meta Bar */}
              <div className="flex items-center justify-between border-b border-[#DADAD8] pb-2.5 text-[10px] font-mono tracking-[0.14em] text-[#8A8A8A] uppercase">
                <span>INVESTIGATOR WORKBENCH // {currentCase.case_id}</span>
                <span className="text-[#1BA8D1]">{currentCase.date_time}</span>
              </div>

              {/* 1. PRIORITY FLAGGED ENTITIES ROW (24px top margin separating it from top bar) */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono tracking-[0.14em] text-[#8A8A8A] uppercase font-semibold">
                      PRIORITY FLAGGED ENTITIES
                    </span>
                    <span className="text-[9px] font-mono text-[#B8B8B6]">
                      // RANKED BY CENTRALITY
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-[#1BA8D1]">CLICK TO FOCUS IN GRAPH</span>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {displayedEntities.map((entity) => {
                    const isBroker = entity.is_broker || entity.betweenness_score > 0.5;
                    return (
                      <button
                        key={entity.id}
                        onClick={() => handleFocusNode(entity)}
                        className={`min-w-[160px] flex-shrink-0 p-3 border text-left rounded-[2px] transition-colors ${
                          isBroker 
                            ? 'bg-[#1E3A5F] text-white border-[#2A4C78] hover:border-[#00C2E0]'
                            : 'bg-white text-[#1A1A1A] border-[#DADAD8] hover:border-[#1BA8D1]'
                        }`}
                      >
                        <div className="text-[8px] font-mono tracking-wider uppercase mb-1">
                          <span className={isBroker ? 'text-[#00C2E0] font-semibold' : 'text-[#8A8A8A]'}>
                            {entity.category}
                          </span>
                        </div>
                        <div className="text-[11px] font-medium tracking-[0.03em] uppercase truncate max-w-[150px]">
                          {entity.label}
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[8px] font-mono mt-1.5 pt-1.5 border-t border-[#EAEAEA]/20">
                          <span className={`truncate max-w-[90px] ${isBroker ? 'text-[#A0C4DF]' : 'text-[#8A8A8A]'}`}>
                            {entity.sublabel || 'Entity Member'}
                          </span>
                          <span className={isBroker ? 'text-[#00C2E0] font-medium' : 'text-[#8A8A8A]'}>
                            BC {entity.betweenness_score.toFixed(3)}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {remainingCount > 0 && !expandEntities && (
                    <button
                      onClick={() => setExpandEntities(true)}
                      className="min-w-[110px] flex-shrink-0 p-3 border border-dashed border-[#DADAD8] hover:border-[#1BA8D1] bg-[#FAF9F7] text-center rounded-[2px] transition-colors flex flex-col justify-center items-center h-[74px]"
                    >
                      <span className="text-[11px] font-mono font-bold text-[#1BA8D1]">+{remainingCount} MORE</span>
                      <span className="text-[8px] font-mono text-[#8A8A8A] uppercase mt-0.5">EXPAND QUEUE</span>
                    </button>
                  )}

                  {expandEntities && remainingCount > 0 && (
                    <button
                      onClick={() => setExpandEntities(false)}
                      className="min-w-[110px] flex-shrink-0 p-3 border border-dashed border-[#DADAD8] hover:border-[#1BA8D1] bg-[#FAF9F7] text-center rounded-[2px] transition-colors flex flex-col justify-center items-center h-[74px]"
                    >
                      <span className="text-[10px] font-mono font-bold text-[#8A8A8A]">COLLAPSE</span>
                      <span className="text-[8px] font-mono text-[#8A8A8A] uppercase mt-0.5">SHOW TOP 4</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Standardized Hairline Section Divider (24px margin above/below) */}
              <div className="border-t border-[#DADAD8] my-6" />

              {/* 2. CASE HEADLINE BLOCK */}
              <div>
                <h2 className="text-2xl font-light text-[#1A1A1A] tracking-[0.01em] uppercase">
                  {currentCase.title}
                </h2>
                <div className="text-xs font-mono text-[#8A8A8A] mt-1 tracking-[0.08em] uppercase">
                  {currentCase.police_station} • {currentCase.investigating_officer}
                </div>
              </div>

              {/* Standardized Hairline Section Divider */}
              <div className="border-t border-[#DADAD8] my-6" />

              {/* STATUTORY CHARGES */}
              <div className="p-3 bg-white border border-[#DADAD8] text-xs font-mono text-[#1A1A1A] rounded-[1px]">
                <strong className="text-[#1BA8D1] uppercase">STATUTORY CHARGES:</strong> {currentCase.bns_sections}
              </div>

              {/* Standardized Hairline Section Divider */}
              <div className="border-t border-[#DADAD8] my-6" />

              {/* CASE SUMMARY PARAGRAPH */}
              <p className="text-xs text-[#666666] leading-relaxed max-w-[760px]">
                {currentCase.summary}
              </p>

              {/* Standardized Hairline Section Divider */}
              <div className="border-t border-[#DADAD8] my-6" />

              {/* 3. CASE DOSSIER TILES (Equal-width columns, consistent internal padding and matching height) */}
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-[#DADAD8] p-3.5 bg-white rounded-[2px] flex flex-col justify-between min-h-[76px]">
                  <div className="text-[9px] font-mono tracking-[0.12em] text-[#8A8A8A] uppercase">
                    IDENTIFIED ACCUSED
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-light text-[#1A1A1A] leading-none">
                      {currentCase.entities.filter(e => e.category === 'PERSON').length || 4}
                    </span>
                    <span className="text-[9px] font-mono text-[#8A8A8A] uppercase">
                      RECORDED SUBJECTS
                    </span>
                  </div>
                </div>

                <div className="border border-[#2A4C78] p-3.5 bg-[#1E3A5F] text-white rounded-[2px] flex flex-col justify-between min-h-[76px] shadow-sm">
                  <div className="text-[9px] font-mono tracking-[0.12em] text-[#00C2E0] uppercase font-medium">
                    STRUCTURAL BROKER
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs font-medium text-white tracking-wide truncate max-w-[150px]">
                      {currentCase.graph.stats.central_broker || "VIKRAM MALHOTRA"}
                    </span>
                    <span className="text-[9px] font-mono text-[#00C2E0]">
                      CENTRAL NODE
                    </span>
                  </div>
                </div>

                <div className="border border-[#DADAD8] p-3.5 bg-white rounded-[2px] flex flex-col justify-between min-h-[76px]">
                  <div className="text-[9px] font-mono tracking-[0.12em] text-[#8A8A8A] uppercase">
                    BSA SEC 63(4) DIGEST
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs font-mono text-[#4A4A4A] truncate max-w-[150px]">
                      {currentCase.sha256_hash.substring(0, 16)}...
                    </span>
                    <span className="text-[9px] font-mono text-[#8A8A8A]">
                      SHA256
                    </span>
                  </div>
                </div>
              </div>

              {/* Standardized Hairline Section Divider */}
              <div className="border-t border-[#DADAD8] my-6" />

              {/* 4. EXTRACTED ENTITIES TAG CLOUD */}
              <div>
                <div className="text-[9px] font-mono tracking-[0.14em] text-[#8A8A8A] uppercase mb-2">
                  EXTRACTED ENTITIES
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentCase.entities.map(e => (
                    <span 
                      key={e.id}
                      className="px-2 py-0.5 bg-white border border-[#DADAD8] text-[10px] font-mono text-[#3A3A3A] rounded-[1px]"
                    >
                      {e.name} <span className="text-[#8A8A8A]">[{e.category}]</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Standardized Hairline Section Divider */}
              <div className="border-t border-[#DADAD8] my-6" />

              {/* 5. RECOMMENDED ACTIONS PANEL (Interactive Checkbox List, 50% dimmed when complete) */}
              <div className="border border-[#DADAD8] bg-white p-4 rounded-[2px]">
                <div className="flex items-center justify-between mb-3 border-b border-[#E7E7E5] pb-2">
                  <span className="text-[9px] font-mono tracking-[0.14em] text-[#1BA8D1] uppercase font-semibold">
                    RECOMMENDED INVESTIGATIVE ACTIONS ({actionsList.length})
                  </span>
                  <span className="text-[9px] font-mono text-[#8A8A8A]">
                    {Object.values(completedActions).filter(Boolean).length} / {actionsList.length} EXECUTED
                  </span>
                </div>

                <div className="space-y-2">
                  {actionsList.map((action) => {
                    const isDone = !!completedActions[action.id];
                    return (
                      <div
                        key={action.id}
                        onClick={() => toggleAction(action.id)}
                        className={`p-2.5 border rounded-[1px] flex items-start gap-3 cursor-pointer transition-all duration-150 ${
                          isDone 
                            ? 'bg-[#FAF9F7] border-[#E2E2DE] opacity-50' 
                            : 'bg-white border-[#DADAD8] hover:border-[#1BA8D1] opacity-100'
                        }`}
                      >
                        {/* Interactive Square Checkbox */}
                        <div className={`mt-0.5 w-3.5 h-3.5 rounded-[1px] flex items-center justify-center flex-shrink-0 transition-colors ${
                          isDone 
                            ? 'bg-[#00C2E0] border border-[#00C2E0] text-white' 
                            : 'border border-[#8A8A8A] bg-white'
                        }`}>
                          {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[8px] font-mono uppercase text-[#8A8A8A] tracking-wider">
                              {action.category}
                            </span>
                            <span className={`text-[8px] font-mono px-1 rounded-[1px] ${
                              action.priority === 'CRITICAL' ? 'bg-[#D6483C] text-white' : 'bg-[#1E3A5F] text-white'
                            }`}>
                              {action.priority}
                            </span>
                          </div>
                          <p className={`text-xs font-mono leading-tight ${
                            isDone ? 'line-through text-[#8A8A8A]' : 'text-[#1A1A1A]'
                          }`}>
                            {action.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Standardized Hairline Section Divider */}
              <div className="border-t border-[#DADAD8] my-6" />

              {/* 6. CASE TIMELINE STRIP */}
              <div className="border border-[#DADAD8] bg-white p-4 rounded-[2px]">
                <div className="text-[9px] font-mono tracking-[0.14em] text-[#8A8A8A] uppercase mb-3">
                  INCIDENT TIMELINE // CHRONOLOGICAL EVENT STREAM
                </div>

                {/* Horizontal Timeline Connector with Dots */}
                <div className="relative flex items-center justify-between pt-2 pb-1">
                  {/* Connecting Wire Line */}
                  <div className="absolute top-[17px] left-3 right-3 h-[1px] bg-[#C7CDD2] z-0" />

                  {timelineEvents.map((ev, idx) => (
                    <div key={idx} className="relative z-10 flex flex-col items-center text-center max-w-[110px]">
                      {/* Junction Dot */}
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1BA8D1] border border-white mb-1.5" />
                      {/* Timestamp */}
                      <span className="text-[8px] font-mono text-[#8A8A8A] tracking-wider">
                        {ev.time}
                      </span>
                      {/* Event Title */}
                      <span className="text-[9px] font-medium text-[#1A1A1A] uppercase leading-tight mt-0.5 line-clamp-2">
                        {ev.event}
                      </span>
                      {/* Status */}
                      <span className="text-[8px] font-mono text-[#1BA8D1] mt-0.5">
                        {ev.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Launch Knowledge Graph Button */}
            <div className="mt-5 pt-3 border-t border-[#DADAD8] flex items-center justify-between">
              <div className="text-xs font-mono text-[#8A8A8A]">
                OPEN INTERACTIVE INVESTIGATION CANVAS & SCHEMATIC HUD
              </div>
              <button
                onClick={() => setFullScreenGraph(true)}
                className="px-6 py-2 bg-[#00C2E0] hover:bg-[#00B2CE] text-white font-mono font-medium tracking-[0.12em] text-xs uppercase flex items-center gap-2 rounded-[2px] transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>OPEN FULL-SCREEN KNOWLEDGE GRAPH & HUD</span>
              </button>
            </div>
          </section>
        </main>
      ) : (
        /* MODE B: FULL-SCREEN KNOWLEDGE GRAPH WITH DETROIT HUD */
        <main className="flex-1 p-6 grid grid-cols-12 gap-6 max-w-[1920px] mx-auto w-full h-[calc(100vh-108px)]">
          {/* FLOWCHART CANVAS */}
          <div className="col-span-8 h-full flex flex-col relative">
            <div className="absolute top-3 right-28 z-20">
              <button
                onClick={() => setFullScreenGraph(false)}
                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#DADAD8] text-xs font-mono text-[#1A1A1A] hover:bg-[#F2F2F0] rounded-[2px] uppercase font-medium"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>CLOSE GRAPH</span>
              </button>
            </div>

            <DetroitCanvas
              nodes={currentCase.graph.nodes}
              edges={currentCase.graph.edges}
              selectedNodeId={selectedNode?.id || null}
              onSelectNode={(node) => setSelectedNode(node)}
              caseId={selectedCaseId}
              externalShowLegend={showGraphLegend}
            />
          </div>

          {/* FLOATING CYBERLIFE DOSSIER INSPECTOR */}
          <div className="col-span-4 h-full">
            <CyberLifeDossier
              selectedNode={selectedNode}
              entities={currentCase.entities}
              edges={currentCase.graph.edges}
              allNodes={currentCase.graph.nodes}
              onSelectNode={(node) => setSelectedNode(node)}
              crossCaseMatch={currentCase.cross_case_match}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        </main>
      )}

      {/* =========================================================================
          4. BOTTOM HUD CONTROLLER STRIP
          ========================================================================= */}
      <DetectiveHUD
        onOpenStats={() => setStatsOpen(true)}
        onOpenPatterns={() => setPatternsOpen(true)}
        onOpenLegend={() => {
          if (!fullScreenGraph) setFullScreenGraph(true);
          setShowGraphLegend(prev => !prev);
        }}
        onOpenCertificate={() => setCertOpen(true)}
        onBackToCases={() => setFullScreenGraph(false)}
        isFullScreenGraph={fullScreenGraph}
        patternCount={currentCase.patterns.length}
      />

      {/* MODALS */}
      <CaseStatsModal
        isOpen={statsOpen}
        onClose={() => setStatsOpen(false)}
        graph={currentCase.graph}
      />
      <PatternsModal
        isOpen={patternsOpen}
        onClose={() => setPatternsOpen(false)}
        patterns={currentCase.patterns}
      />
      <BSACertificateModal
        isOpen={certOpen}
        onClose={() => setCertOpen(false)}
        firNumber={currentCase.fir_number}
        sha256Hash={currentCase.sha256_hash}
        blockchainTxHash={currentCase.blockchain_tx_hash}
      />
    </div>
  );
}
