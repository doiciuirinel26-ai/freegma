@echo off
chcp 65001 >nul
title FREEGMA Backend
echo.
echo  Pornesc FREEGMA Backend pe portul 8000...
echo  Apasa Ctrl+C pentru a opri.
echo.
cd /d "%~dp0backend"
set FREEGMA_API_KEY=freegma-dev-key-2026
"C:\Users\Fane sefu meu\AppData\Local\Programs\Python\Python311\python.exe" main.py
pause
