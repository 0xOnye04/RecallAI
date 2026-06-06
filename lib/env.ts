export const env = {
  aiProvider: process.env.AI_PROVIDER ?? "openai",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
  memorySecret: process.env.MEMORY_ENCRYPTION_SECRET ?? "recall-ai-dev-secret-change-me",
  walrusPublisherUrl: process.env.WALRUS_PUBLISHER_URL ?? "",
  walrusAggregatorUrl: process.env.WALRUS_AGGREGATOR_URL ?? "",
  suiNetwork: process.env.SUI_NETWORK ?? "mainnet",
  suiRpcUrl: process.env.SUI_RPC_URL ?? "https://fullnode.mainnet.sui.io:443",
  tatumApiKey: process.env.TATUM_API_KEY ?? "",
  tatumBaseUrl: process.env.TATUM_BASE_URL ?? "https://api.tatum.io",
  tatumSuiNetwork: process.env.TATUM_SUI_NETWORK ?? process.env.SUI_NETWORK ?? "mainnet"
};
