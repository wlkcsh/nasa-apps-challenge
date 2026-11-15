import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import main

@pytest.fixture(scope="session")
def client():
    with TestClient(main.app) as test_client:
        yield test_client
