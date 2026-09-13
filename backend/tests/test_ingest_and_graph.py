"""Backend verification: ingest -> anchor -> graph -> registry -> tamper check."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

# Isolate persistence for the test run.
os.environ["CASE_REGISTRY_PATH"] = os.path.join(os.path.dirname(__file__), "_tmp_registry.json")
os.environ["LEDGER_STORE_PATH"] = os.path.join(os.path.dirname(__file__), "_tmp_ledger.json")
for _p in (os.environ["CASE_REGISTRY_PATH"], os.environ["LEDGER_STORE_PATH"]):
    if os.path.exists(_p):
        os.remove(_p)

from main import app  # noqa: E402

client = TestClient(app)
BASE = os.path.join(os.path.dirname(__file__), "..", "..", "data")


def _read(*parts):
    with open(os.path.join(BASE, *parts), encoding="utf-8") as f:
        return f.read()


def test_full_pipeline():
    fir = _read("sample_firs", "fir_01_noida_cyber.txt")
    cdr = _read("sample_cdrs", "cdr_case_01.csv")
    bank = _read("sample_bank", "bank_case_01.csv")

    # 1. Multipart ingest.
    r = client.post(
        "/api/v1/cases/ingest-files",
        files={"fir_file": ("fir.txt", fir, "text/plain"),
               "cdr_file": ("cdr.csv", cdr, "text/csv"),
               "bank_file": ("bank.csv", bank, "text/csv")},
        data={"fir_number": "112/2026",
              "police_station": "Cyber Crime PS, Gautam Buddha Nagar",
              "io_name": "Sub-Inspector Rajesh"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["evidence"]) == 3
    assert body["certificate"]["statute"].startswith("Bharatiya Sakshya")
    assert body["graph_summary"]["node_count"] > 5
    case_id = body["case_id"]
    root_hash, tx = body["root_case_hash"], body["certificate"]["blockchain_tx_hash"]

    # 2. Deterministic hash: same bytes under a throwaway FIR no -> same file hash.
    r2 = client.post(
        "/api/v1/cases/ingest-files",
        files={"fir_file": ("fir.txt", fir, "text/plain")},
        data={"fir_number": "999/2026", "police_station": "x", "io_name": "y"},
    )
    assert r2.json()["evidence"][0]["sha256_hash"] == body["evidence"][0]["sha256_hash"]

    # 3. Registry lists seeded + ingested cases (incl. FIR 45/2024, 89/2025).
    cases = client.get("/api/v1/cases/").json()
    ids = {c["case_id"] for c in cases}
    assert {"CASE_2026_NOIDA_112", "FIR_45_2024_SURAJPUR", "FIR_89_2025_SECTOR20"} <= ids, ids

    # 4. Detail + graph carry Louvain/betweenness + broker + BSA cert.
    detail = client.get(f"/api/v1/cases/{case_id}").json()
    assert detail["bsa_certificate"]["blockchain_tx_hash"] == tx
    graph = client.get(f"/api/v1/cases/{case_id}/graph").json()
    assert graph["central_broker_id"], "broker must be flagged"
    assert any(n["betweenness_score"] > 0 for n in graph["nodes"])
    assert graph["total_communities"] >= 1

    # 5. Aggregate syndicate graph bridges shared identifiers across cases.
    agg = client.get("/api/v1/cases/all/aggregate-graph").json()
    assert len(agg["case_ids"]) >= 3
    assert agg["bridge_edge_count"] >= 1, agg["stats"]
    assert any(e["source_type"] == "CROSS_CASE" for e in agg["edges"])

    # 6. Ledger verify: pristine passes; 1-char tamper fails.
    assert client.get(f"/api/v1/blockchain/verify/{tx}").json()["verified"] is True
    assert client.get(f"/api/v1/blockchain/verify/{root_hash}").json()["verified"] is True
    tampered = "X" + fir[1:]
    import hashlib
    fake = hashlib.sha256(tampered.encode()).hexdigest()
    assert client.get(f"/api/v1/blockchain/verify/{fake}").json()["verified"] is False
    # Clean up isolated test files
    for _p in (os.environ["CASE_REGISTRY_PATH"], os.environ["LEDGER_STORE_PATH"]):
        if os.path.exists(_p):
            try:
                os.remove(_p)
            except Exception:
                pass

    print(f"OK: {case_id} nodes={graph['stats']['total_nodes']} "
          f"broker={graph['stats']['central_broker']} bridges={agg['bridge_edge_count']}")


if __name__ == "__main__":
    test_full_pipeline()
    print("ALL BACKEND CHECKS PASSED")
