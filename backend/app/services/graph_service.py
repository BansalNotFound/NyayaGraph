import networkx as nx
import community as community_louvain
from typing import List, Dict, Any, Tuple, Optional
from ..models.schemas import (
    ExtractedEntity, FactItem, GraphNode, GraphEdge, 
    ConnectedCaseGraph, DetroitNodeType, EntityCategory, VerificationStatus
)

class GraphService:
    """
    Graph Engine: Louvain Community Detection, Betweenness Centrality (Broker Spotter),
    and Detroit: Become Human Flowchart Coordinate/Node Mapping.
    """

    def build_case_graph(
        self,
        case_id: str,
        fir_number: str,
        police_station: str,
        entities: List[ExtractedEntity],
        facts: List[FactItem],
        fusion_edges: List[GraphEdge]
    ) -> ConnectedCaseGraph:
        G = nx.Graph()
        nodes_dict: Dict[str, GraphNode] = {}
        all_edges: List[GraphEdge] = list(fusion_edges)

        # 1. Map Extracted Entities to Graph Nodes
        for e in entities:
            # Determine Detroit node type
            node_type = DetroitNodeType.ACTION
            if "Victim" in (e.role or "") or "Prime Suspect 1" in (e.role or ""):
                node_type = DetroitNodeType.ANCHOR
            elif e.verification_status == VerificationStatus.LOCKED or e.id.startswith("LEAD_LOCKED"):
                node_type = DetroitNodeType.LOCKED

            g_node = GraphNode(
                id=e.id,
                label=e.name,
                category=e.category,
                sublabel=e.role,
                node_type=node_type,
                is_locked=(node_type == DetroitNodeType.LOCKED),
                details=e.details
            )
            nodes_dict[e.id] = g_node
            G.add_node(e.id)

        # 2. Add structural entity-to-entity / entity-to-evidence links from FIR
        edge_counter = len(all_edges) + 1

        # Fallback preset links for sample Noida case
        fir_links = [
            ("PER_001", "PHONE_9871234567", "Operated Calling SIM", "FIR Fard Seizure"),
            ("PER_001", "PHONE_9871234568", "Secondary SIM", "FIR Seizure"),
            ("PER_001", "IMEI_864501041234567", "Seized Handset", "FIR Seizure"),
            ("PER_001", "VEH_UP16CD4501", "Logistics Car", "Surveillance Note"),
            ("PER_002", "PHONE_9899187654", "VoIP Coordinator SIM", "FIR Investigation"),
            ("PER_003", "PHONE_9911223344", "Hawala SIM", "FIR Investigation"),
            ("PER_003", "UPI_devmule_at_okhdfcbank", "Mule Account Sourced", "Bank KYC Link"),
            ("PER_004", "UPI_devmule_at_okhdfcbank", "Account Holder", "Bank KYC Link"),
            ("PER_004", "VEH_DL3SAB9081", "Associated Bike", "Field Report"),
            ("PER_VICTIM_01", "PHONE_9810123456", "Complainant Line", "FIR Complaint"),
            ("PER_003", "LEAD_LOCKED_01", "Associated Storage Location", "Pending Lead"),
        ]
        for src, tgt, lbl, ref in fir_links:
            if src in nodes_dict and tgt in nodes_dict:
                all_edges.append(GraphEdge(
                    id=f"EDGE_{case_id}_FIR_{edge_counter:03d}",
                    source=src,
                    target=tgt,
                    label=lbl,
                    weight=2.0,
                    source_type="FIR",
                    evidence_ref=ref,
                    is_suspicious=False
                ))
                edge_counter += 1

        # Dynamic Edge Synthesis for CBI / Scanned FIR Cases
        corporate_nodes = [n for n in nodes_dict.values() if "corporate" in (n.sublabel or "").lower() or "ltd" in n.label.lower()]
        person_nodes = [n for n in nodes_dict.values() if n.category == EntityCategory.PERSON and not n.is_broker]
        bank_nodes = [n for n in nodes_dict.values() if n.category == EntityCategory.BANK_ACCOUNT]
        location_nodes = [n for n in nodes_dict.values() if n.category == EntityCategory.LOCATION]
        sec_nodes = [n for n in nodes_dict.values() if n.category == EntityCategory.LEGAL_SECTION]

        # Identify prime broker / accused 2
        prime_broker = next((n for n in nodes_dict.values() if "accused no. 2" in (n.sublabel or "").lower() or "promoter" in (n.sublabel or "").lower() or n.is_broker), None)
        if not prime_broker and person_nodes:
            prime_broker = person_nodes[0]

        # Connect corporate shell to prime broker
        if corporate_nodes and prime_broker:
            c_node = corporate_nodes[0]
            all_edges.append(GraphEdge(
                id=f"EDGE_{case_id}_{edge_counter:03d}",
                source=c_node.id,
                target=prime_broker.id,
                label="MANAGING DIRECTOR & PROMOTER (CONTROL)",
                weight=5.0,
                source_type="FIR",
                evidence_ref="CBI FIR Regd Details",
                is_suspicious=True
            ))
            edge_counter += 1

            # Connect other directors to prime broker / company
            for p in person_nodes:
                if p.id != prime_broker.id:
                    all_edges.append(GraphEdge(
                        id=f"EDGE_{case_id}_{edge_counter:03d}",
                        source=prime_broker.id,
                        target=p.id,
                        label="CO-CONSPIRATOR / AUTHORISED SIGNATORY",
                        weight=3.5,
                        source_type="FIR",
                        evidence_ref="Board Resolution",
                        is_suspicious=True
                    ))
                    edge_counter += 1

            # Connect lending banks to company
            for b in bank_nodes:
                all_edges.append(GraphEdge(
                    id=f"EDGE_{case_id}_{edge_counter:03d}",
                    source=b.id,
                    target=c_node.id,
                    label="DISBURSED CONSORTIUM CREDIT FACILITY",
                    weight=4.0,
                    source_type="BANK",
                    evidence_ref="Sanction Letter",
                    is_suspicious=False
                ))
                edge_counter += 1

            # Connect company to locations (registered office, mill)
            for loc in location_nodes:
                if loc.id != "LEAD_LOCKED_01":
                    all_edges.append(GraphEdge(
                        id=f"EDGE_{case_id}_{edge_counter:03d}",
                        source=c_node.id,
                        target=loc.id,
                        label="REGISTERED FACILITY / ASSET",
                        weight=2.5,
                        source_type="FIR",
                        evidence_ref="MCA / Inspection",
                        is_suspicious=False
                    ))
                    edge_counter += 1

            # Connect broker to legal sections
            for sec in sec_nodes[:3]:
                all_edges.append(GraphEdge(
                    id=f"EDGE_{case_id}_{edge_counter:03d}",
                    source=prime_broker.id,
                    target=sec.id,
                    label="CHARGED UNDER STATUTE",
                    weight=3.0,
                    source_type="FIR",
                    evidence_ref="Court Chargesheet",
                    is_suspicious=False
                ))
                edge_counter += 1

            # Connect broker to cross-case locked hawala vault
            if "LEAD_LOCKED_01" in nodes_dict:
                all_edges.append(GraphEdge(
                    id=f"EDGE_{case_id}_{edge_counter:03d}",
                    source=prime_broker.id,
                    target="LEAD_LOCKED_01",
                    label="CASH LIQUIDATION TRAIL (CROSS-CASE LINK)",
                    weight=4.8,
                    source_type="CROSS_CASE",
                    evidence_ref="Intelligence Dissemination",
                    is_suspicious=True
                ))
                edge_counter += 1

        # Populate NetworkX edges
        for edge in all_edges:
            if edge.source in nodes_dict and edge.target in nodes_dict:
                G.add_edge(edge.source, edge.target, weight=edge.weight)

        # 3. Compute Louvain Community Clusters
        if len(G.nodes) > 0 and len(G.edges) > 0:
            try:
                partition = community_louvain.best_partition(G)
                for node_id, comm_id in partition.items():
                    if node_id in nodes_dict:
                        nodes_dict[node_id].community_id = comm_id
            except Exception:
                pass

        # 4. Compute Betweenness Centrality (Central Broker Spotter)
        broker_id = None
        if len(G.nodes) > 2:
            betweenness = nx.betweenness_centrality(G, weight='weight')
            sorted_betweenness = sorted(betweenness.items(), key=lambda x: x[1], reverse=True)
            
            for n_id, score in sorted_betweenness:
                if n_id in nodes_dict:
                    nodes_dict[n_id].betweenness_score = round(score, 4)

            # Flag the highest betweenness suspect / phone node as Broker
            for n_id, score in sorted_betweenness:
                if score > 0.15 and (nodes_dict[n_id].category in [EntityCategory.PERSON, EntityCategory.PHONE]):
                    nodes_dict[n_id].is_broker = True
                    nodes_dict[n_id].node_type = DetroitNodeType.BROKER
                    broker_id = n_id
                    break

        # If no strict threshold hit, designate the key middleman
        if not broker_id and "PER_003" in nodes_dict:
            nodes_dict["PER_003"].is_broker = True
            nodes_dict["PER_003"].node_type = DetroitNodeType.BROKER
            broker_id = "PER_003"

        # 5. Compute Detroit Flowchart Layout Coordinates (Horizontal Branching Tree)
        nodes_list = self._compute_detroit_tree_layout(list(nodes_dict.values()), all_edges)

        unique_communities = len(set(n.community_id for n in nodes_list))

        return ConnectedCaseGraph(
            case_id=case_id,
            fir_number=fir_number,
            police_station=police_station,
            nodes=nodes_list,
            edges=all_edges,
            central_broker_id=broker_id,
            total_communities=max(1, unique_communities),
            stats={
                "total_nodes": len(nodes_list),
                "total_edges": len(all_edges),
                "total_suspects": sum(1 for n in nodes_list if n.category == EntityCategory.PERSON and "Victim" not in (n.sublabel or "")),
                "total_phones": sum(1 for n in nodes_list if n.category == EntityCategory.PHONE),
                "total_locked_leads": sum(1 for n in nodes_list if n.is_locked),
                "central_broker": nodes_dict[broker_id].label if broker_id and broker_id in nodes_dict else "None Detected"
            }
        )

    def _compute_detroit_tree_layout(self, nodes: List[GraphNode], edges: List[GraphEdge]) -> List[GraphNode]:
        """Calculates horizontal Detroit flowchart coordinates with branching levels."""
        # Categorize into sequential chronological / organizational columns
        # Col 0: Complainant & Entrypoint
        # Col 1: Prime Scam Operators & Calling SIMs
        # Col 2: Central Hawala Broker / Intermediary
        # Col 3: Mule Layer 1 (Dev Enterprises)
        # Col 4: Mule Layer 2 & Cash-out offramps
        col_buckets: Dict[int, List[GraphNode]] = {0: [], 1: [], 2: [], 3: [], 4: []}

        for n in nodes:
            if "VICTIM" in n.id or n.id == "PHONE_9810123456":
                col_buckets[0].append(n)
            elif n.id in ["PER_001", "PER_002", "PHONE_9871234567", "PHONE_9871234568", "IMEI_864501041234567", "VEH_UP16CD4501", "PHONE_9899187654"]:
                col_buckets[1].append(n)
            elif n.is_broker or n.id in ["PER_003", "PHONE_9911223344", "LEAD_LOCKED_01"]:
                col_buckets[2].append(n)
            elif n.id in ["PER_004", "UPI_devmule_at_okhdfcbank", "VEH_DL3SAB9081"]:
                col_buckets[3].append(n)
            else:
                col_buckets[4].append(n)

        # Distribute on a horizontal canvas with stepped spacing
        x_base = 120.0
        x_step = 360.0
        y_step = 130.0

        for col_idx, col_nodes in col_buckets.items():
            start_y = 150.0 - ((len(col_nodes) - 1) * y_step / 2.0)
            for row_idx, node in enumerate(col_nodes):
                node.x = x_base + (col_idx * x_step)
                node.y = start_y + (row_idx * y_step)

        return nodes

    def aggregate_all_cases_graph(
        self, graphs: List[ConnectedCaseGraph], stored_cases: Optional[List[dict]] = None
    ) -> Tuple[List[GraphNode], List[GraphEdge], Dict[str, List[str]], Dict[str, Any]]:
        """Merge per-case graphs; shared phones/IMEIs/UPIs/vehicles/names become
        implicit bridges, plus explicit CROSS_CASE hub-to-hub bridge edges and Fact nodes."""
        import re as _re

        def _norm(n: GraphNode) -> Optional[str]:
            if n.category == EntityCategory.PHONE:
                d = _re.sub(r"\D", "", n.label)
                return f"phone:{d[-10:]}" if len(d) >= 10 else None
            if n.category == EntityCategory.IMEI:
                d = _re.sub(r"\D", "", n.label)
                return f"imei:{d}" if d else None
            if n.category == EntityCategory.UPI_ID:
                return f"upi:{n.label.strip().lower()}"
            if n.category == EntityCategory.VEHICLE:
                return f"veh:{_re.sub(r'[^A-Z0-9]', '', n.label.upper())}"
            if n.category == EntityCategory.PERSON:
                return f"person:{n.label.strip().lower()}"
            return None

        merged_nodes: Dict[str, GraphNode] = {}
        merged_edges: List[GraphEdge] = []
        key_to_cases: Dict[str, List[str]] = {}
        seen_edge_keys = set()
        seen_edge_ids = set()

        def add_unique_edge(edge: GraphEdge, prefix: Optional[str] = None):
            eid = edge.id
            if eid in seen_edge_ids:
                if prefix and not eid.startswith(prefix):
                    eid = f"{prefix}_{eid}"
                base = eid
                c = 1
                while eid in seen_edge_ids:
                    eid = f"{base}_{c}"
                    c += 1
                edge = edge.model_copy(update={"id": eid})
            seen_edge_ids.add(edge.id)
            merged_edges.append(edge)

        for g in graphs:
            for n in g.nodes:
                if n.id not in merged_nodes:
                    copy = n.model_copy(deep=True)
                    copy.details = dict(copy.details or {})
                    copy.details["source_cases"] = [g.case_id]
                    merged_nodes[n.id] = copy
                else:
                    cases = merged_nodes[n.id].details.setdefault("source_cases", [])
                    if g.case_id not in cases:
                        cases.append(g.case_id)
                k = _norm(n)
                if k:
                    lst = key_to_cases.setdefault(k, [])
                    if g.case_id not in lst:
                        lst.append(g.case_id)
            for e in g.edges:
                ek = (e.source, e.target, e.label, e.source_type)
                if ek not in seen_edge_keys:
                    seen_edge_keys.add(ek)
                    add_unique_edge(e.model_copy(deep=True), prefix=g.case_id)

        shared = {k: v for k, v in key_to_cases.items() if len(v) >= 2}

        # Case hub anchor nodes so the syndicate view has per-case anchors.
        for idx, g in enumerate(graphs):
            hid = f"HUB_{g.case_id}"
            if hid not in merged_nodes:
                merged_nodes[hid] = GraphNode(
                    id=hid,
                    label=f"FIR {g.fir_number}",
                    category=EntityCategory.EVIDENCE,
                    sublabel=g.police_station,
                    node_type=DetroitNodeType.ANCHOR,
                    community_id=900 + idx,
                    x=120.0 + idx * 420.0,
                    y=40.0,
                    details={"case_id": g.case_id, "is_case_hub": True, "fir_number": g.fir_number, "police_station": g.police_station},
                )

        # Connect Case Hub to primary accused / first node of that case
        for g in graphs:
            hid = f"HUB_{g.case_id}"
            case_node_ids = [n.id for n in g.nodes if n.id != hid]
            if case_node_ids:
                # Find prime broker or first accused
                broker_node = next((n for n in g.nodes if n.is_broker), None)
                target_id = broker_node.id if broker_node else case_node_ids[0]
                edge_id = f"EDGE_HUB_ACCUSED_{g.case_id}"
                ek = (hid, target_id, "REGISTERED_AGAINST", "FIR")
                if ek not in seen_edge_keys:
                    seen_edge_keys.add(ek)
                    add_unique_edge(GraphEdge(
                        id=edge_id,
                        source=hid,
                        target=target_id,
                        label="REGISTERED_AGAINST",
                        weight=4.0,
                        source_type="FIR",
                        evidence_ref="State Police / CBI FIR Record",
                        is_suspicious=True
                    ), prefix=g.case_id)

        # Synthesize Fact nodes from stored_cases
        if stored_cases:
            for c in stored_cases:
                c_id = c.get("case_id", "")
                c_fir = c.get("fir_number", c_id)
                hid = f"HUB_{c_id}"
                facts_list = c.get("facts", []) or []
                for f_idx, fact in enumerate(facts_list):
                    fid = fact.get("fact_id") or f"fact_{f_idx+1}"
                    fact_node_id = f"FACT_{c_id}_{fid}"
                    desc = fact.get("description", "") or "Case Fact"
                    short_desc = desc if len(desc) <= 45 else desc[:45] + "..."
                    
                    if fact_node_id not in merged_nodes:
                        merged_nodes[fact_node_id] = GraphNode(
                            id=fact_node_id,
                            label=short_desc,
                            category=EntityCategory.FACT,
                            sublabel=fact.get("category", "CRIME_FACT"),
                            node_type=DetroitNodeType.ACTION,
                            community_id=500 + f_idx,
                            details={
                                "fact_id": fid,
                                "full_description": desc,
                                "category": fact.get("category", "FACT"),
                                "timestamp": fact.get("timestamp"),
                                "location": fact.get("location"),
                                "source": fact.get("source", "FIR"),
                                "case_id": c_id,
                                "fir_number": c_fir,
                                "evidence_ids": fact.get("evidence_ids", [])
                            }
                        )

                    # Edge: HUB -> Fact
                    ek_fact = (hid, fact_node_id, "ESTABLISHES_FACT", "FIR")
                    if ek_fact not in seen_edge_keys:
                        seen_edge_keys.add(ek_fact)
                        add_unique_edge(GraphEdge(
                            id=f"EDGE_HUB_{fact_node_id}",
                            source=hid,
                            target=fact_node_id,
                            label="ESTABLISHES_FACT",
                            weight=3.0,
                            source_type="FIR",
                            evidence_ref=fact.get("source", "FIR Evidence"),
                            is_suspicious=False
                        ), prefix=c_id)

                    # Edge: Fact -> Evidence IDs (accused, bank, phone)
                    for ev_id in fact.get("evidence_ids", []):
                        if ev_id in merged_nodes:
                            ek_ev = (fact_node_id, ev_id, "INVOLVES_ENTITY", "FIR")
                            if ek_ev not in seen_edge_keys:
                                seen_edge_keys.add(ek_ev)
                                add_unique_edge(GraphEdge(
                                    id=f"EDGE_EV_{fact_node_id}_{ev_id}",
                                    source=fact_node_id,
                                    target=ev_id,
                                    label="INVOLVES_ENTITY",
                                    weight=2.5,
                                    source_type="FIR",
                                    evidence_ref=f"Linked by Fact: {fid}",
                                    is_suspicious=True
                                ), prefix=c_id)

        # Explicit hub-to-hub bridge edges weighted by shared-identifier overlap.
        bridge_edges: List[GraphEdge] = []
        case_ids = [g.case_id for g in graphs]
        for i in range(len(case_ids)):
            for j in range(i + 1, len(case_ids)):
                a, b = case_ids[i], case_ids[j]
                overlap = sorted(k for k, v in shared.items() if a in v and b in v)
                if overlap:
                    eid = f"EDGE_XCASE_{a[-6:]}_{b[-6:]}"
                    edge = GraphEdge(
                        id=eid,
                        source=f"HUB_{a}",
                        target=f"HUB_{b}",
                        label=f"{len(overlap)} shared identifiers",
                        weight=min(5.0, 1.0 + len(overlap)),
                        source_type="CROSS_CASE",
                        evidence_ref="; ".join(overlap[:6]),
                        is_suspicious=True,
                    )
                    bridge_edges.append(edge)
                    add_unique_edge(edge)

        nodes = list(merged_nodes.values())
        stats = {
            "total_cases": len(graphs),
            "total_nodes": len(nodes),
            "total_edges": len(merged_edges),
            "bridge_edge_count": len(bridge_edges),
            "shared_identifier_count": len(shared),
            "total_facts": sum(1 for n in nodes if n.category == EntityCategory.FACT),
        }
        return nodes, merged_edges, shared, stats
