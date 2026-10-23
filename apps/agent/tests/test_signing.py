import json
import subprocess
from pathlib import Path

from ailo_agent.keys import new_private_key, public_jwk
from ailo_agent.signing import sign_request

API_DIR = Path(__file__).resolve().parents[2] / "api"  # so `jose` resolves from the npm workspace
VERIFY = Path(__file__).with_name("verify_with_jose.mjs")


def verify_in_node(token: str, jwk: dict, method: str, path: str, body: str) -> dict:
    out = subprocess.run(
        ["node", str(VERIFY), token, json.dumps(jwk), method, path, body],
        cwd=API_DIR, capture_output=True, text=True,
    )
    assert out.returncode == 0, out.stderr or out.stdout
    return json.loads(out.stdout)


def test_python_signed_token_verifies_in_the_typescript_api():
    key = new_private_key()
    body = json.dumps({"payee_id": "p1", "amount_kobo": 850000}, separators=(",", ":"))
    token = sign_request(key, "agt_123", "POST", "/v1/payments", body.encode())
    assert verify_in_node(token, public_jwk(key), "POST", "/v1/payments", body) == {"ok": True, "kid": "agt_123"}


def test_get_with_empty_body_verifies():
    key = new_private_key()
    token = sign_request(key, "agt_123", "GET", "/v1/agents/me")
    assert verify_in_node(token, public_jwk(key), "GET", "/v1/agents/me", "")["ok"] is True


def test_public_jwk_never_contains_the_private_part():
    jwk = public_jwk(new_private_key())
    assert set(jwk) == {"kty", "crv", "x"}
    assert jwk["kty"] == "OKP" and jwk["crv"] == "Ed25519"
