import os
import re
import json
from typing import List, Optional, Dict, Any
from ..models.schemas import CrossCaseResemblance, ExtractedEntity
from .vector_service import VectorService
from ..core.database import get_root_data_dir


class CrossCaseService:
    """
    Hybrid Cross-Case Resemblance Engine.
    Combines hard identifier collisions (phones, vehicles, UPIs, names) from SQLite
    with semantic modus operandi vector similarity from ChromaDB.
    """

    def __init__(self, archive_path: str = None):
        if not archive_path:
            archive_path = os.path.join(get_root_data_dir(), "historical_cases", "archive_cases.json")
        self.archive_path = archive_path
        self._vector_service = VectorService()
        self._load_archive()

    def _load_archive(self):
        self.archive = []
        if os.path.exists(self.archive_path):
            try:
                with open(self.archive_path, 'r', encoding='utf-8') as f:
                    self.archive = json.load(f)
            except Exception:
                self.archive = []

    def find_resemblance(self, entities: List[ExtractedEntity], active_case_mo: str = "") -> Optional[CrossCaseResemblance]:
        if not self.archive:
            return None

        active_phones = {re.sub(r'\D', '', e.name) for e in entities if getattr(e.category, "value", e.category) == "PHONE"}
        active_vehicles = {re.sub(r'[^A-Z0-9]', '', e.name.upper()) for e in entities if getattr(e.category, "value", e.category) == "VEHICLE"}
        active_names = {e.name.lower() for e in entities if getattr(e.category, "value", e.category) == "PERSON"}
        active_upis = {e.name.lower() for e in entities if getattr(e.category, "value", e.category) == "UPI_ID"}

        # 1. Check Semantic Modus Operandi Similarity via ChromaDB
        semantic_scores = {}
        if active_case_mo:
            vector_hits = self._vector_service.search_similar_cases(active_case_mo, top_k=5)
            for hit in vector_hits:
                semantic_scores[hit["case_id"]] = hit["similarity_score"]

        best_match = None
        highest_score = 0.0

        for past_case in self.archive:
            score = 0.0
            overlap_dict = {"phones": [], "vehicles": [], "suspect_names": [], "upi_ids": []}

            # Check phone collisions
            past_phones = past_case.get("key_identifiers", {}).get("phones", [])
            for p in past_phones:
                clean_p = re.sub(r'\D', '', p)
                if clean_p in active_phones:
                    score += 35.0
                    overlap_dict["phones"].append(p)

            # Check vehicle collisions
            past_vehs = past_case.get("key_identifiers", {}).get("vehicles", [])
            for v in past_vehs:
                clean_v = re.sub(r'[^A-Z0-9]', '', v.upper())
                if clean_v in active_vehicles:
                    score += 25.0
                    overlap_dict["vehicles"].append(v)

            # Check suspect name / alias collisions
            past_names = past_case.get("key_identifiers", {}).get("suspect_names", [])
            for n in past_names:
                for an in active_names:
                    if n.lower() in an or an in n.lower():
                        score += 30.0
                        overlap_dict["suspect_names"].append(n)
                        break

            # Check UPI ID collisions
            past_upis = past_case.get("key_identifiers", {}).get("upi_ids", [])
            for u in past_upis:
                if u.lower() in active_upis:
                    score += 25.0
                    overlap_dict["upi_ids"].append(u)

            # Incorporate ChromaDB semantic similarity bonus
            past_cid = past_case.get("case_id")
            if past_cid in semantic_scores:
                # Add scaled semantic score
                score += semantic_scores[past_cid] * 0.25

            if score > highest_score and score >= 40.0:
                highest_score = score
                best_match = (past_case, overlap_dict, score)

        if not best_match:
            return None

        matched_case, overlap_dict, raw_score = best_match
        norm_percentage = min(98.5, max(52.0, raw_score))

        return CrossCaseResemblance(
            matched_case_id=matched_case.get("case_id", ""),
            matched_fir_number=matched_case.get("fir_number", ""),
            police_station=matched_case.get("police_station", ""),
            investigating_officer=matched_case.get("investigating_officer", ""),
            io_contact=matched_case.get("io_contact", ""),
            resemblance_percentage=round(norm_percentage, 1),
            overlapping_identifiers=overlap_dict,
            syndicate_structure=matched_case.get("syndicate_structure", ""),
            recovery_tactics_and_leads=matched_case.get("recovery_tactics_and_leads", ""),
            recommended_action=(
                f"High resemblance ({round(norm_percentage, 1)}%) detected with {matched_case.get('fir_number')} "
                f"handled by {matched_case.get('investigating_officer')}. Direct IO-to-IO liaison recommended "
                f"to obtain custodial interrogation notes and freeze shared syndicate bank accounts."
            )
        )
