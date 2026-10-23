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
