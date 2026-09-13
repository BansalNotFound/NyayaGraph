import os
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse

from ..models.schemas import (
    CaseProcessingResult, ConnectedCaseGraph, EvidenceItem, EvidenceIngestResponse,
    CaseSummary, CaseDetailResponse, AggregateGraphResponse, BSACertificate,
)
from ..services.extractor_service import ExtractorService
from ..services.fusion_service import FusionService
from ..services.graph_service import GraphService
from ..services.pattern_service import PatternService
from ..services.cross_case_service import CrossCaseService
from ..services.blockchain_service import BlockchainService
from ..services.case_store_service import CaseStoreService
from ..services.chat_service import ChatService
from ..services.pdf_service import PDFService

router = APIRouter(prefix="/api/v1/cases", tags=["cases"])
blockchain_router = APIRouter(prefix="/api/v1/blockchain", tags=["blockchain"])
chat_router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

extractor_service = ExtractorService()
fusion_service = FusionService()
graph_service = GraphService()
pattern_service = PatternService()
cross_case_service = CrossCaseService()
blockchain_service = BlockchainService()
case_store = CaseStoreService(blockchain=blockchain_service)
chat_service = ChatService()
pdf_service = PDFService()



def load_default_samples():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

    fir_path = os.path.join(base_dir, "data", "sample_firs", "fir_01_noida_cyber.txt")
    cdr_path = os.path.join(base_dir, "data", "sample_cdrs", "cdr_case_01.csv")
    bank_path = os.path.join(base_dir, "data", "sample_bank", "bank_case_01.csv")

    fir_text = ""
    cdr_csv = ""
    bank_csv = ""

    if os.path.exists(fir_path):
        with open(fir_path, 'r', encoding='utf-8') as f:
            fir_text = f.read()
    if os.path.exists(cdr_path):
        with open(cdr_path, 'r', encoding='utf-8') as f:
            cdr_csv = f.read()
    if os.path.exists(bank_path):
        with open(bank_path, 'r', encoding='utf-8') as f:
            bank_csv = f.read()

    return fir_text, cdr_csv, bank_csv


def _run_pipeline(fir_text, cdr_csv, bank_csv, fir_number, police_station, io_name,
                  case_id=None, date_time="Active Ingestion"):
    """Shared pipeline: hash -> anchor -> extract -> fuse -> graph -> patterns."""
    file_hashes = {
        "FIR": blockchain_service.compute_sha256(fir_text or ""),
        "CDR": blockchain_service.compute_sha256(cdr_csv or ""),
        "BANK": blockchain_service.compute_sha256(bank_csv or ""),
    }
    anchor = blockchain_service.anchor_evidence(
        fir_number=fir_number, police_station=police_station, io_name=io_name,
        file_sha256=file_hashes["FIR"], file_hashes=file_hashes,
    )
    entities, facts = extractor_service.extract_from_fir_text(fir_text or "")
    cdr_records = fusion_service.parse_cdr_data(cdr_csv) if cdr_csv else []
    bank_records = fusion_service.parse_bank_data(bank_csv) if bank_csv else []
    graph = graph_service.build_case_graph(
        case_id=case_id or f"CASE_{fir_number.replace('/', '_')}",
        fir_number=fir_number, police_station=police_station,
        entities=entities, facts=facts,
        fusion_edges=fusion_service.generate_fusion_edges(cdr_records, bank_records),
    )
    broker = next((n for n in graph.nodes if n.is_broker), None)
    patterns = pattern_service.analyze_patterns(
        nodes=graph.nodes, edges=graph.edges,
        cdr_records=cdr_records, bank_records=bank_records, broker_node=broker)
    result = CaseProcessingResult(
        case_id=case_id or f"CASE_{fir_number.replace('/', '_')}",
        fir_number=fir_number, police_station=police_station, date_time=date_time,
        sha256_hash=anchor["root_case_hash"],
        blockchain_tx_hash=anchor["blockchain_tx_hash"],
        entities=entities, facts=facts, graph=graph, patterns=patterns,
        cross_case_match=cross_case_service.find_resemblance(entities),
    )
    return result, file_hashes, anchor


def _to_summary(stored: dict) -> CaseSummary:
    g = stored.get("graph", {}) or {}
    nodes = g.get("nodes", []) or []
    broker = next((n.get("label") for n in nodes if n.get("is_broker")), None)
    return CaseSummary(
        case_id=stored["case_id"], fir_number=stored.get("fir_number", ""),
        police_station=stored.get("police_station", ""), date_time=stored.get("date_time", ""),
        node_count=len(nodes), edge_count=len(g.get("edges", []) or []),
        broker_name=broker, sha256_hash=stored.get("sha256_hash", ""),
        blockchain_tx_hash=stored.get("blockchain_tx_hash"),
    )


def _certificate_for(stored: dict) -> Optional[BSACertificate]:
    hit = blockchain_service.verify_evidence(stored.get("blockchain_tx_hash", ""))
    if hit.get("verified"):
        return BSACertificate(
            fir_number=hit.get("fir_number", ""), police_station=hit.get("police_station", ""),
            investigating_officer=hit.get("investigating_officer", ""),
            file_hashes=hit.get("file_hashes", {}) or {},
            root_case_hash=hit.get("root_case_hash", ""),
            blockchain_tx_hash=hit.get("blockchain_tx_hash", ""),
            block_number=hit.get("block_number", 0), timestamp=hit.get("timestamp", ""),
            contract_address=hit.get("contract_address"),
            ledger_mode=hit.get("ledger_mode", "sovereign-local"),
            legal_declaration=hit.get("legal_declaration", ""))
    return None


@router.get("/sample", response_model=CaseProcessingResult)
def get_sample_case_analysis():
    """
    Instant end-to-end processing of the sample Noida Cyber Extortion case.
    Executes Ingestion -> Entity Extraction & Verification -> Multi-Source Fusion ->
    Detroit Flowchart Graph Construction -> Pattern Spotting -> Cross-Case Resemblance.
    """
    fir_text, cdr_csv, bank_csv = load_default_samples()
    if not fir_text:
        raise HTTPException(status_code=404, detail="Sample dataset files not found")
    result, _, _ = _run_pipeline(
        fir_text, cdr_csv, bank_csv, fir_number="112/2026",
        police_station="Cyber Crime PS, Gautam Buddha Nagar",
        io_name="Sub-Inspector Rajesh", case_id="CASE_2026_NOIDA_112",
        date_time="14/02/2026 11:30 hrs")
    return result


@router.post("/process", response_model=CaseProcessingResult)
async def process_custom_case(
    fir_text: str = Form(...),
    cdr_csv: Optional[str] = Form(""),
    bank_csv: Optional[str] = Form(""),
    fir_number: str = Form("112/2026"),
    police_station: str = Form("Cyber Crime PS, Gautam Buddha Nagar"),
    io_name: str = Form("Sub-Inspector Rajesh")
):
    """Process custom uploaded case documents and build full connected case graph."""
    result, _, _ = _run_pipeline(
        fir_text, cdr_csv or "", bank_csv or "", fir_number=fir_number,
        police_station=police_station, io_name=io_name)
    return result


@router.post("/ingest-files", response_model=EvidenceIngestResponse)
async def ingest_evidence_files(
    fir_file: UploadFile = File(...),
    cdr_file: Optional[UploadFile] = File(None),
    bank_file: Optional[UploadFile] = File(None),
    fir_number: str = Form("112/2026"),
    police_station: str = Form("Cyber Crime PS, Gautam Buddha Nagar"),
    io_name: str = Form("Sub-Inspector Rajesh"),
):
    """Multipart evidence ingestion: hash + anchor + extract + graph + persist."""
    async def _read(up: Optional[UploadFile]):
        if up is None:
            return None, "", ""
        raw = await up.read()
        text = raw.decode("utf-8", errors="ignore")
        return raw, text, up.filename or "upload"

    fir_raw, fir_text, fir_name = await _read(fir_file)
    cdr_raw, cdr_text, cdr_name = await _read(cdr_file)
    bank_raw, bank_text, bank_name = await _read(bank_file)
    if not fir_text.strip():
        raise HTTPException(status_code=400, detail="FIR file is empty or unreadable")

    result, file_hashes, anchor = _run_pipeline(
        fir_text, cdr_text, bank_text, fir_number=fir_number,
        police_station=police_station, io_name=io_name)
    case_store.save_case(result.model_dump())

    now = datetime.now(timezone.utc).isoformat()
    evidence = [EvidenceItem(
        evidence_id=f"{result.case_id}-FIR", file_name=fir_name, file_type="FIR",
        sha256_hash=file_hashes["FIR"], file_size_bytes=len(fir_raw or b""),
        ingestion_timestamp=now, blockchain_tx_hash=result.blockchain_tx_hash)]
    if cdr_file is not None:
        evidence.append(EvidenceItem(
            evidence_id=f"{result.case_id}-CDR", file_name=cdr_name, file_type="CDR",
            sha256_hash=file_hashes["CDR"], file_size_bytes=len(cdr_raw or b""),
            ingestion_timestamp=now, blockchain_tx_hash=result.blockchain_tx_hash))
    if bank_file is not None:
        evidence.append(EvidenceItem(
            evidence_id=f"{result.case_id}-BANK", file_name=bank_name, file_type="BANK",
            sha256_hash=file_hashes["BANK"], file_size_bytes=len(bank_raw or b""),
            ingestion_timestamp=now, blockchain_tx_hash=result.blockchain_tx_hash))

    return EvidenceIngestResponse(
        case_id=result.case_id, fir_number=fir_number, police_station=police_station,
        evidence=evidence, root_case_hash=anchor["root_case_hash"],
        certificate=BSACertificate(
            fir_number=fir_number, police_station=police_station, investigating_officer=io_name,
            file_hashes=file_hashes, root_case_hash=anchor["root_case_hash"],
            blockchain_tx_hash=anchor["blockchain_tx_hash"], block_number=anchor["block_number"],
            timestamp=anchor["timestamp"], contract_address=anchor.get("contract_address"),
            ledger_mode=anchor.get("ledger_mode", "sovereign-local"),
            legal_declaration=anchor["legal_declaration"]),
        entity_preview=result.entities[:25],
        graph_summary={"node_count": len(result.graph.nodes),
                       "edge_count": len(result.graph.edges),
                       "broker": result.graph.stats.get("central_broker")},
    )


@router.get("/", response_model=list[CaseSummary])
def list_all_cases():
    """Summaries of all ingested + archived cases."""
    return [_to_summary(c) for c in case_store.list_cases()]


# NOTE: static route declared before /{case_id} so "all" isn't captured as an id.
@router.get("/all/aggregate-graph", response_model=AggregateGraphResponse)
def get_aggregate_graph():
    """Master syndicate graph spanning every case in the registry."""
    from ..models.schemas import ConnectedCaseGraph
    stored = case_store.list_cases()
    if not stored:
        raise HTTPException(status_code=404, detail="No cases in registry")
    graphs = [ConnectedCaseGraph(**c["graph"]) for c in stored]
    nodes, edges, shared, stats = graph_service.aggregate_all_cases_graph(graphs, stored_cases=stored)
    return AggregateGraphResponse(
        case_ids=[c["case_id"] for c in stored], nodes=nodes, edges=edges,
        bridge_edge_count=stats.get("bridge_edge_count", 0),
        shared_identifiers=shared, stats=stats)


@router.get("/search/similar")
def search_similar_cases(query: str, top_k: int = 5):
    """Semantic vector search across case narratives and modus operandi stored in ChromaDB."""
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query parameter cannot be empty")
    return case_store._vector_service.search_similar_cases(query, top_k=top_k)



@router.get("/pdf/catalog")
def get_pdf_catalog(limit: int = 60):
    """List of available archived CBI FIR PDFs with preview metadata."""
    return pdf_service.list_archived_pdfs(limit=limit)


@router.get("/{case_id}", response_model=CaseDetailResponse)
def get_case_detail(case_id: str):
    """Full case processing result + BSA 63(4) certificate."""
    stored = case_store.get_case(case_id)
    if not stored:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    detail = CaseDetailResponse(**stored)
    detail.bsa_certificate = _certificate_for(stored)
    return detail


@router.get("/{case_id}/graph", response_model=ConnectedCaseGraph)
def get_case_graph(case_id: str):
    """Detailed per-case graph (Louvain communities + betweenness broker)."""
    stored = case_store.get_case(case_id)
    if not stored:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return ConnectedCaseGraph(**stored["graph"])


@router.get("/{case_id}/fir-pdf")
def get_case_fir_pdf(case_id: str):
    """Serves the authentic scanned CBI FIR PDF for previewing in browser."""
    pdf_info = pdf_service.find_pdf_for_case(case_id)
    if not pdf_info or not os.path.isfile(pdf_info["file_path"]):
        raise HTTPException(status_code=404, detail=f"No FIR PDF found for case '{case_id}'")
    
    return FileResponse(
        path=pdf_info["file_path"],
        media_type="application/pdf",
        filename=pdf_info["filename"],
        headers={
            "Content-Disposition": f'inline; filename="{pdf_info["filename"]}"',
            "X-NyayaGraph-SHA256": pdf_info["sha256_hash"],
            "X-NyayaGraph-BSA": "Section 63(4) Bharatiya Sakshya Adhiniyam 2023"
        }
    )


@router.get("/{case_id}/fir-pdf-info")
def get_case_fir_pdf_info(case_id: str):
    """Returns verification metadata and availability of the FIR PDF."""
    pdf_info = pdf_service.find_pdf_for_case(case_id)
    if not pdf_info:
        return {
            "available": False,
            "case_id": case_id,
            "message": "FIR PDF not available in current archive."
        }
    return {
        **pdf_info,
        "pdf_url": f"/api/v1/cases/{case_id}/fir-pdf"
    }


from pydantic import BaseModel

class CaseAiAnalysisRequest(BaseModel):
    custom_focus: Optional[str] = None


@router.post("/{case_id}/ai-analysis")
def get_case_ai_analysis(case_id: str, req: Optional[CaseAiAnalysisRequest] = None):
    """Deep forensic AI analysis of the case description using Groq / DeepSeek Flash."""
    custom_focus = req.custom_focus if req else None
    res = chat_service.analyze_case_description(case_id, custom_focus=custom_focus)
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("error", "Analysis failed"))
    return res


@router.get("/{case_id}/ai-analysis-stream")
def stream_case_ai_analysis(case_id: str, custom_focus: Optional[str] = None):
    """
    SSE stream: real-time Groq AI forensic analysis with step events, thinking traces,
    and token-by-token streaming so the frontend can animate live pipeline progress.
    """
    def _gen():
        yield from chat_service.stream_case_analysis(case_id, custom_focus=custom_focus)

    return StreamingResponse(
        _gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@blockchain_router.get("/verify/{hash_or_tx}")
def verify_on_chain(hash_or_tx: str):
    """Validate a file hash / root hash / tx id against the anchored ledger."""
    return blockchain_service.verify_evidence(hash_or_tx)


@blockchain_router.get("/ledger")
def get_ledger():
    """All anchored blocks and transaction receipts."""
    blocks = blockchain_service.get_ledger()
    return {"count": len(blocks), "blocks": blocks,
            "contract_address": BlockchainService.CONTRACT_ADDRESS,
            "statute": "Bharatiya Sakshya Adhiniyam (BSA) 2023 Section 63(4)"}


# ──────────────────────────────────────────────────────────────────────────────
# FLOWCHART CHAPTERS  –  served to the frontend flowchart view
# Converts every stored case from SQLite/ChromaDB into FlowChapter JSON so the
# frontend never needs hardcoded data.
# ──────────────────────────────────────────────────────────────────────────────

_CATEGORY_ICON = {
    "PERSON": "👤", "PHONE": "📱", "IMEI": "📡", "VEHICLE": "🚗",
    "BANK_ACCOUNT": "🏦", "UPI_ID": "💸", "LOCATION": "📍",
    "LEGAL_SECTION": "⚖️", "EVIDENCE": "🔍", "FACT": "📋",
}

_NODE_TYPE_MAP = {
    "ANCHOR": "parallelogram-thumbnail",
    "ACTION": "action",
    "LOCKED": "locked",
    "BROKER": "choice",
    "GHOST":  "warning",
}


def _case_to_flowchart_chapter(stored: dict, chapter_index: int) -> dict:
    """Transform one stored case dict (SQLite + ChromaDB) into a FlowChapter-compatible dict."""
    from collections import defaultdict

    g = stored.get("graph", {}) or {}
    raw_nodes = g.get("nodes", []) or []
    raw_edges = g.get("edges", []) or []
    case_id = stored.get("case_id", f"CASE_{chapter_index}")
    fir_num = stored.get("fir_number", "UNKNOWN")
    ps = stored.get("police_station", "UNKNOWN")

    NODE_W, NODE_H, CLUSTER_PAD = 240, 36, 40

    # Group nodes by community
    communities: dict = defaultdict(list)
    for n in raw_nodes:
        communities[n.get("community_id", 0)].append(n)

    clusters = []
    cluster_x = 60
    cluster_map: dict = {}  # community_id -> cluster_id
    for comm_id, comm_nodes in communities.items():
        cluster_id = f"cl-{case_id[:8]}-c{comm_id}"
        cluster_h = CLUSTER_PAD * 2 + len(comm_nodes) * (NODE_H + 20)
        clusters.append({
            "id": cluster_id,
            "label": f"COMMUNITY {comm_id}",
            "x": cluster_x,
            "y": 50,
            "w": NODE_W + CLUSTER_PAD * 2,
            "h": min(cluster_h, 460),
        })
        cluster_map[comm_id] = cluster_id
        cluster_x += NODE_W + CLUSTER_PAD * 3 + 20

    flow_nodes = []
    node_y_counters: dict = defaultdict(int)
    for n in raw_nodes:
        comm = n.get("community_id", 0)
        cluster_id = cluster_map.get(comm, f"cl-{case_id[:8]}-c0")
        cluster_info = next((c for c in clusters if c["id"] == cluster_id), None)
        base_x = (cluster_info["x"] + CLUSTER_PAD) if cluster_info else 80
        node_y = 90 + node_y_counters[comm] * (NODE_H + 20)
        node_y_counters[comm] += 1

        raw_type = n.get("node_type", "ACTION")
        if isinstance(raw_type, str) and "." in raw_type:
            raw_type = raw_type.split(".")[-1]
        flow_type = _NODE_TYPE_MAP.get(raw_type, "action")
        if n.get("is_broker"):
            flow_type = "choice"
        if n.get("is_locked"):
            flow_type = "locked"

        cat = n.get("category", "FACT")
        if isinstance(cat, str) and "." in cat:
            cat = cat.split(".")[-1]

        icon = _CATEGORY_ICON.get(cat, "📋")
        status = "locked" if n.get("is_locked") else ("active" if n.get("is_broker") else "completed")
        score = float(n.get("betweenness_score") or 0.0)
        world_stat = f"{min(int(score * 1000 + 70), 100)}%"

        details_dict = n.get("details") or {}
        detail_str = "; ".join(f"{k}: {v}" for k, v in list(details_dict.items())[:4]) if details_dict else (n.get("sublabel") or "")

        flow_nodes.append({
            "id": n["id"],
            "cluster": cluster_id,
            "type": flow_type,
            "icon": icon,
            "x": base_x,
            "y": node_y,
            "w": NODE_W,
            "h": NODE_H,
            "label": (n.get("label") or "")[:42],
            "status": status,
            "worldStat": world_stat,
            "details": detail_str,
            "req": "Requires further investigation" if n.get("is_locked") else None,
            "sceneTheme": "rooftop-rain" if n.get("is_broker") else None,
        })

    flow_connections = [
        {"from": e["source"], "to": e["target"], "hasArrow": True}
        for e in raw_edges
        if e.get("source") and e.get("target")
    ]

    broker = next((n for n in raw_nodes if n.get("is_broker")), None)
    broker_label = (broker["label"] if broker else "UNKNOWN").upper()

    return {
        "id": f"chapter-{chapter_index + 1}",
        "code": fir_num,
        "title": ps.upper(),
        "character": broker_label,
        "completionNote": f"{len(raw_nodes)} NODES // {len(raw_edges)} EDGES",
        "description": (
            f"Case RC: {fir_num}. Station: {ps}. "
            f"{len(raw_nodes)} entities across {g.get('total_communities', 1)} communities. "
            f"Central broker: {broker_label}."
        ),
        "canvasWidth": 2400,
        "canvasHeight": 580,
        "clusters": clusters,
        "nodes": flow_nodes,
        "connections": flow_connections,
    }


flowchart_router = APIRouter(prefix="/api/v1/flowchart", tags=["flowchart"])


@flowchart_router.get("/chapters")
def get_flowchart_chapters():
    """
    Returns all cases stored in SQLite/ChromaDB as FlowChapter JSON.
    The Next.js flowchart view fetches this endpoint — no hardcoded frontend data needed.
    """
    stored_cases = case_store.list_cases()
    if not stored_cases:
        raise HTTPException(
            status_code=404,
            detail="No cases found in database. Ingest a FIR PDF first via POST /api/v1/cases/ingest-files"
        )
    chapters = [_case_to_flowchart_chapter(c, i) for i, c in enumerate(stored_cases)]
    legend = [
        {"type": "parallelogram-thumbnail", "label": "Prime Anchor / Broker Node",  "color": "#00b4d8", "desc": "Central criminal broker identified via betweenness centrality."},
        {"type": "action",                  "label": "Entity — Person / Account",   "color": "#0077b6", "desc": "Extracted person, bank account, UPI ID, or phone entity."},
        {"type": "choice",                  "label": "Syndicate Hub / Mule Chain",  "color": "#023e8a", "desc": "Shell company, hawala off-ramp, or crypto conduit node."},
        {"type": "locked",                  "label": "Locked Lead [ ... ]",         "color": "#6c757d", "desc": "Pending investigation, missing KYC, or offshore jurisdiction."},
        {"type": "warning",                 "label": "Cross-Case Ghost Node",       "color": "#e63946", "desc": "Entity appearing in multiple FIRs — high-priority cross-case link."},
    ]
    return {"chapters": chapters, "legend": legend}


from pydantic import BaseModel

class ChatInquiryRequest(BaseModel):
    query: str
    case_id: Optional[str] = None
    chat_history: Optional[list[dict]] = None


@chat_router.post("")
def handle_chat_query(req: ChatInquiryRequest):
    """
    RAG-driven AI detective interrogation against NyayaGraph Knowledge Base
    powered by Groq AI (llama-3.3-70b) with DeepSeek Flash fallback.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    return chat_service.answer_query(
        query=req.query,
        case_id=req.case_id,
        chat_history=req.chat_history
    )


@chat_router.post("/stream")
def stream_chat_query(req: ChatInquiryRequest):
    """
    SSE stream: Groq AI detective chat with live nodes_retrieved event for
    the immersive in-chat node sprouting animation on the frontend.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    def _gen():
        yield from chat_service.stream_chat_query(
            query=req.query,
            case_id=req.case_id,
            chat_history=req.chat_history,
        )

    return StreamingResponse(
        _gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/chat")
def handle_case_chat_query(req: ChatInquiryRequest):
    """Mirror endpoint on /api/v1/cases/chat."""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    return chat_service.answer_query(
        query=req.query,
        case_id=req.case_id,
        chat_history=req.chat_history
    )


