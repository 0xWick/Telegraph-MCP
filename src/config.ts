import type { TelegraphConfig } from "./types.js";

export function loadConfig(): TelegraphConfig {
  const evmKey = process.env.TELEGRAPH_EVM_PRIVATE_KEY;
  const svmKey = process.env.TELEGRAPH_SOLANA_PRIVATE_KEY;

  if (!evmKey && !svmKey) {
    throw new Error(
      "At least one private key is required. Set TELEGRAPH_EVM_PRIVATE_KEY or TELEGRAPH_SOLANA_PRIVATE_KEY."
    );
  }

  const nodePort = process.env.NODE_PORT || "7044";
  const enginePort = process.env.ENGINE_PORT || "8080";
  const daemonPort = process.env.DAEMON_PORT || "8081";

  const nodeUrl = process.env.TELEGRAPH_NODE_URL || `http://localhost:${nodePort}`;
  const engineUrl = process.env.TELEGRAPH_ENGINE_URL || `http://localhost:${enginePort}`;
  const daemonUrl = process.env.TELEGRAPH_DAEMON_URL || `http://localhost:${daemonPort}`;

  return {
    nodeUrl: nodeUrl.replace(/\/$/, ""),
    engineUrl: engineUrl.replace(/\/$/, ""),
    daemonUrl: daemonUrl.replace(/\/$/, ""),
    evmPrivateKey: evmKey,
    solanaPrivateKey: svmKey,
    evmNetwork: (process.env.EVM_NETWORK || "eip155:*") as `${string}:${string}`,
    svmNetwork: (process.env.SVM_NETWORK || "solana:*") as `${string}:${string}`,
    refreshIntervalMs: parseInt(process.env.REFRESH_INTERVAL_MS || "300000", 10),
    transport: "stdio",
  };
}
