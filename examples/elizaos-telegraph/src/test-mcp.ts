/**
 * ElizaOS + Telegraph MCP Client
 *
 * Connects to the Telegraph MCP server as an MCP client and tests all tool categories.
 * Uses @modelcontextprotocol/sdk directly — no Eliza runtime needed for tool testing.
 *
 * For Eliza agent integration, see character.ts
 */

import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MCP_ENTRY = resolve(__dirname, "../../../dist/index.js");

function childEnv(): Record<string, string> {
  const base: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string") base[k] = v;
  }
  base.TELEGRAPH_NODE_URL = process.env.TELEGRAPH_NODE_URL || "http://13.237.89.59:7044";
  base.TELEGRAPH_ENGINE_URL = process.env.TELEGRAPH_ENGINE_URL || "http://13.237.89.59:8080";
  base.TELEGRAPH_DAEMON_URL = process.env.TELEGRAPH_DAEMON_URL || "http://13.237.89.59:8081";
  return base;
}

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   ElizaOS + Telegraph MCP — Tool Test Client     ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  const transport = new StdioClientTransport({
    command: "node",
    args: [MCP_ENTRY],
    env: childEnv(),
  });

  const client = new Client(
    { name: "elizaos-telegraph", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    console.log("Connecting to Telegraph MCP server...");
    await client.connect(transport);
    console.log("✅ Connected!\n");

    // ── List all tools ──────────────────────────────────────────────
    const { tools } = await client.listTools();
    console.log(`📋 ${tools.length} tools available:\n`);
    const categories: Record<string, string[]> = {};
    for (const t of tools) {
      const cat = t.name.startsWith("tg_node_") ? "Node" :
        t.name.startsWith("tg_engine_") ? "Engine" :
        t.name.startsWith("tg_daemon_") ? "Daemon" :
        "Subnet";
      (categories[cat] ||= []).push(t.name);
    }
    for (const [cat, names] of Object.entries(categories)) {
      console.log(`  ${cat} (${names.length}): ${names.join(", ")}`);
    }

    // ── Test free tools ────────────────────────────────────────────
    console.log("\n── Testing free tools ──\n");

    const freeTools = [
      ["tg_daemon_health", {}, "Daemon health"],
      ["tg_daemon_categories", {}, "Signal categories"],
      ["tg_engine_list_subnets", {}, "Engine subnets"],
      ["tg_node_status", {}, "Node status"],
    ];

    for (const [name, args, label] of freeTools) {
      try {
        const result = await client.callTool({ name: name as string, arguments: args as any });
        const text = result.content?.map((c: any) => c.text || "").join("") || "";
        console.log(`✅ ${label}: ${text.substring(0, 120)}...`);
      } catch (err: any) {
        console.log(`❌ ${label}: ${err.message?.substring(0, 80)}`);
      }
    }

    // ── Test Engine tools ──────────────────────────────────────────
    console.log("\n── Testing engine tools ──\n");

    try {
      const result = await client.callTool({
        name: "tg_engine_ask",
        arguments: { query: "What is Bitcoin?" },
      });
      const text = result.content?.map((c: any) => c.text || "").join("") || "";
      console.log(`✅ Engine ask: ${text.substring(0, 200)}...`);
    } catch (err: any) {
      console.log(`⚠️  Engine ask (expected without funded key): ${err.message?.substring(0, 100)}`);
    }

    console.log("\n✅ All tests complete!");
    console.log("\nTo use with Eliza agent: set up character.ts with @elizaos/plugin-mcp");
    console.log("See README.md for integration instructions.\n");

  } catch (err: any) {
    console.error("❌ Fatal:", err.message);
    process.exit(1);
  } finally {
    await transport.close();
  }
}

main();
