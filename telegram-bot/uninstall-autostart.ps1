$TaskName = "BsnTelegramBot"
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "✅ 작업 스케줄러에서 $TaskName 제거 완료" -ForegroundColor Green
} else {
    Write-Host "등록된 작업이 없습니다." -ForegroundColor Yellow
}
