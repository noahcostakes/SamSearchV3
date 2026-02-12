---
applyTo: "**/*.{py,ts,tsx}"
---

# Security Patterns & Requirements

## Authentication Patterns

### JWT Token Handling (Frontend)
```typescript
// Store tokens securely
import { api } from '@/services/api';

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    
    // Store in httpOnly cookie (preferred) or localStorage
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    
    return data;
  },
  
  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

// Axios interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken });
        
        localStorage.setItem('access_token', data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        authApi.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### Token Blacklist (Backend)
```python
from app.services.token_blacklist import TokenBlacklist
from app.core.redis import get_redis

@router.post("/logout")
async def logout(
    token: str = Depends(get_token_from_header),
    current_user: User = Depends(get_current_user),
    redis = Depends(get_redis)
):
    blacklist = TokenBlacklist(redis)
    
    # Invalidate all user's tokens
    logout_time = int(datetime.now(timezone.utc).timestamp())
    await blacklist.add_user_logout(current_user.id, logout_time)
    
    return {"message": "Logged out successfully"}
```

## Input Validation

### Backend Validation
```python
from pydantic import BaseModel, field_validator, EmailStr
import re

class UserCreate(BaseModel):
    email: EmailStr  # Built-in email validation
    password: str
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain special character")
        return v
```

### SQL Injection Prevention
```python
# CORRECT ✅ - SQLAlchemy ORM (parameterized)
from sqlalchemy import select

result = await db.execute(
    select(User).where(User.email == user_input)
)

# WRONG ❌ - String interpolation
query = f"SELECT * FROM users WHERE email = '{user_input}'"  # SQL injection!
```

## XSS Prevention

### Frontend Sanitization
```typescript
import DOMPurify from 'dompurify';

// Sanitize HTML before rendering
function SafeHtml({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
  });
  
  return ;
}

// Better: Avoid dangerouslySetInnerHTML entirely
function SafeText({ text }: { text: string }) {
  return {text}  // React escapes automatically
}
```

## CSRF Protection
```python
from fastapi.middleware.csrf import CSRFMiddleware

app.add_middleware(
    CSRFMiddleware,
    secret_key=settings.JWT_SECRET_KEY
)

# Or use SameSite cookies
@router.post("/login")
async def login(response: Response, credentials: UserLogin):
    access_token, _ = create_tokens(user.id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,  # HTTPS only
        samesite="strict",  # CSRF protection
        max_age=1800  # 30 minutes
    )
    
    return {"message": "Logged in"}
```

## Rate Limiting
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")  # Max 5 login attempts per minute
async def login(request: Request, credentials: UserLogin):
    ...

# Per-user rate limiting
from app.services.usage_tracker import check_usage_limit

@router.post("/search")
async def search(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await check_usage_limit(current_user, db)
    # ... proceed with search
```

## Encryption

### Sensitive Data at Rest
```python
from app.core.encryption import encryption

# Encrypt before storing
encrypted_key = encryption.encrypt(api_key)
user.sam_api_key_encrypted = encrypted_key
await db.commit()

# Decrypt when needed
api_key = encryption.decrypt(user.sam_api_key_encrypted)
sam_client = SAMClient(api_key)
```

### Environment Variables
```python
# NEVER hardcode secrets
API_KEY = "sk-ant-1234..."  # ❌ WRONG

# Use environment variables
from app.config import settings
api_key = settings.ANTHROPIC_API_KEY  # ✅ CORRECT
```

## Logging Security
```python
import logging

logger = logging.getLogger(__name__)

# CORRECT ✅ - Log without sensitive data
logger.info(
    "User login attempt",
    extra={
        "email": user.email,
        "ip_address": request.client.host,
        "user_agent": request.headers.get("user-agent"),
    }
)

# WRONG ❌ - Logging sensitive data
logger.info(f"Password: {password}")  # Never log passwords
logger.info(f"API Key: {api_key}")    # Never log API keys
logger.info(f"Token: {token}")        # Never log tokens
```

## Security Headers
```python
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000"
        
        return response
```

## Dependency Security
```bash
# Backend - Check for vulnerabilities
pip install safety
safety check

# Frontend - Check for vulnerabilities
npm audit
npm audit fix
```

## Security Checklist

Before deploying:

- [ ] All secrets in environment variables
- [ ] Passwords hashed with Argon2id
- [ ] API keys encrypted at rest (AES-256-GCM)
- [ ] SQL queries parameterized (no string interpolation)
- [ ] Input validation on all endpoints
- [ ] Rate limiting enabled
- [ ] HTTPS enforced (production)
- [ ] Security headers configured
- [ ] CORS configured (no wildcard in production)
- [ ] Dependencies scanned for vulnerabilities
- [ ] Error messages don't expose internals
- [ ] Logging doesn't contain sensitive data