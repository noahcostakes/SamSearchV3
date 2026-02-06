@echo off
REM Quick Celery Worker Restart
echo Starting Celery Worker...
cd backend
..\venv\Scripts\celery.exe -A app.tasks.celery_app worker --loglevel=info --pool=solo
pause
