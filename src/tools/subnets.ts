import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Integration, Endpoint, TelegraphConfig } from "../types.js";
import { jsonSchemaToZod } from "../schema.js";
import { callSubnet, type PaymentFetch } from "../client.js";

let registeredTools = new Set<string>();

function sanitizeEndpoint(path: string): string {
  return path
    .replace(/^\//, "")
    .replace(/[/-]/g, "_")
    .replace(/_{2,}/g, "_")
    .toLowerCase();
}

export function buildToolName(slug: string, endpointPath: string): string {
  const shortName = slug.replace(/^bittensor-sn\d+-/, "").replace(/-/g, "_").replace(/_{2,}/g, "_");
  const epName = sanitizeEndpoint(endpointPath);
  return `tg_${shortName}_${epName}`;
}

function buildDescription(integration: Integration, endpoint: Endpoint): string {
  const parts: string[] = [];
  const name = integration.name || integration.slug;
  parts.push(`${name} — ${endpoint.method.toUpperCase()} ${endpoint.path}`);
  if (endpoint.description) parts.push(endpoint.description.trim());
  const sm = integration.signal_mapping;
  if (sm) {
    const info: string[] = [`Signal: ${sm.type}`];
    if (sm.confidence_field) info.push(`Confidence: ${sm.confidence_field}`);
    if (sm.label_field) info.push(`Label: ${sm.label_field}`);
    parts.push(info.join(", "));
  }
  parts.push(`Subnet ID: ${integration.id} | Protocol: ${integration.protocol}`);
  return parts.join("\n\n");
}

function buildAnnotations(method?: string): Record<string, unknown> {
  const isReadonly = method?.toUpperCase() === "GET";
  return {
    readOnlyHint: isReadonly,
    destructiveHint: false,
    idempotentHint: isReadonly,
    openWorldHint: true,
  };
}

function makeSubnetHandler(nodeUrl: string, subnetId: string, endpoint: Endpoint, fetchWithPayment: PaymentFetch) {
  return async (args: Record<string, unknown>) => {
    try {
      const result = await callSubnet(fetchWithPayment, nodeUrl, subnetId, endpoint, args);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err: any) {
      let message = err.message || String(err);
      if (message.includes("402") || message.includes("payment")) {
        message = `Payment failed. Ensure your wallet has sufficient USDC and the correct chain is configured. Details: ${message}`;
      } else if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
        message = `Cannot reach Telegraph node at ${nodeUrl}. Is the node running?`;
      }
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true,
      };
    }
  };
}

export function syncSubnetTools(
  server: McpServer,
  integrations: Integration[],
  config: TelegraphConfig,
  fetchWithPayment: PaymentFetch
): { added: number; removed: number; kept: number } {
  const newNames = new Set<string>();
  for (const integration of integrations) {
    for (const endpoint of integration.endpoints) {
      newNames.add(buildToolName(integration.slug, endpoint.path));
    }
  }

  const registry = (server as any)._registeredTools as Map<string, unknown> | undefined;

  let removed = 0;
  for (const oldName of registeredTools) {
    if (!newNames.has(oldName)) {
      if (registry?.delete(oldName)) {
        removed++;
        console.error(`[telegraph-mcp] Removed stale tool: ${oldName}`);
      }
    }
  }

  let added = 0;
  let kept = 0;

  for (const integration of integrations) {
    for (const endpoint of integration.endpoints) {
      const toolName = buildToolName(integration.slug, endpoint.path);

      if (registeredTools.has(toolName)) {
        kept++;
        continue;
      }

      let inputSchema: z.ZodTypeAny;
      if (integration.input_schema) {
        inputSchema = jsonSchemaToZod(integration.input_schema);
      } else {
        inputSchema = z.object({});
      }

      const description = buildDescription(integration, endpoint);
      const annotations = buildAnnotations(endpoint.method);

      try {
        server.registerTool(
          toolName,
          { description, inputSchema, annotations },
          makeSubnetHandler(config.nodeUrl, integration.id, { ...endpoint }, fetchWithPayment)
        );
        added++;
      } catch (err: any) {
        console.error(`[telegraph-mcp] Failed to register tool ${toolName}: ${err.message}`);
      }
    }
  }

  registeredTools = newNames;
  return { added, removed, kept };
}
