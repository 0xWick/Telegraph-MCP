import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TelegraphConfig } from "../types.js";
import { callEngine, type PaymentFetch } from "../client.js";

export function registerEngineTools(
  server: McpServer,
  config: TelegraphConfig,
  fetchWithPayment: PaymentFetch
): void {
  server.registerTool(
    "tg_engine_list_subnets",
    {
      description: "List all available Telegraph Engine subnets (AI inference providers). No payment required. Returns subnet ID, slug, name, description, base URL, capabilities, and cost per call.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const result = await callEngine(fetchWithPayment, config.engineUrl, "/v1/subnets", "GET");
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Failed: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "tg_engine_ask",
    {
      description: "Auto-routed AI inference through the Telegraph Engine. The engine uses an LLM router to select the best subnet for your query and returns the result. Requires x402 payment. Use this for general questions like 'what is the weather in Lahore', 'what is Bitcoin', or 'is this image a deepfake'.",
      inputSchema: z.object({
        query: z.string().describe("Natural language query for AI inference"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async (args: Record<string, unknown>) => {
      try {
        const result = await callEngine(fetchWithPayment, config.engineUrl, "/v1/ask", "POST", {
          query: args.query,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        let message = err.message || String(err);
        if (message.includes("402") || message.includes("payment")) {
          message = `Payment required. Ensure your wallet has USDC. Tip: check TELEGRAPH_EVM_PRIVATE_KEY or TELEGRAPH_SOLANA_PRIVATE_KEY. Details: ${message}`;
        } else if (message.includes("routing failed") || message.includes("subnet not found")) {
          message = `Routing failed. The engine could not match your query to an available subnet. Try using tg_engine_ask_subnet with a specific subnet ID (use tg_engine_list_subnets to see options). Details: ${message}`;
        }
        return {
          content: [{ type: "text" as const, text: message }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "tg_engine_ask_subnet",
    {
      description: "Direct AI inference through a specific Telegraph subnet. Provide the subnet ID (e.g., 18 for Zeus Weather, 34 for BitMind deepfake detection, 102 for OpenAI) along with the method, endpoint, and payload. Requires x402 payment. Use tg_engine_list_subnets to see available subnets and their capabilities.",
      inputSchema: z.object({
        subnet_id: z.string().describe("Subnet ID to call (e.g., '18', '34', '102')"),
        method: z.enum(["GET", "POST"]).describe("HTTP method for the subnet call"),
        endpoint: z.string().describe("Endpoint path on the subnet (e.g., '/', '/chat')"),
        payload: z.record(z.any()).describe("Request payload as a JSON object"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async (args: Record<string, unknown>) => {
      try {
        const result = await callEngine(
          fetchWithPayment,
          config.engineUrl,
          `/v1/ask/${args.subnet_id}`,
          "POST",
          {
            method: args.method,
            endpoint: args.endpoint,
            payload: args.payload,
          }
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        let message = err.message || String(err);
        if (message.includes("402") || message.includes("payment")) {
          message = `Payment required. Ensure your wallet has USDC. Details: ${message}`;
        }
        return {
          content: [{ type: "text" as const, text: message }],
          isError: true,
        };
      }
    }
  );
}
