@echo off
REM SamSearch Quick Stop
REM Double-click this file to stop all services

powershell -ExecutionPolicy Bypass -File "%~dp0stop.ps1"
