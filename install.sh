#!/bin/bash
set -e

BOLD="\033[1m"
GREEN="\033[32m"
CYAN="\033[36m"
RED="\033[31m"
RESET="\033[0m"

echo ""
echo -e "${BOLD}freshcontext-mcp installer${RESET}"
echo "─────────────────────────────────"

# ── 1. Check for Node / npx ──
if ! command -v npx &> /dev/null; then
  echo -e "${RED}✗ Node.js not found.${RESET}"
  echo ""
  echo "Install Node.js from https://nodejs.org (LTS version)"
  echo "Then re-run this script."
  exit 1
fi

echo -e "${GREEN}✓ Node.js found${RESET} ($(node --version))"

# ── 2. Find Claude Desktop config ──
CONFIG_DIR="$HOME/Library/Application Support/Claude"
CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"

# ── 3. Create config dir if needed ──
if [ ! -d "$CONFIG_DIR" ]; then
  mkdir -p "$CONFIG_DIR"
  echo -e "${GREEN}✓ Created Claude config directory${RESET}"
fi

# ── 4. Create or update config file ──
if [ ! -f "$CONFIG_FILE" ]; then
  cat > "$CONFIG_FILE" << 'EOF'
{
  "mcpServers": {
    "freshcontext": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://freshcontext-mcp.gimmanuel73.workers.dev/mcp"]
    }
  }
}
EOF
  echo -e "${GREEN}✓ Created Claude Desktop config${RESET}"
else
  echo "Updating existing Claude Desktop config..."
  node -e "
    const fs = require('fs');
    const path = '$CONFIG_FILE';
    let config = {};
    try { config = JSON.parse(fs.readFileSync(path, 'utf8')); } catch(e) {}
    if (!config.mcpServers) config.mcpServers = {};
    config.mcpServers.freshcontext = {
      command: 'npx',
      args: ['-y', 'mcp-remote', 'https://freshcontext-mcp.gimmanuel73.workers.dev/mcp']
    };
    fs.writeFileSync(path, JSON.stringify(config, null, 2));
    console.log('done');
  "
  echo -e "${GREEN}✓ Updated Claude Desktop config${RESET}"
fi

# ── 5. Done ──
echo ""
echo -e "${BOLD}${GREEN}✅ freshcontext-mcp installed!${RESET}"
echo ""
echo -e "  ${CYAN}Restart Claude Desktop to activate.${RESET}"
echo ""
echo "  You'll see these tools available in Claude:"
echo "  • extract_github    • extract_hackernews"
echo "  • extract_scholar   • extract_yc"
echo "  • search_repos      • package_trends"
echo "  • extract_landscape"
echo ""
