@echo off
echo =================================
echo   خوام - تشغيل المشروع
echo =================================
echo.

echo جاري تشغيل Backend...
start "Backend" cmd /k "cd backend && python main.py"

timeout /t 2 /nobreak >nul

echo جاري تشغيل Frontend...
cd frontend
start "Frontend" cmd /k "pnpm dev"

echo.
echo تم تشغيل المشروع!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
pause

