# SamSearch - AI-Powered Government Contract Search Platform

A full-stack B2B SaaS application that helps small businesses discover, evaluate, and track government contract opportunities from SAM.gov using AI-powered matching and scoring.

## Features

- **AI-Powered Opportunity Matching**: Leverages Claude AI to analyze and score contract opportunities based on your company profile
- **Smart Search**: Advanced search with filters for NAICS codes, set-asides, notice types, and more
- **Company Profiles**: Build detailed profiles with capabilities, certifications, and preferences
- **Opportunity Tracking**: Save and organize opportunities with notes
- **Secure API Key Storage**: AES-256-GCM encryption for SAM.gov API keys
- **Background Processing**: Async job processing with Celery for search and scoring

## Tech Stack

### Backend
- **Python 3.11+** with **FastAPI**
- **PostgreSQL 16** with async support (asyncpg)
- **Redis 7** for caching and job queue
- **Celery 5.3** for background tasks
- **SQLAlchemy 2.0** with Alembic migrations
- **Anthropic Claude API** for AI scoring

### Frontend
- **React 18** with **TypeScript 5.3**
- **Vite 5** for development and build
- **TanStack Query 5** for data fetching
- **Zustand 4** for state management
- **shadcn/ui** + **Tailwind CSS 3.4** for UI
- **React Hook Form** + **Zod** for form validation

### Infrastructure
- **Docker** + **Docker Compose**
- **Nginx** for reverse proxy
- **GitHub Actions** for CI/CD

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)
- SAM.gov API Key
- Anthropic API Key (for AI features)

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SamSearchV3
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Generate encryption key**
   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   # Add the output to ENCRYPTION_KEY in .env
   ```

4. **Start services**
   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Flower (Celery monitoring): http://localhost:5555

### Local Development

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt -r requirements-dev.txt

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

```
├── backend/
│   ├── alembic/              # Database migrations
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   └── v1/           # API version 1
│   │   ├── core/             # Core modules (security, middleware)
│   │   ├── db/               # Database configuration
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   └── tasks/            # Celery tasks
│   ├── tests/                # Backend tests
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── layout/       # Layout components
│   │   │   └── ui/           # shadcn/ui components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   ├── stores/           # Zustand stores
│   │   └── types/            # TypeScript types
│   └── Dockerfile
├── .github/
│   ├── instructions/         # Copilot instructions
│   └── workflows/            # GitHub Actions
├── docker-compose.yml        # Development compose
└── docker-compose.production.yml
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh` - Refresh tokens
- `GET /api/v1/auth/me` - Get current user

### Profile
- `GET /api/v1/profile` - Get company profile
- `PUT /api/v1/profile` - Update company profile
- `PUT /api/v1/profile/sam-key` - Update SAM.gov API key
- `DELETE /api/v1/profile/sam-key` - Delete SAM.gov API key

### Search
- `POST /api/v1/search` - Start new search
- `GET /api/v1/search/history` - Get search history
- `GET /api/v1/search/{job_id}/results` - Get search results
- `POST /api/v1/search/save` - Save opportunity
- `GET /api/v1/search/saved` - Get saved opportunities
- `DELETE /api/v1/search/saved/{id}` - Remove saved opportunity

### Jobs
- `GET /api/v1/jobs/{job_id}` - Get job status
- `GET /api/v1/jobs/{job_id}/result` - Get job result

## Security

- **Password Hashing**: Argon2id via pwdlib
- **JWT Tokens**: Access tokens (30min) + Refresh tokens (7 days)
- **API Key Encryption**: AES-256-GCM at rest
- **Rate Limiting**: Redis-based per-user limits
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.

## Testing

### Backend
```bash
cd backend
pytest -v --cov=app
```

### Frontend
```bash
cd frontend
npm run test
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue on GitHub.
