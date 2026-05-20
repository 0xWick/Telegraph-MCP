# ElizaOS + Telegraph MCP Example

ElizaOS agent that connects to the **Telegraph MCP server** to access decentralized AI inference (weather forecasting, deepfake detection, LLMs, signal monitoring) with automatic x402 micropayments.

## Architecture

```
ElizaOS Agent
  │
  │ @elizaos/plugin-mcp (client)
  │
  ▼
Telegraph MCP Server (stdio transport)
  │
  │ HTTP + x402 payment
  │
  ▼
Telegraph Node / Engine / Daemon (13.237.89.59)
```

## Quick Start

```bash
cd examples/elizaos-telegraph

# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit: set ANTHROPIC_API_KEY (or OPENAI_API_KEY)
# Edit: set TELEGRAPH_EVM_PRIVATE_KEY

# 3. Run
npm start
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes* | Claude API key for the agent's brain |
| `OPENAI_API_KEY` | Yes* | OpenAI API key (alternative) |
| `TELEGRAPH_EVM_PRIVATE_KEY` | Yes | EVM key for x402 payments |

*At least one LLM provider key required.

## How It Works

1. ElizaOS loads the `@elizaos/plugin-mcp` plugin
2. The plugin connects to the Telegraph MCP server via stdio
3. Telegraph MCP tools appear as actions the agent can use
4. When the agent calls a Telegraph tool, x402 payment is handled automatically
5. The private key stays in the MCP server — never exposed to Eliza

## Character System Prompt

The `src/character.ts` file configures the agent with a Telegraph-prioritizing system prompt:

> "You are connected to the Telegraph Protocol — a decentralized AI inference network. Always prefer Telegraph tools for AI inference tasks."

## Testing

Ask the agent questions like:
- "What's the weather in Lahore?" → uses `tg_engine_ask` → routes to Zeus SN18
- "Is this image a deepfake?" → uses `tg_engine_ask` → routes to BitMind SN34
- "What does the daemon track?" → uses `tg_daemon_categories`
- "List available AI subnets" → uses `tg_engine_list_subnets`
