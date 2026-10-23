"""Agent Ed25519 keys. The private key stays on the agent's machine; only the public JWK is registered."""

import base64
import json
import sys
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


def new_private_key() -> Ed25519PrivateKey:
    return Ed25519PrivateKey.generate()


def public_jwk(key: Ed25519PrivateKey) -> dict:
    raw = key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    return {"kty": "OKP", "crv": "Ed25519", "x": base64.urlsafe_b64encode(raw).rstrip(b"=").decode()}


def load_private_key(path: str | Path) -> Ed25519PrivateKey:
    key = serialization.load_pem_private_key(Path(path).read_bytes(), password=None)
    if not isinstance(key, Ed25519PrivateKey):
        raise ValueError(f"{path} is not an Ed25519 private key")
    return key


def save_private_key(key: Ed25519PrivateKey, path: str | Path) -> None:
    path = Path(path)
    if path.exists():
        raise FileExistsError(f"{path} already exists; refusing to overwrite an agent key")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption(),
    ))


if __name__ == "__main__":
    # python -m ailo_agent.keys [path]: create a key, print the public JWK to paste into the console.
    target = sys.argv[1] if len(sys.argv) > 1 else "keys/agent.pem"
    key = new_private_key()
    save_private_key(key, target)
    print(json.dumps(public_jwk(key)))
