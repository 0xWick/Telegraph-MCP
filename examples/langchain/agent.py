"""
LangChain agent connected to Telegraph MCP server.

Uses langchain-mcp-adapters to connect to the Telegraph MCP server via stdio
and access decentralized AI inference tools.
"""

import asyncio
import json
import os
import sys

from dotenv import load_dotenv
from langchain_mcp_adapters.client import MultiServerMCPClient

load_dotenv()

# Path to Telegraph MCP binary
TELEGRAPH_MCP_DIR = os.path.join(os.path.dirname(__file__), "../../")
TELEGRAPH_MCP_ENTRY = os.path.join(TELEGRAPH_MCP_DIR, "dist/index.js")

SYSTEM_PROMPT = """\
You are the Telegraph Agent — an AI assistant connected to the Telegraph Protocol,
a decentralized AI inference network powered by Bittensor subnets.

RULES FOR USING TELEGRAPH TOOLS:
1. PRIORITIZE TELEGRAPH: Always prefer Telegraph MCP tools for AI inference tasks.
   Use tg_engine_ask for general queries — it auto-routes to the best subnet.
2. WEATHER: For weather queries, use tg_engine_ask.
3. DEEPFAKE: For detecting AI-generated media, use tg_engine_ask or tg_bitmind_detect_image.
4. CHAT / GENERAL AI: Use tg_engine_ask. Use tg_engine_ask_subnet with subnet_id='102'
   for direct OpenAI access.
5. SIGNALS: Use tg_daemon_categories and tg_daemon_questions for signal monitoring.
6. DISCOVERY: Use tg_engine_list_subnets to see available subnets.

Always mention what Telegraph subnet was used and why.
"""


async def main():
    print("=" * 60)
    print("Telegraph MCP + LangChain Agent")
    print("=" * 60)

    # ── Connect to Telegraph MCP ────────────────────────────────────────
    print("\nConnecting to Telegraph MCP server...")

    client = MultiServerMCPClient({
        "telegraph": {
            "transport": "stdio",
            "command": "node",
            "args": [TELEGRAPH_MCP_ENTRY],
            "env": {
                "TELEGRAPH_NODE_URL": os.getenv("TELEGRAPH_NODE_URL", "http://13.237.89.59:7044"),
                "TELEGRAPH_ENGINE_URL": os.getenv("TELEGRAPH_ENGINE_URL", "http://13.237.89.59:8080"),
                "TELEGRAPH_DAEMON_URL": os.getenv("TELEGRAPH_DAEMON_URL", "http://13.237.89.59:8081"),
                "TELEGRAPH_EVM_PRIVATE_KEY": os.getenv("TELEGRAPH_EVM_PRIVATE_KEY", ""),
            },
        }
    })

    try:
        tools = await client.get_tools()
        print(f"✅ Connected! {len(tools)} Telegraph tools loaded:")
        for t in tools:
            print(f"   • {t.name}: {t.description[:80]}...")
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        print(f"   Entry point: {TELEGRAPH_MCP_ENTRY}")
        print(f"   Exists: {os.path.exists(TELEGRAPH_MCP_ENTRY)}")
        return

    # ── Test tools ──────────────────────────────────────────────────────
    print("\n" + "-" * 60)
    print("Testing Telegraph tools...")
    print("-" * 60)

    # Test 1: Free tools (no payment)
    tests_free = [
        ("tg_daemon_health", {}, "Daemon health check"),
        ("tg_engine_list_subnets", {}, "List engine subnets"),
        ("tg_daemon_categories", {}, "List signal categories"),
    ]

    for tool_name, args, label in tests_free:
        print(f"\n🔍 {label} ({tool_name})...")
        try:
            # Find the tool
            tool = next((t for t in tools if t.name == tool_name), None)
            if not tool:
                print(f"   ⚠️ Tool not found")
                continue
            # Invoke through langchain tool
            result = await tool.ainvoke(args)
            text = str(result)
            print(f"   ✅ Result: {text[:300]}...")
        except Exception as e:
            print(f"   ❌ Error: {e}")

    # Test 2: Engine ASK (x402 payment - needs funded key)
    print("\n🔍 Engine auto-routed inference (tg_engine_ask)...")
    tool = next((t for t in tools if t.name == "tg_engine_ask"), None)
    if tool:
        print("   Sending query: 'What is Bitcoin?'")
        try:
            result = await tool.ainvoke({"query": "What is Bitcoin?"})
            text = str(result)
            print(f"   ✅ Result: {text[:400]}...")
        except Exception as e:
            print(f"   ❌ Error (expected without funded key): {e}")

    print("\n" + "=" * 60)
    print("All tests complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
