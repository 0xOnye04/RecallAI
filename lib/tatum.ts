import { env } from "@/lib/env";
import { getTatumSuiBalance } from "@/lib/tatum-sui-rpc";
import { withTimeout } from "@/lib/timeout";

export async function getTatumWalletProfile(walletAddress: string) {
  if (!env.tatumApiKey) {
    return {
      tatumVerified: false,
      recentTransactionCount: undefined
    };
  }

  try {
    await withTimeout(
      getTatumSuiBalance(walletAddress),
      800,
      "Tatum wallet verification timed out"
    );
    return {
      tatumVerified: true,
      recentTransactionCount: undefined
    };
  } catch {
    return {
      tatumVerified: false,
      recentTransactionCount: undefined
    };
  }
}
