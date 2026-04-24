@echo off
echo [1/3] Starting Portable MongoDB...
powershell -ExecutionPolicy Bypass -File .\start-mongo.ps1

echo [2/3] Checking dependencies in server...
cd server
if not exist node_modules (
    echo node_modules not found. Installing dependencies...
    call npm install
)

echo [3/3] Launching CodeSphere...
echo Application will be available at http://localhost:5000
npm start
pause
