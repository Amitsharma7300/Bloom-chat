$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$sdkRoot = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$adb = Join-Path $sdkRoot 'platform-tools\adb.exe'
$emulator = Join-Path $sdkRoot 'emulator\emulator.exe'
$packageName = 'com.indiery1235.bloomchatmobile'
$apk = Join-Path $projectRoot 'APP\android\app\build\outputs\apk\debug\app-debug.apk'

function Wait-ForPort([int]$port, [int]$seconds) {
    $deadline = (Get-Date).AddSeconds($seconds)
    do {
        $client = [System.Net.Sockets.TcpClient]::new()
        try {
            $connection = $client.BeginConnect('127.0.0.1', $port, $null, $null)
            if ($connection.AsyncWaitHandle.WaitOne(500)) {
                try { $client.EndConnect($connection); return $true } catch { }
            }
        } finally { $client.Dispose() }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    return $false
}

if (-not (Test-Path -LiteralPath $adb) -or -not (Test-Path -LiteralPath $emulator)) {
    throw 'Android SDK emulator or adb was not found.'
}

if (-not (Wait-ForPort 5000 1)) {
    Write-Host 'Starting Bloom API...'
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/d', '/c', 'npm run dev' -WorkingDirectory (Join-Path $projectRoot 'BACKEND') -WindowStyle Hidden
}
if (-not (Wait-ForPort 8081 1)) {
    Write-Host 'Starting Metro...'
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/d', '/c', 'npx expo start --host lan --port 8081' -WorkingDirectory (Join-Path $projectRoot 'APP') -WindowStyle Hidden
}
if (-not (Wait-ForPort 5000 60) -or -not (Wait-ForPort 8081 90)) {
    throw 'Bloom API or Metro did not start. Check that Node.js and project dependencies are installed.'
}

$runningEmulator = & $adb devices | Select-String '^emulator-\d+\s+device$'
if (-not $runningEmulator) {
    Write-Host 'Starting Pixel 8 emulator...'
    Start-Process -FilePath $emulator -ArgumentList '-avd', 'Pixel_8', '-memory', '3072', '-allow-host-audio'
}
& $adb wait-for-device | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Android emulator did not connect.' }

Write-Host 'Waiting for Android to boot...'
$deadline = (Get-Date).AddMinutes(3)
while ((& $adb shell getprop sys.boot_completed).Trim() -ne '1') {
    if ((Get-Date) -ge $deadline) { throw 'Android emulator did not finish booting.' }
    Start-Sleep -Seconds 2
}

if (-not (& $adb shell pm path $packageName)) {
    if (-not (Test-Path -LiteralPath $apk)) { throw 'Bloom debug APK is missing. Build it before launching the emulator.' }
    Write-Host 'Installing Bloom...'
    & $adb install -r $apk | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Bloom APK installation failed.' }
}

& $adb reverse tcp:8081 tcp:8081 | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not connect the emulator to Metro.' }

$appReady = $false
for ($attempt = 0; $attempt -lt 3 -and -not $appReady; $attempt++) {
    & $adb shell am force-stop $packageName | Out-Null
    & $adb shell am start -n "$packageName/.MainActivity" | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Bloom did not launch.' }
    $deadline = (Get-Date).AddSeconds(35)
    do {
        Start-Sleep -Seconds 4
        & $adb shell uiautomator dump /sdcard/bloom-launch-ui.xml 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { continue }
        $uiText = (& $adb shell cat /sdcard/bloom-launch-ui.xml 2>$null) -join ''
        if ($uiText -match 'Good conversations|Before you enter Bloom|Choose this once|Bloom Premium|Friends &amp; chats|YOUR BLOOM SPACE') {
            $appReady = $true
            break
        }
        if ($uiText -match 'Unable to load script') { break }
    } while ((Get-Date) -lt $deadline)
    if (-not $appReady -and $attempt -lt 2) { Write-Host 'Waiting for the emulator connection; retrying Bloom...' }
}
if (-not $appReady) { throw 'Bloom opened but did not reach an app screen. Check the emulator network and Metro logs.' }
Write-Host 'Bloom is running on the Android emulator.'
