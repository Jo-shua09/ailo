"""Signed HTTP client for the Ailo API. Every call carries a fresh one-time agent token."""

import json
import os
from urllib.parse import urlsplit

import httpx
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from .signing import sign_request


class AiloError(Exception):
    def __init__(self, status: int, code: str, message: str, body: dict | None = None):
        super().__init__(f"{status} {code}: {message}")
        self.status, self.code, self.message = status, code, message
        # A blocked payment is a 400 that still carries {payment, receipt}.
        self.body = body or {}


class AiloClient:
    def __init__(self, base_url: str, agent_id: str, key: Ed25519PrivateKey, http: httpx.Client | None = None):
        self.base_url = base_url.rstrip("/")
        self.agent_id = agent_id
        self.key = key
        self.http = http or httpx.Client(timeout=10.0)

    def get(self, path: str) -> dict:
        return self._send("GET", path, b"")

    def post(self, path: str, payload: dict, idempotency_key: str | None = None) -> dict:
        # Sign exactly the bytes we send; any re-serialisation would break the body hash.
        body = json.dumps(payload, separators=(",", ":")).encode()
        extra = {"idempotency-key": idempotency_key} if idempotency_key else {}
        return self._send("POST", path, body, extra)

    def _send(self, method: str, path: str, body: bytes, extra: dict | None = None) -> dict:
        url = f"{self.base_url}{path}"
        parts = urlsplit(url)
        signed_path = parts.path + (f"?{parts.query}" if parts.query else "")
        headers = {
            "authorization": f"Agent {sign_request(self.key, self.agent_id, method, signed_path, body)}",
            "content-type": "application/json",
            **(extra or {}),
        }
        res = self.http.request(method, url, content=body or None, headers=headers)
        try:
            data = res.json() if res.content else {}
        except ValueError:  # e.g. an HTML 502 page from ngrok or a proxy
            data = {}
        if res.is_error:
            err = data.get("error", {})
            raise AiloError(res.status_code, err.get("code", "HTTP_ERROR"), err.get("message", res.text), data)
        return data

    @classmethod
    def from_env(cls) -> "AiloClient":
        from .keys import load_private_key

        return cls(os.environ["AILO_API_URL"], os.environ["AGENT_ID"], load_private_key(os.environ["AGENT_PRIVATE_KEY_PATH"]))
