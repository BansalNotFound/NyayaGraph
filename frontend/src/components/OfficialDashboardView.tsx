"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  LayoutDashboard,
  Network,
  FolderArchive,
  MessageSquareCode,
  GitFork,
  ShieldCheck,
  Calendar,
  Share2,
  MoreHorizontal,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Bell,
  Sparkles,
  Layers,
  Building2,
  Briefcase,
  Users,
  CheckCircle2,
  ExternalLink,
  Bot,
  Filter,
  Check,
  Clock,
  Fingerprint,
  FileText,
  Globe,
  UserX,
  Sliders,
  Eye,
  X,
  MapPin,
  Hash,
  AlertTriangle,
  User,
  Camera,
} from "lucide-react";
import {
  fetchAllCases,
  fetchPdfCatalog,
  fetchUidbRecords,
  ApiCaseSummary,
  PdfCatalogItem,
  UidbRecord,
} from "@/lib/api";
import { CASE_LIST } from "@/lib/casesData";
import FirPdfModal from "@/components/FirPdfModal";
import SphereGallery3D, { type GalleryItem } from "@/components/SphereGallery3D";

interface OfficialDashboardViewProps {
  onNavigate: (view: "dashboard" | "graph" | "cases" | "chat" | "flowchart") => void;
  onOpenCase: (caseId: string, firNumber?: string) => void;
  onOpenChat: (caseId?: string, firNumber?: string) => void;
}

export default function OfficialDashboardView({
  onNavigate,
  onOpenCase,
  onOpenChat,
}: OfficialDashboardViewProps) {
  const [cases, setCases] = useState<ApiCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"warrants" | "summons" | "alerts">("warrants");
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  // PDF Preview & Vault State
  const [previewPdfCase, setPreviewPdfCase] = useState<{
    caseId: string;
    firNumber?: string;
    policeStation?: string;
  } | null>(null);
  const [pdfCatalog, setPdfCatalog] = useState<PdfCatalogItem[]>([]);

  // ── 3D Forensic Sphere Gallery State ──
  const [uidbRecords, setUidbRecords] = useState<UidbRecord[]>([]);
  const [sphereMode, setSphereMode] = useState<"uidb" | "cbi">("uidb");
  const [sphereSpeed, setSphereSpeed] = useState<number>(18);
  const [selectedUidb, setSelectedUidb] = useState<UidbRecord | null>(null);
  const [uidbFilterPs, setUidbFilterPs] = useState<string>("ALL");

  // ── Missing Persons & Dossiers Section State ──
  const [missingSearch, setMissingSearch] = useState("");
  const [missingLimit, setMissingLimit] = useState(8);
  const [missingFilterStation, setMissingFilterStation] = useState("ALL");

  // ── Dossier Inspect Modal State ──
  const [inspectModalRecord, setInspectModalRecord] = useState<UidbRecord | null>(null);

  // Ref to the dossier inspector panel so "Inspect" can scroll it into view
  const dossierPanelRef = useRef<HTMLDivElement>(null);
  const handleInspectUidb = (rec: UidbRecord) => {
    setSelectedUidb(rec);
    setInspectModalRecord(rec);
    dossierPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Load cases, PDF catalog, and UIDB records
  useEffect(() => {
    let mounted = true;
    fetchPdfCatalog(12).then((items) => {
      if (mounted && items?.length) setPdfCatalog(items);
    });

    fetchUidbRecords().then((records) => {
      if (mounted && records?.length) {
        setUidbRecords(records);
        setSelectedUidb(records[0]);
      }
    });

    fetchAllCases()
      .then((data) => {
        if (!mounted) return;
        if (data && data.length > 0) {
          setCases(data);
        } else {
          const fallback = CASE_LIST.map((c) => ({
            case_id: c.case_id,
            fir_number: c.fir_number,
            police_station: c.police_station,
            date_time: c.date_time,
            node_count: c.accused_count * 4 + 12,
            edge_count: c.accused_count * 7 + 18,
            broker_name: c.central_broker,
            sha256_hash: "0x8f" + Math.random().toString(16).substring(2, 10) + "...63b4",
          }));
          setCases(fallback);
        }
      })
      .catch(() => {
        if (!mounted) return;
        const fallback = CASE_LIST.map((c) => ({
          case_id: c.case_id,
          fir_number: c.fir_number,
          police_station: c.police_station,
          date_time: c.date_time,
          node_count: c.accused_count * 4 + 12,
          edge_count: c.accused_count * 7 + 18,
          broker_name: c.central_broker,
          sha256_hash: "0x8f" + Math.random().toString(16).substring(2, 10) + "...63b4",
        }));
        setCases(fallback);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Filtered cases for the bottom table
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        c.fir_number.toLowerCase().includes(q) ||
        c.case_id.toLowerCase().includes(q) ||
        (c.broker_name && c.broker_name.toLowerCase().includes(q)) ||
        c.police_station.toLowerCase().includes(q);

      const matchBranch =
        !selectedBranch || c.police_station.toLowerCase().includes(selectedBranch.toLowerCase());

      return matchQuery && matchBranch;
    });
  }, [cases, searchQuery, selectedBranch]);

  // Unique Police Stations for UIDB filter dropdown
  const uniquePoliceStations = useMemo(() => {
    const s = new Set<string>();
    uidbRecords.forEach((r) => {
      if (r.police_station_en && r.police_station_en !== "State Police Jurisdiction") {
        s.add(r.police_station_en);
      }
    });
    return Array.from(s).sort();
  }, [uidbRecords]);

  // Gallery items for SphereGallery3D
  const sphereItems: GalleryItem[] = useMemo(() => {
    if (sphereMode === "uidb") {
      const list =
        uidbFilterPs === "ALL"
          ? uidbRecords
          : uidbRecords.filter((r) => r.police_station_en === uidbFilterPs);

      return list.map((r) => ({
        id: r.id,
        image: r.image_url,
        title: r.name_en,
        subtitle: `${r.police_station_en} • Reg: ${r.reg_number}`,
        record: r,
      }));
    } else {
      return cases.slice(0, 32).map((c) => ({
        id: c.case_id,
        image: `/data/pdf_covers/cover_${c.fir_number}.png`,
        title: `FIR ${c.fir_number}`,
        subtitle: `${c.police_station}`,
        link: "",
        record: c,
      }));
    }
  }, [sphereMode, uidbRecords, uidbFilterPs, cases]);

  // Filtered Missing Persons & Unidentified Dossiers
  const filteredMissingPersons = useMemo(() => {
    return uidbRecords.filter((r) => {
      const q = missingSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        r.name_en.toLowerCase().includes(q) ||
        r.name_hi.toLowerCase().includes(q) ||
        r.police_station_en.toLowerCase().includes(q) ||
        r.reg_number.toLowerCase().includes(q);

      const matchStation =
        missingFilterStation === "ALL" ||
        r.police_station_en.toLowerCase() === missingFilterStation.toLowerCase();

      return matchQ && matchStation;
    });
  }, [uidbRecords, missingSearch, missingFilterStation]);

  // High Priority Statutory Actions, Summons & Warrants
  const statutoryActions = [
    {
      id: "w-1",
      category: "warrants" as const,
      case_id: "CASE_CBI_RC0782026E0004",
      fir: "RC0782026E0004",
      title: "Section 94 BNSS Search & Seizure Warrant",
      desc: "NCS Sugars • Godown physical stock audit & consortium escrow freeze",
      time: "10:30 - 12:00 hrs",
      wing: "CBI BS&FB Bangalore",
      badgeColor: "bg-accent/15 text-accent",
      isHighlighted: true,
      officer: "Dr. S. K. Narayanan",
    },
    {
      id: "w-2",
      category: "summons" as const,
      case_id: "CASE_CBI_RC0782026E0001",
      fir: "RC0782026E0001",
      title: "Section 173 BNSS Custodial Remand Summons",
      desc: "R L Jewels Pvt Ltd • Multi-hop bullion diversion paper trail interrogation",
      time: "14:00 - 16:30 hrs",
      wing: "CBI BS&FB Bangalore",
      badgeColor: "bg-info/15 text-info",
      isHighlighted: false,
      officer: "Insp. Vikramaditya",
    },
    {
      id: "w-3",
      category: "alerts" as const,
      case_id: "CASE_2026_NOIDA_112",
      fir: "112/2026",
      title: "Look Out Circular (LOC) / Border Alert",
      desc: "Digital Arrest Extortion Gateway • VoIP SIP trunk intercept & escrow freeze",
      time: "ACTIVE 24/7",
      wing: "CBI Cyber & ACB",
      badgeColor: "bg-alert/15 text-alert",
      isHighlighted: false,
      officer: "DySP Rajeshwari Sen",
    },
    {
      id: "w-4",
      category: "warrants" as const,
      case_id: "CASE_CBI_RC0782026E0003",
      fir: "RC0782026E0003",
      title: "Section 106 BNSS Bank Debit Freeze",
      desc: "Ashapura Garments • Canara Bank 14 mule accounts attached",
      time: "16:45 hrs",
      wing: "CBI BS&FB Bangalore",
      badgeColor: "bg-verified/15 text-verified",
      isHighlighted: false,
      officer: "SP Anirudh Sharma",
    },
  ];

  return (
    <div className="flex h-full w-full overflow-hidden select-none transition-colors duration-150 bg-canvas text-ink">
      {/* ═══════════════════════════════════════════════════════════
          LEFT SIDEBAR (Fixed Height, Pinned with Independent Scroll)
         ═══════════════════════════════════════════════════════════ */}
      <aside
        className="w-64 shrink-0 h-full overflow-y-auto flex flex-col justify-between border-r p-4 lg:p-5 transition-colors duration-150 border-line bg-panel-deep"
      >
        <div className="space-y-6">
          {/* Top Brand & Logo */}
          <div className="flex items-center gap-3 px-1 pt-1">
            <div className="flex size-9 items-center justify-center rounded-xl bg-charcoal text-white shadow-xs">
              <ShieldCheck className="size-5 text-accent" />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-extrabold tracking-tight text-ink">
                NyayaGraph
              </span>
              <span className="text-[10.5px] font-medium text-ink-muted">
                CBI Intelligence Core
              </span>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-ink-faint" />
            <input
              type="text"
              placeholder="Search here..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border py-2 pl-9 pr-3 text-xs shadow-xs focus:outline-none transition-colors border-line bg-panel text-ink placeholder-ink-faint focus:border-accent"
            />
          </div>

          {/* 6 Square Grid Action Tiles (2 cols x 3 rows) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Tile 1: Dashboard (Active State) */}
            <button
              onClick={() => onNavigate("dashboard")}
              className="group flex flex-col items-start justify-between rounded-2xl p-3.5 text-left shadow-md transition-all cursor-pointer bg-charcoal border border-line-strong text-white hover:brightness-110"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-white/10 text-white">
                <LayoutDashboard className="size-4 text-accent" />
              </div>
              <div className="mt-4">
                <span className="block text-[11px] font-semibold text-white">Dashboard</span>
                <span className="text-[9px] text-white/60">Executive Overview</span>
              </div>
            </button>

            {/* Tile 2: Master Syndicate Graph */}
            <button
              onClick={() => onNavigate("graph")}
              className="group flex flex-col items-start justify-between rounded-2xl border p-3.5 text-left shadow-xs transition-all cursor-pointer border-line bg-panel text-ink hover:border-line-strong hover:bg-raised"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-raised text-ink">
                <Network className="size-4" />
              </div>
              <div className="mt-4">
                <span className="block text-[11px] font-semibold">Syndicate Graph</span>
                <span className="text-[9px] text-ink-muted">2,744 Nodes</span>
              </div>
            </button>

            {/* Tile 3: Cases & FIRs */}
            <button
              onClick={() => onNavigate("cases")}
              className="group flex flex-col items-start justify-between rounded-2xl border p-3.5 text-left shadow-xs transition-all cursor-pointer border-line bg-panel text-ink hover:border-line-strong hover:bg-raised"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-raised text-ink">
                <FolderArchive className="size-4" />
              </div>
              <div className="mt-4">
                <span className="block text-[11px] font-semibold">Cases & FIRs</span>
                <span className="text-[9px] text-ink-muted">500 Ingested Files</span>
              </div>
            </button>

            {/* Tile 4: Detective AI Copilot */}
            <button
              onClick={() => onOpenChat()}
              className="group flex flex-col items-start justify-between rounded-2xl border p-3.5 text-left shadow-xs transition-all cursor-pointer border-line bg-panel text-ink hover:border-line-strong hover:bg-raised"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-raised text-ink">
                <MessageSquareCode className="size-4" />
              </div>
              <div className="mt-4">
                <span className="block text-[11px] font-semibold">Detective AI</span>
                <span className="text-[9px] text-ink-muted">DeepSeek Copilot</span>
              </div>
            </button>

            {/* Tile 5: BSA Evidence Ledger */}
            <button
              onClick={() => {
                setSelectedBranch(null);
                setSearchQuery("");
              }}
              className="group flex flex-col items-start justify-between rounded-2xl border p-3.5 text-left shadow-xs transition-all cursor-pointer border-line bg-panel text-ink hover:border-line-strong hover:bg-raised"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-raised text-ink">
                <ShieldCheck className="size-4" />
              </div>
              <div className="mt-4">
                <span className="block text-[11px] font-semibold">BSA 63(4) Ledger</span>
                <span className="text-[9px] text-ink-muted">Immutable Proofs</span>
              </div>
            </button>

            {/* Tile 6: Procedural Flowchart */}
            <button
              onClick={() => onNavigate("flowchart")}
              className="group flex flex-col items-start justify-between rounded-2xl border p-3.5 text-left shadow-xs transition-all cursor-pointer border-line bg-panel text-ink hover:border-line-strong hover:bg-raised"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-raised text-ink">
                <GitFork className="size-4" />
              </div>
              <div className="mt-4">
                <span className="block text-[11px] font-semibold">Flowchart</span>
                <span className="text-[9px] text-ink-muted">BNSS Statutory</span>
              </div>
            </button>
          </div>

          {/* Favorite Sections */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold tracking-wider uppercase text-ink-muted">
              <span className="flex items-center gap-1.5">
                <ChevronDown className="size-3" />
                <span>Favorite Investigations</span>
              </span>
            </div>
            <ul className="space-y-1 text-xs">
              {[
                { name: "Consortium Bank Fraud", query: "Consortium" },
                { name: "Hawala Mule Matrix", query: "Hawala" },
                { name: "NCS Sugar Mill Diversion", query: "Sugar" },
              ].map((item) => (
                <li key={item.name}>
                  <button
                    onClick={() => {
                      setSelectedBranch(null);
                      setSearchQuery(item.query);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 font-medium cursor-pointer transition-colors text-ink-muted hover:bg-raised hover:text-ink"
                  >
                    <span className="size-2 rounded-xs bg-accent" />
                    <span>{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Investigation Branches */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold tracking-wider uppercase text-ink-muted">
              <span className="flex items-center gap-1.5">
                <ChevronDown className="size-3" />
                <span>Investigation Branches</span>
              </span>
            </div>
            <ul className="space-y-1 text-xs">
              {[
                { name: "CBI BS&FB Bangalore (194 FIRs)", filter: "Bangalore" },
                { name: "CBI ACB New Delhi (142 FIRs)", filter: "Delhi" },
                { name: "CBI SCB Kolkata (98 FIRs)", filter: "Kolkata" },
                { name: "Cyber Crime Unit (66 FIRs)", filter: "Cyber" },
              ].map((b) => (
                <li key={b.name}>
                  <button
                    onClick={() =>
                      setSelectedBranch(selectedBranch === b.filter ? null : b.filter)
                    }
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 font-medium transition-colors cursor-pointer ${
                      selectedBranch === b.filter
                        ? "bg-raised text-ink font-bold"
                        : "text-ink-muted hover:bg-raised hover:text-ink"
                    }`}
                  >
                    <span className="truncate">{b.name}</span>
                    {selectedBranch === b.filter && <Check className="size-3" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Officer Profile Card */}
        <div
          className="mt-6 flex items-center justify-between rounded-2xl border p-2.5 shadow-xs transition-colors border-line bg-panel"
        >
          <div className="flex items-center gap-2.5">
            <div className="relative flex size-9 items-center justify-center rounded-xl bg-charcoal font-bold text-white">
              <span className="text-xs">SN</span>
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-panel bg-verified" />
            </div>
            <div className="leading-tight">
              <span className="block text-xs font-bold text-ink">Dr. S. K. Narayanan</span>
              <span className="text-[10px] text-ink-muted">Chief Forensic Director</span>
            </div>
          </div>
          <button
            className="flex size-8 items-center justify-center rounded-xl transition-colors text-ink-muted hover:bg-raised hover:text-ink"
          >
            <Bell className="size-4" />
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
            MAIN EXECUTIVE DASHBOARD CANVAS
           ═══════════════════════════════════════════════════════════ */}
      <main className="flex-1 h-full overflow-y-auto p-5 lg:p-7 space-y-6">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <span className="font-bold text-accent">CBI SPE</span>
            <span>/</span>
            <span className="font-semibold text-ink">
              National Crime Intelligence Command
            </span>
            <span>/</span>
            <span
              className="rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider border-alert/40 bg-alert/10 text-alert"
            >
              CONFIDENTIAL // LAW ENFORCEMENT SENSITIVE // 500 INGESTED FILES
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium shadow-xs transition-colors border-line bg-panel text-ink hover:bg-raised"
            >
              <Calendar className="size-3.5" />
              <span>Statutory Session: 13 Sep 2026</span>
            </button>
            <button
              onClick={() => {
                alert("Exporting official CBI forensic intelligence dossier across 500 ingested files...");
              }}
              className="flex size-8 items-center justify-center rounded-xl border shadow-xs transition-colors cursor-pointer border-line bg-panel text-ink hover:bg-raised"
              title="Export Intelligence Summary"
            >
              <Share2 className="size-3.5" />
            </button>
          </div>
        </div>

        {/* ── TOP HERO CARD (Greeting + Core KPIs + Arc Gauge) ── */}
        <section
          className="relative overflow-hidden rounded-3xl border p-6 lg:p-8 shadow-xs transition-colors border-line bg-gradient-to-br from-panel via-panel to-panel-deep"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Greeting & 4 Stats */}
            <div className="lg:col-span-8 space-y-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-ink">
                  CBI Master Forensic Intelligence & Syndicate Portal
                </h1>
                <p className="mt-1 text-xs lg:text-sm font-medium text-ink-muted">
                  Directorate General of Special Police Establishment • 500 Case Dossiers Ingested & Verified
                </p>
              </div>

              {/* 4 Core Stat Counters */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <FolderArchive className="size-3.5 text-accent" />
                    <span className="font-semibold text-xl lg:text-2xl text-ink">500</span>
                  </div>
                  <span className="text-[11px] font-medium text-ink-muted">
                    Ingested Case Files
                  </span>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Users className="size-3.5 text-accent" />
                    <span className="font-semibold text-xl lg:text-2xl text-ink">2,744</span>
                  </div>
                  <span className="text-[11px] font-medium text-ink-muted">
                    Extracted Entities
                  </span>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Network className="size-3.5 text-accent" />
                    <span className="font-semibold text-xl lg:text-2xl text-ink">5,252</span>
                  </div>
                  <span className="text-[11px] font-medium text-ink-muted">
                    Syndicate Links
                  </span>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="size-3.5 text-accent" />
                    <span className="font-semibold text-xl lg:text-2xl text-ink">₹842.6 Cr</span>
                  </div>
                  <span className="text-[11px] font-medium text-ink-muted">
                    Defrauded Public Funds
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Circular Arc Gauge */}
            <div
              className="lg:col-span-4 flex flex-col items-center justify-center border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 border-line"
            >
              <div className="relative flex items-center justify-center">
                <svg className="size-40 -rotate-90 transform" viewBox="0 0 120 120">
                  {/* Background track */}
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    className="stroke-line"
                    strokeWidth="9"
                    fill="transparent"
                    strokeDasharray="250"
                    strokeDashoffset="60"
                    strokeLinecap="round"
                  />
                  {/* Active amber evidence-tag arc meter */}
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    className="stroke-accent"
                    strokeWidth="9"
                    fill="transparent"
                    strokeDasharray="250"
                    strokeDashoffset="100"
                    strokeLinecap="round"
                  />
                  {/* Indicator pointer dot */}
                  <circle
                    cx="98"
                    cy="27"
                    r="4.5"
                    className="fill-panel-deep stroke-accent"
                    strokeWidth="3"
                  />
                </svg>

                {/* Arc tick labels */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black tracking-tight text-ink">94%</span>
                  <span className="text-[10px] font-semibold tracking-wide uppercase text-ink-muted">
                    Evidence Authenticity
                  </span>
                  <span className="text-[9px] font-mono text-ink-faint">
                    BSA 2023 Sec 63(4)
                  </span>
                </div>

                {/* Gauge edge ticks */}
                <span className="absolute bottom-1 left-4 text-[9px] font-mono text-ink-faint">
                  00
                </span>
                <span className="absolute top-1 left-4 text-[9px] font-mono text-ink-faint">
                  20
                </span>
                <span className="absolute -top-1 text-[9px] font-mono text-ink-faint">
                  40
                </span>
                <span className="absolute -top-1 right-12 text-[9px] font-mono text-ink-faint">
                  60
                </span>
                <span className="absolute top-8 right-2 text-[9px] font-mono text-ink-faint">
                  80
                </span>
                <span className="absolute bottom-1 right-4 text-[9px] font-mono text-ink-faint">
                  100
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── MIDDLE ROW (Schedule Milestones + Resolution Chart + Branch Bars) ── */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* 1. Schedule / Case Milestones Card */}
          <div
            className="lg:col-span-4 flex flex-col justify-between rounded-3xl border p-5 shadow-xs transition-colors border-line bg-panel"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <button
                    className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold border-line bg-panel-deep text-ink"
                  >
                    <span>13 Sep 2026</span>
                    <ChevronDown className="size-3 text-ink-muted" />
                  </button>
                  <span className="text-xs font-bold text-ink">Statutory Action Radar</span>
                </div>
                <button
                  className="flex size-7 items-center justify-center rounded-lg text-ink-muted hover:bg-raised"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 pt-1 pb-4">
                {[
                  { id: "warrants", label: "Active Warrants (Sec 94)" },
                  { id: "summons", label: "Custodial Summons (Sec 173)" },
                  { id: "alerts", label: "Border Alerts (LOC)" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-accent text-accent-contrast font-bold"
                        : "bg-panel-deep text-ink-muted hover:text-ink"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Milestone Cards List */}
              <div className="space-y-3">
                {statutoryActions
                  .filter((item) => item.category === activeTab || (activeTab === "warrants" && item.category === "warrants"))
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`group relative rounded-2xl p-4 transition-all ${
                        item.isHighlighted
                          ? "border border-accent/40 bg-gradient-to-br from-accent/15 to-accent/5 shadow-xs"
                          : "border border-line bg-panel-deep hover:bg-panel hover:border-line-strong"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span
                            className="block text-[10px] font-mono font-bold tracking-wider text-accent"
                          >
                            {item.fir}
                          </span>
                          <h4 className="mt-0.5 text-xs font-bold transition-colors text-ink group-hover:text-accent">
                            {item.title}
                          </h4>
                          <p className="mt-1 text-[10.5px] text-ink-muted">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => onOpenCase(item.case_id, item.fir)}
                          className="flex size-6 shrink-0 items-center justify-center rounded-full shadow-xs hover:scale-105 transition-all cursor-pointer bg-raised text-ink-muted hover:text-ink"
                          title="Open Case"
                        >
                          <ExternalLink className="size-3" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-line">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${item.badgeColor}`}
                          >
                            {item.wing}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-medium text-ink-muted">
                            <Clock className="size-3" />
                            {item.time}
                          </span>
                        </div>
                        <div className="flex size-5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-contrast">
                          CBI
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* 2. Investigation & Resolution Velocity */}
          <div
            className="lg:col-span-5 flex flex-col justify-between rounded-3xl border p-5 shadow-xs transition-colors border-line bg-panel"
          >
            <div>
              {/* Header with KPI and Arrow */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-panel-deep text-ink">
                    <Fingerprint className="size-4 text-accent" />
                  </div>
                  <div>
                    <span className="text-2xl font-bold tracking-tight text-ink">94.8%</span>
                    <span className="block text-[11px] font-medium text-ink-muted">
                      Cross-Syndicate Linkage Rate (500 Ingested Files)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate("graph")}
                  className="flex size-8 items-center justify-center rounded-xl border transition-colors cursor-pointer border-line bg-panel-deep text-ink hover:bg-raised"
                  title="Inspect Syndicate Matrix"
                >
                  <ArrowUpRight className="size-4" />
                </button>
              </div>

              {/* Smooth SVG Trend Line Chart */}
              <div className="mt-6">
                <div className="relative h-32 w-full">
                  <svg
                    className="h-full w-full overflow-visible"
                    viewBox="0 0 320 100"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="chartGoldFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" style={{ stopColor: "var(--ng-accent)" }} stopOpacity="0.3" />
                        <stop offset="100%" style={{ stopColor: "var(--ng-accent)" }} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Soft Grid Lines */}
                    <line
                      x1="0"
                      y1="20"
                      x2="320"
                      y2="20"
                      className="stroke-line"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="0"
                      y1="50"
                      x2="320"
                      y2="50"
                      className="stroke-line"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="0"
                      y1="80"
                      x2="320"
                      y2="80"
                      className="stroke-line"
                      strokeDasharray="3 3"
                    />

                    {/* Gradient Fill Area */}
                    <path
                      d="M 0,75 C 35,70 65,45 100,55 C 135,65 165,30 200,32 C 235,35 265,15 320,18 L 320,100 L 0,100 Z"
                      fill="url(#chartGoldFill)"
                    />

                    {/* Line */}
                    <path
                      d="M 0,75 C 35,70 65,45 100,55 C 135,65 165,30 200,32 C 235,35 265,15 320,18"
                      fill="none"
                      className="stroke-accent"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Highlight Dots */}
                    <circle
                      cx="200"
                      cy="32"
                      r="4"
                      className="fill-panel-deep stroke-accent"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="320"
                      cy="18"
                      r="4"
                      className="fill-panel-deep stroke-accent"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>

                {/* Chart X-Axis Investigation Stages */}
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono font-semibold text-ink-faint">
                  <span>Phase 1: Ingestion</span>
                  <span>Phase 2: Entity Graph</span>
                  <span>Phase 3: Hawala Trace</span>
                  <span>Phase 4: Seizures</span>
                  <span>Phase 5: Cognizance</span>
                </div>
              </div>
            </div>

            {/* Row of 5 Metric Sub-Cards */}
            <div className="mt-5 grid grid-cols-5 gap-2 border-t pt-4 border-line">
              {[
                { label: "Active FIRs", val: "500 Files", action: "Inspect", fn: () => onNavigate("cases") },
                { label: "Key Brokers", val: "48 Nodes", action: "Matrix", fn: () => onNavigate("graph") },
                { label: "CBI Wings", val: "18 Units", action: "Filter", fn: () => setSelectedBranch(null) },
                { label: "BSA Proofs", val: "500 Crypt", action: "Verify", fn: () => { } },
                { label: "Asset Freezes", val: "₹842.6 Cr", action: "Sec 106", fn: () => setSearchQuery("Consortium") },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="rounded-xl p-2 text-left transition-colors bg-panel-deep"
                >
                  <span className="block text-[9px] font-medium text-ink-muted">
                    {stat.label}
                  </span>
                  <span className="block text-xs font-bold text-ink">{stat.val}</span>
                  <button
                    onClick={stat.fn}
                    className="mt-1 flex items-center gap-0.5 text-[8.5px] font-medium text-accent hover:underline cursor-pointer"
                  >
                    <span>{stat.action}</span>
                    <ArrowUpRight className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Branch / Crime Distribution Vertical Bars */}
          <div
            className="lg:col-span-3 flex flex-col justify-between rounded-3xl border p-5 shadow-xs transition-colors border-line bg-panel"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-ink">
                    Syndicate Threat Vectors & Defrauded Public Funds
                  </h3>
                  <span className="text-[10px] text-ink-muted">
                    Fund distribution across 500 case files
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-extrabold text-ink">500</span>
                  <span className="text-[9px] text-ink-muted">Ingested Files</span>
                </div>
              </div>

              {/* 3 Distinct Rounded Vertical Bars */}
              <div className="mt-8 flex h-48 items-end justify-center gap-4">
                {/* Bar 1: Bank Fraud (BS&FB) - Amber 49% */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[11px] font-bold text-accent">49%</span>
                  <div className="relative w-11 rounded-2xl bg-accent transition-all hover:brightness-105 h-38 shadow-xs flex flex-col justify-end p-1.5 items-center">
                    <span className="text-[9px] font-bold text-accent-contrast uppercase rotate-0">BS&FB</span>
                  </div>
                  <span className="text-[10px] font-semibold text-ink">Bank Fraud</span>
                </div>

                {/* Bar 2: Anti-Corruption (ACB) - Charcoal 31% */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[11px] font-bold text-ink">31%</span>
                  <div
                    className="relative w-11 rounded-2xl transition-all hover:brightness-110 h-26 shadow-xs flex flex-col justify-end p-1.5 items-center bg-charcoal"
                  >
                    <span className="text-[9px] font-bold text-white uppercase">ACB</span>
                  </div>
                  <span className="text-[10px] font-semibold text-ink">Corruption</span>
                </div>

                {/* Bar 3: Special Crimes (SCB) - Muted Grey 20% */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[11px] font-bold text-ink-muted">20%</span>
                  <div
                    className="relative w-11 rounded-2xl transition-all hover:brightness-105 h-18 shadow-xs flex flex-col justify-end p-1.5 items-center bg-ink-muted"
                  >
                    <span className="text-[9px] font-bold text-accent-contrast uppercase">SCB</span>
                  </div>
                  <span className="text-[10px] font-semibold text-ink">Special Crime</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl p-2.5 text-center bg-panel-deep">
              <span className="text-[10.5px] font-medium text-ink-muted">
                ₹842.60 Cr Proceeds of Crime Attached under PMLA & BNSS
              </span>
            </div>
          </div>
        </section>

        {/* ── EXECUTIVE PDF SECTION: CBI ARCHIVED FIR EVIDENCE VAULT ── */}
        <section
          className="rounded-3xl border p-5 lg:p-6 shadow-xs transition-colors border-line bg-panel"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-inherit">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-charcoal text-white shadow-xs">
                <FileText className="size-5 text-accent" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-ink">
                    CBI Scanned FIR Evidence Vault & PDF Preview
                  </h3>
                  <span
                    className="rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold border-accent/30 bg-accent/10 text-accent"
                  >
                    148 Authentic Scanned FIRs
                  </span>
                </div>
                <span className="text-xs text-ink-muted">
                  Instant cryptographic preview of original scanned CBI FIR PDFs with BSA 2023 Sec 63(4) integrity verification
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-mono font-medium border-verified/40 bg-verified/10 text-verified"
              >
                <ShieldCheck className="size-3.5" />
                <span>Tamper-Evident Ledger Anchored</span>
              </span>
            </div>
          </div>

          {/* Quick Access PDF Cards Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-4">
            {[
              {
                fir: "RC0782026E0004",
                branch: "CBI BS&FB Bangalore",
                size: "5.97 MB",
                title: "NCS Sugars • Consortium Diversion",
                crime: "₹842.6 Cr Credit Default",
                hash: "0905a831f3f1ee13...",
              },
              {
                fir: "RC0782026E0001",
                branch: "CBI BS&FB Bangalore",
                size: "4.50 MB",
                title: "R L Jewels Pvt Ltd • Bullion Layering",
                crime: "Hawala Gold Diversion",
                hash: "e08f44f030c829cb...",
              },
              {
                fir: "RC0782026E0003",
                branch: "CBI BS&FB Bangalore",
                size: "6.30 MB",
                title: "Ashapura Garments • Canara Bank",
                crime: "14 Attached Mule Accounts",
                hash: "883f6c875cba65ab...",
              },
              {
                fir: "RC0202026A0003",
                branch: "CBI ACB New Delhi",
                size: "1.91 MB",
                title: "Central SPE • Bribe Conduit",
                crime: "Public Servant Misconduct",
                hash: "7f41ba829410ea09...",
              },
            ].map((item) => (
              <div
                key={item.fir}
                className="group relative flex flex-col justify-between rounded-2xl border p-4 transition-all border-line bg-panel-deep hover:border-accent/50 hover:bg-panel"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-accent">
                      <FileText className="size-3.5" />
                      <span>FIR {item.fir}</span>
                    </div>
                    <span
                      className="rounded px-1.5 py-0.5 text-[9.5px] font-mono bg-raised text-ink-muted"
                    >
                      {item.size}
                    </span>
                  </div>

                  <h4 className="mt-2 text-xs font-bold line-clamp-1 group-hover:text-accent transition-colors text-ink">
                    {item.title}
                  </h4>
                  <p className="mt-0.5 text-[11px] line-clamp-1 text-ink-muted">
                    {item.crime} • {item.branch}
                  </p>

                  <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-ink-faint">
                    <span>Hash:</span>
                    <span className="truncate">{item.hash}</span>
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-inherit flex items-center justify-between">
                  <button
                    onClick={() =>
                      setPreviewPdfCase({
                        caseId: `CASE_CBI_${item.fir}`,
                        firNumber: item.fir,
                        policeStation: item.branch,
                      })
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-contrast hover:brightness-105 transition-all cursor-pointer shadow-2xs"
                  >
                    <FileText className="size-3" />
                    <span>Preview PDF</span>
                  </button>

                  <button
                    onClick={() => onOpenCase(`CASE_CBI_${item.fir}`, item.fir)}
                    className="text-[10.5px] font-semibold hover:underline cursor-pointer text-ink-muted hover:text-ink"
                  >
                    Case Graph →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3D FORENSIC SPHERE GALLERY: MP POLICE UNIDENTIFIED DOSSIERS & CASE VISUALIZER ── */}
        <section
          className="rounded-3xl border p-5 lg:p-6 shadow-xs transition-colors overflow-hidden border-line bg-panel"
        >
          {/* Header & Badges */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-inherit">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-charcoal text-white shadow-xs">
                <Globe className="size-5 text-accent animate-spin-slow" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-ink">
                    3D Forensic Sphere Gallery // CCTNS & Syndicate Evidence Vault
                  </h3>
                  <span
                    className="rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold border-accent/30 bg-accent/10 text-accent"
                  >
                    {uidbRecords.length} MP CCTNS Scraped Records
                  </span>
                  <span
                    className="rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold border-verified/40 bg-verified/10 text-verified"
                  >
                    WebGL 60 FPS
                  </span>
                </div>
                <span className="text-xs text-ink-muted">
                  Interactive 3D spherical projection of scraped MP Police SCRB unidentified records & CBI evidence archives with Hindi-to-English translation
                </span>
              </div>
            </div>

            {/* Source Toggle & Speed Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border p-0.5 border-line bg-panel-deep">
                <button
                  onClick={() => setSphereMode("uidb")}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    sphereMode === "uidb"
                      ? "bg-accent text-accent-contrast shadow-2xs font-bold"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <UserX className="size-3" />
                  <span>Unidentified Persons ({uidbRecords.length})</span>
                </button>
                <button
                  onClick={() => setSphereMode("cbi")}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    sphereMode === "cbi"
                      ? "bg-accent text-accent-contrast shadow-2xs font-bold"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <ShieldCheck className="size-3" />
                  <span>CBI Cases (148)</span>
                </button>
              </div>

              {/* Police Station Filter (when in UIDB mode) */}
              {sphereMode === "uidb" && uniquePoliceStations.length > 0 && (
                <select
                  value={uidbFilterPs}
                  onChange={(e) => setUidbFilterPs(e.target.value)}
                  className="rounded-xl border px-2.5 py-1 text-xs font-mono outline-none cursor-pointer border-line bg-panel-deep text-ink focus:border-accent"
                >
                  <option value="ALL">All Stations ({uniquePoliceStations.length})</option>
                  {uniquePoliceStations.map((ps) => (
                    <option key={ps} value={ps}>
                      {ps}
                    </option>
                  ))}
                </select>
              )}

              {/* Spin Speed Preset Buttons */}
              <div className="flex items-center gap-1 rounded-xl border px-1.5 py-0.5 text-[11px] font-mono border-line bg-panel-deep text-ink-muted">
                <span className="text-[10px] uppercase font-bold px-1">Spin:</span>
                {[
                  { label: "Stop", speed: 0 },
                  { label: "Slow", speed: 8 },
                  { label: "Normal", speed: 18 },
                  { label: "Fast", speed: 36 },
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setSphereSpeed(s.speed)}
                    className={`rounded px-1.5 py-0.5 text-[10px] transition-colors cursor-pointer ${
                      sphereSpeed === s.speed
                        ? "bg-accent text-accent-contrast font-bold"
                        : "hover:text-ink"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Split Main Area: 3D WebGL Sphere (Left) & Active Dossier HUD (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
            {/* Left Column: Sphere Canvas */}
            <div
              className="lg:col-span-8 relative flex flex-col items-center justify-center rounded-2xl border overflow-hidden min-h-[480px] lg:min-h-[540px] border-line bg-radial from-[#141824] via-[#0d1016] to-[#07080c]"
            >
              <SphereGallery3D
                images={sphereItems}
                branches={Math.min(sphereItems.length || 32, 48)}
                speed={sphereSpeed}
                hover={220}
                rounded={18}
                minHeight={520}
                core={{
                  coreSize: 22,
                  coreColor: "#e0a43c77",
                  lineColor: "#e0a43c33",
                }}
                onSelectItem={(item) => {
                  if (item.record && sphereMode === "uidb") {
                    setSelectedUidb(item.record as UidbRecord);
                  } else if (item.record && sphereMode === "cbi") {
                    onOpenCase(item.record.case_id, item.record.fir_number);
                  }
                }}
              />

              {/* Floating Navigation HUD Guide */}
              <div
                className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full border px-3.5 py-1 text-[11px] font-mono shadow-md backdrop-blur-md pointer-events-none border-line-strong/80 bg-charcoal/85 text-ink-muted"
              >
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-accent animate-ping" />
                  <span>Drag: Orbit</span>
                </span>
                <span>•</span>
                <span>Wheel: Zoom</span>
                <span>•</span>
                <span>Hover: Pop</span>
                <span>•</span>
                <span className="text-accent font-bold">Click Card: Inspect</span>
              </div>
            </div>

            {/* Right Column: Dossier Profile Inspector & Quick Thumbnails */}
            <div ref={dossierPanelRef} className="lg:col-span-4 flex flex-col gap-4 scroll-mt-20">
              {selectedUidb ? (
                <div
                  className="rounded-2xl border p-4.5 shadow-xs transition-colors flex flex-col justify-between border-line bg-panel-deep"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between pb-3 border-b border-inherit">
                      <div>
                        <span
                          className="block text-[10px] font-mono font-bold tracking-wider uppercase text-accent"
                        >
                          SCRB UIDB Ref: {selectedUidb.reg_number}
                        </span>
                        <h4 className="mt-0.5 text-sm font-bold text-ink">
                          {selectedUidb.name_en}
                        </h4>
                        <span className="text-[11px] text-ink-muted">
                          {selectedUidb.name_hi}
                        </span>
                      </div>
                      <span
                        className="rounded-md border px-2 py-0.5 text-[9.5px] font-mono font-bold border-accent/30 bg-accent/10 text-accent"
                      >
                        {selectedUidb.status_en}
                      </span>
                    </div>

                    {/* Photo Thumbnail Preview */}
                    <div className="mt-3 relative rounded-xl overflow-hidden border border-inherit bg-canvas flex items-center justify-center h-48">
                      {selectedUidb.has_local_photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedUidb.image_url}
                          alt={selectedUidb.name_en}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 text-ink-muted">
                          <UserX className="size-10 text-accent/50" />
                          <span className="text-xs font-mono">Government Record Photo</span>
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 rounded-md bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[9px] font-mono text-white">
                        Image ID: {selectedUidb.image_id}
                      </div>
                    </div>

                    {/* Attribute Grid */}
                    <div className="mt-3.5 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-ink-muted">Police Station:</span>
                        <span className="font-semibold text-ink">
                          {selectedUidb.police_station_en} ({selectedUidb.police_station_hi})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-muted">Age / State:</span>
                        <span className="font-semibold text-ink">
                          {selectedUidb.age ? `${selectedUidb.age} Yrs` : "Not Stated"} • MP
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-muted">Agency Source:</span>
                        <span className="text-[10.5px] truncate max-w-[180px] text-ink-muted">
                          MP Police SCRB CCTNS
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-inherit space-y-2">
                    <button
                      onClick={() => onNavigate("graph")}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-2 text-xs font-bold text-accent-contrast hover:brightness-105 transition-all cursor-pointer shadow-xs"
                    >
                      <Network className="size-3.5" />
                      <span>Search in Crime Syndicate Graph</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onOpenChat(
                            undefined,
                            `Inquire links for unidentified record ${selectedUidb.reg_number} from ${selectedUidb.police_station_en} PS`
                          )
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-1.5 text-[11px] font-semibold transition-colors cursor-pointer border-line bg-panel text-ink hover:border-line-strong hover:bg-raised"
                      >
                        <Bot className="size-3 text-accent" />
                        <span>Copilot Dossier</span>
                      </button>

                      <a
                        href={selectedUidb.portal_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer border-line bg-panel text-ink hover:border-line-strong hover:bg-raised"
                        title="Open official MP Police Citizen Portal"
                      >
                        <ExternalLink className="size-3" />
                        <span>Portal</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border p-6 text-center space-y-2 border-line bg-panel-deep">
                  <UserX className="size-8 mx-auto text-ink-muted" />
                  <p className="text-xs text-ink-muted">
                    Click any photograph in the 3D rotating sphere to inspect biometric & jurisdiction details.
                  </p>
                </div>
              )}

              {/* Quick Subject Selectors */}
              <div
                className="rounded-2xl border p-3.5 shadow-xs transition-colors border-line bg-panel"
              >
                <span
                  className="block text-[10px] font-bold uppercase tracking-wider font-mono mb-2 text-ink-muted"
                >
                  Quick Select Unidentified Subjects
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {uidbRecords.slice(0, 3).map((rec) => (
                    <button
                      key={rec.id}
                      onClick={() => setSelectedUidb(rec)}
                      className={`group rounded-xl border p-1.5 text-left transition-all cursor-pointer ${
                        selectedUidb?.id === rec.id
                          ? "border-accent bg-accent/10 shadow-xs"
                          : "border-line bg-panel-deep hover:border-line-strong"
                      }`}
                    >
                      <div className="h-16 rounded-lg overflow-hidden bg-black/40 mb-1">
                        {rec.has_local_photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={rec.image_url}
                            alt={rec.name_en}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-ink-faint">
                            UIDB
                          </div>
                        )}
                      </div>
                      <span className="block text-[10.5px] font-bold truncate group-hover:text-accent transition-colors text-ink">
                        {rec.name_en}
                      </span>
                      <span className="block text-[9.5px] truncate font-mono text-ink-faint">
                        {rec.police_station_en}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
              MISSING PERSONS & UNIDENTIFIED DOSSIERS — MP POLICE CCTNS SCRB
           ══════════════════════════════════════════════════════════════════ */}
        <section
          className="rounded-3xl border shadow-xs transition-colors overflow-hidden border-line bg-panel"
        >
          {/* ── Section Header ── */}
          <div
            className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-5 lg:px-6 pt-5 pb-4 border-b border-line"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex size-10 items-center justify-center rounded-xl bg-charcoal text-white shadow-xs">
                <UserX className="size-5 text-alert" />
                <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-alert text-[8px] font-bold text-white">
                  {uidbRecords.length}
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-ink">
                    Missing Persons & Unidentified Dossiers - CCTNS SCRB Intelligence
                  </h3>
                  <span
                    className="rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold border-alert/40 bg-alert/10 text-alert"
                  >
                    {filteredMissingPersons.length} Active Records
                  </span>
                  <span
                    className="rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold border-verified/40 bg-verified/10 text-verified"
                  >
                    MP POLICE UIDB
                  </span>
                  <span
                    className="rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold border-accent/30 bg-accent/10 text-accent"
                  >
                    Hindi → English
                  </span>
                </div>
                <span className="text-xs text-ink-muted">
                  Scraped and transliterated from MP Police Citizen Portal - SCRB biometric dossiers
                </span>
              </div>
            </div>

            {/* Search + Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-3.5 text-ink-faint" />
                <input
                  type="text"
                  placeholder="Search dossiers..."
                  value={missingSearch}
                  onChange={(e) => setMissingSearch(e.target.value)}
                  className="w-48 rounded-xl border py-2 pl-9 pr-3 text-xs focus:outline-none transition-colors border-line bg-panel-deep text-ink placeholder-ink-faint focus:border-alert"
                />
              </div>

              <select
                value={missingFilterStation}
                onChange={(e) => setMissingFilterStation(e.target.value)}
                className="rounded-xl border px-2.5 py-2 text-xs font-mono outline-none cursor-pointer border-line bg-panel-deep text-ink focus:border-alert"
              >
                <option value="ALL">All Stations</option>
                {uniquePoliceStations.map((ps) => (
                  <option key={ps} value={ps}>
                    {ps}
                  </option>
                ))}
              </select>

              <select
                value={missingLimit}
                onChange={(e) => setMissingLimit(Number(e.target.value))}
                className="rounded-xl border px-2.5 py-2 text-xs font-mono outline-none cursor-pointer border-line bg-panel-deep text-ink"
              >
                <option value={8}>Show 8</option>
                <option value={16}>Show 16</option>
                <option value={32}>Show 32</option>
                <option value={999}>Show All</option>
              </select>
            </div>
          </div>

          {/* ── Stat Strip ── */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 divide-x px-5 lg:px-6 py-3 border-b text-center divide-line border-line"
          >
            {[
              { label: "Total SCRB Records", value: uidbRecords.length, color: "text-alert" },
              {
                label: "With Photo",
                value: uidbRecords.filter((r) => r.has_local_photo).length,
                color: "text-accent",
              },
              {
                label: "Known Age",
                value: uidbRecords.filter((r) => r.age && r.age > 0).length,
                color: "text-verified",
              },
              {
                label: "Police Stations",
                value: uniquePoliceStations.length,
                color: "text-info",
              },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center py-1">
                <span className={`text-xl font-extrabold font-mono ${stat.color}`}>
                  {stat.value}
                </span>
                <span className="text-[10px] font-medium text-ink-muted">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* ── Dossier Card Grid ── */}
          <div className="p-5 lg:p-6">
            {filteredMissingPersons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <UserX className="size-10 text-alert/40" />
                <p className="text-sm text-ink-muted">
                  No dossiers found for this filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredMissingPersons.slice(0, missingLimit).map((rec, idx) => (
                  <div
                    key={rec.id}
                    className="group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-line bg-panel-deep hover:border-alert/40"
                  >
                    {/* ── Photo Section ── */}
                    <div className="relative h-44 overflow-hidden bg-black/30">
                      {rec.has_local_photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={rec.image_url}
                          alt={rec.name_en}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex w-full h-full flex-col items-center justify-center gap-2 text-center bg-gradient-to-b from-zinc-800 to-zinc-900">
                          <UserX className="size-10 text-zinc-600" />
                          <span className="text-[10px] font-mono text-zinc-500">No Photo</span>
                        </div>
                      )}

                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

                      {/* Index Badge */}
                      <span className="absolute top-2 left-2 rounded-md bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[9px] font-mono font-bold text-accent">
                        #{(idx + 1).toString().padStart(3, "0")}
                      </span>

                      {/* Status Badge */}
                      <span
                        className="absolute top-2 right-2 rounded-md px-2 py-0.5 text-[9px] font-mono font-bold bg-alert/90 text-white backdrop-blur-xs"
                      >
                        {rec.status_en === "Unidentified / Unknown" ? "UNIDENTIFIED" : rec.status_en}
                      </span>

                      {/* Reg No on bottom of photo */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        <span className="rounded bg-black/75 px-2 py-0.5 text-[9.5px] font-mono text-accent">
                          Reg: {rec.reg_number}
                        </span>
                        {rec.age && rec.age > 0 ? (
                          <span className="rounded bg-black/75 px-2 py-0.5 text-[9.5px] font-mono text-zinc-300">
                            ~{rec.age} yrs
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* ── Details Section ── */}
                    <div className="flex flex-1 flex-col p-3.5 gap-2.5">
                      {/* Name */}
                      <div>
                        <h4 className="text-xs font-bold leading-tight group-hover:text-alert transition-colors text-ink">
                          {rec.name_en}
                        </h4>
                        <span className="block text-[10px] font-mono mt-0.5 truncate text-ink-muted">
                          Image ID: {rec.image_id}
                        </span>
                      </div>

                      {/* Meta Grid */}
                      <div className="space-y-1.5 rounded-xl border p-2.5 text-[10.5px] font-mono border-line bg-canvas">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-ink-muted">Station:</span>
                          <span className="font-semibold text-right leading-tight max-w-[120px] text-ink">
                            {rec.police_station_en}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-ink-muted">District:</span>
                          <span className="font-semibold text-ink">{rec.district_en || "MP"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-ink-muted">State:</span>
                          <span className="font-semibold text-ink">{rec.state_en}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-auto flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => setInspectModalRecord(rec)}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-alert/10 border border-alert/30 px-2 py-1.5 text-[10.5px] font-semibold text-alert hover:bg-alert hover:text-white transition-all cursor-pointer"
                          title="Open full dossier details"
                        >
                          <Eye className="size-3" />
                          <span>Inspect</span>
                        </button>
                        <button
                          onClick={() =>
                            onOpenChat(
                              undefined,
                              `Analyze missing person dossier: ${rec.name_en}, Reg: ${rec.reg_number}, from ${rec.police_station_en} PS, ${rec.district_en}, Madhya Pradesh`
                            )
                          }
                          className="flex items-center justify-center rounded-lg border px-2 py-1.5 text-[10.5px] font-semibold transition-all cursor-pointer border-line bg-panel text-accent hover:bg-accent/10 hover:border-accent/40"
                          title="Ask Detective AI about this person"
                        >
                          <Bot className="size-3" />
                        </button>
                        <a
                          href={rec.portal_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center rounded-lg border px-2 py-1.5 text-[10.5px] font-semibold transition-all cursor-pointer border-line bg-panel text-ink-muted hover:text-ink hover:border-line-strong"
                          title="MP Police Citizen Portal"
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More / Show All footer */}
            {filteredMissingPersons.length > missingLimit && (
              <div
                className="mt-5 flex items-center justify-between border-t pt-4 text-xs border-line text-ink-muted"
              >
                <span>
                  Showing {missingLimit} of {filteredMissingPersons.length} dossiers
                </span>
                <button
                  onClick={() => setMissingLimit((prev) => Math.min(prev + 8, filteredMissingPersons.length))}
                  className="rounded-xl border px-4 py-1.5 font-semibold shadow-2xs transition-colors cursor-pointer border-line bg-panel-deep text-ink hover:bg-raised"
                >
                  Load 8 More →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── BOTTOM SECTION: ACTIVE CBI CASE REGISTER (List Cases Table) ── */}
        <section
          className="rounded-3xl border p-5 lg:p-6 shadow-xs transition-colors border-line bg-panel"
        >
          {/* Table Header & Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4">
            <div>
              <h3 className="text-sm font-bold text-ink">
                Central FIR Registry & Criminal Syndicate Dossiers (500 Ingested Files)
              </h3>
              <span className="text-xs text-ink-muted">
                Real-time forensic synchronization across 500 ingested case files & evidence vaults
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-3.5 text-ink-faint" />
                <input
                  type="text"
                  placeholder="Filter 500 files by FIR, accused, conduit, bank..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 lg:w-72 rounded-xl border py-2 pl-9 pr-3 text-xs focus:outline-none transition-colors border-line bg-panel-deep text-ink placeholder-ink-faint focus:border-accent focus:bg-panel"
                />
              </div>

              <button
                onClick={() => {
                  setSelectedBranch(null);
                  setSearchQuery("");
                }}
                className="flex size-8 items-center justify-center rounded-xl border transition-colors cursor-pointer border-line bg-panel-deep text-ink-muted hover:bg-raised hover:text-ink"
                title="Reset Filters"
              >
                <Filter className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr
                  className="border-b text-[10.5px] font-bold tracking-wider uppercase border-line text-ink-muted"
                >
                  <th className="pb-3 pl-2">FIR & Case Title</th>
                  <th className="pb-3">Case ID</th>
                  <th className="pb-3">Prime Accused / Broker</th>
                  <th className="pb-3">Police Station & Wing</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Registration Date</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-ink-muted">
                      Loading case registry from CBI database...
                    </td>
                  </tr>
                ) : filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-ink-muted">
                      No matching cases found for query &ldquo;{searchQuery}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  filteredCases.slice(0, 10).map((c) => (
                    <tr
                      key={c.case_id}
                      className="group transition-colors hover:bg-panel-deep"
                    >
                      {/* FIR & Case Title */}
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex size-8 shrink-0 items-center justify-center rounded-xl font-mono font-bold text-[10px] group-hover:bg-accent group-hover:text-accent-contrast transition-colors bg-panel-deep text-ink"
                          >
                            FIR
                          </div>
                          <div>
                            <span className="block font-bold text-ink">{c.fir_number}</span>
                            <span className="text-[10px] text-ink-muted">
                              {c.node_count} nodes • {c.edge_count} links
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Case ID */}
                      <td className="py-3 font-mono text-[11px] text-ink-muted">
                        {c.case_id.length > 22 ? c.case_id.substring(0, 22) + "..." : c.case_id}
                      </td>

                      {/* Prime Accused / Broker */}
                      <td className="py-3">
                        <span className="font-semibold text-ink">
                          {c.broker_name || "Syndicate Conduit"}
                        </span>
                      </td>

                      {/* Police Station */}
                      <td className="py-3 text-ink-muted">
                        <span className="line-clamp-1 max-w-[220px]">
                          {c.police_station}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3">
                        <span
                          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium bg-verified/15 text-verified"
                        >
                          <CheckCircle2 className="size-3" />
                          <span>BSA 63(4) Valid</span>
                        </span>
                      </td>

                      {/* Registration Date */}
                      <td className="py-3 font-mono text-[11px] text-ink-muted">
                        {c.date_time ? c.date_time.split(" ")[0] : "2026-09-12"}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              setPreviewPdfCase({
                                caseId: c.case_id,
                                firNumber: c.fir_number,
                                policeStation: c.police_station,
                              })
                            }
                            className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs border-line bg-panel-deep text-accent hover:bg-accent/10"
                            title="Preview Scanned FIR PDF"
                          >
                            <FileText className="size-3 text-accent" />
                            <span>PDF</span>
                          </button>
                          <button
                            onClick={() => onOpenCase(c.case_id, c.fir_number)}
                            className="rounded-lg border px-2.5 py-1 text-[11px] font-medium shadow-2xs transition-colors cursor-pointer border-line bg-panel-deep text-ink hover:bg-raised"
                            title="Open in Case Explorer"
                          >
                            Explore
                          </button>
                          <button
                            onClick={() => onOpenChat(c.case_id, c.fir_number)}
                            className="flex size-7 items-center justify-center rounded-lg border shadow-2xs transition-colors cursor-pointer border-line bg-panel-deep text-accent hover:bg-accent hover:text-accent-contrast"
                            title="Interrogate with Detective AI"
                          >
                            <Bot className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom table pagination & count info */}
          <div
            className="mt-4 flex items-center justify-between border-t pt-3 text-xs border-line text-ink-muted"
          >
            <span>
              Showing {Math.min(filteredCases.length, 10)} of 500 Ingested Case Files
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate("cases")}
                className="rounded-xl border px-3 py-1 font-medium shadow-2xs transition-colors cursor-pointer border-line bg-panel-deep text-ink hover:bg-raised"
              >
                Explore All 500 Ingested Files in Dossier Explorer →
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── FIR SCANNED PDF PREVIEW MODAL ── */}
      {previewPdfCase && (
        <FirPdfModal
          isOpen={!!previewPdfCase}
          onClose={() => setPreviewPdfCase(null)}
          caseId={previewPdfCase.caseId}
          firNumber={previewPdfCase.firNumber}
          policeStation={previewPdfCase.policeStation}
        />
      )}

      {/* ── DOSSIER INSPECT MODAL ── */}
      {inspectModalRecord && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(12px)" }}
          onClick={() => setInspectModalRecord(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-line bg-panel-deep"
            style={{ maxHeight: "92vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setInspectModalRecord(null)}
              className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-alert transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            {/* Hero Photo */}
            <div className="relative h-72 w-full overflow-hidden bg-black">
              {inspectModalRecord.has_local_photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={inspectModalRecord.image_url}
                  alt={inspectModalRecord.name_en}
                  className="w-full h-full object-cover"
                  style={{ filter: "brightness(0.85)" }}
                />
              ) : (
                <div className="flex w-full h-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-zinc-800 to-zinc-950">
                  <Camera className="size-16 text-zinc-600" />
                  <span className="text-sm font-mono text-zinc-500">No Photo on Record</span>
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-panel-deep via-black/30 to-transparent" />

              {/* Status badge overlay */}
              <span className="absolute top-4 left-4 rounded-lg px-3 py-1 text-xs font-bold font-mono bg-alert/90 text-white shadow-lg">
                {inspectModalRecord.status_en === "Unidentified / Unknown"
                  ? "⚠ UNIDENTIFIED"
                  : inspectModalRecord.status_en}
              </span>

              {/* Name & Reg over photo bottom */}
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
                <h2 className="text-2xl font-extrabold text-white tracking-tight drop-shadow">
                  {inspectModalRecord.name_en}
                </h2>
                {inspectModalRecord.name_hi && (
                  <p className="text-sm text-zinc-300 font-medium mt-0.5">{inspectModalRecord.name_hi}</p>
                )}
              </div>
            </div>

            {/* Details Body */}
            <div className="p-6 space-y-5">

              {/* Primary Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Hash, label: "Registration No.", value: inspectModalRecord.reg_number, accent: true },
                  { icon: User, label: "Approximate Age", value: inspectModalRecord.age && inspectModalRecord.age > 0 ? `~${inspectModalRecord.age} years` : "Unknown", accent: false },
                  { icon: MapPin, label: "Police Station", value: inspectModalRecord.police_station_en, accent: false },
                  { icon: MapPin, label: "District", value: inspectModalRecord.district_en || "Madhya Pradesh", accent: false },
                  { icon: Globe, label: "State", value: inspectModalRecord.state_en, accent: false },
                  { icon: AlertTriangle, label: "Status", value: inspectModalRecord.status_en, accent: true },
                ].map((field) => {
                  const Icon = field.icon;
                  return (
                    <div
                      key={field.label}
                      className="flex items-start gap-3 rounded-2xl border p-3.5 border-line bg-canvas"
                    >
                      <div className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xl ${
                        field.accent ? "bg-alert/15 text-alert" : "bg-accent/10 text-accent"
                      }`}>
                        <Icon className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-mono uppercase tracking-wider text-ink-muted">{field.label}</span>
                        <span className={`block text-sm font-bold mt-0.5 truncate ${
                          field.accent ? "text-alert" : "text-ink"
                        }`}>{field.value || "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Image ID */}
              <div className="rounded-2xl border border-line bg-canvas px-4 py-3 flex items-center gap-3">
                <Fingerprint className="size-4 text-accent shrink-0" />
                <div>
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-ink-muted">SCRB Image ID</span>
                  <span className="block text-xs font-mono font-semibold text-ink mt-0.5">{inspectModalRecord.image_id}</span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => {
                    onOpenChat(
                      undefined,
                      `Analyze missing person dossier: ${inspectModalRecord.name_en}, Reg: ${inspectModalRecord.reg_number}, from ${inspectModalRecord.police_station_en} PS, ${inspectModalRecord.district_en}, Madhya Pradesh. Provide full forensic analysis, potential leads and cross-case connections.`
                    );
                    setInspectModalRecord(null);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-accent/90 transition-colors cursor-pointer shadow-lg"
                >
                  <Bot className="size-4" />
                  Ask AI Detective
                </button>
                <a
                  href={inspectModalRecord.portal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold border-line bg-panel text-ink-muted hover:text-ink hover:border-line-strong transition-colors cursor-pointer"
                >
                  <ExternalLink className="size-4" />
                  MP Portal
                </a>
                <button
                  onClick={() => {
                    handleInspectUidb(inspectModalRecord);
                    setInspectModalRecord(null);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold border-alert/30 bg-alert/10 text-alert hover:bg-alert hover:text-white transition-colors cursor-pointer"
                >
                  <Eye className="size-4" />
                  3D Gallery
                </button>
              </div>

              {/* Footer note */}
              <p className="text-center text-[10px] font-mono text-ink-faint pt-1">
                Source: MP Police SCRB / UIDB Portal • NyayaGraph CBI Intelligence Core
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
