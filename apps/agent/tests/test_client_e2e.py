import json
import os
import signal
import subprocess
from pathlib import Path

import httpx
import pytest

from ailo_agent.client import AiloClient, AiloError
from ailo_agent.keys import new_private_key, public_jwk

API_DIR = Path(__file__).resolve().parents[2] / "api"


WINDOWS = os.name == "nt"


@pytest.fixture(scope="module")
def api_url():
    # npx is a .cmd shim on Windows (needs the shell); elsewhere start a new process group to kill as one.
    proc = subprocess.Popen(
        ["npx", "tsx", "src/test/serve.ts"], cwd=API_DIR, stdout=subprocess.PIPE, text=True,
        shell=WINDOWS, start_new_session=not WINDOWS,
    )
    try:
        port = json.loads(proc.stdout.readline())["port"]
        yield f"http://127.0.0.1:{port}"
    finally:
        # Kill the whole process tree, or the node server outlives the test.
        if WINDOWS:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
        else:
            os.killpg(proc.pid, signal.SIGTERM)


def register(api_url: str, jwk: dict) -> tuple[str, str]:
    token = httpx.post(f"{api_url}/v1/owner/session", json={"pin": "246810"}).json()["token"]
    res = httpx.post(f"{api_url}/v1/agents", json={"name": "Shop agent", "public_jwk": jwk},
                     headers={"authorization": f"Owner {token}"})
    assert res.status_code == 201, res.text
    return res.json()["id"], token


def test_signed_call_reaches_the_real_api(api_url):
    key = new_private_key()
    agent_id, _ = register(api_url, public_jwk(key))
    me = AiloClient(api_url, agent_id, key).get("/v1/agents/me")
    assert me["id"] == agent_id and me["status"] == "active"


def test_braked_agent_gets_a_clear_error(api_url):
    key = new_private_key()
    agent_id, owner = register(api_url, public_jwk(key))
    httpx.post(f"{api_url}/v1/agents/{agent_id}/brake", headers={"authorization": f"Owner {owner}"})
    with pytest.raises(AiloError) as err:
        AiloClient(api_url, agent_id, key).get("/v1/agents/me")
    assert err.value.status == 403 and err.value.code == "AGENT_REVOKED"
