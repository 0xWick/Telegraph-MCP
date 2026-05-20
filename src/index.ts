#!/usr/bin/env node

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "./config.js";
import { createPaymentAwareFetch } from "./x402.js";
import { discoverSubnets } from "./discovery.js";
import { syncSubnetTools } from "./tools/subnets.js";
import { registerEngineTools } from "./tools/engine.js";
import { registerDaemonTools } from "./tools/daemon.js";
import { registerNodeTools } from "./tools/node.js";
import { startServer } from "./transport.js";

async function main() {
  const config = loadConfig();

  console.error("[telegraph-mcp] Telegraph MCP Server v1.0.0");
  console.error(`[telegraph-mcp] Node: ${config.nodeUrl}`);
  console.error(`[telegraph-mcp] Engine: ${config.engineUrl}`);
  console.error(`[telegraph-mcp] Daemon: ${config.daemonUrl}`);
  console.error(`[telegraph-mcp] Transport: ${config.transport}`);

  const fetchWithPayment = await createPaymentAwareFetch(config);

  const server = new McpServer({
    name: "telegraph",
    version: "1.0.0",
  });

  console.error("[telegraph-mcp] Registering node tools...");
  registerNodeTools(server, config);
  registerEngineTools(server, config, fetchWithPayment);
  registerDaemonTools(server, config);
  console.error("[telegraph-mcp] Node/engine/daemon tools registered");

  async function refreshSubnetTools() {
    try {
      console.error("[telegraph-mcp] Refreshing subnet integrations...");
      const integrations = await discoverSubnets(config.nodeUrl);
      console.error(`[telegraph-mcp] Found ${integrations.length} integrations`);

      const result = syncSubnetTools(server, integrations, config, fetchWithPayment);
      console.error(`[telegraph-mcp] Sync: +${result.added} new, -${result.removed} removed, ${result.kept} unchanged`);

      if (result.added > 0 || result.removed > 0) {
        try {
          server.sendToolListChanged();
        } catch {
          console.error("[telegraph-mcp] Tool list change notification sent");
        }
      }
    } catch (err: any) {
      console.error(`[telegraph-mcp] Refresh failed: ${err.message}`);
    }
  }

  await refreshSubnetTools();

  if (config.refreshIntervalMs > 0) {
    console.error(`[telegraph-mcp] Auto-refresh every ${config.refreshIntervalMs / 1000}s`);
    setInterval(refreshSubnetTools, config.refreshIntervalMs);
  }

  await startServer(server, config);
}

main().catch((err) => {
  console.error(`[telegraph-mcp] Fatal: ${err.message}`);
  process.exit(1);
});
