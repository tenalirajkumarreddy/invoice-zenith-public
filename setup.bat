@echo off
REM Invoice Zenith - Quick Setup Script for Windows

echo 🚀 Setting up Invoice Zenith for Public Access...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
call npm install

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
cd ..

echo.
echo 🎉 Setup complete!
echo.
echo 📝 To start the application:
echo.
echo Option 1 - Frontend Only (Mock Data):
echo   npm run dev
echo   Visit: http://localhost:8080
echo.
echo Option 2 - Full Stack (Recommended):
echo   Terminal 1: cd backend ^&^& npm start
echo   Terminal 2: npm run dev
echo   Visit: http://localhost:8080
echo.
echo 🌐 The application is now accessible without authentication!
echo 📊 All features are publicly available for demonstration.
echo.
echo 📚 For more details, see SETUP_GUIDE.md
pause
