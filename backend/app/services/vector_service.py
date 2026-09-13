import os
from typing import Dict, Any, List, Optional
import chromadb
from chromadb.config import Settings
from ..core.database import get_root_data_dir, get_knowledge_base_dir


class VectorService:
    """
    ChromaDB Vector Knowledge Base for Semantic Legal Forensics & Cross-Case Matching.
    Persists locally in root NyayaGraph/data/knowledge_base/chroma_db directory.
    """

    def __init__(self, persist_dir: Optional[str] = None):
        self.persist_dir = persist_dir or os.environ.get(
            "CHROMA_PERSIST_DIR",
            os.path.join(get_knowledge_base_dir(), "chroma_db")
        )
        os.makedirs(self.persist_dir, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=self.persist_dir,
            settings=Settings(anonymized_telemetry=False)
        )
        self.cases_col = self.client.get_or_create_collection(
            name="case_narratives",
            metadata={"description": "FIR texts, Modus Operandi & Allegations for Semantic Cross-Case Matching"}
        )
        self.suspects_col = self.client.get_or_create_collection(
            name="suspect_dossiers",
            metadata={"description": "Criminal aliases, behavioral traits & suspect profiles"}
        )

    def index_case(
        self,
        case_id: str,
        fir_number: str,
        police_station: str,
        narrative: str,
        modus_operandi: str = "",
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Indexes or updates a case narrative and MO in ChromaDB."""
        doc_text = f"FIR {fir_number} at {police_station}.\nMODUS OPERANDI: {modus_operandi}\nNARRATIVE:\n{narrative.strip()}"
        meta = {
            "case_id": case_id,
            "fir_number": fir_number,
            "police_station": police_station,
            **(metadata or {})
        }
        self.cases_col.upsert(
            ids=[case_id],
            documents=[doc_text],
            metadatas=[meta]
        )

    def search_similar_cases(self, query_text: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Finds past cases with semantically similar modus operandi or crime pattern."""
        count = self.cases_col.count()
        if count == 0:
            return []
        k = min(count, top_k)
        results = self.cases_col.query(
            query_texts=[query_text],
            n_results=k
        )
        hits = []
        if results and results.get("ids"):
            ids = results["ids"][0]
            docs = results["documents"][0] if results.get("documents") else []
            metas = results["metadatas"][0] if results.get("metadatas") else []
            distances = results["distances"][0] if results.get("distances") else []
            for idx, cid in enumerate(ids):
                # Cosine/L2 distance to normalized similarity percentage
                dist = distances[idx] if idx < len(distances) else 1.0
                sim_pct = max(0.0, min(100.0, round((1.0 - (dist / 2.0)) * 100, 1)))
                hits.append({
                    "case_id": cid,
                    "similarity_score": sim_pct,
                    "distance": dist,
                    "metadata": metas[idx] if idx < len(metas) else {},
                    "document_snippet": docs[idx][:250] if idx < len(docs) else ""
                })
        return hits

    def index_suspect(
        self,
        suspect_id: str,
        case_id: str,
        name: str,
        role: str,
        aliases: List[str],
        details_str: str = ""
    ):
        """Indexes suspect profile for semantic person search across aliases."""
        alias_str = ", ".join(aliases) if aliases else "None"
        doc_text = f"Suspect: {name}. Aliases: {alias_str}. Role: {role}. Case: {case_id}. Details: {details_str}"
        self.suspects_col.upsert(
            ids=[f"{case_id}_{suspect_id}"],
            documents=[doc_text],
            metadatas={"case_id": case_id, "name": name, "role": role}
        )
