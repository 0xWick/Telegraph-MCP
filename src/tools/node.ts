import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TelegraphConfig } from "../types.js";

export function registerNodeTools(server: McpServer, config: TelegraphConfig): void {
  server.registerTool(
    "tg_node_status",
    {
      description: "Get the status of the Telegraph Node. Returns public key, node identity, and chain connection info. No payment required.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch(`${config.nodeUrl}/status`, { signal: controller.signal });
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          const data = await res.json();
          return {
            content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
          };
        } finally {
          clearTimeout(timeout);
        }
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Node unreachable: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "tg_node_subnets_health",
    {
      description: "Check the health of all subnet integrations on the Telegraph Node. Returns available subnets, status, and timestamp. No payment required.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch(`${config.nodeUrl}/api/subnets/health`, { signal: controller.signal });
          if (!res.ok) throw new Error(`Health check: ${res.status}`);
          const data = await res.json();
          return {
            content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
          };
        } finally {
          clearTimeout(timeout);
        }
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Failed: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "tg_node_list_subnets",
    {
      description: "List all available Telegraph subnet integrations with full metadata. Returns subnet ID, slug, protocol, name, description, available endpoints, input/output schemas, and signal mappings. No payment required.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch(`${config.nodeUrl}/miner-dispatcher/integrations`, { signal: controller.signal });
          if (!res.ok) throw new Error(`Integrations: ${res.status}`);
          const data = await res.json();
          return {
            content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
          };
        } finally {
          clearTimeout(timeout);
        }
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Failed: ${err.message}` }],
          isError: true,
        };
      }
    }
  );
}
