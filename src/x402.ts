import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import type { TelegraphConfig } from "./types.js";

interface SchemeRegistration {
  network: `${string}:${string}`;
  client: any;
  x402Version?: number;
}

interface SvmModules {
  ExactSvmScheme: any;
  toClientSvmSigner: any;
  createKeyPairSignerFromBytes: any;
  base58: any;
}

let svmModules: SvmModules | null = null;

async function loadSvmModules(): Promise<SvmModules | null> {
  if (svmModules) return svmModules;
  try {
    const svm = await import("@x402/svm");
    const solanaKit = await import("@solana/kit");
    const scure = await import("@scure/base");
    svmModules = {
      ExactSvmScheme: svm.ExactSvmScheme,
      toClientSvmSigner: svm.toClientSvmSigner,
      createKeyPairSignerFromBytes: solanaKit.createKeyPairSignerFromBytes,
      base58: scure.base58,
    };
    return svmModules;
  } catch {
    console.error("[telegraph-mcp] SVM modules not available. Solana payments disabled.");
    return null;
  }
}

export async function createPaymentAwareFetch(
  config: TelegraphConfig
): Promise<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>> {
  const schemes: SchemeRegistration[] = [];

  if (config.evmPrivateKey) {
    const account = privateKeyToAccount(config.evmPrivateKey as `0x${string}`);
    const evmSigner = toClientEvmSigner(account);
    schemes.push({
      network: config.evmNetwork,
      client: new ExactEvmScheme(evmSigner),
    });
    console.error(`[telegraph-mcp] EVM payment enabled (network: ${config.evmNetwork}, from: ${account.address})`);
  }

  if (config.solanaPrivateKey) {
    const mods = await loadSvmModules();
    if (mods) {
      try {
        const keypair = await mods.createKeyPairSignerFromBytes(
          mods.base58.decode(config.solanaPrivateKey)
        );
        const svmSigner = mods.toClientSvmSigner(keypair);
        schemes.push({
          network: config.svmNetwork,
          client: new mods.ExactSvmScheme(svmSigner),
        });
        console.error(`[telegraph-mcp] SVM payment enabled (network: ${config.svmNetwork})`);
      } catch (err: any) {
        console.error(`[telegraph-mcp] SVM signer setup failed: ${err.message}`);
      }
    }
  }

  if (schemes.length === 0) {
    throw new Error("No payment schemes configured. Set TELEGRAPH_EVM_PRIVATE_KEY or TELEGRAPH_SOLANA_PRIVATE_KEY.");
  }

  const client = x402Client.fromConfig({
    schemes: schemes,
  });

  return wrapFetchWithPayment(fetch, client);
}
