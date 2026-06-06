import { env } from "@/lib/env";

type TatumSuiNetwork = "mainnet" | "testnet" | "devnet";

const TATUM_SUI_ENDPOINTS: Record<TatumSuiNetwork, string> = {
  mainnet: "https://sui-mainnet.gateway.tatum.io/",
  testnet: "https://sui-testnet.gateway.tatum.io/",
  devnet: "https://sui-devnet.gateway.tatum.io/"
};

type TatumRpcError = {
  code?: number;
  message?: string;
};

type TatumRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: TatumRpcError;
};

export function getTatumSuiNetwork(): TatumSuiNetwork {
  if (env.tatumSuiNetwork === "testnet" || env.tatumSuiNetwork === "devnet") {
    return env.tatumSuiNetwork;
  }

  return "mainnet";
}

export async function tatumSuiRpc<T>(method: string, params: unknown[] = []) {
  if (!env.tatumApiKey) {
    throw new Error("TATUM_API_KEY is required for Tatum Sui RPC");
  }

  const network = getTatumSuiNetwork();
  const response = await fetch(TATUM_SUI_ENDPOINTS[network], {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": env.tatumApiKey
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params
    }),
    next: { revalidate: 30 }
  });

  const text = await response.text();
  let payload: TatumRpcResponse<T> | null = null;

  if (text.trim()) {
    try {
      payload = JSON.parse(text) as TatumRpcResponse<T>;
    } catch {
      const preview = text.replace(/\s+/g, " ").slice(0, 160);
      throw new Error(`Tatum Sui RPC returned a non-JSON response: ${preview}`);
    }
  }

  if (!response.ok) {
    throw new Error(`Tatum Sui RPC failed with ${response.status}`);
  }

  if (payload?.error) {
    throw new Error(payload.error.message ?? `Tatum Sui RPC error ${payload.error.code ?? ""}`.trim());
  }

  if (!payload || typeof payload.result === "undefined") {
    throw new Error("Tatum Sui RPC returned an empty result");
  }

  return payload.result;
}

export async function getTatumSuiStatus() {
  const checkpoint = await tatumSuiRpc<string>("sui_getLatestCheckpointSequenceNumber");

  return {
    provider: "Tatum Sui RPC",
    network: getTatumSuiNetwork(),
    checkpoint
  };
}

export async function getTatumSuiBalance(walletAddress: string) {
  return await tatumSuiRpc<{
    coinType: string;
    coinObjectCount: number;
    totalBalance: string;
    lockedBalance: Record<string, string>;
  }>("suix_getBalance", [walletAddress]);
}
