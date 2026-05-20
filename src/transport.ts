import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { TelegraphConfig } from "./types.js";

export async function startServer(server: McpServer, _config: TelegraphConfig): Promise<void> {
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  console.error("[telegraph-mcp] stdio transport ready");

  process.on("SIGINT", async () => {
    console.error("[telegraph-mcp] shutting down...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("[telegraph-mcp] shutting down...");
    await server.close();
    process.exit(0);
  });
}
