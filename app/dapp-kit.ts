import { createDAppKit } from "@mysten/dapp-kit-react";
import { SuiGrpcClient } from "@mysten/sui/grpc";

const GRPC_URLS = {
  testnet: "https://fullnode.testnet.sui.io:443",
  mainnet: "https://fullnode.mainnet.sui.io:443"
} as const;

export const dAppKit = createDAppKit({
  networks: ["mainnet", "testnet"],
  defaultNetwork: "testnet",
  createClient: (network) => new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] }),
  autoConnect: false,
  storage: null,
  storageKey: "recall-ai:sui-wallet",
  slushWalletConfig: null
});

declare module "@mysten/dapp-kit-react" {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}
