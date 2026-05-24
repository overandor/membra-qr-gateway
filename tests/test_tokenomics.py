def _create_sale(client):
    r = client.post("/api/token-sale", json={
        "name": "Test Sale",
        "symbol": "TST",
        "max_supply": 1_000_000,
        "initial_price": 0.10,
        "max_bonus_pct": 0.50,
        "decay_lambda": 3.0,
    })
    assert r.status_code == 200
    data = r.json()
    assert data["sale_id"].startswith("sale_")
    return data["sale_id"]


def test_create_sale(client):
    sale_id = _create_sale(client)
    assert sale_id.startswith("sale_")


def test_get_sale(client):
    sale_id = _create_sale(client)
    r = client.get(f"/api/token-sale/{sale_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["sale_id"] == sale_id
    assert data["status"] == "active"


def test_calculate_contribution(client):
    sale_id = _create_sale(client)
    r = client.post("/api/token-sale/calculate", json={
        "sale_id": sale_id,
        "buyer_wallet": "wallet_test",
        "currency": "USDC",
        "amount": 100,
    })
    assert r.status_code == 200
    data = r.json()
    assert data["total_tokens"] > 0
    assert "split" in data


def test_record_contribution(client):
    sale_id = _create_sale(client)
    r = client.post("/api/token-sale/contribute", json={
        "sale_id": sale_id,
        "buyer_wallet": "wallet_test",
        "currency": "USDC",
        "amount": 100,
    })
    assert r.status_code == 200
    data = r.json()
    assert data["contribution_id"].startswith("ctr_")
    assert data["position"] == 1


def test_rebase_requires_admin(client):
    sale_id = _create_sale(client)
    r = client.post("/api/rebase/trigger", json={
        "sale_id": sale_id,
        "admin_key": "wrong-key",
    })
    assert r.status_code == 403
