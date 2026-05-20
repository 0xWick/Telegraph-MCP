cd ~/Telegraph-MCP
cat > start-mcp.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
export $(grep -v '^#' .env | xargs)
exec node dist/index.js
EOF

chmod +x start-mcp.sh