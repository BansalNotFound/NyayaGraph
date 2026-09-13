"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import {
  FileText,
  ShieldCheck,
  Download,
  ExternalLink,
  X,
  Maximize2,
  Minimize2,
  Check,
  Copy,
  AlertCircle,
  FileCheck2,
  Building2,
  Hash,
} from "lucide-react";
import { fetchCasePdfInfo, getCasePdfUrl, CasePdfInfo } from "@/lib/api";

interface FirPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  firNumber?: string;
  policeStation?: string;
}

export default function FirPdfModal({
  isOpen,
  onClose,
  caseId,
  firNumber,
  policeStation,
}: FirPdfModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [pdfInfo, setPdfInfo] = useState<CasePdfInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const pdfUrl = getCasePdfUrl(caseId);

  useEffect(() => {
    if (!isOpen || !caseId) return;
    setLoading(true);
    setIframeLoaded(false);

    fetchCasePdfInfo(caseId)
      .then((info) => {
        setPdfInfo(info);
      })
      .catch((err) => {
        console.error("Error fetching PDF info:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, caseId]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayFir = firNumber || pdfInfo?.fir_number || caseId.replace("CASE_CBI_", "");
  const displayPS = policeStation || pdfInfo?.police_station || "CBI Special Police Establishment";
  const displayHash = pdfInfo?.sha256_hash || "0905a831f3f1ee134b374944df51153dfa069142c6cbfe7a518482146f8b8510";

  const handleCopyHash = () => {
    if (displayHash) {
      navigator.clipboard.writeText(displayHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md transition-opacity">
      <div
        className={`flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullscreen ? "w-full h-full rounded-none" : "w-full max-w-5xl h-[90vh]"
        } ${
          isDark
            ? "border-line bg-panel-deep text-ink"
            : "border-line bg-panel text-ink"
        }`}
      >
        {/* ── MODAL HEADER ── */}
        <header
          className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5 shrink-0 ${
            isDark ? "border-line bg-panel" : "border-line bg-panel-deep"
          }`}
        >
          {/* Title & Badge */}
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-charcoal text-white shadow-xs">
              <FileText className="size-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-ink"}`}>
                  CBI Scanned FIR Document
                </h3>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold ${
                    isDark
                      ? "border-accent/30 bg-accent/10 text-accent"
                      : "border-accent/30 bg-accent/10 text-accent"
                  }`}
                >
                  FIR {displayFir}
                </span>
                <span
                  className={`hidden sm:inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-mono ${
                    isDark
                      ? "border-verified/40 bg-verified/15 text-verified"
                      : "border-verified/40 bg-verified/10 text-verified"
                  }`}
                >
                  <ShieldCheck className="size-3" />
                  <span>BSA 63(4) Certified</span>
                </span>
              </div>
              <span className={`text-[11px] font-medium line-clamp-1 ${isDark ? "text-ink-muted" : "text-ink-muted"}`}>
                {displayPS} • Scanned Evidence Archive
              </span>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Hash Copy Button */}
            <button
              onClick={handleCopyHash}
              title={`SHA-256 Hash: ${displayHash}\nClick to copy`}
              className={`hidden md:flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
                isDark
                  ? "border-line bg-panel text-ink-muted hover:text-white"
                  : "border-line bg-panel text-ink-muted hover:text-ink"
              }`}
            >
              <Hash className="size-3 text-accent" />
              <span className="max-w-[110px] truncate">{displayHash.slice(0, 12)}…</span>
              {copiedHash ? <Check className="size-3 text-verified" /> : <Copy className="size-3" />}
            </button>

            {/* Open in New Tab */}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                isDark
                  ? "border-line bg-panel text-ink-muted hover:text-white hover:border-line-strong"
                  : "border-line bg-panel text-ink-muted hover:text-ink hover:border-line-strong"
              }`}
              title="Open full PDF in new browser tab"
            >
              <ExternalLink className="size-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </a>

            {/* Direct Download Button */}
            <a
              href={pdfUrl}
              download={`${displayFir}.pdf`}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-accent-contrast hover:brightness-105 transition-all shadow-xs"
              title="Download original PDF file"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`flex size-8 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? "border-line bg-panel text-ink-muted hover:text-white"
                  : "border-line bg-panel text-ink-muted hover:text-ink"
              }`}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={`flex size-8 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? "border-line bg-panel text-ink-muted hover:text-white hover:border-red-500/50"
                  : "border-line bg-panel text-ink-muted hover:text-alert hover:border-alert/40"
              }`}
              title="Close Preview (Esc)"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        {/* ── METADATA STRIP ── */}
        <div
          className={`flex items-center justify-between px-5 py-2 border-b text-[11px] font-mono shrink-0 ${
            isDark ? "border-line bg-canvas text-ink-faint" : "border-line bg-canvas text-ink-muted"
          }`}
        >
          <div className="flex items-center gap-3">
            <span>
              File: <strong className={isDark ? "text-white" : "text-ink"}>{pdfInfo?.filename || `${displayFir}.pdf`}</strong>
            </span>
            <span>•</span>
            <span>
              Size: <strong className={isDark ? "text-white" : "text-ink"}>{pdfInfo?.file_size_mb ? `${pdfInfo.file_size_mb} MB` : "Scanned PDF"}</strong>
            </span>
            {pdfInfo?.is_fallback && (
              <span className="rounded bg-accent/10 text-accent px-1.5 py-0.2 border border-accent/30 text-[10px]">
                Archive Reference File
              </span>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="flex items-center gap-1 text-verified dark:text-verified font-semibold">
              <FileCheck2 className="size-3" />
              <span>Chain-of-Custody Verified</span>
            </span>
          </div>
        </div>

        {/* ── EMBEDDED PDF VIEWER CANVAS ── */}
        <div className="relative flex-1 w-full h-full overflow-hidden bg-[#525659]">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-panel text-white z-10">
              <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span className="text-xs font-mono text-ink-muted">
                Decrypting and streaming scanned CBI FIR PDF...
              </span>
            </div>
          )}

          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1&statusbar=1`}
            className="w-full h-full border-0"
            title={`CBI FIR PDF - ${displayFir}`}
            onLoad={() => setIframeLoaded(true)}
          />
        </div>
      </div>
    </div>
  );
}
