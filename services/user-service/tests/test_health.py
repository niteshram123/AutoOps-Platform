import pytest
from httpx import AsyncClient

from app.main import app
from app.routes.users import users


@pytest.fixture(autouse=True)
def clear_users():
    users.clear()
    yield
    users.clear()


@pytest.mark.asyncio
async def test_health_returns_200():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_response_has_required_fields():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")

    body = response.json()
    assert {"status", "service", "version", "timestamp", "uptime_seconds", "user_count"} <= set(body)


@pytest.mark.asyncio
async def test_health_status_is_healthy():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_user_count_is_integer():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")

    assert isinstance(response.json()["user_count"], int)
