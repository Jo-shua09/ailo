"""Ailo over MCP stdio, so any MCP agent can pay through Ailo with its own key.

Run: uv run --env-file .env python -m ailo_agent.mcp_server
"""

from typing import Any

from mcp.server.mcpserver import MCPServer

from . import tools
from .client import AiloClient

mcp = MCPServer("ailo", instructions="Pay Nigerian merchants in Naira (amounts in kobo) within the owner's mandate.")
_client: AiloClient | None = None
# The API has no agent-readable payment status, so status only covers this session's own payments.
_payments: dict[str, dict] = {}


def client() -> AiloClient:
    global _client
    _client = _client or AiloClient.from_env()
    return _client


@mcp.tool()
def get_mandate() -> dict[str, Any]:
    """The owner's current spending mandate (rules), or a note that none is set."""
    return tools.get_mandate(client())


@mcp.tool()
def pay(payee_id: str, amount_kobo: int, category: str, reason: str) -> dict[str, Any]:
    """Ask Ailo to pay a payee. amount_kobo is an integer (N1 = 100 kobo)."""
    res = tools.pay(client(), payee_id, amount_kobo, category, reason)
    if "payment_id" in res:
        _payments[res["payment_id"]] = res
    return res


@mcp.tool()
def payment_status(payment_id: str) -> dict[str, Any]:
    """Last known result of a payment made in this session."""
    return _payments.get(payment_id) or {"status": "unknown", "message": "not a payment from this session"}


if __name__ == "__main__":
    mcp.run()
