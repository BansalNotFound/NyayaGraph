# NyayaGraph — Executive Design Principles & UI Architecture
**Design System Standard for CBI Forensic Intelligence & Official Investigative Dashboards**

---

## 1. Design Philosophy: "Executive Clarity & Institutional Warmth"

Traditional law enforcement and cyber intelligence dashboards often succumb to "AI Slop" — dark neon-purple glassmorphism, garish glow effects, and chaotic visual noise. 

NyayaGraph's Executive Dashboard introduces **Institutional Warmth & High-Trust Legibility**:
- **Tactile & Human**: Soft warm ivory and sand surfaces evoke physical official documents, fine parchment, and high-end editorial clarity.
- **Authoritative Contrast**: Deep charcoal accents (`#1c1d22`) and rich saffron-amber meters (`#f5b838`) anchor the investigator's visual hierarchy without eye fatigue.
- **Zero AI Slop**: No fuzzy gradients, no artificial drop-shadow bleeds, no floating blur cards. Every line, border, and metric is precise, crisp, and statutory.
- **Information Density with Breathing Room**: High data throughput (147 FIRs, 2,744 entities, 5,252 links) structured into distinct, rounded Bento cards with generous internal padding.

---

## 2. Color Palette & Token System

### 2.1 Surfaces & Backgrounds
| Token Name | Hex Code | Purpose / Application |
| :--- | :--- | :--- |
| **Canvas Background** | `#f5f3ec` / `#f6f4ee` | Global application frame background. Warm, tactile, non-glare ivory. |
| **Sidebar Surface** | `#f9f8f4` | Left navigation sidebar background. Subtle warm tint with `#e8e4da` right border. |
| **Primary Card Surface** | `#ffffff` / `#fffdf9` | Bento cards, containers, tables. High-contrast crisp white with `#ede9df` borders. |
| **Muted Card Surface** | `#faf8f3` / `#f4efe4` | Sub-stat tiles, filter pills, secondary table headers, icon badge backgrounds. |
| **Active Highlight Card** | `#fff7e6` to `#fffcf5` | High-priority milestone card with `#f8e2b2` amber accent border. |

### 2.2 Typography & Neutral Hierarchy
| Token Name | Hex Code | Purpose / Application |
| :--- | :--- | :--- |
| **Primary Ink** | `#1c1d22` | Hero titles, case headers, active numbers, high-priority labels. |
| **Body Ink** | `#202124` | Table cell text, descriptive body paragraphs, search input text. |
| **Secondary Ink** | `#4a4b52` | Case IDs, table secondary columns, action button labels. |
| **Subtle Slate** | `#7a7b83` | Metadata, timestamps, branch names, metric labels, section headers. |
| **Muted Placeholder** | `#9e9ea5` | Input placeholders, inactive tick marks, subtle guide lines. |

### 2.3 Functional & Accent Accents
| Token Name | Hex Code | Background Tint | Purpose / Application |
| :--- | :--- | :--- | :--- |
| **Executive Gold / Saffron** | `#f5b838` / `#b87c12` | `#fff7e6` / `#fbeed4` | Primary arc gauge, BS&FB Bank Fraud bar, active icons, focus rings. |
| **Executive Pitch Charcoal** | `#202126` | `#2b2c34` (hover) | Active sidebar tile, primary toggle pills, ACB Corruption bar, officer avatar. |
| **BSA Statutory Emerald** | `#047857` | `#ecfdf5` | Section 63(4) cryptographic authenticity verification badges, online status diodes. |
| **Wing Navy Blue** | `#1b62b3` | `#e8f1fb` | Summons badges, court schedule pills, CBI special wing indicators. |
| **Wing Royal Purple** | `#7d2db8` | `#f4ebfb` | Cyber Crime and Telecom CDR surveillance badges. |
| **Neutral Slate Bar** | `#9396a3` | `#faf8f3` | SCB Special Crimes category distribution bar. |

---

## 3. Typography System

The typography pairs modern humanistic sans-serif with ultra-precise monospace figures for forensic data:

### 3.1 Font Families
- **Primary Interface Font**: `Inter` (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif).
  - OpenType Features enabled: `cv02`, `cv03`, `cv04`, `cv11` for enhanced legibility of numerals and symbols.
- **Forensic & Monospace Font**: `JetBrains Mono` (ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas).
  - Used for: FIR numbers (`RC0782026E0004`), Case IDs, SHA-256 Hashes, timestamps, and statutory BNSS/IPC legal sections.

### 3.2 Type Scale Hierarchy
| Level | Font Size | Weight | Tracking | Application |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | 24px – 30px | Bold (`font-bold`) | `-0.025em` | *"Good Morning, Director General"* |
| **Metric Large** | 24px – 28px | ExtraBold (`font-extrabold`) | `-0.03em` | Primary KPI Counters (`147`, `2,744`, `5,252`, `32`) |
| **Gauge Center** | 30px – 32px | Black (`font-black`) | `-0.03em` | Arc Gauge Metric (`94%`) |
| **Card Header** | 13px – 15px | Bold (`font-bold`) | `-0.015em` | Section Titles (*"Schedule"*, *"Resolution Velocity"*, *"List Cases"*) |
| **Body Regular** | 12px – 13px | Medium (`font-medium`) | `normal` | Case descriptions, table rows, filter buttons |
| **Monospace ID** | 10.5px – 11px | Semibold (`font-semibold`) | `0.02em` | FIR codes, Hash checksums, dates |
| **Badge / Caption** | 9px – 10.5px | Bold (`font-bold`) | `0.05em` | Uppercase status badges, wing identifiers, tick markers |

---

## 4. Spacing, Geometry & Radii Tokens

All cards and controls follow an intentional squircle radius system that creates a soft, approachable, yet structured layout:

### 4.1 Border Radii
- **Hero & Primary Bento Cards**: `rounded-3xl` (`24px` / `1.5rem`)
  - Used on the top hero greeting, middle analytical cards, and bottom case register.
- **Action Grid Tiles & Sub-Cards**: `rounded-2xl` (`16px` / `1.0rem`)
  - Used for the 6 sidebar grid tiles, milestone case cards, and vertical bars.
- **Buttons, Inputs & Pill Tabs**: `rounded-xl` (`12px` / `0.75rem`)
  - Used on search inputs, action buttons, filter selectors, and date pickers.
- **Status Tags & Micro Badges**: `rounded-lg` / `rounded-md` (`6px` – `8px`)
  - Used on table badges, wing indicators, and legal section chips.

### 4.2 Elevation & Borders
- **Crisp 1px Borders**: In place of heavy drop-shadows, all cards feature a 1px solid border (`border-[#ede9df]` or `border-[#e8e4da]`).
- **Subtle Elevation**: `shadow-xs` (`0 1px 2px 0 rgba(0, 0, 0, 0.03)`), providing soft depth without artificial glow.

---

## 5. Architectural Layout & Grid Structure

The screen is organized as a unified, dual-panel institutional workstation:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ MASTER TOP BAR (Optional Quick Switcher: Dashboard • Graph • Cases • Chat • Flowchart) │
├──────────────┬─────────────────────────────────────────────────────────────────────────┤
│ LEFT SIDEBAR │ MAIN EXECUTIVE CANVAS                                                   │
│ (256px)      │                                                                         │
│              │ ┌─────────────────────────────────────────────────────────────────────┐ │
│ • Directorate│ │ TOP HERO CARD: Greeting + 4 Core KPIs + Circular Arc Gauge          │ │
│   Emblem     │ └─────────────────────────────────────────────────────────────────────┘ │
│ • Search     │                                                                         │
│ • 6-Tile Grid│ ┌───────────────────┬─────────────────────────────┬───────────────────┐ │
│   [Dash][Grp]│ │ 1. SCHEDULE       │ 2. RESOLUTION VELOCITY      │ 3. BRANCH STATUS  │ │
│   [Cas ][AI ]│ │  Priority FIRs    │  78.4% SVG Area Trend Chart │  49% BS&FB (Gold) │ │
│   [Led ][Flo]│ │  Milestone Cards  │  5 Sub-Metric Tiles         │  31% ACB (Dark)   │ │
│ • Favorites  │ │  Summons & Dates  │  (FIRs, Nodes, Proofs...)   │  20% SCB (Slate)  │ │
│ • CBI Wings  │ └───────────────────┴─────────────────────────────┴───────────────────┘ │
│ • Officer    │                                                                         │
│   Profile    │ ┌─────────────────────────────────────────────────────────────────────┐ │
│   Card       │ │ ACTIVE CBI CASE REGISTER (List Cases Table)                         │ │
│              │ │ Live Search • Filter • Accused • Sections • BSA 63(4) • Actions     │ │
│              │ └─────────────────────────────────────────────────────────────────────┘ │
└──────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Left Sidebar Components
1. **Brand Identity**: NyayaGraph seal with Saffron Shield (`#f5b838`) in a dark pill (`#202126`).
2. **Search Input**: Full-width rounded field with interior magnifying icon.
3. **2x3 Action Grid**:
   - `Dashboard`: Active dark tile (`#202126`), white text, gold icon.
   - `Syndicate Graph`, `Cases & FIRs`, `Detective AI`, `BSA 63(4) Ledger`, `Procedural Flowchart`: Warm white cards with subtle hover state.
4. **Investigation Wings**: Quick-filter triggers for BS&FB Bangalore, ACB New Delhi, SCB Kolkata, and Cyber Crime Unit.
5. **Officer Dossier Widget**: Director profile with live green status diode and alert bell.

### 5.2 Middle Analytical Row (3 Columns)
1. **Schedule / Case Milestones (Column 1)**:
   - Filter pill toggles (`Priority FIRs`, `Summons`, `Hearings`).
   - Active milestone cards with highlighted amber border (`#f8e2b2`) on the top-priority case.
   - Direct link buttons to open cases directly into the full graph.
2. **Resolution Velocity (Column 2)**:
   - Large KPI indicator (`78.4% Average Syndicate Resolution KPI`) with trend arrow ↗.
   - Interactive SVG smooth bezier curve with golden-amber fill (`stop-opacity="0.28"` to `0.0`).
   - 5 micro sub-cards underneath: Active FIRs, Key Brokers, Wings, BSA Proofs, and Bank Lines.
3. **Branch Distribution (Column 3)**:
   - 3 distinct rounded vertical bars with proportional heights:
     - 49% BS&FB Banking & Securities (`#f5b838` Saffron Amber)
     - 31% ACB Anti-Corruption (`#202126` Dark Charcoal)
     - 20% SCB Special Crimes (`#9396a3` Muted Slate)
   - Bottom summary tile of total collateral seized.

### 5.3 Active CBI Case Register (Bottom Table)
- Real-time search across 147 FIR cases by number, broker, bank, or legal section.
- High-density tabular layout with:
  - FIR & Case Title with node and link counts.
  - Case ID in monospace.
  - Prime Accused / Central Broker tag.
  - Police Station & Branch Wing.
  - BSA 2023 Sec 63(4) cryptographic verification badge.
  - Registration Date.
  - Action buttons: "Explore" (Cases View) and "Bot" (Interrogate with Detective AI).

---

## 6. Component Code Patterns & Reference Snippets

### 6.1 Circular Arc Gauge (SVG)
```tsx
<div className="relative flex items-center justify-center">
  <svg className="size-40 -rotate-90 transform" viewBox="0 0 120 120">
    {/* Faint Background Track */}
    <circle
      cx="60"
      cy="60"
      r="48"
      stroke="#f1ede2"
      strokeWidth="9"
      fill="transparent"
      strokeDasharray="250"
      strokeDashoffset="60"
      strokeLinecap="round"
    />
    {/* Active Golden Amber Arc Meter */}
    <circle
      cx="60"
      cy="60"
      r="48"
      stroke="#f5b838"
      strokeWidth="9"
      fill="transparent"
      strokeDasharray="250"
      strokeDashoffset="100"
      strokeLinecap="round"
    />
    {/* Pointer Indicator */}
    <circle cx="98" cy="27" r="4.5" fill="#ffffff" stroke="#f5b838" strokeWidth="3" />
  </svg>
  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
    <span className="text-3xl font-black tracking-tight text-[#1c1d22]">94%</span>
    <span className="text-[10px] font-semibold tracking-wide text-[#7a7b83] uppercase">
      Evidence Authenticity
    </span>
    <span className="text-[9px] font-mono text-[#a8a9b2]">BSA 2023 Sec 63(4)</span>
  </div>
</div>
```

### 6.2 Action Grid Tile (Sidebar)
```tsx
{/* Active State */}
<button className="flex flex-col items-start justify-between rounded-2xl bg-[#202126] p-3.5 text-left text-white shadow-md">
  <div className="flex size-7 items-center justify-center rounded-lg bg-white/10 text-white">
    <LayoutDashboard className="size-4 text-[#f5b838]" />
  </div>
  <div className="mt-4">
    <span className="block text-[11px] font-semibold text-white">Dashboard</span>
    <span className="text-[9px] text-[#a0a1a8]">Executive Overview</span>
  </div>
</button>

{/* Inactive State */}
<button className="flex flex-col items-start justify-between rounded-2xl border border-[#e8e4da] bg-white p-3.5 text-left text-[#202124] shadow-xs hover:border-[#ded8cb] hover:bg-[#faf8f2]">
  <div className="flex size-7 items-center justify-center rounded-lg bg-[#f4efe4] text-[#4f5159]">
    <Network className="size-4 text-[#202124]" />
  </div>
  <div className="mt-4">
    <span className="block text-[11px] font-semibold text-[#202124]">Syndicate Graph</span>
    <span className="text-[9px] text-[#7a7b83]">2,744 Nodes</span>
  </div>
</button>
```

---

## 7. Rules for Future Modifications & Extensions

1. **Never Reintroduce Neon / Cyberpunk Gradients**:
   - Avoid glowing drop-shadows, saturated purple/cyan borders, or pure black `#000000` pitch backgrounds in the executive views.
2. **Preserve the Warm Ivory Foundation**:
   - Always use `#f5f3ec` / `#f6f4ee` as the canvas backing and `#ffffff` / `#fffdf9` for cards.
3. **Maintain Font Discipline**:
   - Strictly reserve `JetBrains Mono` for machine-verifiable data (hashes, dates, FIR numbers, legal sections, node counts). Use `Inter` with OpenType figures for all textual interface elements.
4. **Maintain Squircles (`rounded-2xl` & `rounded-3xl`)**:
   - Never use sharp `rounded-none` or overly tight `rounded-sm` on primary cards.
5. **Keep Accents Purposeful**:
   - Use Golden-Amber (`#f5b838`) exclusively for focus, primary metrics, and priority actions. Do not paint arbitrary UI elements in amber.
