"""用户认证 API"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import select

from ..config import settings
from ..db.database import async_session
from ..db.models import DBUser

router = APIRouter(prefix="/api/auth")

# ── Security ──

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": user_id,
        "username": username,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> DBUser:
    """从 Bearer token 中解析并返回当前用户"""
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )

    async with async_session() as session:
        result = await session.execute(select(DBUser).where(DBUser.id == user_id))
        user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive"
        )
    return user


# ── Request / Response Models ──


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    username: str
    email: str | None
    role: str
    is_active: bool
    created_at: datetime | None
    last_login: datetime | None


# ── Endpoints ──


@router.post("/register", response_model=UserResponse)
async def register(req: RegisterRequest):
    """用户注册"""
    async with async_session() as session:
        # 检查用户名是否已存在
        result = await session.execute(
            select(DBUser).where(DBUser.username == req.username)
        )
        if result.scalar_one_or_none() is not None:
            raise HTTPException(status_code=400, detail="Username already exists")

        user = DBUser(
            id=uuid.uuid4().hex,
            username=req.username,
            password_hash=hash_password(req.password),
            email=req.email,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login,
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    """用户登录，返回 JWT token"""
    async with async_session() as session:
        result = await session.execute(
            select(DBUser).where(DBUser.username == req.username)
        )
        user = result.scalar_one_or_none()

    if user is None or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password"
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is deactivated")

    # 更新 last_login
    async with async_session() as session:
        result = await session.execute(select(DBUser).where(DBUser.id == user.id))
        db_user = result.scalar_one()
        db_user.last_login = datetime.now(timezone.utc)
        await session.commit()

    token = create_access_token(user.id, user.username)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: DBUser = Depends(get_current_user)):
    """获取当前用户信息"""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        last_login=current_user.last_login,
    )


@router.post("/logout")
async def logout(current_user: DBUser = Depends(get_current_user)):
    """登出（客户端丢弃 token 即可，此处仅返回确认）"""
    return {"status": "logged_out", "username": current_user.username}
