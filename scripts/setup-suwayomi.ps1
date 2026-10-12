$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskRuntime = Join-Path $taskRoot '.runtime/suwayomi'
$taskArchive = Join-Path $taskRuntime 'downloads/server-v2.4.2366.zip'
$taskDigest = 'b955f374a8d94b8d1c2750ae28fa7eb2066b479957561b5ba9cf8ac993c8fc13'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $taskArchive) | Out-Null
if (-not (Test-Path -LiteralPath $taskArchive)) {
    Invoke-WebRequest 'https://github.com/Suwayomi/Suwayomi-Server/releases/download/v2.4.2366/Suwayomi-Server-v2.4.2366-windows-x64.zip' -OutFile $taskArchive
}
if ((Get-FileHash -LiteralPath $taskArchive -Algorithm SHA256).Hash.ToLower() -ne $taskDigest) { throw 'Release checksum mismatch. Do not run this archive.' }
$taskPortable = Join-Path $taskRuntime 'portable'
if (-not (Test-Path -LiteralPath (Join-Path $taskPortable 'Suwayomi-Server-v2.4.2366-windows-x64/jre/bin/java.exe'))) {
    Expand-Archive -LiteralPath $taskArchive -DestinationPath $taskPortable
}
Write-Output 'Portable Suwayomi is ready. Run node scripts/start-local.mjs.'
