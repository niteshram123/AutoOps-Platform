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
async def test_create_user_success():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/users", json={"name": "Ada Lovelace", "email": "ada@example.com", "role": "admin"})

    assert response.status_code == 201
    assert response.json()["email"] == "ada@example.com"


@pytest.mark.asyncio
async def test_create_user_invalid_email():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/users", json={"name": "Ada Lovelace", "email": "not-email", "role": "admin"})

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_user_invalid_role():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/users", json={"name": "Ada Lovelace", "email": "ada@example.com", "role": "owner"})

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_users_empty():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/users")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_user_by_id():
    async with AsyncClient(app=app, base_url="http://test") as client:
        created = await client.post("/users", json={"name": "Grace Hopper", "email": "grace@example.com", "role": "developer"})
        response = await client.get(f"/users/{created.json()['id']}")

    assert response.status_code == 200
    assert response.json()["name"] == "Grace Hopper"


@pytest.mark.asyncio
async def test_update_user():
    async with AsyncClient(app=app, base_url="http://test") as client:
        created = await client.post("/users", json={"name": "Linus Torvalds", "email": "linus@example.com", "role": "developer"})
        response = await client.put(f"/users/{created.json()['id']}", json={"role": "viewer"})

    assert response.status_code == 200
    assert response.json()["role"] == "viewer"


@pytest.mark.asyncio
async def test_delete_user():
    async with AsyncClient(app=app, base_url="http://test") as client:
        created = await client.post("/users", json={"name": "Margaret Hamilton", "email": "margaret@example.com", "role": "admin"})
        response = await client.delete(f"/users/{created.json()['id']}")

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_get_nonexistent_user():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/users/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404
    assert response.json()["detail"] == {"error": "user not found"}
