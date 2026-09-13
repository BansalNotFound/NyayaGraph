import os
import json
import sqlite3
from typing import Dict, Any, List, Optional

def get_root_data_dir() -> str:
    """Returns absolute path to root NyayaGraph/data directory."""
    # backend/app/core/database.py -> backend/app/core -> backend/app -> backend -> NyayaGraph -> data
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    data_dir = os.path.join(base, "data")
    os.makedirs(data_dir, exist_ok=True)
    return data_dir

def get_knowledge_base_dir() -> str:
    """Returns absolute path to root NyayaGraph/data/knowledge_base directory."""
    kb_dir = os.path.join(get_root_data_dir(), "knowledge_base")
    os.makedirs(kb_dir, exist_ok=True)
    return kb_dir

def get_db_path() -> str:
    return os.environ.get("NYAYAGRAPH_DB_PATH", os.path.join(get_knowledge_base_dir(), "nyayagraph.db"))


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS cases (
        case_id TEXT PRIMARY KEY,
        fir_number TEXT NOT NULL,
        police_station TEXT NOT NULL,
        date_time TEXT,
        sha256_hash TEXT,
        blockchain_tx_hash TEXT,
        raw_text TEXT,
        status TEXT DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS entities (
        id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        role TEXT,
        aliases TEXT, -- JSON array
        raw_span TEXT,
        span_start INTEGER,
        span_end INTEGER,
        verification_status TEXT DEFAULT 'VERIFIED',
        details TEXT, -- JSON object
        PRIMARY KEY (id, case_id),
        FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS graph_nodes (
        id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        label TEXT NOT NULL,
        category TEXT NOT NULL,
        sublabel TEXT,
        node_type TEXT DEFAULT 'ACTION',
        community_id INTEGER DEFAULT 0,
        betweenness_score REAL DEFAULT 0.0,
        is_broker BOOLEAN DEFAULT 0,
        is_locked BOOLEAN DEFAULT 0,
        is_ghost BOOLEAN DEFAULT 0,
        x REAL,
        y REAL,
        details TEXT, -- JSON object
        PRIMARY KEY (id, case_id),
        FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS graph_edges (
        id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        label TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        source_type TEXT DEFAULT 'FIR',
        evidence_ref TEXT,
        is_suspicious BOOLEAN DEFAULT 0,
        PRIMARY KEY (id, case_id),
        FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS facts (
        id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        fact_id TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp TEXT,
        location TEXT,
        source TEXT DEFAULT 'FIR',
        is_locked BOOLEAN DEFAULT 0,
        evidence_ids TEXT, -- JSON array
        PRIMARY KEY (id, case_id),
        FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS patterns (
        id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        pattern_id TEXT NOT NULL,
        title TEXT NOT NULL,
        pattern_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        involved_nodes TEXT, -- JSON array
        supporting_evidence TEXT, -- JSON object
        investigative_advice TEXT,
        PRIMARY KEY (id, case_id),
        FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evidence_items (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        sha256_hash TEXT NOT NULL,
        file_size_bytes INTEGER DEFAULT 0,
        ingestion_timestamp TEXT,
        blockchain_tx_hash TEXT,
        FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ledger_blocks (
        block_id INTEGER PRIMARY KEY AUTOINCREMENT,
        block_number INTEGER NOT NULL,
        fir_number TEXT NOT NULL,
        police_station TEXT NOT NULL,
        investigating_officer TEXT NOT NULL,
        root_case_hash TEXT NOT NULL,
        file_sha256 TEXT NOT NULL,
        blockchain_tx_hash TEXT NOT NULL UNIQUE,
        timestamp TEXT NOT NULL,
        file_hashes TEXT, -- JSON object
        contract_address TEXT,
        ledger_mode TEXT DEFAULT 'sovereign-local',
        legal_declaration TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_entities_case ON entities(case_id);
    CREATE INDEX IF NOT EXISTS idx_nodes_case ON graph_nodes(case_id);
    CREATE INDEX IF NOT EXISTS idx_edges_case ON graph_edges(case_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_tx ON ledger_blocks(blockchain_tx_hash);
    CREATE INDEX IF NOT EXISTS idx_ledger_hash ON ledger_blocks(root_case_hash);
    """)
    conn.commit()
    conn.close()

# Auto-initialize database schema on load
init_db()
