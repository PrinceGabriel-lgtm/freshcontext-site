# freshcontext-mcp installer for Windows
# Run with: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "freshcontext-mcp installer" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "─────────────────────────────────"

# ── 1. Check for Node ──
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✓ Node.js found ($nodeVersion)" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Node.js from https://nodejs.org (LTS version)"
    Write-Host "Then re-run this script."
    exit 1
}

# ── 2. Find Claude Desktop config ──
$ConfigDir = "$env:APPDATA\Claude"
$ConfigFile = "$ConfigDir\claude_desktop_config.json"

# ── 3. Create config dir if needed ──
if (-not (Test-Path $ConfigDir)) {
    New-Item -ItemType Directory -Path $ConfigDir | Out-Null
    Write-Host "✓ Created Claude config directory" -ForegroundColor Green
}

# ── 4. Create or update config file ──
$freshEntry = @{
    command = "npx"
    args = @("-y", "mcp-remote", "https://freshcontext-mcp.gimmanuel73.workers.dev/mcp")
}

if (-not (Test-Path $ConfigFile)) {
    $config = @{ mcpServers = @{ freshcontext = $freshEntry } }
    $config | ConvertTo-Json -Depth 10 | Set-Content $ConfigFile
    Write-Host "✓ Created Claude Desktop config" -ForegroundColor Green
} else {
    Write-Host "Updating existing Claude Desktop config..."
    $existing = Get-Content $ConfigFile -Raw | ConvertFrom-Json
    if (-not $existing.mcpServers) {
        $existing | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value ([PSCustomObject]@{})
    }
    $existing.mcpServers | Add-Member -MemberType NoteProperty -Name "freshcontext" -Value ([PSCustomObject]$freshEntry) -Force
    $existing | ConvertTo-Json -Depth 10 | Set-Content $ConfigFile
    Write-Host "✓ Updated Claude Desktop config" -ForegroundColor Green
}

# ── 5. Done ──
Write-Host ""
Write-Host "✅ freshcontext-mcp installed!" -ForegroundColor Green
Write-Host ""
Write-Host "  Restart Claude Desktop to activate." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Tools now available in Claude:"
Write-Host "  • extract_github    • extract_hackernews"
Write-Host "  • extract_scholar   • extract_yc"
Write-Host "  • search_repos      • package_trends"
Write-Host "  • extract_landscape"
Write-Host ""
