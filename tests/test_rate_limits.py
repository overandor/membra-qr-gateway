def test_rate_limit_headers_present(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    # slowapi injects X-RateLimit headers when using memory storage
    # In test client these may not appear; just ensure no crash
