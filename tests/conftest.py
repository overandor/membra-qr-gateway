import os
import pytest
from fastapi.testclient import TestClient

# Use in-memory DB for tests
os.environ["DB_PATH"] = "/tmp/test_membra.sqlite3"
os.environ["MEMBRA_EVENT_SECRET"] = "test-secret"
os.environ["ADMIN_API_KEY"] = "test-admin-key"

from app import api, init_db


@pytest.fixture(scope="function", autouse=True)
def reset_db():
    init_db()
    yield
    # cleanup between tests
    import sqlite3
    conn = sqlite3.connect(os.environ["DB_PATH"])
    conn.execute("DELETE FROM artifacts")
    conn.execute("DELETE FROM token_sales")
    conn.execute("DELETE FROM contributions")
    conn.execute("DELETE FROM rebate_claims")
    conn.execute("DELETE FROM rebase_epochs")
    conn.execute("DELETE FROM holder_balances")
    conn.execute("DELETE FROM holder_rebase_events")
    conn.commit()
    conn.close()


@pytest.fixture
def client():
    return TestClient(api)
