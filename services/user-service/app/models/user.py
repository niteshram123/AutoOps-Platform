from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    role: Literal["admin", "developer", "viewer"]


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    role: Optional[Literal["admin", "developer", "viewer"]] = None


class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
