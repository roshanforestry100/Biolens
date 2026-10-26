# BioLens Dev Environment Setup Script
# Run this in PowerShell before starting development: .\setup-env.ps1

$ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"

$env:ANDROID_HOME = $ANDROID_HOME
$env:JAVA_HOME = $JAVA_HOME
$env:PATH += ";$ANDROID_HOME\emulator;$ANDROID_HOME\platform-tools;$ANDROID_HOME\tools\bin;$JAVA_HOME\bin"

Write-Host "✓ Environment configured" -ForegroundColor Green
Write-Host "  ANDROID_HOME: $ANDROID_HOME" -ForegroundColor Cyan
Write-Host "  JAVA_HOME:    $JAVA_HOME" -ForegroundColor Cyan
Write-Host ""
Write-Host "ADB Devices:" -ForegroundColor Yellow
& "$ANDROID_HOME\platform-tools\adb.exe" devices

Write-Host ""
Write-Host "Available Emulators:" -ForegroundColor Yellow
& "$ANDROID_HOME\emulator\emulator.exe" -list-avds

Write-Host ""
Write-Host "To start emulator:  .\start-emulator.ps1" -ForegroundColor White
Write-Host "To run app:         npx expo start --android" -ForegroundColor White
