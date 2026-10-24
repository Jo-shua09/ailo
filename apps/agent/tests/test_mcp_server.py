import anyio
import httpx
from mcp import Client

from ailo_agent import mcp_server
from ailo_agent.client import AiloClient
from ailo_agent.keys import new_private_key

from .test_tools import SETTLED


def test_tools_are_registered_and_pay_feeds_payment_status(monkeypatch):
    def handler(request):
        if request.url.path == "/v1/mandates/current":
            return httpx.Response(404, json={"error": {"code": "NO_MANDATE", "message": "x"}})
        return httpx.Response(201, json=SETTLED)

    http = httpx.Client(transport=httpx.MockTransport(handler))
    monkeypatch.setattr(mcp_server, "_client", AiloClient("http://api.test", "agt_1", new_private_key(), http=http))
    monkeypatch.setattr(mcp_server, "_payments", {})

    async def main():
        async with Client(mcp_server.mcp) as c:
            names = {t.name for t in (await c.list_tools()).tools}
            mandate = await c.call_tool("get_mandate", {})
            paid = await c.call_tool("pay", {"payee_id": "payee_mama_ngozi", "amount_kobo": 850000,
                                             "category": "stock", "reason": "rice"})
            status = await c.call_tool("payment_status", {"payment_id": "pay_2"})
            unknown = await c.call_tool("payment_status", {"payment_id": "pay_nope"})
            return names, mandate, paid, status, unknown

    names, mandate, paid, status, unknown = anyio.run(main)
    assert names == {"get_mandate", "pay", "payment_status"}
    assert mandate.structured_content["mandate"] is None
    assert paid.structured_content["status"] == "settled"
    assert status.structured_content == paid.structured_content
    assert unknown.structured_content["status"] == "unknown"
