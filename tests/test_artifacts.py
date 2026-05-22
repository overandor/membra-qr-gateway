def test_create_and_list_artifacts(client):
    r = client.post("/api/artifacts", json={
        "artifact_title": "Test Artifact",
        "artifact_type": "proofbook",
        "destination_url": "https://example.com",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["artifact_id"].startswith("art_")
    assert data["status"] == "registered_pending_external_verification"

    r2 = client.get("/api/artifacts")
    assert r2.status_code == 200
    assert len(r2.json()["artifacts"]) == 1
