# 빌사남 텔레그램 봇 Windows 작업 스케줄러 등록 스크립트
# 사용법: 관리자 PowerShell에서 실행
#   PowerShell -ExecutionPolicy Bypass -File install-autostart.ps1

$ErrorActionPreference = "Stop"

$TaskName = "BsnTelegramBot"
$BotDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BatFile = Join-Path $BotDir "start-bot.bat"

Write-Host "=== 빌사남 텔레그램 봇 자동시작 등록 ===" -ForegroundColor Cyan
Write-Host "작업명: $TaskName"
Write-Host "경로  : $BatFile"
Write-Host ""

if (-not (Test-Path $BatFile)) {
    Write-Error "start-bot.bat 파일을 찾을 수 없습니다: $BatFile"
    exit 1
}

# 기존 작업 있으면 제거
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "기존 작업 제거 중..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# 로그인 시 자동 시작, 숨김 창으로 실행
$Action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c start /min `"`" `"$BatFile`"" `
    -WorkingDirectory $BotDir

$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

$Principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "빌사남 텔레그램 개발 봇 (로그인 시 자동 시작)" | Out-Null

Write-Host "✅ 등록 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "다음 동작:"
Write-Host "  1. 지금 바로 시작하려면:  Start-ScheduledTask -TaskName $TaskName"
Write-Host "  2. 중지하려면:            Stop-ScheduledTask  -TaskName $TaskName"
Write-Host "  3. 제거하려면:            Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false"
Write-Host ""
Write-Host "로그 위치: $(Join-Path $BotDir 'dev-audit.log')"
