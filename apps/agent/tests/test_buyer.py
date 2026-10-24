import json

import httpx
from pydantic_ai import ModelResponse, TextPart, ToolCallPart, models
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.models.test import TestModel

from ailo_agent import buyer
from ailo_agent.client import AiloClient
from ailo_agent.keys import new_private_key

from .test_tools import BLOCKED, SETTLED

models.ALLOW_MODEL_REQUESTS = False
PAGE = "shop://rice"


def client_for(handler, sent=None):
    def record(request):
        if sent is not None and request.method == "POST":
            sent.append(json.loads(request.content))
        return handler(request)

    return AiloClient("http://api.test", "agt_1", new_private_key(), http=httpx.Client(transport=httpx.MockTransport(record)))


def scripted(*calls):
    """A fake model that makes these tool calls in order, one per turn, then says done."""
    def fn(messages, info):
        turn = sum(1 for m in messages if m.kind == "response")
        if turn < len(calls):
            return ModelResponse(parts=[ToolCallPart(*calls[turn])])
        return ModelResponse(parts=[TextPart("done")])
    return FunctionModel(fn)


PAY = ("pay", {"payee_id": "payee_mama_ngozi", "amount_kobo": 850000, "category": "stock", "reason": "rice"})


def test_testmodel_can_drive_every_tool():
    deps = buyer.Deps(client_for(lambda r: httpx.Response(201, json=SETTLED)), {PAGE: "Rice N8,500"})
    buyer.run("restock rice under N20,000", deps, model=TestModel())
    assert deps.results  # TestModel calls pay with generated args, the mock settles it


def test_page_text_reaches_the_model_wrapped_and_unknown_pages_are_refused():
    seen = []

    def fn(messages, info):
        turn = sum(1 for m in messages if m.kind == "response")
        if turn:
            seen.extend(p.content for p in messages[-1].parts if p.part_kind == "tool-return")
        calls = [("read_shop_page", {"url": PAGE}), ("read_shop_page", {"url": "http://evil.test"})]
        return ModelResponse(parts=[ToolCallPart(*calls[turn])] if turn < 2 else [TextPart("done")])

    buyer.run("restock rice", buyer.Deps(None, {PAGE: "Rice N8,500"}), model=FunctionModel(fn))
    assert "UNTRUSTED" in seen[0] and "Rice N8,500" in seen[0]
    assert seen[1].startswith("refused")


def test_blocked_payment_stops_further_payments():
    sent = []
    deps = buyer.Deps(client_for(lambda r: httpx.Response(400, json=BLOCKED), sent), {PAGE: "x"})
    buyer.run("restock rice", deps, model=scripted(PAY, PAY))
    assert len(sent) == 1 and deps.results[0]["status"] == "blocked"
    assert deps.attempts == [PAY[1], PAY[1]]


def test_baseline_records_attempts_without_sending():
    deps = buyer.Deps(None, {PAGE: "x"}, baseline=True)
    buyer.run("restock rice", deps, model=scripted(("get_mandate", {}), PAY))
    assert deps.attempts == [PAY[1]] and deps.results == []


def test_compromised_flag_adds_the_demo_instruction():
    captured = []

    def fn(messages, info):
        captured.append(info.instructions or "")
        return ModelResponse(parts=[TextPart("done")])

    buyer.run("x", buyer.Deps(None, {}), model=FunctionModel(fn), compromised=True)
    buyer.run("x", buyer.Deps(None, {}), model=FunctionModel(fn))
    assert buyer.COMPROMISED in captured[0] and buyer.COMPROMISED not in captured[1]
    assert buyer.INSTRUCTIONS in captured[0]  # added to the base rules, not replacing them


def test_gemini_key_is_mapped(monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    buyer.map_gemini_key()
    import os
    assert os.environ["GOOGLE_API_KEY"] == "k"
