import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "NyayaGraph // CBI Forensic Intelligence & Master Crime Syndicate Graph",
  description: "Next-generation CBI legal knowledge graph, FIR investigation platform, and AI detective copilot.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full w-full">
      <body className="h-full w-full antialiased font-sans overflow-hidden select-none">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
