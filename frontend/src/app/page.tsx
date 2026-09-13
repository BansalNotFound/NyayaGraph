"use client";

import React, { useEffect, useState } from "react";
import OfficialDashboardView from "@/components/OfficialDashboardView";
import ObsidianGraphView from "@/components/ObsidianGraphView";
import CasesExplorerView from "@/components/CasesExplorerView";
import DetectiveChatView from "@/components/DetectiveChatView";
import { FlowchartView } from "@/components/FlowchartView";
import { fetchFlowchartChapters } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import type { FlowChapter } from "@/data/cyberlifeData";
import {
  LayoutDashboard,
  Network,
  FolderArchive,
  MessageSquareCode,
  GitFork,
  ShieldCheck,
  Cpu,
  Sun,
  Moon,
} from "lucide-react";

export type ActiveAppView = "dashboard" | "graph" | "cases" | "chat" | "flowchart";

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState<ActiveAppView>("dashboard");
  const [stats, setStats] = useState<{ cases: number; nodes: number; edges: number } | null>(null);
  const [chapters, setChapters] = useState<FlowChapter[] | null>(null);

  // Cross-view state parameters
  const [chatCaseId, setChatCaseId] = useState<string | null>(null);
  const [chatFirNumber, setChatFirNumber] = useState<string | null>(null);

  useEffect(() => {
    if (view !== "flowchart" || chapters) return;
    fetchFlowchartChapters().then((d) => {
      if (d?.chapters?.length) setChapters(d.chapters as FlowChapter[]);
    });
  }, [view, chapters]);

  const handleOpenChatWithCase = (caseId?: string, firLabel?: string) => {
    if (caseId) setChatCaseId(caseId);
    if (firLabel) setChatFirNumber(firLabel);
    setView("chat");
  };

  const handleOpenCaseInExplorer = (caseId?: string) => {
    setView("cases");
  };

  const handleJumpToGlobalGraph = (nodeId?: string) => {
    setView("graph");
  };

  const isDark = theme === "dark";

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden font-sans select-none antialiased transition-colors duration-150 bg-canvas text-ink"
    >
      {/* ── MASTER TOP NAVIGATION BAR (Noir Evidence Room) ── */}
      <header
        className="flex h-13 shrink-0 items-center justify-between border-b px-5 z-50 transition-colors duration-150 border-line bg-panel-deep text-ink"
      >
        {/* Left: Brand Identity & Live Metrics */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("dashboard")}
            className="flex items-center gap-2.5 cursor-pointer text-left"
          >
            <div className="flex size-8 items-center justify-center rounded-xl bg-charcoal text-white shadow-xs">
              <ShieldCheck className="size-4.5 text-accent" />
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-black tracking-wider uppercase text-ink"
              >
                NyayaGraph
              </span>
              <span
                className="rounded-md border px-2 py-0.5 text-[10.5px] font-semibold border-line bg-panel text-ink-muted"
              >
                CBI Core
              </span>
            </div>
          </button>

          <div className={`mx-2 h-4 w-px bg-line`} />

          {/* Quick Node & Edge Live Counter with 500 Ingested Files */}
          <div
            className={`hidden md:flex items-center gap-2 font-mono text-[11px] text-ink-muted`}
          >
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-verified" />
              <span className={`font-semibold text-ink`}>
                500 Ingested Files
              </span>
            </span>
            <span>•</span>
            <span className="font-semibold">
              {stats?.nodes ? `${stats.nodes.toLocaleString()} nodes` : "2,744 nodes"}
            </span>
            <span>•</span>
            <span className="font-semibold">
              {stats?.edges ? `${stats.edges.toLocaleString()} edges` : "5,252 edges"}
            </span>
          </div>
        </div>

        {/* Center: Master View Switcher Tabs */}
        <nav
          className="flex items-center rounded-xl border p-1 transition-colors border-line bg-panel"
        >
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "graph", label: "Syndicate Graph", icon: Network },
            { id: "cases", label: "Cases & FIRs", icon: FolderArchive },
            { id: "chat", label: "Detective AI", icon: MessageSquareCode, badge: "DeepSeek" },
            { id: "flowchart", label: "Procedural Flow", icon: GitFork },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as ActiveAppView)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-raised text-ink shadow-xs border border-line-strong"
                    : "text-ink-muted hover:text-ink hover:bg-raised/40 border border-transparent"
                }`}
              >
                <Icon
                  className={`size-3.5 ${active ? "text-accent" : ""}`}
                />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className="rounded px-1.5 py-0.2 text-[9px] font-mono font-bold bg-panel-deep text-ink-muted border border-line"
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Engine Indicator, Knowledge Base & Theme Toggle */}
        <div className="flex items-center gap-2.5">
          <div
            className="hidden lg:flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-mono border-line bg-panel text-ink-muted"
          >
            <Cpu className="size-3 text-accent" />
            <span>DeepSeek Flash</span>
          </div>

          <div
            className="flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-mono font-bold border-line bg-panel text-ink"
          >
            <span className="size-1.5 rounded-full bg-verified" />
            <span className="text-[10px]">KB ONLINE</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to Day Shift (Paper & Ink)" : "Switch to Night Shift (Noir)"}
            className="flex size-8 items-center justify-center rounded-xl border shadow-xs transition-all cursor-pointer hover:scale-105 border-line bg-panel text-accent hover:bg-raised"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </header>

      {/* ── ACTIVE VIEW CONTAINER ── */}
      <main className="flex-1 overflow-hidden relative">
        {view === "dashboard" && (
          <div className="h-full w-full">
            <OfficialDashboardView
              onNavigate={(v) => setView(v)}
              onOpenCase={(cid, fir) => {
                setView("cases");
              }}
              onOpenChat={(cid, fir) => handleOpenChatWithCase(cid, fir)}
            />
          </div>
        )}

        {view === "graph" && (
          <div className="h-full w-full">
            <ObsidianGraphView
              onStats={setStats}
              onOpenCaseExplorer={handleOpenCaseInExplorer}
              onOpenChat={handleOpenChatWithCase}
            />
          </div>
        )}

        {view === "cases" && (
          <div className="h-full w-full">
            <CasesExplorerView
              onOpenChatWithCase={(cid, fir) => handleOpenChatWithCase(cid, fir)}
              onJumpToGlobalGraph={handleJumpToGlobalGraph}
            />
          </div>
        )}

        {view === "chat" && (
          <div className="h-full w-full">
            <DetectiveChatView
              initialCaseId={chatCaseId}
              initialFirNumber={chatFirNumber}
              onJumpToCase={handleOpenCaseInExplorer}
              onJumpToGraph={handleJumpToGlobalGraph}
            />
          </div>
        )}

        {view === "flowchart" && (
          <div className="h-full w-full">
            {chapters ? (
              <FlowchartView
                chapters={chapters}
                onSelectNode={() => {}}
                onOpenLegend={() => {}}
                onJumpToChat={handleOpenChatWithCase}
                onJumpToCase={handleOpenCaseInExplorer}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-ink-muted font-mono text-xs">
                Loading procedural investigation flowchart...
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
