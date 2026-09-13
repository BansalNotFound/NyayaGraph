import os
from dotenv import load_dotenv

# Load .env variables immediately on server initialization
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as cases_router, blockchain_router, flowchart_router, chat_router
from app.api.uidb import router as uidb_router

app = FastAPI(
    title="NyayaGraph-GN API",
    description="AI Criminal Network Profiler & Detective Workbench (SIH26189)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases_router)
app.include_router(blockchain_router)
app.include_router(flowchart_router)
app.include_router(chat_router)
app.include_router(uidb_router)

@app.get("/")
def read_root():
    return {
        "system": "NyayaGraph-GN",
        "tagline": "AI Criminal Network Profiler & Detective Workbench",
        "status": "operational",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "sample_analysis": "/api/v1/cases/sample",
            "process_custom_case": "/api/v1/cases/process",
            "ingest_files": "/api/v1/cases/ingest-files",
            "list_cases": "/api/v1/cases/",
            "aggregate_graph": "/api/v1/cases/all/aggregate-graph",
            "verify_evidence": "/api/v1/blockchain/verify/{hash_or_tx}",
            "ledger": "/api/v1/blockchain/ledger",
            "flowchart_chapters": "/api/v1/flowchart/chapters",
            "health": "/api/v1/health"
        }
    }

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "engine": "FastAPI + NetworkX + Louvain + Pydantic",
        "bsa_section": "BSA 2023 Section 63(4) Evidence Ledger Ready",
    }

