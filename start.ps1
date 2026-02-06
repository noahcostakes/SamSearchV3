# SamSearch Startup Script
# Run this script to start all services

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "    Starting SamSearch Application    " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Refresh PATH to pick up Ollama
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Check if Docker is running
Write-Host "[1/5] Checking Docker..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1 | Select-String "Server Version"
if (-not $dockerRunning) {
    Write-Host "  ! Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    Write-Host "  Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host "  OK - Docker is running" -ForegroundColor Green

# Start PostgreSQL and Redis
Write-Host "[2/5] Starting databases (PostgreSQL & Redis)..." -ForegroundColor Yellow
docker-compose -f "$PSScriptRoot\docker-compose.yml" up -d postgres redis 2>&1 | Out-Null
Start-Sleep -Seconds 3
Write-Host "  OK - Databases started" -ForegroundColor Green

# Start Ollama
Write-Host "[3/5] Starting Ollama AI..." -ForegroundColor Yellow
$ollamaRunning = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
if (-not $ollamaRunning) {
    Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}
Write-Host "  OK - Ollama is running" -ForegroundColor Green

# Start Backend
Write-Host "[4/6] Starting Backend API..." -ForegroundColor Yellow
$backendPath = "$PSScriptRoot\backend"
$venvPython = "$PSScriptRoot\venv\Scripts\python.exe"
$uvicorn = "$PSScriptRoot\venv\Scripts\uvicorn.exe"

# Start backend with visible logs
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Backend API Logs' -ForegroundColor Cyan; Write-Host '==================' -ForegroundColor Cyan; Set-Location '$backendPath'; & '$uvicorn' app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info" -WindowStyle Normal
Start-Sleep -Seconds 3
Write-Host "  OK - Backend started at http://localhost:8000" -ForegroundColor Green

# Start Celery Worker
Write-Host "[5/6] Starting Celery Worker for background tasks..." -ForegroundColor Yellow
$celery = "$PSScriptRoot\venv\Scripts\celery.exe"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Celery Worker Logs' -ForegroundColor Cyan; Write-Host '==================' -ForegroundColor Cyan; Set-Location '$backendPath'; & '$celery' -A app.tasks.celery_app worker --loglevel=info --pool=solo" -WindowStyle Normal
Start-Sleep -Seconds 2
Write-Host "  OK - Celery worker started" -ForegroundColor Green

# Start Frontend
Write-Host "[6/6] Starting Frontend..." -ForegroundColor Yellow
$frontendPath = "$PSScriptRoot\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendPath'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3
Write-Host "  OK - Frontend started at http://localhost:5173" -ForegroundColor Green

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "    All Services Started!            " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "  API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Opening browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "Press any key to close this window (services will keep running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
