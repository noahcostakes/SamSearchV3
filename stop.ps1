# SamSearch Stop Script
# Run this script to stop all services

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "    Stopping SamSearch Application   " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Stop Frontend (node processes on port 5173)
Write-Host "[1/4] Stopping Frontend..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "  OK - Frontend stopped" -ForegroundColor Green

# Stop Backend (uvicorn/python on port 8000)
Write-Host "[2/4] Stopping Backend..." -ForegroundColor Yellow
$backendProcesses = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid in $backendProcesses) {
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
}
Write-Host "  OK - Backend stopped" -ForegroundColor Green

# Stop Docker containers
Write-Host "[3/4] Stopping databases..." -ForegroundColor Yellow
docker-compose -f "$PSScriptRoot\docker-compose.yml" stop postgres redis 2>&1 | Out-Null
Write-Host "  OK - Databases stopped" -ForegroundColor Green

# Optionally stop Ollama
Write-Host "[4/4] Stopping Ollama..." -ForegroundColor Yellow
Get-Process -Name "ollama" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "  OK - Ollama stopped" -ForegroundColor Green

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "    All Services Stopped!            " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
