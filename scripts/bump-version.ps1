#Requires -Version 5.1
<#
.SYNOPSIS
  Bump the project version in all three coordinated files at once.

.DESCRIPTION
  Todo Reminder keeps its version number in three places that must stay in sync:
    - package.json            (frontend + pnpm)
    - src-tauri/Cargo.toml    (Rust crate)
    - src-tauri/tauri.conf.json (Tauri bundle + installer)

  Forgetting any one of them causes the MSI installer, the app's reported
  version, and cargo to diverge. This script updates all three atomically and
  prints a summary you can paste into CHANGELOG.md.

.PARAMETER Version
  The new version string. SemVer format: MAJOR.MINOR.PATCH, optionally with a
  pre-release suffix like -alpha, -beta.1, -rc.2.
  Examples: 0.1.0, 0.1.0-alpha, 0.2.0-rc.1, 1.0.0

.EXAMPLE
  ./scripts/bump-version.ps1 0.2.0

.EXAMPLE
  ./scripts/bump-version.ps1 0.2.0-beta.1

.NOTES
  This script does NOT commit, tag, or push. Review the diff yourself, update
  CHANGELOG.md, then commit + tag manually. See AGENT.md §11.
#>

param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Version
)

$ErrorActionPreference = 'Stop'

# Validate semver-ish format: MAJOR.MINOR.PATCH[-PRE]
if ($Version -notmatch '^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$') {
  throw "Invalid version '$Version'. Expected SemVer format like 0.1.0 or 0.2.0-alpha."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Write-Host "Bumping version to $Version in $repoRoot" -ForegroundColor Cyan
Write-Host ""

# --- 1. package.json ---
$pkgPath = Join-Path $repoRoot 'package.json'
$pkg = [System.IO.File]::ReadAllText($pkgPath, [System.Text.Encoding]::UTF8)
$oldPkg = if ($pkg -match '"version"\s*:\s*"([^"]+)"') { $Matches[1] } else { 'unknown' }
$pkg = $pkg -replace '("version"\s*:\s*")[^"]+(")', "`${1}$Version`${2}"
[System.IO.File]::WriteAllText($pkgPath, $pkg, (New-Object System.Text.UTF8Encoding $false))
Write-Host "[package.json]            $oldPkg -> $Version"

# --- 2. src-tauri/Cargo.toml ---
$cargoPath = Join-Path $repoRoot 'src-tauri\Cargo.toml'
$cargo = [System.IO.File]::ReadAllText($cargoPath, [System.Text.Encoding]::UTF8)
# Only replace the version line inside [package], not any dependency version strings.
# Use a narrow regex: ^version = "..." at start of a line within the first ~30 lines.
$cargoPattern = '(?m)^(version\s*=\s*")[^"]+(")'
$oldCargo = if ($cargo -match $cargoPattern) { ($cargo | Select-String $cargoPattern).Matches[0].Value } else { 'unknown' }
$cargo = [regex]::Replace($cargo, $cargoPattern, "`${1}$Version`${2}", [System.Text.RegularExpressions.RegexOptions]::Multiline, [System.TimeSpan]::FromSeconds(2))
[System.IO.File]::WriteAllText($cargoPath, $cargo, (New-Object System.Text.UTF8Encoding $false))
Write-Host "[src-tauri/Cargo.toml]    (package) version -> $Version"

# --- 3. src-tauri/tauri.conf.json ---
$confPath = Join-Path $repoRoot 'src-tauri\tauri.conf.json'
$conf = [System.IO.File]::ReadAllText($confPath, [System.Text.Encoding]::UTF8)
$oldConf = if ($conf -match '"version"\s*:\s*"([^"]+)"') { $Matches[1] } else { 'unknown' }
$conf = $conf -replace '("version"\s*:\s*")[^"]+(")', "`${1}$Version`${2}"
[System.IO.File]::WriteAllText($confPath, $conf, (New-Object System.Text.UTF8Encoding $false))
Write-Host "[src-tauri/tauri.conf.json] $oldConf -> $Version"

Write-Host ""
Write-Host "Done. Next steps:" -ForegroundColor Green
Write-Host "  1. Update CHANGELOG.md — add a new section for $Version"
Write-Host "  2. git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md"
Write-Host "  3. git commit -m `"chore(release): v$Version`""
Write-Host "  4. git tag v$Version"
