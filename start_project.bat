@echo off

echo Starting Asset Management System...

echo Activating Python venv...
call .venv\Scripts\activate

echo Starting Flask Backend...
start cmd /k "cd backend && python run.py"

echo Starting React Frontend...
start cmd /k "cd frontend && npm run dev"

echo System Started!
pause