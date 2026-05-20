import type { Integration } from "./types.js";

export async function discoverSubnets(nodeUrl: string): Promise<Integration[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `${nodeUrl}/miner-dispatcher/integrations`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Failed to fetch integrations: ${res.status} ${await res.text().catch(() => "")}`);
    }
    return res.json() as Promise<Integration[]>;
  } finally {
    clearTimeout(timeout);
  }
}
