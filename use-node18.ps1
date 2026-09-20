# Dot-source this to use Node 18.20.4 in the CURRENT shell only:
#   . .\use-node18.ps1
# Nothing outside this shell session is changed (no admin, no nvm symlink switch).

$version = (Get-Content (Join-Path $PSScriptRoot '.nvmrc')).Trim()
$nvmRoot = if ($env:NVM_HOME) { $env:NVM_HOME } else { "$env:APPDATA\nvm" }
$nodeDir = Join-Path $nvmRoot "v$version"

if (-not (Test-Path (Join-Path $nodeDir 'node.exe'))) {
    Write-Error "Node $version not found at $nodeDir. Run: nvm install $version"
    return
}

# Drop any other nvm version dir already on PATH, then prepend this one.
$env:Path = (($env:Path -split ';' | Where-Object { $_ -and $_ -notlike "$nvmRoot\v*" }) -join ';')
$env:Path = "$nodeDir;$env:Path"

Write-Host "node $(node -v) / npm $(npm -v) - this shell only"
