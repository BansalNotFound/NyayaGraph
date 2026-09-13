"""
Data Migration Script: Flat JSON -> Dual SQLite (nyayagraph.db) + ChromaDB (data/chroma_db)
Migrates cases_registry.json and ledger_store.json into SQLite & ChromaDB located in root data/ folder.
"""
import os
import sys
import json
import sqlite3

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import get_db_path, get_connection, init_db, get_root_data_dir
from app.services.vector_service import VectorService


def migrate():
    print("[*] Initializing SQLite schema at:", get_db_path())
    init_db()
    conn = get_connection()
    c = conn.cursor()

    vector_service = VectorService()

    data_dir = get_root_data_dir()
    json_registry_path = os.path.join(data_dir, "cases_registry.json")
    json_ledger_path = os.path.join(data_dir, "ledger_store.json")

    # 1. Migrate Blockchain Blocks
    migrated_blocks = 0
    if os.path.exists(json_ledger_path):
        with open(json_ledger_path, "r", encoding="utf-8") as f:
            blocks = json.load(f)
        for b in blocks:
            c.execute("""
                INSERT OR REPLACE INTO ledger_blocks (
                    block_number, fir_number, police_station, investigating_officer,
                    root_case_hash, file_sha256, blockchain_tx_hash, timestamp,
                    file_hashes, contract_address, ledger_mode, legal_declaration
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                b.get("block_number", 0),
                b.get("fir_number", ""),
                b.get("police_station", ""),
                b.get("investigating_officer", ""),
                b.get("root_case_hash", b.get("file_sha256", "")),
                b.get("file_sha256", ""),
                b.get("blockchain_tx_hash", ""),
                b.get("timestamp", ""),
                json.dumps(b.get("file_hashes", {})),
                b.get("contract_address", ""),
                b.get("ledger_mode", "sovereign-local"),
                b.get("legal_declaration", "")
            ))
            migrated_blocks += 1
        print(f"[+] Migrated {migrated_blocks} blockchain ledger blocks into SQLite")

    # 2. Migrate Cases, Entities, Nodes, Edges, Facts, Patterns
    migrated_cases = 0
    migrated_nodes = 0
    migrated_edges = 0
    migrated_entities = 0

    if os.path.exists(json_registry_path):
        with open(json_registry_path, "r", encoding="utf-8") as f:
            registry = json.load(f)
        cases_list = list(registry.values()) if isinstance(registry, dict) else registry

        for case in cases_list:
            cid = case["case_id"]
            fir_no = case.get("fir_number", "")
            ps = case.get("police_station", "")
            dt = case.get("date_time", "")
            sha = case.get("sha256_hash", "")
            tx = case.get("blockchain_tx_hash", "")
            raw_text = ""

            # Check if there is raw text in facts or transcript
            facts = case.get("facts", [])
            for f in facts:
                raw_text += f"{f.get('category')}: {f.get('description')}\n"

            # Insert Case Record
            c.execute("""
                INSERT OR REPLACE INTO cases (
                    case_id, fir_number, police_station, date_time, sha256_hash, blockchain_tx_hash, raw_text
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (cid, fir_no, ps, dt, sha, tx, raw_text))

            # Insert Entities
            for ent in case.get("entities", []):
                c.execute("""
                    INSERT OR REPLACE INTO entities (
                        id, case_id, name, category, role, aliases, raw_span,
                        span_start, span_end, verification_status, details
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    ent["id"], cid, ent["name"], ent["category"], ent.get("role"),
                    json.dumps(ent.get("aliases", [])), ent.get("raw_span"),
                    ent.get("span_start"), ent.get("span_end"),
                    ent.get("verification_status", "VERIFIED"),
                    json.dumps(ent.get("details", {}))
                ))
                migrated_entities += 1

                # Index suspect into ChromaDB
                if ent.get("category") == "PERSON":
                    vector_service.index_suspect(
                        suspect_id=ent["id"],
                        case_id=cid,
                        name=ent["name"],
                        role=ent.get("role", "Suspect"),
                        aliases=ent.get("aliases", []),
                        details_str=json.dumps(ent.get("details", {}))
                    )

            # Insert Graph Nodes
            graph = case.get("graph", {}) or {}
            for node in graph.get("nodes", []):
                c.execute("""
                    INSERT OR REPLACE INTO graph_nodes (
                        id, case_id, label, category, sublabel, node_type, community_id,
                        betweenness_score, is_broker, is_locked, is_ghost, x, y, details
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    node["id"], cid, node["label"], node["category"], node.get("sublabel"),
                    node.get("node_type", "ACTION"), node.get("community_id", 0),
                    node.get("betweenness_score", 0.0), int(node.get("is_broker", False)),
                    int(node.get("is_locked", False)), int(node.get("is_ghost", False)),
                    node.get("x"), node.get("y"), json.dumps(node.get("details", {}))
                ))
                migrated_nodes += 1

            # Insert Graph Edges
            for edge in graph.get("edges", []):
                c.execute("""
                    INSERT OR REPLACE INTO graph_edges (
                        id, case_id, source, target, label, weight, source_type, evidence_ref, is_suspicious
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    edge["id"], cid, edge["source"], edge["target"], edge["label"],
                    edge.get("weight", 1.0), edge.get("source_type", "FIR"),
                    edge.get("evidence_ref"), int(edge.get("is_suspicious", False))
                ))
                migrated_edges += 1

            # Insert Facts
            for fact in facts:
                c.execute("""
                    INSERT OR REPLACE INTO facts (
                        id, case_id, fact_id, category, description, timestamp, location, source, is_locked, evidence_ids
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f"{cid}_{fact['fact_id']}", cid, fact["fact_id"], fact["category"],
                    fact["description"], fact.get("timestamp"), fact.get("location"),
                    fact.get("source", "FIR"), int(fact.get("is_locked", False)),
                    json.dumps(fact.get("evidence_ids", []))
                ))

            # Insert Patterns
            for pat in case.get("patterns", []):
                c.execute("""
                    INSERT OR REPLACE INTO patterns (
                        id, case_id, pattern_id, title, pattern_type, severity, description,
                        involved_nodes, supporting_evidence, investigative_advice
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f"{cid}_{pat['pattern_id']}", cid, pat["pattern_id"], pat["title"],
                    pat["pattern_type"], pat["severity"], pat["description"],
                    json.dumps(pat.get("involved_nodes", [])),
                    json.dumps(pat.get("supporting_evidence", {})),
                    pat.get("investigative_advice", "")
                ))

            # Index Case into ChromaDB
            mo = next((f["description"] for f in facts if f.get("category") == "MODUS_OPERANDI"), "")
            vector_service.index_case(
                case_id=cid,
                fir_number=fir_no,
                police_station=ps,
                narrative=raw_text or mo,
                modus_operandi=mo,
                metadata={"date_time": dt, "sha256": sha}
            )

            migrated_cases += 1
            print(f"[+] Migrated {cid} ({fir_no}) -> {len(graph.get('nodes', []))} nodes, {len(graph.get('edges', []))} edges")

    conn.commit()
    conn.close()

    print("\n[OK] Migration Complete!")
    print(f"     - Database: {get_db_path()}")
    print(f"     - Vector DB: {vector_service.persist_dir}")
    print(f"     - Cases: {migrated_cases}")
    print(f"     - Entities: {migrated_entities}")
    print(f"     - Graph Nodes: {migrated_nodes}")
    print(f"     - Graph Edges: {migrated_edges}")
    print(f"     - Ledger Blocks: {migrated_blocks}")


if __name__ == "__main__":
    migrate()
