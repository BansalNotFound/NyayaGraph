"""
CBI Scanned FIR Ingestion Pipeline with Unlimited-OCR
Reads downloaded CBI PDFs, executes OCR via local llama-server on port 8989,
extracts legal entities/facts, computes graph metrics, anchors to blockchain,
and registers in NyayaGraph cases store.
"""
import os
import sys
import json
import time
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.ocr_service import OCRService
from app.services.extractor_service import ExtractorService
from app.services.fusion_service import FusionService
from app.services.graph_service import GraphService
from app.services.pattern_service import PatternService
from app.services.blockchain_service import BlockchainService
from app.services.case_store_service import CaseStoreService
from app.models.schemas import FactItem, GraphNode, DetroitNodeType, EntityCategory, VerificationStatus


def ingest_cbi_pdf(pdf_path: str, case_no: str, location: str, max_pages: int = 5):
    ocr_service = OCRService(endpoint="http://127.0.0.1:8989/v1/chat/completions")
    extractor = ExtractorService()
    graph_service = GraphService()
    pattern_service = PatternService()
    blockchain = BlockchainService()
    case_store = CaseStoreService(blockchain=blockchain)

    print(f"\n========================================================")
    print(f"[*] INGESTING CBI CASE: {case_no} ({location})")
    print(f"[*] PDF Path: {pdf_path}")
    print(f"========================================================")

    # 1. Check if OCR transcript already cached
    transcript_path = pdf_path.replace(".pdf", "_ocr.txt")
    if os.path.exists(transcript_path):
        print(f"[+] Found cached Unlimited-OCR transcript at {transcript_path}")
        with open(transcript_path, "r", encoding="utf-8") as f:
            fir_text = f.read()
    else:
        # Execute Unlimited-OCR on local llama-server
        print(f"[*] Calling local Unlimited-OCR on port 8989 (RTX 4060)...")
        start_t = time.time()
        fir_text = ocr_service.process_pdf(pdf_path, max_pages=max_pages)
        dur = time.time() - start_t
        print(f"[OK] Unlimited-OCR completed in {dur:.2f}s ({len(fir_text)} chars extracted)")
        with open(transcript_path, "w", encoding="utf-8") as f:
            f.write(fir_text)

    # 2. SHA-256 Hashing & BSA 2023 Section 63(4) Blockchain Anchoring
    with open(pdf_path, "rb") as f:
        file_bytes = f.read()
    file_hash = blockchain.compute_bytes_sha256(file_bytes)
    anchor_info = blockchain.anchor_evidence(
        fir_number=case_no,
        police_station=f"CBI Branch: {location}",
        io_name="Superintendent of Police / IO (CBI)",
        file_sha256=file_hash,
        file_hashes={"CBI_RAW_FIR_PDF": file_hash}
    )
    print(f"[OK] Anchored on BSA 2023 Section 63(4) Ledger: TX {anchor_info['blockchain_tx_hash'][:18]}...")

    # 3. Entity & Fact Extraction
    entities, facts = extractor.extract_from_fir_text(fir_text)
    print(f"[+] Extracted {len(entities)} entities & {len(facts)} facts from OCR transcript")

    # 4. Build Relationship Graph
    case_id = f"CASE_CBI_{case_no.replace('/', '_')}"
    graph = graph_service.build_case_graph(
        case_id=case_id,
        fir_number=case_no,
        police_station=f"CBI Branch, {location}",
        entities=entities,
        facts=facts,
        fusion_edges=[]
    )

    # 5. Detect Patterns & Broker
    broker_node = next((n for n in graph.nodes if n.is_broker), None)
    patterns = pattern_service.analyze_patterns(
        nodes=graph.nodes,
        edges=graph.edges,
        cdr_records=[],
        bank_records=[],
        broker_node=broker_node
    )

    # 6. Save into NyayaGraph Case Store
    case_dict = {
        "case_id": case_id,
        "fir_number": case_no,
        "police_station": f"CBI Branch, {location}",
        "date_time": time.strftime("%Y-%m-%d"),
        "sha256_hash": file_hash,
        "blockchain_tx_hash": anchor_info["blockchain_tx_hash"],
        "entities": [e.model_dump() for e in entities],
        "facts": [f.model_dump() for f in facts],
        "graph": graph.model_dump(),
        "patterns": [p.model_dump() for p in patterns],
        "cross_case_match": None
    }
    case_store.save_case(case_dict)
    print(f"[OK] Case {case_id} registered into SQLite & ChromaDB!")
    print(f"[OK] Graph stats: {graph.stats}")
    return case_dict


def ingest_from_manifest(max_cases: int = 3, max_pages_per_pdf: int = 5):
    manifest_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "data", "cbi_firs_manifest.json"
    )
    if not os.path.exists(manifest_path):
        print("[!] Manifest not found. Running scraper first...")
        from scrape_cbi_firs import scrape_cbi_firs
        manifest = scrape_cbi_firs(min_size_mb=2.0, max_files=max_cases)
    else:
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    print(f"[*] Ingesting up to {max_cases} cases from manifest...")
    for item in manifest[:max_cases]:
        pdf_path = item["file_path"]
        case_no = item["case_number"]
        location = item["location"]
        if os.path.exists(pdf_path):
            ingest_cbi_pdf(pdf_path, case_no, location, max_pages=max_pages_per_pdf)
        else:
            print(f"[!] PDF file does not exist: {pdf_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest downloaded CBI FIRs using Unlimited-OCR")
    parser.add_argument("--max-cases", type=int, default=1, help="Max cases to ingest (default: 1)")
    parser.add_argument("--max-pages", type=int, default=4, help="Max pages per PDF to OCR (default: 4)")
    args = parser.parse_args()

    ingest_from_manifest(max_cases=args.max_cases, max_pages_per_pdf=args.max_pages)
