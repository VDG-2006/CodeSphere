# start-mongo.ps1
# Launches the portable MongoDB instance extracted from the MSI

$MONGO_EXE = "D:\rfp\CodeSphere\server\mongodb\MongoDB\Server\8.2\bin\mongod.exe"
$DB_PATH = "D:\rfp\CodeSphere\server\data\db"
$LOG_PATH = "D:\rfp\CodeSphere\server\data\log\mongo.log"

Write-Host "Starting Portable MongoDB..." -ForegroundColor Green
Write-Host "DB Path: $DB_PATH"
Write-Host "Log Path: $LOG_PATH"

# Start mongod in a separate process
Start-Process -FilePath $MONGO_EXE -ArgumentList "--dbpath `"$DB_PATH`" --logpath `"$LOG_PATH`" --bind_ip 127.0.0.1" -NoNewWindow
