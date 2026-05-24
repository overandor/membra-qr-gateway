def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert "version" in data
    assert data["db"] == "connected"


def test_ready(client):
    r = client.get("/api/ready")
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert "ready" in data
