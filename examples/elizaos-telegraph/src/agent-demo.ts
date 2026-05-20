/**
 * Telegraph Agent Demo
 *
 * A simplified agent that uses the character config + OpenAI + Telegraph MCP.
 * This demonstrates the full integration without the full ElizaOS runtime.
 */

import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";

const MCP_ENTRY = resolve(import.meta.dirname, "../../../dist/index.js");

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

async function callOpenAI(system: string, user: string, tools: any[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   Telegraph Agent Demo — OpenAI + MCP                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY not set");
    process.exit(1);
  }

  // Connect to Telegraph MCP
  const transport = new StdioClientTransport({
    command: "node",
    args: [MCP_ENTRY],
    env: childEnv(),
  });

  const client = new Client(
    { name: "telegraph-agent-demo", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("✅ Connected to Telegraph MCP\n");

  // List tools
  const { tools } = await client.listTools();
  console.log(`📋 ${tools.length} Telegraph tools available\n`);

  // Convert MCP tools to OpenAI function format
  const openaiTools = tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));

  // System prompt from character.ts
  const systemPrompt =
    "You are the Telegraph Agent — an AI assistant connected to the Telegraph Protocol, " +
    "a decentralized AI inference network powered by Bittensor subnets.\n\n" +
    "RULES FOR USING TELEGRAPH TOOLS:\n" +
    "1. PRIORITIZE TELEGRAPH: Always prefer Telegraph MCP tools for AI inference tasks.\n" +
    "2. WEATHER: For weather queries, use tg_engine_ask.\n" +
    "3. DEEPFAKE: For detecting AI-generated media, use tg_engine_ask or tg_bitmind_detect_image.\n" +
    "4. CHAT / GENERAL AI: Use tg_engine_ask. Use tg_engine_ask_subnet with subnet_id='102' for direct OpenAI access.\n" +
    "5. SIGNALS: Use tg_daemon_categories and tg_daemon_questions for signal monitoring.\n" +
    "6. DISCOVERY: Use tg_engine_list_subnets to see available subnets.\n" +
    "7. X402 PAYMENTS: Telegraph tools cost a small fee ($0.01 USDC). Don't mention it unless asked.\n\n" +
    "Always mention what Telegraph subnet was used and why.";

  // Test queries
  const queries = [
    "What's the weather in Lahore?",
    "List available AI subnets on Telegraph.",
    "What is Bitcoin?",
  ];

  for (const query of queries) {
    console.log(`💬 User: ${query}`);

    const completion = await callOpenAI(systemPrompt, query, openaiTools);
    const msg = completion.choices[0].message;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const toolCall = msg.tool_calls[0];
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);

      console.log(`🔧 Tool call: ${toolName}(${JSON.stringify(toolArgs)})`);

      try {
        const result = await client.callTool({ name: toolName, arguments: toolArgs });
        const text = result.content?.map((c: any) => c.text || "").join("") || "";

        // Send tool result back to OpenAI for final response
        const finalCompletion = await callOpenAI(systemPrompt, query, []);
        const response = finalCompletion.choices[0].message.content;
        console.log(`🤖 Agent: ${response}\n`);
      } catch (err: any) {
        console.log(`❌ Tool error: ${err.message}\n`);
      }
    } else {
      console.log(`🤖 Agent: ${msg.content}\n`);
    }
  }

  await transport.close();
  console.log("✅ Demo complete.");
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
