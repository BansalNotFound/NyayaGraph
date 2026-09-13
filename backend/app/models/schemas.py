from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class EntityCategory(str, Enum):
    PERSON = "PERSON"
    PHONE = "PHONE"
    IMEI = "IMEI"
    VEHICLE = "VEHICLE"
    BANK_ACCOUNT = "BANK_ACCOUNT"
    UPI_ID = "UPI_ID"
    LOCATION = "LOCATION"
    LEGAL_SECTION = "LEGAL_SECTION"
    EVIDENCE = "EVIDENCE"
    FACT = "FACT"

class VerificationStatus(str, Enum):
    VERIFIED = "VERIFIED"           # Exact verbatim span match in source doc
    LOCKED = "LOCKED"               # Pending investigation / missing KYC / locked lead
    UNVERIFIED = "UNVERIFIED"

class DetroitNodeType(str, Enum):
    ANCHOR = "ANCHOR"               # Slanted parallelogram prime thumbnail
    ACTION = "ACTION"               # CyberLife electric blue action step
    LOCKED = "LOCKED"               # Translucent lock card [...]
    BROKER = "BROKER"               # Central Broker with glowing golden aura
    GHOST = "GHOST"                 # Cross-case historical lead (dotted border)

class ExtractedEntity(BaseModel):
    id: str
    name: str
    category: EntityCategory
    role: Optional[str] = None      # e.g., "Prime Suspect", "Victim", "Mule Handler", "Caller"
    aliases: List[str] = Field(default_factory=list)
    raw_span: Optional[str] = None
    span_start: Optional[int] = None
    span_end: Optional[int] = None
    verification_status: VerificationStatus = VerificationStatus.VERIFIED
    details: Dict[str, Any] = Field(default_factory=dict)

class FactItem(BaseModel):
    fact_id: str
    category: str
    description: str
    timestamp: Optional[str] = None
    location: Optional[str] = None
    source: str = "FIR"
    is_locked: bool = False
    evidence_ids: List[str] = Field(default_factory=list)

class GraphNode(BaseModel):
    id: str
    label: str
    category: EntityCategory
    sublabel: Optional[str] = None
    node_type: DetroitNodeType = DetroitNodeType.ACTION
    community_id: int = 0
    betweenness_score: float = 0.0
    is_broker: bool = False
    is_locked: bool = False
    is_ghost: bool = False
    details: Dict[str, Any] = Field(default_factory=dict)
    x: Optional[float] = None
    y: Optional[float] = None

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    weight: float = 1.0
    source_type: str = "FIR"        # "FIR", "CDR", "BANK", "CROSS_CASE"
    evidence_ref: Optional[str] = None
    is_suspicious: bool = False

class ConnectedCaseGraph(BaseModel):
    case_id: str
    fir_number: str
    police_station: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    central_broker_id: Optional[str] = None
    total_communities: int = 1
    stats: Dict[str, Any] = Field(default_factory=dict)

class SuspiciousPattern(BaseModel):
    pattern_id: str
    title: str
    pattern_type: str              # "BURNER_BURST", "TOWER_CO_LOCATION", "MULE_LAYERING", "BROKER_FOUND"
    severity: str                  # "HIGH", "CRITICAL", "MEDIUM"
    description: str
    involved_nodes: List[str]
    supporting_evidence: Dict[str, Any]
    investigative_advice: str

class CrossCaseResemblance(BaseModel):
    matched_case_id: str
    matched_fir_number: str
    police_station: str
    investigating_officer: str
    io_contact: str
    resemblance_percentage: float
    overlapping_identifiers: Dict[str, List[str]]
    syndicate_structure: str
    recovery_tactics_and_leads: str
    recommended_action: str

class CaseProcessingResult(BaseModel):
    case_id: str
    fir_number: str
    police_station: str
    date_time: str
    sha256_hash: str
    blockchain_tx_hash: str
    entities: List[ExtractedEntity]
    facts: List[FactItem]
    graph: ConnectedCaseGraph
    patterns: List[SuspiciousPattern]
    cross_case_match: Optional[CrossCaseResemblance] = None


# ---------- Multi-source evidence ingestion & ledger schemas ----------

class EvidenceItem(BaseModel):
    evidence_id: str
    file_name: str
    file_type: str            # "FIR" | "CDR" | "BANK"
    sha256_hash: str
    file_size_bytes: int
    ingestion_timestamp: str
    blockchain_tx_hash: Optional[str] = None
    verification_status: str = "ANCHORED"


class BSACertificate(BaseModel):
    statute: str = "Bharatiya Sakshya Adhiniyam (BSA) 2023 Section 63(4)"
    fir_number: str
    police_station: str
    investigating_officer: str
    file_hashes: Dict[str, str] = Field(default_factory=dict)
    root_case_hash: str
    blockchain_tx_hash: str
    block_number: int
    timestamp: str
    contract_address: Optional[str] = None
    ledger_mode: str = "sovereign-local"   # "on-chain" | "sovereign-local"
    legal_declaration: str


class EvidenceIngestResponse(BaseModel):
    case_id: str
    fir_number: str
    police_station: str
    evidence: List[EvidenceItem]
    root_case_hash: str
    certificate: BSACertificate
    entity_preview: List[ExtractedEntity]
    graph_summary: Dict[str, Any] = Field(default_factory=dict)


class CaseSummary(BaseModel):
    case_id: str
    fir_number: str
    police_station: str
    date_time: str
    node_count: int
    edge_count: int
    broker_name: Optional[str] = None
    sha256_hash: str
    blockchain_tx_hash: Optional[str] = None


class CaseDetailResponse(CaseProcessingResult):
    bsa_certificate: Optional[BSACertificate] = None


class AggregateGraphResponse(BaseModel):
    case_ids: List[str]
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    bridge_edge_count: int = 0
    shared_identifiers: Dict[str, List[str]] = Field(default_factory=dict)
    stats: Dict[str, Any] = Field(default_factory=dict)
