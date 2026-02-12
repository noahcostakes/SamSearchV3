---
applyTo: '**'
---
# SAM.gov AI-Powered Contract Search Platform

## Project Purpose

An AI-powered B2B SaaS platform that helps small businesses discover relevant government contracts by:
- Automating SAM.gov API searches based on company profiles
- Using Claude AI to score and rank opportunities by relevance
- Providing actionable recommendations (bid/watch/skip)
- Tracking search history and usage analytics

**Target Users:** Small businesses seeking federal government contracts  
**Key Differentiator:** AI scoring reduces manual contract review from 20+ hours/month to minutes

---

## Technology Stack

### Backend
- **Framework:** FastAPI 0.109+ with async/await patterns
- **Language:** Python 3.11+ with type hints (mandatory)
- **Database:** PostgreSQL 16 with SQLAlchemy 2.0 ORM
- **Cache/Queue:** Redis 7 for caching and Celery job queue
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Security:** JWT + Argon2id passwords + AES-256-GCM encryption

### Frontend
- **Framework:** React 18 with TypeScript 5 (strict mode)
- **Build Tool:** Vite 5 (NOT Create React App)
- **State Management:** Zustand for global state, TanStack Query for server state
- **UI Library:** shadcn/ui + Tailwind CSS
- **Validation:** Zod schemas matching backend Pydantic models

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Monitoring:** Prometheus + Grafana
- **Logging:** Structured JSON logging with request IDs

---

## Critical Project Rules

### Security First (NON-NEGOTIABLE)

1. **Never Store Secrets in Code**
   - All API keys, passwords, tokens → environment variables
   - Use AES-256-GCM encryption for user API keys at rest
   - Hash passwords with Argon2id (via pwdlib), never plain text

2. **Validate All Inputs**
   - Backend: Pydantic models with field validators
   - Frontend: Zod schemas before API calls
   - SQL: Always use SQLAlchemy ORM (parameterized queries)
   - Never trust user input, sanitize at boundaries

3. **Authentication & Authorization**
   - JWT tokens with short expiry (30 min access, 7 day refresh)
   - Token blacklist for logout (Redis-based)
   - Check auth on ALL protected endpoints
   - Include request IDs for audit trails

4. **Security Headers (Production)**
```python
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY
   Strict-Transport-Security: max-age=31536000
   Content-Security-Policy: default-src 'self'
```

### SAM.gov API Integration (CRITICAL - COMMON MISTAKES)

**Use EXACT parameter names** (internet examples are often wrong):
```python
# CORRECT ✅
params = {
    "ptype": "o,k",              # NOT "noticeType"
    "ncode": "541511",            # NOT "naicsCode"
    "typeOfSetAside": "SBA",      # NOT "setAside"
    "postedFrom": "01/15/2024",   # MM/DD/YYYY format
    "postedTo": "02/15/2024",     # NOT YYYY-MM-DD
}

# WRONG ❌ (will fail silently or return errors)
params = {
    "noticeType": "o,k",          # Wrong parameter name
    "naicsCode": "541511",        # Wrong parameter name
    "setAside": "SBA",            # Wrong parameter name
    "postedFrom": "2024-01-15",   # Wrong date format
}
```

**Rate Limits:** 1,000 requests per DAY (not hour), track usage in database

### Background Jobs (Celery)

**AI scoring MUST run asynchronously** (prevents request timeouts):
```python
# CORRECT ✅ - Return job ID immediately
@router.post("/search/start")
async def start_search(...):
    job = score_opportunities_task.delay(user_id, profile_id)
    return {"job_id": job.id, "status": "processing"}

# WRONG ❌ - Blocks HTTP request for 10-30 seconds
@router.post("/search")
async def search(...):
    opportunities = await ai_scorer.score(...)  # Too slow!
    return opportunities
```

### Error Handling

**Always handle errors explicitly:**
```python
# CORRECT ✅
try:
    result = await sam_client.search(...)
except httpx.TimeoutException:
    logger.error(f"SAM.gov timeout user={user_id}")
    raise HTTPException(502, "API temporarily unavailable")
except httpx.HTTPStatusError as e:
    if e.response.status_code == 429:
        raise HTTPException(429, "Rate limit reached")
    raise HTTPException(502, "API error")

# WRONG ❌
try:
    result = await sam_client.search(...)
except:  # Never use bare except
    pass  # Never silently swallow errors
```

**User-facing errors:** Never expose stack traces, always log with request ID

### Database Best Practices

1. **Always Use Indexes** on frequently queried columns
```python
   __table_args__ = (
       Index('idx_user_id', 'user_id'),
       Index('idx_created_at', 'created_at'),
   )
```

2. **Use Database Transactions**
```python
   async with db.begin():
       # Multiple operations here
       await db.commit()
```

3. **Never Use Raw SQL** - Always use SQLAlchemy ORM

### Code Quality Standards

1. **Type Hints Everywhere** (Python & TypeScript)
```python
   # CORRECT ✅
   async def create_user(email: str, password: str) -> User:
       ...
   
   # WRONG ❌
   async def create_user(email, password):  # No types
       ...
```

2. **Meaningful Names** - No abbreviations unless industry standard
```python
   # CORRECT ✅
   user_authentication_service
   opportunity_relevance_score
   
   # WRONG ❌
   usr_auth_svc
   opp_rel_scr
```

3. **Small, Focused Functions** - Single responsibility principle
   - Max 50 lines per function
   - One level of abstraction per function

4. **Comments for "Why" not "What"**
```python
   # CORRECT ✅
   # Cache for 24h to reduce AI costs while keeping scores fresh
   @cached(ttl=86400)
   async def get_opportunity_score(...):
   
   # WRONG ❌
   # This function gets the opportunity score
   async def get_opportunity_score(...):
```

### Testing Requirements

**Every feature MUST have tests:**

1. **Unit Tests** - All services, utils, helpers
2. **Integration Tests** - All API endpoints
3. **Security Tests** - Auth, validation, encryption
4. **Mock External APIs** - SAM.gov, Claude API
```python
# Always mock external APIs
@pytest.mark.asyncio
async def test_search_opportunities(mock_sam_api):
    mock_sam_api.return_value = {"opportunitiesData": [...]}
    result = await sam_client.search(...)
    assert result["totalRecords"] == 100
```

**Test Coverage:** Aim for 80%+ on critical paths (auth, search, scoring)

---

## Project Structure
```
sam-search/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # API routes (auth, search, profiles)
│   │   ├── core/            # Security, encryption, middleware
│   │   ├── services/        # SAM client, AI scorer, business logic
│   │   ├── models/          # SQLAlchemy database models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── tasks/           # Celery background jobs
│   │   └── db/              # Database session management
│   ├── tests/               # pytest test suite
│   └── alembic/             # Database migrations
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # shadcn components
│   │   │   ├── layout/      # Header, Sidebar, Layout
│   │   │   └── features/    # Auth, Profile, Search, Dashboard
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client (axios/fetch)
│   │   ├── stores/          # Zustand state stores
│   │   └── types/           # TypeScript interfaces
│
└── .github/
    ├── copilot-instructions.md         # This file
    ├── instructions/
    │   ├── backend.instructions.md     # Python-specific rules
    │   ├── frontend.instructions.md    # React/TS-specific rules
    │   └── security.instructions.md    # Security patterns
    └── workflows/
        └── ci.yml                       # GitHub Actions CI/CD
```

---

## Common Patterns & Examples

### API Endpoint Pattern
```python
from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.schemas.user import UserResponse

router = APIRouter(prefix="/api/v1/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user's profile"""
    return UserResponse.from_orm(current_user)
```

### Frontend API Call Pattern
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/profile');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Background Job Pattern
```python
from app.tasks.celery_app import celery_app

@celery_app.task(bind=True, name='tasks.score_opportunities')
def score_opportunities_task(self, user_id: str, profile_id: str):
    self.update_state(state='PROCESSING', meta={'progress': 10})
    # ... do work ...
    return results
```

---

## Environment-Specific Behavior

### Local Development
- CORS: Allow `localhost:3000` and `localhost:5173`
- Debug mode: Enabled
- Detailed error messages in responses
- Hot reload enabled

### Production
- CORS: Allow only production domain
- Debug mode: Disabled
- Generic error messages to users
- HTTPS redirect enabled
- Security headers enabled
- Database SSL required

---

## Reference Documentation

For detailed guidelines, see:
- **Backend Architecture:** `docs/backend-architecture.md`
- **Frontend Patterns:** `docs/frontend-patterns.md`
- **Security Checklist:** `docs/security-checklist.md`
- **API Documentation:** `docs/api-documentation.md`
- **Testing Guide:** `docs/testing-guide.md`
- **Deployment Guide:** `docs/deployment-guide.md`

---

## What NOT to Do

1. ❌ **Never use** Create React App (use Vite)
2. ❌ **Never use** `passlib` (use `pwdlib[argon2]`)
3. ❌ **Never add** features beyond requirements (avoid over-engineering)
4. ❌ **Never skip** input validation
5. ❌ **Never expose** sensitive data in logs or error messages
6. ❌ **Never use** `SELECT *` in queries
7. ❌ **Never commit** `.env` files or secrets
8. ❌ **Never use** `any` type in TypeScript without good reason
9. ❌ **Never deploy** without running tests first
10. ❌ **Never assume** data is safe - always validate

---

## Quick Commands
```bash
# Backend
cd backend
pytest                           # Run tests
black .                          # Format code
mypy app/                        # Type check
alembic upgrade head             # Run migrations
uvicorn app.main:app --reload    # Start dev server

# Frontend
cd frontend
npm run dev                      # Start dev server
npm run build                    # Build for production
npm run lint                     # Lint code
npx tsc --noEmit                 # Type check

# Docker
docker-compose up -d             # Start all services
docker-compose logs -f backend   # View backend logs
docker-compose exec backend bash # Shell into backend
```

---

## When in Doubt

1. **Security:** Fail closed (deny access if uncertain)
2. **Performance:** Async background jobs for slow operations
3. **Errors:** Log everything, show generic messages to users
4. **Testing:** If you're not sure, write a test
5. **Documentation:** If it's not obvious, add a comment

---

*Last Updated: February 2026*
*For questions or issues, see: `docs/troubleshooting.md`*