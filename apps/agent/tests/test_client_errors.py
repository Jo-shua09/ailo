import httpx
import pytest

from ailo_agent.client import AiloClient, AiloError
from ailo_agent.keys import new_private_key


def test_html_error_page_becomes_a_clear_ailo_error():
    def handler(_request):
        return httpx.Response(502, text="<html>Bad Gateway</html>")

    client = AiloClient("http://api.test", "agt_1", new_private_key(), http=httpx.Client(transport=httpx.MockTransport(handler)))
    with pytest.raises(AiloError) as err:
        client.get("/v1/agents/me")
    assert err.value.status == 502
