---
applyTo: "backend/**/*.py"
---

# Backend Python Instructions

## Python Style Guide

### Type Hints (MANDATORY)
```python
# ALWAYS include type hints for function signatures
from typing import Optional, List, Dict, Any

async def get_user_by_email(email: str) -> Optional[User]:
    """Fetch user by email address"""
    ...

async def search_opportunities(
    profile: CompanyProfile,
    days_back: int = 30
) -> List[Dict[str, Any]]:
    """Search SAM.gov and return opportunities"""
    ...
```

### FastAPI Patterns

**Dependency Injection:**
```python
from fastapi import Depends
from app.api.deps import get_current_user, get_db

@router.get("/protected")
async def protected_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ...
```

**Response Models:**
```python
from app.schemas.user import UserResponse

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user  # FastAPI auto-converts to UserResponse
```

### SQLAlchemy Async Patterns

**Queries:**
```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Simple query
result = await db.execute(select(User).where(User.email == email))
user = result.scalar_one_or_none()

# Join query
result = await db.execute(
    select(User, CompanyProfile)
    .join(CompanyProfile)
    .where(User.id == user_id)
)
user, profile = result.one()

# Filtering
result = await db.execute(
    select(User)
    .where(User.is_active == True)
    .where(User.created_at > cutoff_date)
    .order_by(User.created_at.desc())
    .limit(100)
)
users = result.scalars().all()
```

**Transactions:**
```python
async with db.begin():
    user = User(email=email, ...)
    db.add(user)
    
    profile = CompanyProfile(user_id=user.id, ...)
    db.add(profile)
    
    # Both committed together
```

### Pydantic Validation

**Custom Validators:**
```python
from pydantic import BaseModel, field_validator
import re

class ProfileCreate(BaseModel):
    primary_naics: str
    
    @field_validator("primary_naics")
    @classmethod
    def validate_naics(cls, v: str) -> str:
        if not re.match(r"^\d{6}$", v):
            raise ValueError("NAICS must be 6 digits")
        return v
    
    @field_validator("email")
    @classmethod
    def validate_email_domain(cls, v: str) -> str:
        if "@example.com" in v:
            raise ValueError("Invalid email domain")
        return v.lower()
```

### Error Handling

**HTTP Exceptions:**
```python
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

try:
    user = await get_user(user_id)
except UserNotFoundError:
    logger.warning(f"User not found: {user_id}")
    raise HTTPException(404, "User not found")
except DatabaseError as e:
    logger.error(f"Database error: {e}", exc_info=True)
    raise HTTPException(500, "Internal server error")
```

### Logging

**Structured Logging:**
```python
import logging

logger = logging.getLogger(__name__)

# Include context
logger.info(
    "User registered",
    extra={
        "user_id": user.id,
        "email": user.email,
        "request_id": request.state.request_id,
    }
)

# Error logging
logger.error(
    "SAM.gov API failed",
    extra={
        "user_id": user_id,
        "status_code": response.status_code,
        "error": str(error),
    },
    exc_info=True  # Include stack trace
)
```

### Async Best Practices
```python
# CORRECT ✅ - Use async/await consistently
async def process_search(user_id: str):
    user = await get_user(user_id)
    profile = await get_profile(user.id)
    results = await search_sam_gov(profile)
    return results

# WRONG ❌ - Mixing sync/async
async def process_search(user_id: str):
    user = get_user(user_id)  # Blocks event loop!
    ...
```

### Celery Tasks
```python
from app.tasks.celery_app import celery_app

@celery_app.task(
    bind=True,
    name='tasks.my_task',
    max_retries=3,
    time_limit=300
)
def my_background_task(self, arg1: str, arg2: int):
    try:
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'current': 50, 'total': 100}
        )
        
        # Do work
        result = expensive_operation(arg1, arg2)
        
        return result
    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
```

## Security Patterns

**Password Hashing:**
```python
from pwdlib import PasswordHash

hasher = PasswordHash.recommended()

# Hash password
hashed = hasher.hash(plain_password)

# Verify password
if hasher.verify(plain_password, hashed_password):
    # Correct password
    ...
```

**Encryption:**
```python
from app.core.encryption import encryption

# Encrypt sensitive data
encrypted_key = encryption.encrypt(api_key)

# Store in database
user.sam_api_key_encrypted = encrypted_key

# Decrypt when needed
api_key = encryption.decrypt(user.sam_api_key_encrypted)
```

**JWT Tokens:**
```python
from app.core.security import create_tokens, verify_token

# Create tokens
access_token, refresh_token = create_tokens(user.id)

# Verify token
payload = await verify_token(token, token_type="access", blacklist=blacklist)
if not payload:
    raise HTTPException(401, "Invalid token")
```

## Testing

**Pytest Fixtures:**
```python
import pytest
from httpx import AsyncClient

@pytest.fixture
async def client():
    """Async HTTP client for testing"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def test_user(db):
    """Create test user"""
    user = User(email="test@example.com", ...)
    db.add(user)
    await db.commit()
    yield user
    await db.delete(user)
    await db.commit()
```

**Test Patterns:**
```python
@pytest.mark.asyncio
async def test_create_user(client):
    response = await client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "SecurePass123!"
    })
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data
```

## Code Organization

**Service Layer Pattern:**
```python
# app/services/user_service.py
class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_user(self, email: str, password: str) -> User:
        # Business logic here
        ...
    
    async def authenticate(self, email: str, password: str) -> Optional[User]:
        # Auth logic here
        ...

# In routes
from app.services.user_service import UserService

@router.post("/register")
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    service = UserService(db)
    user = await service.create_user(user_data.email, user_data.password)
    return user
```