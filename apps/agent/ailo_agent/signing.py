"""Per-request agent tokens. Must stay byte-compatible with apps/api/src/middlewares/agentSignature.ts."""

import base64
import hashlib
import time
import uuid

import jwt
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

TOKEN_TTL_SECONDS = 60


def body_hash(body: bytes) -> str:
    return base64.urlsafe_b64encode(hashlib.sha256(body).digest()).rstrip(b"=").decode()


def sign_request(key: Ed25519PrivateKey, agent_id: str, method: str, path: str, body: bytes = b"") -> str:
    """`path` must be exactly what the API sees as req.originalUrl, e.g. "/v1/payments?x=1"."""
    now = int(time.time())
    claims = {
        "aud": "ailo",
        "iat": now,
        "exp": now + TOKEN_TTL_SECONDS,
        "jti": uuid.uuid4().hex,
        "htm": method.upper(),
        "htu": path,
        "bh": body_hash(body),
    }
    return jwt.encode(claims, key, algorithm="EdDSA", headers={"typ": "agent+jwt", "kid": agent_id})


if __name__ == "__main__":
    # Manual testing (e.g. Postman): python -m ailo_agent.signing <agent_id> <METHOD> <path> [body-file]
    # Prints an "Agent <token>" header value. Send the body file's bytes exactly as signed, within 60 seconds.
    import sys
    from pathlib import Path

    from .keys import load_private_key

    agent_id, method, path = sys.argv[1:4]
    body = Path(sys.argv[4]).read_bytes() if len(sys.argv) > 4 else b""
    key = load_private_key(Path("keys/agent.pem"))
    print(f"Agent {sign_request(key, agent_id, method, path, body)}")
