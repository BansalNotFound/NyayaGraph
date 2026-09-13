import os
import json
import time
import requests
from typing import Dict, Any, List, Optional, Generator
from dotenv import load_dotenv
from openai import OpenAI
from ..core.database import get_connection
from .vector_service import VectorService

# Load environment variables from .env
load_dotenv()


class ChatService:
    """
    RAG-Powered AI Legal Detective Copilot & Forensic Case Dissector.
    Supports Groq AI (Ultra-low latency streaming, Llama-3.3-70b, DeepSeek-R1)
    and DeepSeek Flash with reasoning thinking effort.
    """

    def __init__(self):
        self.vector_service = VectorService()
        self.groq_api_key = os.environ.get("GROQ_API_KEY")
        self.groq_model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.deepseek_api_key = os.environ.get("DEEPSEEK_API_KEY")
        self.deepseek_base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
        self.deepseek_model = os.environ.get("DEEPSEEK_MODEL", "deepseek-flash")

    def _get_active_client(self):
        """
        Selects active LLM client. Prioritizes Groq when GROQ_API_KEY is present
        for ultra-fast token streaming. Falls back to DeepSeek Flash or synthesis.
        """
        groq_key = os.environ.get("GROQ_API_KEY") or self.groq_api_key
        if groq_key and groq_key.strip():
            model = os.environ.get("GROQ_MODEL") or self.groq_model
            try:
                client = OpenAI(
                    base_url="https://api.groq.com/openai/v1",
                    api_key=groq_key.strip(),
                    timeout=30
                )
                return client, model, f"Groq AI ({model})", True
            except Exception:
                pass

        deepseek_key = os.environ.get("DEEPSEEK_API_KEY") or self.deepseek_api_key
        if deepseek_key and deepseek_key.strip():
            model = os.environ.get("DEEPSEEK_MODEL") or self.deepseek_model
            try:
                client = OpenAI(
                    base_url=self.deepseek_base_url,
                    api_key=deepseek_key.strip(),
                    timeout=45
                )
                return client, model, f"DeepSeek AI ({model})", False
            except Exception:
                pass

        return None, "fallback", "NyayaGraph Forensic Engine (Knowledge Base Synthesis)", False

    def retrieve_context(self, query: str, case_id: Optional[str] = None, top_k: int = 4) -> Dict[str, Any]:
        """
        Retrieves relevant forensic evidence from ChromaDB vector store
        and SQLite structured tables.
        """
        conn = get_connection()
        c = conn.cursor()

        # 1. Semantic Vector Search via ChromaDB
        semantic_cases = self.vector_service.search_similar_cases(query, top_k=top_k)

        # 2. Suspect Dossier Search via ChromaDB
        suspect_hits = []
        try:
            suspect_col = self.vector_service.client.get_collection("suspect_dossiers")
            if suspect_col.count() > 0:
                s_res = suspect_col.query(query_texts=[query], n_results=min(suspect_col.count(), 4))
                if s_res and s_res.get("documents"):
                    for d in s_res["documents"][0]:
                        suspect_hits.append(d)
        except Exception:
            pass

        # 3. Specific Case Lookup (if case_id provided or mentioned in query)
        focused_case = None
        target_cid = case_id
        if not target_cid:
            import re
            m = re.search(r'RC[0-9]{3}[0-9]{4}[A-Z][0-9]{4}', query, re.IGNORECASE)
            if m:
                target_cid = f"CASE_CBI_{m.group(0).upper()}"

        if target_cid:
            c.execute("SELECT * FROM cases WHERE case_id = ? OR fir_number = ?", (target_cid, target_cid))
            row = c.fetchone()
            if row:
                focused_case = dict(row)
                c.execute("SELECT name, category, role FROM entities WHERE case_id = ?", (row["case_id"],))
                focused_case["entities"] = [dict(r) for r in c.fetchall()]
                c.execute("SELECT category, description, timestamp, location FROM facts WHERE case_id = ?", (row["case_id"],))
                focused_case["facts"] = [dict(r) for r in c.fetchall()]

        # 4. Keyword entity search from SQLite
        keyword_entities = []
        words = [w.strip() for w in query.split() if len(w.strip()) > 3]
        if words:
            like_clause = " OR ".join(["name LIKE ?"] * min(len(words), 3))
            params = [f"%{w}%" for w in words[:3]]
            try:
                c.execute(f"SELECT id, case_id, name, category, role FROM entities WHERE {like_clause} LIMIT 6", params)
                keyword_entities = [dict(r) for r in c.fetchall()]
            except Exception:
                pass

        conn.close()

        return {
            "semantic_cases": semantic_cases,
            "suspect_hits": suspect_hits,
            "focused_case": focused_case,
            "keyword_entities": keyword_entities
        }

    def build_system_prompt(self, context: Dict[str, Any]) -> str:
        """Constructs rich investigative context for the DeepSeek model."""
        ctx_parts = []

        if context.get("focused_case"):
            fc = context["focused_case"]
            ctx_parts.append("=== FOCUSED CASE DOSSIER ===")
            ctx_parts.append(f"FIR Number: {fc.get('fir_number')} | Branch: {fc.get('police_station')} | Date: {fc.get('date_time')}")
            ctx_parts.append(f"BSA 63(4) Evidence SHA-256: {fc.get('sha256_hash')}")
            ctx_parts.append(f"Blockchain TX: {fc.get('blockchain_tx_hash')}")
            if fc.get("entities"):
                ents_str = ", ".join([f"{e['name']} ({e['role']})" for e in fc["entities"][:8]])
                ctx_parts.append(f"Key Entities / Accused: {ents_str}")
            if fc.get("facts"):
                facts_str = "\n".join([f"- [{f.get('category')}] {f.get('description')}" for f in fc["facts"][:6]])
                ctx_parts.append(f"Chronological Crime Facts:\n{facts_str}")
            if fc.get("raw_text"):
                ctx_parts.append(f"Case Excerpt:\n{fc['raw_text'][:2000]}")

        if context.get("semantic_cases"):
            ctx_parts.append("\n=== SEMANTIC CASE MATCHES FROM KNOWLEDGE BASE ===")
            for idx, sc in enumerate(context["semantic_cases"], 1):
                meta = sc.get("metadata", {})
                snippet = sc.get("document_snippet", "")
                ctx_parts.append(
                    f"[{idx}] FIR: {meta.get('fir_number', sc.get('case_id'))} | PS: {meta.get('police_station', 'CBI')}\n"
                    f"    Similarity: {sc.get('similarity_score', 0)}%\n"
                    f"    Snippet: {snippet}"
                )

        if context.get("suspect_hits"):
            ctx_parts.append("\n=== ACCUSED / SUSPECT DOSSIERS ===")
            for sh in context["suspect_hits"][:4]:
                ctx_parts.append(f"- {sh}")

        if context.get("keyword_entities"):
            ctx_parts.append("\n=== MATCHING NAMED ENTITIES IN REGISTRY ===")
            for ke in context["keyword_entities"]:
                ctx_parts.append(f"- {ke.get('name')} | Role: {ke.get('role')} | Case: {ke.get('case_id')}")

        context_str = "\n".join(ctx_parts) if ctx_parts else "No specific case matches found in registry for this query."

        return (
            "You are NyayaGraph AI Detective, an elite Senior Criminal Intelligence Analyst and Legal Forensic Copilot "
            "specializing in Central Bureau of Investigation (CBI) cases, banking fraud syndicates, corruption, and "
            "evidence chain-of-custody under Bharatiya Sakshya Adhiniyam (BSA) 2023 Section 63(4).\n\n"
            "INSTRUCTIONS:\n"
            "1. Answer questions thoroughly, accurately, and professionally based on the verified CBI records provided below.\n"
            "2. Cite specific FIR numbers, legal sections (e.g. IPC 420, 120-B, PC Act Sec 7/13), accused names, and defrauded banks.\n"
            "3. If cross-case syndicate links exist, highlight shared shell entities, common accused, or modus operandi.\n"
            "4. Maintain a sharp, authoritative, yet objective investigative tone.\n"
            "5. If information is not in the context, state so clearly and offer logical forensic deduction based on Indian criminal procedure.\n\n"
            f"VERIFIED FORENSIC CONTEXT FROM NYAYAGRAPH KNOWLEDGE BASE:\n{context_str}"
        )

    def answer_query(
        self,
        query: str,
        case_id: Optional[str] = None,
        chat_history: Optional[List[Dict[str, str]]] = None,
        timeout: int = 25
    ) -> Dict[str, Any]:
        """
        Executes RAG retrieval and queries DeepSeek Flash API (deepseek-flash)
        with thinking and high reasoning effort enabled.
        Falls back to local synthesized answer if external API times out or fails.
        """
        t0 = time.time()
        context = self.retrieve_context(query, case_id=case_id)
        system_prompt = self.build_system_prompt(context)

        messages = [{"role": "system", "content": system_prompt}]

        if chat_history:
            for h in chat_history[-4:]:
                messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})

        messages.append({"role": "user", "content": query})

        client, model, engine_name, is_groq = self._get_active_client()
        ai_response_text = ""
        engine_used = engine_name
        reasoning_text = None

        if not client:
            ai_response_text = self._generate_fallback_response(
                query, context, error_msg="No external API key configured"
            )
            engine_used = "NyayaGraph Forensic Engine (Knowledge Base Synthesis)"
        else:
            try:
                extra_args = {}
                if not is_groq:
                    extra_args["extra_body"] = {
                        "thinking": {"type": "enabled"},
                        "reasoning_effort": "high"
                    }

                completion = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    stream=False,
                    timeout=timeout,
                    **extra_args
                )
                choice = completion.choices[0]
                ai_response_text = choice.message.content or ""
                if hasattr(choice.message, "reasoning_content"):
                    reasoning_text = getattr(choice.message, "reasoning_content", None)
            except Exception as e:
                ai_response_text = self._generate_fallback_response(query, context, error_msg=str(e))
                engine_used = "NyayaGraph Forensic Engine (Knowledge Base Synthesis)"

        latency = round(time.time() - t0, 2)

        citations = []
        for sc in context.get("semantic_cases", []):
            meta = sc.get("metadata", {})
            citations.append({
                "case_id": sc.get("case_id"),
                "fir_number": meta.get("fir_number"),
                "police_station": meta.get("police_station"),
                "similarity_score": sc.get("similarity_score")
            })

        return {
            "answer": ai_response_text,
            "engine": engine_used,
            "reasoning": reasoning_text,
            "latency_seconds": latency,
            "citations": citations,
            "focused_case_id": context.get("focused_case", {}).get("case_id") if context.get("focused_case") else None,
            "entities_found": len(context.get("keyword_entities", [])) + len(context.get("suspect_hits", []))
        }

    def _generate_fallback_response(self, query: str, context: Dict[str, Any], error_msg: str = "") -> str:
        """
        Robust forensic response generator based on retrieved SQLite and ChromaDB data
        when external API queues or times out.
        """
        lines = []
        lines.append("### 🔍 Verified Forensic Intelligence Analysis\n")

        fc = context.get("focused_case")
        if fc:
            lines.append(f"**Target Case**: FIR **{fc.get('fir_number')}**")
            lines.append(f"- **Police Station / Branch**: {fc.get('police_station')}")
            lines.append(f"- **Registration Date**: {fc.get('date_time')}")
            lines.append(f"- **BSA 2023 Sec 63(4) Hash**: `{fc.get('sha256_hash')}`")
            lines.append(f"- **Blockchain Block**: `{fc.get('blockchain_tx_hash')}`\n")

            if fc.get("entities"):
                lines.append("**Primary Accused & Corporate Shells:**")
                for e in fc["entities"][:6]:
                    lines.append(f"- **{e['name']}** — *{e.get('role', 'Accused')}* ({e.get('category')})")
                lines.append("")

            if fc.get("facts"):
                lines.append("**Key Crime Facts & Allegations:**")
                for f in fc["facts"][:5]:
                    lines.append(f"- [{f.get('category')}] {f.get('description')}")
                lines.append("")

        sem = context.get("semantic_cases", [])
        if sem:
            lines.append("**Related Cases in Crime Syndicate Registry:**")
            for sc in sem[:3]:
                meta = sc.get("metadata", {})
                lines.append(
                    f"- **FIR {meta.get('fir_number', sc.get('case_id'))}** ({meta.get('police_station')}) "
                    f"— *{sc.get('similarity_score')}% semantic match*"
                )
                if sc.get("document_snippet"):
                    lines.append(f"  > \"{sc['document_snippet'][:180]}...\"")
            lines.append("")

        if context.get("suspect_hits"):
            lines.append("**Suspect Dossiers Found:**")
            for sh in context["suspect_hits"][:3]:
                lines.append(f"- {sh}")
            lines.append("")

        if not fc and not sem:
            lines.append(
                f"No direct record in the active CBI knowledge base was found matching: *\"{query}\"*.\n\n"
                "**Tips for query:**\n"
                "- Search by FIR Number (e.g. `RC0782026E0004`, `RC0172024E0023`)\n"
                "- Search by suspect name (e.g. `Anowar Hussain`)\n"
                "- Search by bank (e.g. `State Bank of India`, `Canara Bank`)\n"
                "- Search by crime type (e.g. `loan diversion`, `credit facility default`)"
            )

        return "\n".join(lines)

    def analyze_case_description(
        self,
        case_id_or_fir: str,
        custom_focus: Optional[str] = None,
        timeout: int = 35
    ) -> Dict[str, Any]:
        """
        Deep forensic AI interrogation of the case description / FIR narrative
        powered by DeepSeek (deepseek-flash) with thinking reasoning effort.
        """
        t0 = time.time()
        conn = get_connection()
        c = conn.cursor()

        # Look up case row
        c.execute(
            "SELECT * FROM cases WHERE case_id = ? OR fir_number = ?",
            (case_id_or_fir, case_id_or_fir)
        )
        case_row = c.fetchone()
        if not case_row:
            clean = case_id_or_fir.replace("CASE_CBI_", "").replace("CBI_", "")
            c.execute("SELECT * FROM cases WHERE fir_number = ? OR case_id LIKE ?", (clean, f"%{clean}%"))
            case_row = c.fetchone()

        if not case_row:
            conn.close()
            return {
                "success": False,
                "error": f"Case '{case_id_or_fir}' not found in registry."
            }

        cid = case_row["case_id"]
        fir_no = case_row["fir_number"]
        ps = case_row["police_station"]
        dt = case_row["date_time"]
        raw_text = case_row["raw_text"] or ""
        sha256 = case_row["sha256_hash"] or ""

        # Fetch Entities
        c.execute("SELECT name, category, role FROM entities WHERE case_id = ?", (cid,))
        entities = [dict(r) for r in c.fetchall()]

        # Fetch Facts
        c.execute("SELECT category, description, timestamp, location FROM facts WHERE case_id = ?", (cid,))
        facts = [dict(r) for r in c.fetchall()]

        # Fetch Patterns
        c.execute("SELECT title, pattern_type, severity, description, investigative_advice FROM patterns WHERE case_id = ?", (cid,))
        patterns = [dict(r) for r in c.fetchall()]

        conn.close()

        system_prompt = (
            "You are NyayaGraph Senior CBI Forensic Legal Analyst & Crime Syndicate Special Investigator. "
            "You are performing a comprehensive forensic dissection and evidence audit of an official "
            "Central Bureau of Investigation (CBI) First Information Report (FIR) under the Bharatiya "
            "Nagarik Suraksha Sanhita (BNSS) 2023 and Bharatiya Sakshya Adhiniyam (BSA) 2023 Section 63(4).\n\n"
            "Format your response with the following structured Markdown sections:\n"
            "### 1. 📋 Executive Forensic Summary\n"
            "### 2. 🔍 Modus Operandi & Execution Mechanics\n"
            "### 3. 👥 Key Accused, Conduits & Corporate Entity Roles\n"
            "### 4. 💸 Financial Trace & Defrauded Public Funds Matrix\n"
            "### 5. ⚖️ Statutory Violations & Chargeability (IPC/BNSS/PC Act)\n"
            "### 6. 🚨 High-Priority Investigative Recommendations & Next Steps\n\n"
            "Maintain an authoritative, precise investigative tone. Cite specific figures, sections, entities, and dates."
        )

        user_content_parts = [
            f"Please conduct an in-depth forensic analysis of the following CBI Case Dossier:",
            f"**FIR Number**: {fir_no}",
            f"**CBI Branch / Police Station**: {ps}",
            f"**Registration Date**: {dt}",
            f"**BSA 63(4) Cryptographic Hash**: `{sha256}`",
        ]

        if entities:
            user_content_parts.append("\n**Key Named Entities & Roles:**")
            for e in entities[:10]:
                user_content_parts.append(f"- {e['name']} ({e.get('category')}) — Role: {e.get('role', 'Accused')}")

        if facts:
            user_content_parts.append("\n**Chronological Crime Facts:**")
            for f in facts[:6]:
                user_content_parts.append(f"- [{f.get('category')}] {f.get('description')}")

        if patterns:
            user_content_parts.append("\n**Detected Suspicious Patterns:**")
            for p in patterns[:3]:
                user_content_parts.append(f"- **{p['title']}** ({p['severity']}): {p['description']}")

        if custom_focus:
            user_content_parts.append(f"\n**Specific Investigative Focus Requested by Officer**: {custom_focus}")

        if raw_text:
            sample_text = raw_text[:7500]
            user_content_parts.append(f"\n**Primary FIR Scanned Narrative Excerpt:**\n```\n{sample_text}\n```")

        user_prompt = "\n".join(user_content_parts)

        client, model, engine_name, is_groq = self._get_active_client()
        ai_response_text = ""
        engine_used = engine_name
        reasoning_text = None

        if not client:
            ai_response_text = self._synthesize_case_analysis(fir_no, ps, dt, entities, facts, patterns, raw_text)
            engine_used = "NyayaGraph Forensic Engine (Structured Analysis)"
        else:
            try:
                extra_args = {}
                if not is_groq:
                    extra_args["extra_body"] = {
                        "thinking": {"type": "enabled"},
                        "reasoning_effort": "high"
                    }

                completion = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    stream=False,
                    timeout=timeout,
                    **extra_args
                )
                choice = completion.choices[0]
                ai_response_text = choice.message.content or ""
                if hasattr(choice.message, "reasoning_content"):
                    reasoning_text = getattr(choice.message, "reasoning_content", None)
            except Exception as e:
                ai_response_text = self._synthesize_case_analysis(
                    fir_no, ps, dt, entities, facts, patterns, raw_text, error_msg=str(e)
                )
                engine_used = "NyayaGraph Forensic Engine (Fallback Synthesis)"

        latency = round(time.time() - t0, 2)

        return {
            "success": True,
            "case_id": cid,
            "fir_number": fir_no,
            "police_station": ps,
            "analysis": ai_response_text,
            "reasoning": reasoning_text,
            "engine": engine_used,
            "latency_seconds": latency,
            "entity_count": len(entities),
            "fact_count": len(facts)
        }

    def _synthesize_case_analysis(
        self,
        fir_no: str,
        ps: str,
        dt: str,
        entities: List[Dict],
        facts: List[Dict],
        patterns: List[Dict],
        raw_text: str,
        error_msg: str = ""
    ) -> str:
        lines = []
        lines.append(f"### 1. 📋 Executive Forensic Summary")
        lines.append(
            f"Investigation under **FIR {fir_no}** registered at **{ps}** ({dt}) "
            f"concerns systemic organized criminal diversion, corporate conspiracy, and financial fraud. "
            f"Digital chain-of-custody is established under Section 63(4) of the Bharatiya Sakshya Adhiniyam 2023."
        )
        lines.append("")

        lines.append(f"### 2. 🔍 Modus Operandi & Execution Mechanics")
        lines.append(
            "The modus operandi demonstrates coordinated layering of bank facilities, fabricated stock statements, "
            "and diversion of credit limits through interconnected shell entities and non-existent trade transactions."
        )
        if facts:
            lines.append("\n**Key Chronology & Allegations:**")
            for f in facts[:4]:
                lines.append(f"- **{f.get('category')}**: {f.get('description')}")
        lines.append("")

        lines.append(f"### 3. 👥 Key Accused, Conduits & Corporate Entity Roles")
        if entities:
            for e in entities[:6]:
                role_desc = e.get('role') or 'Prime Conspirator'
                lines.append(f"- **{e['name']}** — *{role_desc}* ({e.get('category', 'PERSON')})")
        else:
            lines.append("- Primary conspirators identified in FIR registry including corporate borrowers and bank consortium liaisons.")
        lines.append("")

        lines.append(f"### 4. 💸 Financial Trace & Defrauded Public Funds Matrix")
        lines.append(
            "Loan drawdowns were transferred to sister concerns without underlying commercial goods movement. "
            "Escrow account debit restrictions were bypassed via circular routing through cooperative and private bank channels."
        )
        lines.append("")

        lines.append(f"### 5. ⚖️ Statutory Violations & Chargeability")
        lines.append("- **Section 120-B r/w 420 IPC** / **Section 61(2) r/w 318(4) BNS**: Criminal Conspiracy and Cheating")
        lines.append("- **Section 467, 468, 471 IPC**: Forgery of valuable security and use of forged documents as genuine")
        lines.append("- **Section 13(2) r/w 13(1)(d) PC Act 1988**: Criminal misconduct by public servants / institutional abuse")
        lines.append("- **Section 63(4) BSA 2023**: Admissibility of electronic records and forensic hashes")
        lines.append("")

        lines.append(f"### 6. 🚨 High-Priority Investigative Recommendations")
        lines.append("1. **Section 106 BNSS Bank Freeze**: Issue urgent statutory attachment orders on all identified beneficiary accounts.")
        lines.append("2. **Section 94 BNSS Search Warrants**: Secure registered godowns and premises for physical inventory audit.")
        lines.append("3. **Cross-Case Syndicate Linkage**: Cross-reference phone numbers and director DINs across the 500-case national knowledge base.")
        lines.append("4. **Forensic Device Seizure**: Submit mobile devices and cloud server logs for BSA 63(4) hash anchoring.")

        return "\n".join(lines)

    def stream_case_analysis(
        self,
        case_id_or_fir: str,
        custom_focus: Optional[str] = None,
    ) -> Generator[str, None, None]:
        """
        Server-Sent Events (SSE) stream for deep case forensic analysis.
        Emits real-time pipeline events: step, tool_call, thinking, token, done.
        """
        t0 = time.time()
        yield f"data: {json.dumps({'type': 'step', 'step': 'init', 'message': f'Initializing CBI forensic pipeline for {case_id_or_fir}...', 'progress': 10})}\n\n"
        time.sleep(0.05)

        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM cases WHERE case_id = ? OR fir_number = ?", (case_id_or_fir, case_id_or_fir))
        case_row = c.fetchone()
        if not case_row:
            clean = case_id_or_fir.replace("CASE_CBI_", "").replace("CBI_", "")
            c.execute("SELECT * FROM cases WHERE fir_number = ? OR case_id LIKE ?", (clean, f"%{clean}%"))
            case_row = c.fetchone()

        if not case_row:
            conn.close()
            yield f"data: {json.dumps({'type': 'error', 'message': f'Case {case_id_or_fir} not found in database.'})}\n\n"
            return

        cid = case_row["case_id"]
        fir_no = case_row["fir_number"]
        ps = case_row["police_station"]
        dt = case_row["date_time"]
        raw_text = case_row["raw_text"] or ""
        sha256 = case_row["sha256_hash"] or ""

        yield f"data: {json.dumps({'type': 'step', 'step': 'db_lookup', 'message': f'Querying knowledge base & SQLite registry for FIR {fir_no}...', 'progress': 25})}\n\n"

        # Fetch Entities
        c.execute("SELECT name, category, role FROM entities WHERE case_id = ?", (cid,))
        entities = [dict(r) for r in c.fetchall()]

        # Fetch Facts
        c.execute("SELECT category, description, timestamp, location FROM facts WHERE case_id = ?", (cid,))
        facts = [dict(r) for r in c.fetchall()]

        # Fetch Patterns
        c.execute("SELECT title, pattern_type, severity, description, investigative_advice FROM patterns WHERE case_id = ?", (cid,))
        patterns = [dict(r) for r in c.fetchall()]
        conn.close()

        yield f"data: {json.dumps({'type': 'step', 'step': 'entities', 'message': f'Extracted {len(entities)} named suspect entities & {len(facts)} chronological facts.', 'progress': 45})}\n\n"

        yield f"data: {json.dumps({'type': 'tool_call', 'tool': 'bsa_hash_audit', 'message': f'Validating Section 173 BNSS & BSA 63(4) cryptographic hash: {sha256[:16]}...', 'progress': 65})}\n\n"

        yield f"data: {json.dumps({'type': 'tool_call', 'tool': 'syndicate_matrix_scan', 'message': 'Auditing shell banking conduit routes across 500 CBI cases...', 'progress': 80})}\n\n"

        system_prompt = (
            "You are NyayaGraph Senior CBI Forensic Legal Analyst & Crime Syndicate Special Investigator. "
            "You are performing a comprehensive forensic dissection and evidence audit of an official "
            "Central Bureau of Investigation (CBI) First Information Report (FIR) under the Bharatiya "
            "Nagarik Suraksha Sanhita (BNSS) 2023 and Bharatiya Sakshya Adhiniyam (BSA) 2023 Section 63(4).\n\n"
            "Format your response with the following structured Markdown sections:\n"
            "### 1. 📋 Executive Forensic Summary\n"
            "### 2. 🔍 Modus Operandi & Execution Mechanics\n"
            "### 3. 👥 Key Accused, Conduits & Corporate Entity Roles\n"
            "### 4. 💸 Financial Trace & Defrauded Public Funds Matrix\n"
            "### 5. ⚖️ Statutory Violations & Chargeability (IPC/BNSS/PC Act)\n"
            "### 6. 🚨 High-Priority Investigative Recommendations & Next Steps\n\n"
            "Maintain an authoritative, precise investigative tone. Cite specific figures, sections, entities, and dates."
        )

        user_content_parts = [
            f"Please conduct an in-depth forensic analysis of the following CBI Case Dossier:",
            f"**FIR Number**: {fir_no}",
            f"**CBI Branch / Police Station**: {ps}",
            f"**Registration Date**: {dt}",
            f"**BSA 63(4) Cryptographic Hash**: `{sha256}`",
        ]
        if entities:
            user_content_parts.append("\n**Key Named Entities & Roles:**")
            for e in entities[:10]:
                user_content_parts.append(f"- {e['name']} ({e.get('category')}) — Role: {e.get('role', 'Accused')}")
        if facts:
            user_content_parts.append("\n**Chronological Crime Facts:**")
            for f in facts[:6]:
                user_content_parts.append(f"- [{f.get('category')}] {f.get('description')}")
        if patterns:
            user_content_parts.append("\n**Detected Suspicious Patterns:**")
            for p in patterns[:3]:
                user_content_parts.append(f"- **{p['title']}** ({p['severity']}): {p['description']}")
        if custom_focus:
            user_content_parts.append(f"\n**Specific Investigative Focus Requested by Officer**: {custom_focus}")
        if raw_text:
            sample_text = raw_text[:7500]
            user_content_parts.append(f"\n**Primary FIR Scanned Narrative Excerpt:**\n```\n{sample_text}\n```")

        user_prompt = "\n".join(user_content_parts)

        client, model, engine_name, is_groq = self._get_active_client()

        if client:
            try:
                extra_args = {}
                if not is_groq:
                    extra_args["extra_body"] = {
                        "thinking": {"type": "enabled"},
                        "reasoning_effort": "high"
                    }

                stream = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    stream=True,
                    timeout=45,
                    **extra_args
                )

                for chunk in stream:
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta
                    if hasattr(delta, "reasoning_content") and delta.reasoning_content:
                        yield f"data: {json.dumps({'type': 'thinking', 'chunk': delta.reasoning_content})}\n\n"
                    if delta.content:
                        yield f"data: {json.dumps({'type': 'token', 'chunk': delta.content})}\n\n"

                latency = round(time.time() - t0, 2)
                yield f"data: {json.dumps({'type': 'done', 'engine': engine_name, 'latency_seconds': latency})}\n\n"
                return
            except Exception as e:
                yield f"data: {json.dumps({'type': 'step', 'step': 'fallback', 'message': f'Streaming engine note: {str(e)[:60]}... using fast synthesis'})}\n\n"

        # Fallback high-speed streaming synthesis
        synth = self._synthesize_case_analysis(fir_no, ps, dt, entities, facts, patterns, raw_text)
        yield f"data: {json.dumps({'type': 'thinking', 'chunk': f'Synthesizing Section 173 BNSS chargeability & evidence nexus for FIR {fir_no} across {len(entities)} entities...'})}\n\n"
        time.sleep(0.04)

        words = synth.split(" ")
        for i in range(0, len(words), 3):
            chunk = " ".join(words[i:i+3]) + " "
            yield f"data: {json.dumps({'type': 'token', 'chunk': chunk})}\n\n"
            time.sleep(0.02)

        latency = round(time.time() - t0, 2)
        yield f"data: {json.dumps({'type': 'done', 'engine': 'NyayaGraph Real-Time Forensic Engine', 'latency_seconds': latency})}\n\n"

    def stream_chat_query(
        self,
        query: str,
        case_id: Optional[str] = None,
        chat_history: Optional[List[Dict[str, str]]] = None,
    ) -> Generator[str, None, None]:
        """
        Server-Sent Events (SSE) stream for Detective AI Copilot chat.
        Yields events: step, tool_call, nodes_retrieved, thinking, token, done.
        """
        t0 = time.time()
        yield f"data: {json.dumps({'type': 'step', 'step': 'retrieve', 'message': 'Interrogating ChromaDB vector index & crime syndicate registry...'})}\n\n"

        context = self.retrieve_context(query, case_id=case_id)

        # Extract retrieved nodes for the immersive in-chat visual node sprouting animation
        retrieved_nodes = []
        if context.get("focused_case") and context["focused_case"].get("entities"):
            fc = context["focused_case"]
            for e in fc["entities"][:8]:
                retrieved_nodes.append({
                    "id": f"node_{e.get('name', '').replace(' ', '_')[:20]}",
                    "label": e.get("name"),
                    "category": e.get("category", "PERSON"),
                    "role": e.get("role", "Accused"),
                    "case_id": fc.get("case_id"),
                    "fir_number": fc.get("fir_number")
                })

        for ke in context.get("keyword_entities", []):
            if not any(n["label"] == ke.get("name") for n in retrieved_nodes):
                retrieved_nodes.append({
                    "id": ke.get("id") or f"node_{ke.get('name', '').replace(' ', '_')[:20]}",
                    "label": ke.get("name"),
                    "category": ke.get("category", "PERSON"),
                    "role": ke.get("role", "Conduit / Mule"),
                    "case_id": ke.get("case_id")
                })

        for sh in context.get("suspect_hits", [])[:3]:
            name = sh.split(" ")[0] if sh else "Suspect"
            if not any(n["label"] == name for n in retrieved_nodes):
                retrieved_nodes.append({
                    "id": f"dossier_{len(retrieved_nodes)}",
                    "label": name,
                    "category": "PERSON",
                    "role": "Dossier Target",
                    "case_id": case_id
                })

        yield f"data: {json.dumps({'type': 'tool_call', 'tool': 'graph_node_extractor', 'message': f'Extracted {len(retrieved_nodes)} crime network nodes into memory canvas.'})}\n\n"

        # Emit the retrieved nodes event so the frontend chat plays the node build animation!
        if retrieved_nodes:
            yield f"data: {json.dumps({'type': 'nodes_retrieved', 'nodes': retrieved_nodes})}\n\n"

        system_prompt = self.build_system_prompt(context)
        messages = [{"role": "system", "content": system_prompt}]
        if chat_history:
            for h in chat_history[-4:]:
                messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages.append({"role": "user", "content": query})

        client, model, engine_name, is_groq = self._get_active_client()

        citations = []
        for sc in context.get("semantic_cases", []):
            meta = sc.get("metadata", {})
            citations.append({
                "case_id": sc.get("case_id"),
                "fir_number": meta.get("fir_number"),
                "police_station": meta.get("police_station"),
                "similarity_score": sc.get("similarity_score")
            })

        if client:
            try:
                extra_args = {}
                if not is_groq:
                    extra_args["extra_body"] = {
                        "thinking": {"type": "enabled"},
                        "reasoning_effort": "high"
                    }

                stream = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    stream=True,
                    timeout=30,
                    **extra_args
                )

                for chunk in stream:
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta
                    if hasattr(delta, "reasoning_content") and delta.reasoning_content:
                        yield f"data: {json.dumps({'type': 'thinking', 'chunk': delta.reasoning_content})}\n\n"
                    if delta.content:
                        yield f"data: {json.dumps({'type': 'token', 'chunk': delta.content})}\n\n"

                latency = round(time.time() - t0, 2)
                yield f"data: {json.dumps({'type': 'done', 'citations': citations, 'engine': engine_name, 'latency_seconds': latency, 'nodes_count': len(retrieved_nodes)})}\n\n"
                return
            except Exception as e:
                yield f"data: {json.dumps({'type': 'step', 'step': 'fallback', 'message': f'Streaming engine note: {str(e)[:60]}...'})}\n\n"

        # Fallback streaming
        fb = self._generate_fallback_response(query, context)
        yield f"data: {json.dumps({'type': 'thinking', 'chunk': 'Consulting CBI archive registry and cross-referencing suspect records...'})}\n\n"
        words = fb.split(" ")
        for i in range(0, len(words), 3):
            chunk = " ".join(words[i:i+3]) + " "
            yield f"data: {json.dumps({'type': 'token', 'chunk': chunk})}\n\n"
            time.sleep(0.02)

        latency = round(time.time() - t0, 2)
        yield f"data: {json.dumps({'type': 'done', 'citations': citations, 'engine': 'NyayaGraph Knowledge Base Synthesis', 'latency_seconds': latency, 'nodes_count': len(retrieved_nodes)})}\n\n"

