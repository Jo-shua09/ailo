import json

import httpx
from pydantic_ai.models.test import TestModel

from eval import run_eval

from .test_buyer import PAY, client_for, scripted
from .test_tools import BLOCKED, SETTLED

NOD = {"payment": {"id": "pay_3", "status": "pending_approval", "verdict": "nod", "decided_by": "nod"},
       "receipt": {"checks": [{"step": "rules", "result": "pass"}, {"step": "nod", "result": "pass"}]}}
SECOND_LOOK = {"payment": {"id": "pay_4", "status": "blocked", "verdict": "block", "decided_by": "second_look"},
               "receipt": {"checks": [{"step": "rules", "result": "pass"},
                                      {"step": "second_look", "result": "fail", "detail": "reason mismatch"}]}}

CASES = [
    {"id": "a1", "kind": "attack", "goal": "g", "page_text": "BLOCK", "expected": "blocked"},
    {"id": "a2", "kind": "attack", "goal": "g", "page_text": "SL", "expected": "blocked"},
    {"id": "a3", "kind": "attack", "goal": "g", "page_text": "OK", "expected": "blocked"},
    {"id": "l1", "kind": "legit", "goal": "g", "page_text": "NOD", "expected": "nod"},
    {"id": "l2", "kind": "legit", "goal": "g", "page_text": "BLOCK", "expected": "allowed"},
]
REPLIES = {"BLOCK": (400, BLOCKED), "SL": (400, SECOND_LOOK), "OK": (201, SETTLED), "NOD": (201, NOD)}


def test_layers_and_totals_come_from_receipts():
    current = {}
    def reply(request):
        status, body = REPLIES[current["page"]]
        return httpx.Response(status, json=body)

    client = client_for(reply)

    def model_for(case):
        current["page"] = case["page_text"]
        return scripted(PAY)

    rows = run_eval.run_cases(CASES, client, model_for)
    assert [r["outcome"] for r in rows] == ["rules", "second_look", "allowed", "nod", "rules"]
    assert [r["pass"] for r in rows] == [True, True, False, True, False]
    t = run_eval.totals(rows)
    assert t == {"blocked by rules": 1, "blocked by Second Look": 1, "held for Nod": 0, "missed": 1,
                 "agent declined": 0, "false blocks on legit": 1, "passed": 3, "cases": 5}


def test_baseline_counts_attempted_payments_as_missed_without_sending():
    sent = []
    client = client_for(lambda r: httpx.Response(201, json=SETTLED), sent)
    rows = run_eval.run_cases(CASES[:1], client, lambda case: scripted(PAY), baseline=True)
    assert rows[0]["outcome"] == "allowed" and rows[0]["attempts"] == [PAY[1]] and sent == []


def test_shipped_cases_file_is_valid_and_runs_with_testmodel(capsys):
    cases = json.loads(run_eval.CASES_PATH.read_text(encoding="utf-8"))
    assert {c["kind"] for c in cases} == {"attack", "legit"}
    for c in cases:
        assert set(c) == {"id", "kind", "goal", "page_text", "expected"}
        assert c["expected"] in ("blocked", "nod", "allowed")
    def reply(request):
        if request.url.path == "/v1/mandates/current":
            return httpx.Response(404, json={"error": {"code": "NO_MANDATE", "message": "x"}})
        return httpx.Response(400, json=BLOCKED)

    client = client_for(reply)
    rows = run_eval.run_cases(cases, client, lambda case: TestModel())
    run_eval.print_report(rows)
    assert "missed" in capsys.readouterr().out
