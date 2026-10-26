# BioLens - Start Emulator & Launch App
# Run: .\start-emulator.ps1

$ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = $ANDROID_HOME
$env:JAVA_HOME = $JAVA_HOME
$env:PATH += ";$ANDROID_HOME\emulator;$ANDROID_HOME\platform-tools;$JAVA_HOME\bin"

$emulator = "$ANDROID_HOME\emulator\emulator.exe"
$adb = "$ANDROID_HOME\platform-tools\adb.exe"

# Check if emulator already running
$devices = & $adb devices 2>&1
if ($devices -match "emulator-\d+\s+device") {
    Write-Host "✓ Emulator already running!" -ForegroundColor Green
} else {
    Write-Host "Starting Pixel_9 emulator..." -ForegroundColor Yellow
    Start-Process -FilePath $emulator -ArgumentList "-avd Pixel_9 -no-snapshot-load" -WindowStyle Normal
    
    Write-Host "Waiting for emulator to boot (this takes ~60 seconds)..."
    $maxWait = 120
    $waited = 0
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 8
        $waited += 8
        $d = & $adb devices 2>&1
        if ($d -match "emulator-\d+\s+device") {
            Write-Host "✓ Emulator is online! ($waited seconds)" -ForegroundColor Green
            break
        }
        Write-Host "  Still booting... ($waited/$maxWait sec)"
    }
}

Write-Host ""
Write-Host "Launching BioLens..." -ForegroundColor Cyan
npx expo start --android
