import logging
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Request, status

from app.models.user import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger("user-service")
users: dict[UUID, UserResponse] = {}


def _ops(request: Request):
    """Shortcut to access custom metrics stored on app.state."""
    return request.app.state


def log_user_action(action: str, user_id: UUID) -> None:
    logger.info(
        "user operation",
        extra={
            "action": action,
            "user_id": str(user_id),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@router.get("", response_model=list[UserResponse])
async def list_users(request: Request):
    _ops(request).user_operations_total.labels(operation="read", status="success").inc()
    _ops(request).user_store_size.set(len(users))
    return list(users.values())


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, request: Request):
    user_id = uuid4()
    now = datetime.now(timezone.utc)
    user = UserResponse(id=user_id, created_at=now, updated_at=now, **payload.model_dump())
    users[user_id] = user
    log_user_action("create", user_id)
    _ops(request).user_operations_total.labels(operation="create", status="success").inc()
    _ops(request).user_store_size.set(len(users))
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: UUID, request: Request):
    if user_id not in users:
        _ops(request).user_operations_total.labels(operation="read", status="not_found").inc()
        raise HTTPException(status_code=404, detail={"error": "user not found"})
    log_user_action("read", user_id)
    _ops(request).user_operations_total.labels(operation="read", status="success").inc()
    return users[user_id]


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: UUID, payload: UserUpdate, request: Request):
    if user_id not in users:
        _ops(request).user_operations_total.labels(operation="update", status="not_found").inc()
        raise HTTPException(status_code=404, detail={"error": "user not found"})

    stored = users[user_id]
    changes = payload.model_dump(exclude_unset=True)
    updated = stored.model_copy(update={**changes, "updated_at": datetime.now(timezone.utc)})
    users[user_id] = updated
    log_user_action("update", user_id)
    _ops(request).user_operations_total.labels(operation="update", status="success").inc()
    return updated


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: UUID, request: Request):
    if user_id not in users:
        _ops(request).user_operations_total.labels(operation="delete", status="not_found").inc()
        raise HTTPException(status_code=404, detail={"error": "user not found"})

    del users[user_id]
    log_user_action("delete", user_id)
    _ops(request).user_operations_total.labels(operation="delete", status="success").inc()
    _ops(request).user_store_size.set(len(users))
    return None
