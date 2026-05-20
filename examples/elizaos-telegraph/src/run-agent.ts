/**
 * Minimal ElizaOS Agent Runner
 *
 * Loads the Telegraph character and starts a minimal ElizaOS runtime
 * with an in-memory PGLite database.
 */

import "dotenv/config";
import { ElizaOS } from "@elizaos/core";
import { createDatabaseAdapter } from "@elizaos/plugin-sql";
import bootstrapPlugin from "@elizaos/plugin-bootstrap";
import mcpPlugin from "@elizaos/plugin-mcp";
import { character } from "./character.js";

async function main() {
  console.log("\n╔═════════════════════════════════════════════════════════╗");
  console.log("║   Running Telegraph Agent via ElizaOS Runtime       ║");
  console.log("╚═════════════════════════════════════════════════════════╗\n");

  // Ensure we have an LLM key
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.error("❌ No LLM API key found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.");
    process.exit(1);
  }

  console.log(`🤖 Character: ${character.name}`);
  console.log(`🔧 Model provider: ${character.modelProvider}`);
  console.log(`🔧 Plugins: ${(character as any).plugins?.join(", ") || "bootstrap, mcp"}`);

  // Create in-memory database adapter
  const dbAdapter = createDatabaseAdapter({}, "temp-agent-id");
  await dbAdapter.init();

  // Create ElizaOS orchestrator
  const elizaOS = new ElizaOS();

  // Add and start the agent
  const agentIds = await elizaOS.addAgents(
    [
      {
        character: character as any,
        plugins: [bootstrapPlugin, mcpPlugin],
        databaseAdapter: dbAdapter as any,
      },
    ],
    {
      autoStart: true,
      isTestMode: true,
      ephemeral: true,
    }
  );

  const agentId = agentIds[0];
  console.log(`\n✅ Agent started! ID: ${agentId}\n`);

  // Send a test message
  const testMessages = [
    "What's the weather in Lahore?",
    "List available AI subnets on Telegraph.",
    "What is Bitcoin?",
  ];

  for (const text of testMessages) {
    console.log(`💬 User: ${text}`);
    try {
      const result = await elizaOS.handleMessage(agentId, {
        entityId: "user-1",
        roomId: "room-1",
        content: { text },
      });
      const response = result.processing?.responseContent?.text || "(no text response)";
      console.log(`🤖 Agent: ${response}\n`);
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}\n`);
    }
  }

  console.log("✅ Agent run complete.");
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
