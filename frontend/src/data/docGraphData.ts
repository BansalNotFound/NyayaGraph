export type DocNode = {
  id: string;
  label: string;
  filename: string;
  parentId: string | null;
  category: "INDEX" | "DOC" | "GUIDE" | "CONFIG";
  description: string;
};

export type DocEdge = {
  id: string;
  source: string;
  target: string;
};

export const DOC_NODES: DocNode[] = [
  {
    id: "index",
    label: "index",
    filename: "index.md",
    parentId: null,
    category: "INDEX",
    description: "Central Documentation & Knowledge Base Index Root",
  },
  {
    id: "01-soup-overview",
    label: "01-soup-overview",
    filename: "01-soup-overview.md",
    parentId: "index",
    category: "DOC",
    description: "Multimodal Evidence Data Soup, OCR Ingestion & Scans",
  },
  {
    id: "02-recommended-models",
    label: "02-recommended-models",
    filename: "02-recommended-models.md",
    parentId: "index",
    category: "GUIDE",
    description: "Neural & LLM Models Benchmark: DeepSeek-Flash, LayoutLMv3, GAT",
  },
  {
    id: "03-conda-environment-setup",
    label: "03-conda-environment-setup",
    filename: "03-conda-environment-setup.md",
    parentId: "index",
    category: "CONFIG",
    description: "Python 3.11, CUDA, D3-Force Physics & Fast API Setup",
  },
  {
    id: "04-experiment-template",
    label: "04-experiment-template",
    filename: "04-experiment-template.md",
    parentId: "02-recommended-models",
    category: "DOC",
    description: "Cross-Case Ledger Audit & Syndicate Link Experiment",
  },
  {
    id: "05-training-guide-and-workflow",
    label: "05-training-guide-and-workflow",
    filename: "05-training-guide-and-workflow.md",
    parentId: "03-conda-environment-setup",
    category: "GUIDE",
    description: "Forensic Entity NER Fine-Tuning & IPC Legal Classifiers",
  },
  {
    id: "06-dataset-domains-roadmap",
    label: "06-dataset-domains-roadmap",
    filename: "06-dataset-domains-roadmap.md",
    parentId: "01-soup-overview",
    category: "DOC",
    description: "500 Ingested Files Across 8 Crime Syndicate Verticals",
  },
  {
    id: "07-function-calling-guide",
    label: "07-function-calling-guide",
    filename: "07-function-calling-guide.md",
    parentId: "05-training-guide-and-workflow",
    category: "GUIDE",
    description: "Autonomous CBI Detective Copilot Tool & Schema Registry",
  },
  {
    id: "08-markdown-formatter-assistant-guide",
    label: "08-markdown-formatter-assistant-guide",
    filename: "08-markdown-formatter-assistant-guide.md",
    parentId: "07-function-calling-guide",
    category: "GUIDE",
    description: "Dossier Formatting & Court-Admissible Charge Sheet Standards",
  },
];

export const DOC_EDGES: DocEdge[] = [
  { id: "e-index-01", source: "index", target: "01-soup-overview" },
  { id: "e-index-02", source: "index", target: "02-recommended-models" },
  { id: "e-index-03", source: "index", target: "03-conda-environment-setup" },
  { id: "e-02-04", source: "02-recommended-models", target: "04-experiment-template" },
  { id: "e-03-05", source: "03-conda-environment-setup", target: "05-training-guide-and-workflow" },
  { id: "e-01-06", source: "01-soup-overview", target: "06-dataset-domains-roadmap" },
  { id: "e-05-07", source: "05-training-guide-and-workflow", target: "07-function-calling-guide" },
  { id: "e-07-08", source: "07-function-calling-guide", target: "08-markdown-formatter-assistant-guide" },
];

/**
 * Organic force-balanced coordinates for each sequence step (0 to 8)
 * At each step, existing nodes drift/reposition smoothly so layout naturally balances.
 */
export function getStepPositions(
  step: number,
  cx: number,
  cy: number
): Record<string, { x: number; y: number }> {
  // Step 0: Idle state — Single root node sits centered
  if (step <= 0) {
    return {
      index: { x: cx, y: cy },
    };
  }

  // Step 1: 01-soup-overview appears below index
  if (step === 1) {
    return {
      index: { x: cx, y: cy - 65 },
      "01-soup-overview": { x: cx, y: cy + 50 },
    };
  }

  // Step 2: 02-recommended-models appears to right; 01 drifts left
  if (step === 2) {
    return {
      index: { x: cx, y: cy - 80 },
      "01-soup-overview": { x: cx - 110, y: cy + 30 },
      "02-recommended-models": { x: cx + 110, y: cy + 30 },
    };
  }

  // Step 3: 03-conda-environment-setup appears center-down; 01 and 02 fan wide
  if (step === 3) {
    return {
      index: { x: cx, y: cy - 100 },
      "01-soup-overview": { x: cx - 145, y: cy + 15 },
      "02-recommended-models": { x: cx + 145, y: cy + 15 },
      "03-conda-environment-setup": { x: cx, y: cy + 50 },
    };
  }

  // Step 4: 04-experiment-template appears below 02
  if (step === 4) {
    return {
      index: { x: cx, y: cy - 115 },
      "01-soup-overview": { x: cx - 150, y: cy + 10 },
      "02-recommended-models": { x: cx + 135, y: cy - 5 },
      "03-conda-environment-setup": { x: cx - 10, y: cy + 45 },
      "04-experiment-template": { x: cx + 225, y: cy + 70 },
    };
  }

  // Step 5: 05-training-guide appears below 03
  if (step === 5) {
    return {
      index: { x: cx, y: cy - 125 },
      "01-soup-overview": { x: cx - 155, y: cy + 5 },
      "02-recommended-models": { x: cx + 140, y: cy - 10 },
      "03-conda-environment-setup": { x: cx - 10, y: cy + 35 },
      "04-experiment-template": { x: cx + 230, y: cy + 65 },
      "05-training-guide-and-workflow": { x: cx - 45, y: cy + 125 },
    };
  }

  // Step 6: 06-dataset-domains-roadmap appears below 01
  if (step === 6) {
    return {
      index: { x: cx, y: cy - 140 },
      "01-soup-overview": { x: cx - 150, y: cy - 25 },
      "02-recommended-models": { x: cx + 150, y: cy - 25 },
      "03-conda-environment-setup": { x: cx - 5, y: cy + 25 },
      "04-experiment-template": { x: cx + 240, y: cy + 60 },
      "05-training-guide-and-workflow": { x: cx - 45, y: cy + 120 },
      "06-dataset-domains-roadmap": { x: cx - 230, y: cy + 65 },
    };
  }

  // Step 7: 07-function-calling-guide appears below 05
  if (step === 7) {
    return {
      index: { x: cx, y: cy - 145 },
      "01-soup-overview": { x: cx - 155, y: cy - 30 },
      "02-recommended-models": { x: cx + 155, y: cy - 30 },
      "03-conda-environment-setup": { x: cx - 5, y: cy + 20 },
      "04-experiment-template": { x: cx + 245, y: cy + 55 },
      "05-training-guide-and-workflow": { x: cx - 45, y: cy + 115 },
      "06-dataset-domains-roadmap": { x: cx - 235, y: cy + 60 },
      "07-function-calling-guide": { x: cx + 35, y: cy + 180 },
    };
  }

  // Step 8 & Final Resting Layout: 08-markdown-formatter appears below 07
  // Index roughly center-top, children fanned below/around it
  return {
    index: { x: cx, y: cy - 150 },
    "01-soup-overview": { x: cx - 160, y: cy - 30 },
    "02-recommended-models": { x: cx + 160, y: cy - 30 },
    "03-conda-environment-setup": { x: cx, y: cy + 20 },
    "04-experiment-template": { x: cx + 245, y: cy + 55 },
    "05-training-guide-and-workflow": { x: cx - 45, y: cy + 115 },
    "06-dataset-domains-roadmap": { x: cx - 240, y: cy + 60 },
    "07-function-calling-guide": { x: cx + 35, y: cy + 180 },
    "08-markdown-formatter-assistant-guide": { x: cx + 140, y: cy + 240 },
  };
}

export const DOC_MARKDOWN_CONTENT: Record<
  string,
  { title: string; subtitle: string; tags: string[]; content: string }
> = {
  index: {
    title: "Master Documentation & Investigation Index",
    subtitle: "Root Node • Architecture & Evidence Processing Pipeline",
    tags: ["CORE", "INDEX", "VAULT_ROOT", "PIPELINE"],
    content: `# Master Syndicate Index & Documentation Root

Welcome to the **NyayaGraph Forensic Documentation & Syndicate Graph**.

This knowledge vault structures the end-to-end evidence digestion, multimodal OCR extraction, cross-case entity resolution, and autonomous investigation workflows.

## Structural File Graph
- [[01-soup-overview]] — Raw evidence ingestion & multimodal data soup
- [[02-recommended-models]] — Forensic LLM & NLP neural architecture matrix
- [[03-conda-environment-setup]] — Python 3.11, CUDA, D3.js force layout environment
- [[04-experiment-template]] — Cross-case ledger audit & financial link experiment
- [[05-training-guide-and-workflow]] — Document NER & relation extraction training pipeline
- [[06-dataset-domains-roadmap]] — 500 Ingested files across 8 crime syndicate verticals
- [[07-function-calling-guide]] — Autonomous CBI Detective Copilot schema
- [[08-markdown-formatter-assistant-guide]] — Court-admissible charge sheet formatting guide
`,
  },
  "01-soup-overview": {
    title: "01. Evidence Data Soup Overview",
    subtitle: "Raw Ingestion • Multimodal Text, Scans & Financial Ledgers",
    tags: ["INGESTION", "RAW_SOUP", "EVIDENCE", "OCR"],
    content: `# 01-soup-overview.md

## High-Volume Forensic Ingestion Pipeline
The "Evidence Soup" aggregates heterogeneous forensic materials across all active cases:
- Scanned First Information Reports (FIRs)
- Bank account ledgers & NEFT/RTGS transaction dumps
- Seizure memos and property seizure inventories
- Intercepted phone call detail records (CDRs)

### Pipeline Stages
1. **Raw Ingestion**: Unstructured PDFs and TIFFs ingested into local vault.
2. **Layout Detection**: Table and entity bounding box isolation.
3. **Canonical Normalization**: Mapping aliases and shell company titles to unique entity UUIDs.
`,
  },
  "02-recommended-models": {
    title: "02. Recommended Neural & LLM Forensic Models",
    subtitle: "Model Evaluation • DeepSeek-Flash, LayoutLMv3 & Graph Attention",
    tags: ["MODELS", "DEEPSEEK-FLASH", "LAYOUTLM", "NER"],
    content: `# 02-recommended-models.md

## Forensic Intelligence Model Suite
For high-precision extraction without hallucinations, the following models are recommended:

- **DeepSeek-Flash / Reasoner**: Primary high-reasoning engine with enabled thinking mode for autonomous detective copilot, FIR cross-examination, and complex multi-hop causal inference.
- **LayoutLMv3**: Multi-modal document parsing for scanned ledgers and stamps.
- **Graph Attention Networks (GAT)**: Centrality scoring and syndicate broker detection.
`,
  },
  "03-conda-environment-setup": {
    title: "03. Conda & Lab Environment Setup",
    subtitle: "Environment Configuration • Python 3.11, PyTorch, D3.js",
    tags: ["SETUP", "CONDA", "PYTHON3.11", "DEPENDENCIES"],
    content: `# 03-conda-environment-setup.md

## Setup Instructions

\`\`\`bash
# Create dedicated forensic analysis environment
conda create -n nyayagraph python=3.11 -y
conda activate nyayagraph

# Core graph analysis & ML dependencies
pip install fastapi uvicorn pydantic torch networkx d3-force-layout
pip install zhipuai httpx python-dotenv
\`\`\`

Frontend Next.js 16 environment requires Node.js >= 18 with Turbopack support.
`,
  },
  "04-experiment-template": {
    title: "04. Cross-Case Audit Experiment Template",
    subtitle: "Experiment Design • Hawala Layering & Benami Detection",
    tags: ["EXPERIMENTS", "BENAMI", "HAWALA", "BENCHMARK"],
    content: `# 04-experiment-template.md

## Objective
Benchmark automated link-prediction accuracy when discovering hidden shell company owners across independent FIRs.

### Metrics
- **Precision@K**: Verified shell brokers within top 10 flagged nodes.
- **False Positive Ratio**: Legitimate vendor transactions incorrectly flagged.
`,
  },
  "05-training-guide-and-workflow": {
    title: "05. Forensic Extraction Training Guide",
    subtitle: "Training Workflow • Fine-Tuning Legal NER on FIR Corpuses",
    tags: ["TRAINING", "WORKFLOW", "LEGAL_NER", "IPC_SECTIONS"],
    content: `# 05-training-guide-and-workflow.md

## Training Workflow
1. **Annotate IPC Sections & Accused Roles**: Mark Section 420, 120B, 467, 471, and PC Act Sec 13(1)(d).
2. **Synthetic Data Augmentation**: Inject perturbed PAN/Aadhaar masks to prevent leakage.
3. **LoRA Fine-Tuning**: 3-epoch low-rank adaptation on forensic crime corpus.
`,
  },
  "06-dataset-domains-roadmap": {
    title: "06. Dataset Domains & 500 Files Roadmap",
    subtitle: "Dataset Coverage • 8 Crime Verticals & 500 Ingested Files",
    tags: ["DATASETS", "500_FILES", "CRIME_VERTICALS", "ROADMAP"],
    content: `# 06-dataset-domains-roadmap.md

## 500 Ingested Forensic Files Coverage
1. **Delhi Excise Liquor Cartel** (64 files)
2. **National Mining Syndicate** (78 files)
3. **Shell Entity Layering Network** (92 files)
4. **Customs Hawala Smuggling Ring** (55 files)
5. **Cyber Extortion & Crypto Laundering** (48 files)
6. **Infrastructure Kickbacks** (60 files)
7. **Defense Procurement Fraud** (53 files)
8. **Pharma Counterfeiting Pipeline** (50 files)
`,
  },
  "07-function-calling-guide": {
    title: "07. Autonomous Agent Function Calling Guide",
    subtitle: "Agent Schema • Tool Definitions for Detective AI",
    tags: ["AGENT", "FUNCTION_CALLING", "TOOLS", "SQL"],
    content: `# 07-function-calling-guide.md

## Agent Tool Registry
- \`query_fir_records(fir_number: str)\`: Pull official police FIR details.
- \`trace_transaction_flow(source_account: str, depth: int)\`: Graph walk financial nodes.
- \`find_cross_case_brokers(min_cases: int)\`: Identify kingpins linking separate cases.
- \`generate_charge_sheet_summary(case_id: str)\`: Draft court-admissible briefing.
`,
  },
  "08-markdown-formatter-assistant-guide": {
    title: "08. Markdown Formatter Assistant Guide",
    subtitle: "Dossier Formatting • Court-Admissible Typography & Citations",
    tags: ["FORMATTING", "ASSISTANT", "DOSSIER", "LEGAL_TECH"],
    content: `# 08-markdown-formatter-assistant-guide.md

## Charge Sheet Markdown Standards
All generated dossiers must follow strict evidential rules:
- Bold all accused names with their case reference: **[Name] (A-1)**
- Link all evidence artifacts with markdown internal links: \`[[seizure_memo_04.pdf]]\`
- Use tabular representations for financial money trails.
- Clearly differentiate circumstantial indicators from forensic proofs.
`,
  },
};
