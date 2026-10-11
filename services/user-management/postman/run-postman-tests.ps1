$ErrorActionPreference = 'Stop'

$serviceRoot = Split-Path -Parent $PSScriptRoot
$collectionPath = Join-Path $PSScriptRoot 'user-management.collection.json'
$templateEnvPath = Join-Path $PSScriptRoot 'user-management.local.environment.json'
$runtimeEnvPath = Join-Path $PSScriptRoot '.tmp.runtime.environment.json'
$authedEnvPath = Join-Path $PSScriptRoot '.tmp.runtime.authed.environment.json'

if (-not (Test-Path $collectionPath)) {
  throw "Collection file not found: $collectionPath"
}

if (-not (Test-Path $templateEnvPath)) {
  throw "Environment template not found: $templateEnvPath"
}

Set-Location $serviceRoot

if (-not (Test-Path '.env') -and (Test-Path '.env.example')) {
  Copy-Item '.env.example' '.env'
}

$apiReachable = Test-NetConnection -ComputerName 'localhost' -Port 3000 -WarningAction SilentlyContinue
if (-not $apiReachable.TcpTestSucceeded) {
  throw 'API is not running on localhost:3000. Start the service with npm run start:dev, then run this script again.'
}

$dbReachable = Test-NetConnection -ComputerName 'localhost' -Port 5432 -WarningAction SilentlyContinue
if (-not $dbReachable.TcpTestSucceeded) {
  throw 'PostgreSQL is not reachable on localhost:5432. Start docker compose first.'
}

npm run prisma:generate | Out-Host
npx prisma db push | Out-Host

$envObj = Get-Content -Path $templateEnvPath -Raw | ConvertFrom-Json

function Set-EnvVar {
  param(
    [Parameter(Mandatory = $true)] [string]$Name,
    [Parameter(Mandatory = $true)] [string]$Value
  )

  $entry = $envObj.values | Where-Object { $_.key -eq $Name } | Select-Object -First 1
  if ($null -eq $entry) {
    $envObj.values += [pscustomobject]@{
      key = $Name
      value = $Value
      enabled = $true
    }
  }
  else {
    $entry.value = $Value
  }
}

$stamp = Get-Date -Format 'yyyyMMddHHmmss'
Set-EnvVar -Name 'base_url' -Value 'http://localhost:3000'
Set-EnvVar -Name 'user_email' -Value "postman.$stamp@example.com"
Set-EnvVar -Name 'user_password' -Value 'Passw0rdA!'
Set-EnvVar -Name 'new_password' -Value 'NewPassw0rdA!'
Set-EnvVar -Name 'consent_category' -Value 'PRIVACY_POLICY'
Set-EnvVar -Name 'access_token' -Value ''
Set-EnvVar -Name 'reset_token' -Value ''

$envObj | ConvertTo-Json -Depth 20 | Set-Content -Path $runtimeEnvPath -Encoding UTF8

$npxArgs = @('newman', 'run', $collectionPath, '-e', $runtimeEnvPath, '--reporters', 'cli', '--bail')

try {
  Write-Host 'Running Register request...'
  & npx @npxArgs --folder 'Register'

  Write-Host 'Running Login request and exporting access token...'
  & npx @npxArgs --folder 'Login' --export-environment $authedEnvPath

  if (-not (Test-Path $authedEnvPath)) {
    throw 'Authenticated environment was not exported from Login request.'
  }

  $protectedArgs = @('newman', 'run', $collectionPath, '-e', $authedEnvPath, '--reporters', 'cli', '--bail')

  Write-Host 'Running Profile folder...'
  & npx @protectedArgs --folder 'Profile'

  Write-Host 'Running Preferences folder...'
  & npx @protectedArgs --folder 'Preferences'

  Write-Host 'Running Consents folder...'
  & npx @protectedArgs --folder 'Consents'

  Write-Host 'Postman automated tests completed successfully.'
}
finally {
  if (Test-Path $runtimeEnvPath) {
    Remove-Item $runtimeEnvPath -Force
  }
  if (Test-Path $authedEnvPath) {
    Remove-Item $authedEnvPath -Force
  }
}
