import pytest

def test_get_presets(client):
    """Verify /api/presets returns the regional presets with valid coordinates."""
    response = client.get("/api/presets")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 5

    fergana = next((p for p in data if "fergana" in p["id"].lower()), None)
    assert fergana is not None
    assert "lat" in fergana and "lon" in fergana
    assert abs(fergana["lat"] - 40.42) < 0.1
    assert abs(fergana["lon"] - 71.76) < 0.1


def test_get_crops(client):
    """Verify /api/crops returns standard FAO-56 crop parameters."""
    response = client.get("/api/crops")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 15

    crop_names = [c["id"] for c in data]
    assert "winter_wheat" in crop_names
    assert "cotton" in crop_names
    assert "mung_bean" in crop_names

    sample = data[0]
    assert "id" in sample
    assert "name" in sample
    assert "water_need_mm" in sample
    assert "season" in sample


def test_get_gibs_layers(client):
    """Verify /api/gibs-layers returns NASA GIBS layer metadata."""
    response = client.get("/api/gibs-layers")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    for expected_layer in ["ndvi", "precip", "temp", "soil"]:
        assert expected_layer in data
        assert "title" in data[expected_layer]
        assert "layer_id" in data[expected_layer]


def test_analyze_field_demo_fergana(client):
    """Verify /api/analyze-field returns baseline + alternative strategies for Fergana."""
    payload = {
        "lat": 40.42,
        "lon": 71.76,
        "name": "Fergana Valley Demo",
        "region": "Fergana",
        "current_rotation": ["winter_wheat", "cotton"],
        "priorities": {
            "water_saving": 8.0,
            "soil_om": 5.0,
            "nitrogen": 4.0,
            "erosion": 4.0,
            "forage": 3.0,
            "income": 5.0,
        },
    }
    response = client.post("/api/analyze-field", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "strategies" in data
    assert len(data["strategies"]) >= 3

    strategy_ids = [s["id"] for s in data["strategies"]]
    assert "baseline" in strategy_ids

    for strat in data["strategies"]:
        assert "id" in strat
        assert "title" in strat
        assert "steps" in strat
        assert len(strat["steps"]) >= 1

    assert "kpis" in data
    assert "soil_profile" in data
    assert "water_balance_monthly" in data


def test_analyze_field_validation_error(client):
    """Verify /api/analyze-field returns 422 if coordinates are missing."""
    payload = {
        "name": "Missing Coordinates Field",
        "region": "Nowhere",
    }
    response = client.post("/api/analyze-field", json=payload)
    assert response.status_code == 422


def test_analyze_field_scenario_sliders(client):
    """Verify /api/analyze-field responds correctly under stress scenario sliders."""
    payload = {
        "lat": 40.42,
        "lon": 71.76,
        "name": "Fergana Valley Drought Scenario",
        "region": "Fergana",
        "current_rotation": ["winter_wheat", "cotton"],
        "scenario": {
            "rain_pct": -25.0,
            "temp_c": 2.5,
            "supply": 0.75,
        },
    }
    response = client.post("/api/analyze-field", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data.get("strategies", [])) >= 3
