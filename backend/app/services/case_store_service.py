"""
Persistent case registry backed by SQLite (data/nyayagraph.db) & ChromaDB (data/chroma_db).
Consolidates all storage in root NyayaGraph/data directory.
"""
import os
import json
import sqlite3
from typing import Dict, List, Optional, Any

from ..core.database import get_db_path, get_connection, init_db, get_root_data_dir
from .vector_service import VectorService


def _clean_val(val, default=""):
    if val is None:
        return default
    if hasattr(val, "value"):
        return str(val.value)
    s = str(val).strip()
    if "." in s:
        s = s.split(".")[-1]
    return s


class CaseStoreService:
    def __init__(self, db_path: Optional[str] = None, blockchain=None):
        self.db_path = db_path or get_db_path()
        self._blockchain = blockchain
        self._vector_service = VectorService()
        init_db()
        self.ensure_seeded()

    # ---------- CRUD ----------

    def list_cases(self) -> List[dict]:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT case_id FROM cases ORDER BY created_at DESC")
        rows = c.fetchall()
        conn.close()

        results = []
        for r in rows:
            case = self.get_case(r["case_id"])
            if case:
                results.append(case)
        return results

    def get_case(self, case_id: str) -> Optional[dict]:
        conn = get_connection()
        c = conn.cursor()

        # 1. Fetch Case Row
        c.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,))
        case_row = c.fetchone()
        if not case_row:
            conn.close()
            return None

        # 2. Fetch Entities
        c.execute("SELECT * FROM entities WHERE case_id = ?", (case_id,))
        ent_rows = c.fetchall()
        entities = []
        for er in ent_rows:
            entities.append({
                "id": er["id"],
                "name": er["name"],
                "category": _clean_val(er["category"]),
                "role": er["role"],
                "aliases": json.loads(er["aliases"] or "[]"),
                "raw_span": er["raw_span"],
                "span_start": er["span_start"],
                "span_end": er["span_end"],
                "verification_status": _clean_val(er["verification_status"], "VERIFIED"),
                "details": json.loads(er["details"] or "{}")
            })

        # 3. Fetch Graph Nodes
        c.execute("SELECT * FROM graph_nodes WHERE case_id = ?", (case_id,))
        node_rows = c.fetchall()
        nodes = []
        broker_id = None
        for nr in node_rows:
            is_br = bool(nr["is_broker"])
            if is_br:
                broker_id = nr["id"]
            nodes.append({
                "id": nr["id"],
                "label": nr["label"],
                "category": _clean_val(nr["category"]),
                "sublabel": nr["sublabel"],
                "node_type": _clean_val(nr["node_type"], "ACTION"),
                "community_id": nr["community_id"],
                "betweenness_score": nr["betweenness_score"],
                "is_broker": is_br,
                "is_locked": bool(nr["is_locked"]),
                "is_ghost": bool(nr["is_ghost"]),
                "x": nr["x"],
                "y": nr["y"],
                "details": json.loads(nr["details"] or "{}")
            })

        # 4. Fetch Graph Edges
        c.execute("SELECT * FROM graph_edges WHERE case_id = ?", (case_id,))
        edge_rows = c.fetchall()
        edges = []
        for er in edge_rows:
            edges.append({
                "id": er["id"],
                "source": er["source"],
                "target": er["target"],
                "label": er["label"],
                "weight": er["weight"],
                "source_type": er["source_type"],
                "evidence_ref": er["evidence_ref"],
                "is_suspicious": bool(er["is_suspicious"])
            })

        # 5. Fetch Facts
        c.execute("SELECT * FROM facts WHERE case_id = ?", (case_id,))
        fact_rows = c.fetchall()
        facts = []
        for fr in fact_rows:
            facts.append({
                "fact_id": fr["fact_id"],
                "category": _clean_val(fr["category"]),
                "description": fr["description"],
                "timestamp": fr["timestamp"],
                "location": fr["location"],
                "source": fr["source"],
                "is_locked": bool(fr["is_locked"]),
                "evidence_ids": json.loads(fr["evidence_ids"] or "[]")
            })

        # 6. Fetch Patterns
        c.execute("SELECT * FROM patterns WHERE case_id = ?", (case_id,))
        pat_rows = c.fetchall()
        patterns = []
        for pr in pat_rows:
            patterns.append({
                "pattern_id": pr["pattern_id"],
                "title": pr["title"],
                "pattern_type": _clean_val(pr["pattern_type"]),
                "severity": _clean_val(pr["severity"]),
                "description": pr["description"],
                "involved_nodes": json.loads(pr["involved_nodes"] or "[]"),
                "supporting_evidence": json.loads(pr["supporting_evidence"] or "{}"),
                "investigative_advice": pr["investigative_advice"]
            })

        conn.close()

        total_communities = len(set(n["community_id"] for n in nodes)) if nodes else 1
        broker_node = next((n for n in nodes if n["is_broker"]), None)

        graph_obj = {
            "case_id": case_id,
            "fir_number": case_row["fir_number"],
            "police_station": case_row["police_station"],
            "nodes": nodes,
            "edges": edges,
            "central_broker_id": broker_id,
            "total_communities": total_communities,
            "stats": {
                "total_nodes": len(nodes),
                "total_edges": len(edges),
                "central_broker": broker_node["label"] if broker_node else None,
                "broker_score": broker_node["betweenness_score"] if broker_node else 0.0,
                "modularity_cells": total_communities
            }
        }

        return {
            "case_id": case_id,
            "fir_number": case_row["fir_number"],
            "police_station": case_row["police_station"],
            "date_time": case_row["date_time"] or "",
            "sha256_hash": case_row["sha256_hash"] or "",
            "blockchain_tx_hash": case_row["blockchain_tx_hash"] or "",
            "entities": entities,
            "facts": facts,
            "graph": graph_obj,
            "patterns": patterns,
            "cross_case_match": None
        }

    def save_case(self, result: dict) -> dict:
        conn = get_connection()
        c = conn.cursor()

        cid = result["case_id"]
        fir_no = result["fir_number"]
        ps = result["police_station"]
        dt = result.get("date_time", "")
        sha = result.get("sha256_hash", "")
        tx = result.get("blockchain_tx_hash", "")

        # 1. Insert Case
        c.execute("""
            INSERT OR REPLACE INTO cases (
                case_id, fir_number, police_station, date_time, sha256_hash, blockchain_tx_hash
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (cid, fir_no, ps, dt, sha, tx))

        # 2. Insert Entities
        for ent in result.get("entities", []):
            eid = ent["id"] if isinstance(ent, dict) else ent.id
            name = ent["name"] if isinstance(ent, dict) else ent.name
            cat = ent["category"] if isinstance(ent, dict) else ent.category
            role = ent.get("role") if isinstance(ent, dict) else ent.role
            aliases = ent.get("aliases", []) if isinstance(ent, dict) else ent.aliases
            rspan = ent.get("raw_span") if isinstance(ent, dict) else ent.raw_span
            s_start = ent.get("span_start") if isinstance(ent, dict) else ent.span_start
            s_end = ent.get("span_end") if isinstance(ent, dict) else ent.span_end
            status = ent.get("verification_status", "VERIFIED") if isinstance(ent, dict) else ent.verification_status
            details = ent.get("details", {}) if isinstance(ent, dict) else ent.details

            cat_clean = _clean_val(cat)
            status_clean = _clean_val(status, "VERIFIED")

            c.execute("""
                INSERT OR REPLACE INTO entities (
                    id, case_id, name, category, role, aliases, raw_span,
                    span_start, span_end, verification_status, details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                eid, cid, name, cat_clean, role, json.dumps(aliases), rspan,
                s_start, s_end, status_clean, json.dumps(details)
            ))

            # Index into ChromaDB
            if cat_clean == "PERSON":
                self._vector_service.index_suspect(
                    suspect_id=eid, case_id=cid, name=name,
                    role=role or "Suspect", aliases=aliases, details_str=json.dumps(details)
                )

        # 3. Insert Graph Nodes
        graph = result.get("graph", {})
        nodes = graph.get("nodes", []) if isinstance(graph, dict) else graph.nodes
        for n in nodes:
            nid = n["id"] if isinstance(n, dict) else n.id
            lbl = n["label"] if isinstance(n, dict) else n.label
            ncat = n["category"] if isinstance(n, dict) else n.category
            sublbl = n.get("sublabel") if isinstance(n, dict) else n.sublabel
            ntype = n.get("node_type", "ACTION") if isinstance(n, dict) else n.node_type
            comm_id = n.get("community_id", 0) if isinstance(n, dict) else n.community_id
            bscore = n.get("betweenness_score", 0.0) if isinstance(n, dict) else n.betweenness_score
            is_br = int(n.get("is_broker", False) if isinstance(n, dict) else n.is_broker)
            is_lock = int(n.get("is_locked", False) if isinstance(n, dict) else n.is_locked)
            is_gh = int(n.get("is_ghost", False) if isinstance(n, dict) else n.is_ghost)
            nx_val = n.get("x") if isinstance(n, dict) else n.x
            ny_val = n.get("y") if isinstance(n, dict) else n.y
            ndetails = n.get("details", {}) if isinstance(n, dict) else n.details

            c.execute("""
                INSERT OR REPLACE INTO graph_nodes (
                    id, case_id, label, category, sublabel, node_type, community_id,
                    betweenness_score, is_broker, is_locked, is_ghost, x, y, details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                nid, cid, lbl, _clean_val(ncat), sublbl, _clean_val(ntype, "ACTION"), comm_id,
                bscore, is_br, is_lock, is_gh, nx_val, ny_val, json.dumps(ndetails)
            ))

        # 4. Insert Graph Edges
        edges = graph.get("edges", []) if isinstance(graph, dict) else graph.edges
        for e in edges:
            ed_id = e["id"] if isinstance(e, dict) else e.id
            src = e["source"] if isinstance(e, dict) else e.source
            tgt = e["target"] if isinstance(e, dict) else e.target
            elbl = e["label"] if isinstance(e, dict) else e.label
            ewt = e.get("weight", 1.0) if isinstance(e, dict) else e.weight
            estype = e.get("source_type", "FIR") if isinstance(e, dict) else e.source_type
            eref = e.get("evidence_ref") if isinstance(e, dict) else e.evidence_ref
            esus = int(e.get("is_suspicious", False) if isinstance(e, dict) else e.is_suspicious)

            c.execute("""
                INSERT OR REPLACE INTO graph_edges (
                    id, case_id, source, target, label, weight, source_type, evidence_ref, is_suspicious
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (ed_id, cid, src, tgt, elbl, ewt, estype, eref, esus))

        # 5. Insert Facts
        facts = result.get("facts", [])
        for f in facts:
            fid = f["fact_id"] if isinstance(f, dict) else f.fact_id
            fcat = f["category"] if isinstance(f, dict) else f.category
            fdesc = f["description"] if isinstance(f, dict) else f.description
            ftm = f.get("timestamp") if isinstance(f, dict) else f.timestamp
            floc = f.get("location") if isinstance(f, dict) else f.location
            fsrc = f.get("source", "FIR") if isinstance(f, dict) else f.source
            flock = int(f.get("is_locked", False) if isinstance(f, dict) else f.is_locked)
            fev = f.get("evidence_ids", []) if isinstance(f, dict) else f.evidence_ids

            c.execute("""
                INSERT OR REPLACE INTO facts (
                    id, case_id, fact_id, category, description, timestamp, location, source, is_locked, evidence_ids
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"{cid}_{fid}", cid, fid, _clean_val(fcat), fdesc, ftm, floc, fsrc, flock, json.dumps(fev)))

        # 6. Insert Patterns
        patterns = result.get("patterns", [])
        for p in patterns:
            pid = p["pattern_id"] if isinstance(p, dict) else p.pattern_id
            pttl = p["title"] if isinstance(p, dict) else p.title
            ptyp = p["pattern_type"] if isinstance(p, dict) else p.pattern_type
            psev = p["severity"] if isinstance(p, dict) else p.severity
            pdesc = p["description"] if isinstance(p, dict) else p.description
            pnodes = p.get("involved_nodes", []) if isinstance(p, dict) else p.involved_nodes
            pevid = p.get("supporting_evidence", {}) if isinstance(p, dict) else p.supporting_evidence
            padv = p.get("investigative_advice", "") if isinstance(p, dict) else p.investigative_advice

            c.execute("""
                INSERT OR REPLACE INTO patterns (
                    id, case_id, pattern_id, title, pattern_type, severity, description,
                    involved_nodes, supporting_evidence, investigative_advice
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"{cid}_{pid}", cid, pid, pttl, _clean_val(ptyp), _clean_val(psev), pdesc,
                json.dumps(pnodes), json.dumps(pevid), padv
            ))

        conn.commit()
        conn.close()

        # 7. Index Case into ChromaDB Vector Knowledge Base
        narrative_parts = [f.get("description") if isinstance(f, dict) else f.description for f in facts]
        mo_desc = next((d for d in narrative_parts if "Digital Arrest" in d or "Scam" in d or "Fraud" in d), "")
        self._vector_service.index_case(
            case_id=cid,
            fir_number=fir_no,
            police_station=ps,
            narrative="\n".join(narrative_parts),
            modus_operandi=mo_desc,
            metadata={"date_time": dt, "sha256": sha}
        )

        return result

    # ---------- Seeding ----------

    def ensure_seeded(self) -> List[dict]:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) as cnt FROM cases")
        cnt = c.fetchone()["cnt"]
        conn.close()

        if cnt > 0:
            return self.list_cases()

        json_reg = os.path.join(get_root_data_dir(), "cases_registry.json")
        if os.path.exists(json_reg):
            from ...scripts.migrate_json_to_sqlite import migrate
            migrate()
            return self.list_cases()

        return []
