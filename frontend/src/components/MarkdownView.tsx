"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "@/context/ThemeContext";

interface MarkdownViewProps {
  content: string;
  className?: string;
  /** Force a color tone (e.g. "dark" for light text on dark bubbles). Defaults to app theme. */
  tone?: "auto" | "light" | "dark";
}

/**
 * Premium, High-legibility Markdown renderer for NyayaGraph AI Detective Copilot & Case Analysis.
 * Powered by react-markdown + remark-gfm.
 * IMPORTANT: forced tones ("dark"/"light") use FIXED palettes so text stays legible on the
 * host surface (e.g. user chat bubbles) regardless of the app theme. Only "auto" follows
 * the app theme.
 */
export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  className = "",
  tone = "auto",
}) => {
  const { theme } = useTheme();
  const isDark = tone === "dark" ? true : tone === "light" ? false : theme === "dark";

  if (!content || typeof content !== "string") return null;

  return (
    <div
      className={`markdown-content leading-relaxed text-xs font-sans ${
        isDark ? "text-zinc-200" : "text-zinc-800"
      } ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2
              className={`mt-4 mb-2 text-sm font-extrabold tracking-wide uppercase border-b pb-1.5 flex items-center gap-2 ${
                isDark ? "text-amber-400 border-zinc-700" : "text-amber-700 border-zinc-300"
              }`}
            >
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3
              className={`mt-3.5 mb-2 text-xs font-bold tracking-wide uppercase flex items-center gap-1.5 ${
                isDark ? "text-amber-400" : "text-amber-700"
              }`}
            >
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4
              className={`mt-3 mb-1.5 text-xs font-bold uppercase tracking-wider ${
                isDark ? "text-white" : "text-zinc-900"
              }`}
            >
              {children}
            </h4>
          ),
          h4: ({ children }) => (
            <h5
              className={`mt-2.5 mb-1 text-[11.5px] font-semibold ${
                isDark ? "text-zinc-200" : "text-zinc-700"
              }`}
            >
              {children}
            </h5>
          ),
          p: ({ children }) => (
            <p className="my-1.5 leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => (
            <strong
              className={`font-bold ${
                isDark ? "text-white" : "text-zinc-900"
              }`}
            >
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className={`italic ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
              {children}
            </em>
          ),
          ul: ({ children }) => (
            <ul className="my-2 space-y-1 pl-4 list-disc marker:text-amber-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-amber-500 marker:font-mono marker:font-bold">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className={`my-2.5 rounded-r-xl border-l-2 py-1.5 pl-3 pr-2 text-xs italic ${
                isDark
                  ? "border-amber-400 bg-white/5 text-zinc-300"
                  : "border-amber-600 bg-amber-50/60 text-zinc-700"
              }`}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-zinc-400/30">
              <table
                className={`w-full border-collapse text-left text-[11px] font-mono ${
                  isDark ? "bg-zinc-900/60" : "bg-white"
                }`}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead
              className={`border-b ${
                isDark ? "border-zinc-700 bg-zinc-800/60 text-amber-400" : "border-zinc-300 bg-zinc-100 text-amber-800"
              }`}
            >
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-bold uppercase tracking-wider">{children}</th>
          ),
          td: ({ children }) => (
            <td
              className={`border-b px-3 py-1.5 ${
                isDark ? "border-zinc-700/60 text-zinc-300" : "border-zinc-200 text-zinc-800"
              }`}
            >
              {children}
            </td>
          ),
          hr: () => (
            <hr
              className={`my-3 border-t ${
                isDark ? "border-zinc-700" : "border-zinc-300"
              }`}
            />
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-amber-500 hover:underline hover:text-amber-400"
            >
              {children}
            </a>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isMultiLine = String(children).includes("\n");
            if (isMultiLine) {
              return (
                <pre
                  className={`my-2.5 overflow-x-auto rounded-xl border p-3 font-mono text-[11px] leading-relaxed ${
                    isDark
                      ? "border-zinc-700 bg-zinc-900/70 text-zinc-100"
                      : "border-zinc-300 bg-zinc-100 text-zinc-900"
                  }`}
                >
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code
                className={`rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-medium ${
                  isDark
                    ? "border-zinc-700 bg-zinc-900/70 text-amber-400"
                    : "border-zinc-300 bg-zinc-100 text-amber-800"
                }`}
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
