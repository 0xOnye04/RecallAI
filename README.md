# Recall AI

Recall AI is a full-stack decentralized chatbot with permanent encrypted memory.

Flow:

1. A Sui wallet address becomes the user ID.
2. The user sends a message.
3. Groq or OpenAI receives the current chat plus restored long-term memory.
4. The updated session is encrypted with AES-256-GCM.
5. The encrypted payload is stored on Walrus.
6. A Sui memory reference stores the Walrus `blobId`.
7. On the next login, Sui references are loaded, Walrus blobs are fetched, decrypted, and injected into AI context.

## Stack

- Next.js app router
- Node.js route handlers
- Groq API or OpenAI API
- Sui wallet login
- Tatum Sui RPC gateway
- Walrus encrypted blob storage
- Sui Move contract for blob references

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The app runs without external keys by using local development adapters in `.data`. Add these values for live integrations:

```bash
AI_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
OPENAI_API_KEY=
MEMORY_ENCRYPTION_SECRET=
WALRUS_PUBLISHER_URL=
WALRUS_AGGREGATOR_URL=
TATUM_API_KEY=
TATUM_SUI_NETWORK=mainnet
SUI_MEMORY_PACKAGE_ID=
SUI_MEMORY_REGISTRY_ID=
```

## Hackathon Requirement Checklist

- **Tatum API key and Sui RPC nodes:** `lib/tatum-sui-rpc.ts` calls Tatum's Sui gateway with `x-api-key`. The UI loads `/api/sui/status` and displays the live Tatum RPC network/checkpoint.
- **Walrus storage:** `lib/walrus.ts` stores encrypted chat sessions on Walrus when publisher/aggregator URLs are configured. Local storage is only a dev fallback.
- **Sui Mainnet/Testnet:** Mainnet is the default in `.env.example` and `app/dapp-kit.ts`. Set `TATUM_SUI_NETWORK=testnet` and `SUI_NETWORK=testnet` if you demo on testnet.
- **AI features:** `lib/openai.ts` can call Groq or OpenAI and injects restored memory into the assistant context before each response.
- **Submission assets:** publish this project to GitHub and record a 2-3 minute demo showing wallet connect, Tatum RPC status, chat memory save, and memory restore after reload.

## Judging Notes

- **Walrus and Tatum Integration:** Recall AI uses Walrus as the durable encrypted memory layer and Tatum Sui RPC as the live chain provider. The memory dashboard shows the blob ID for each stored session, and the top bar shows live Tatum Sui RPC checkpoint data.
- **Technical Quality:** Server-only API keys, wallet-scoped encryption, defensive API parsing, and local development fallbacks keep the demo reliable while preserving production integration boundaries.
- **Creativity:** The product turns a normal chatbot into a wallet-owned memory agent: the wallet address is the identity, Walrus keeps encrypted memory, and restored memories are injected into the AI prompt on every chat turn.
- **Presentation:** Demo the app in this order: connect Sui wallet, point to Tatum RPC status, ask a personal fact, show the new memory session/blob ID, reload, reconnect, and ask a follow-up that proves memory restoration.

## How To Prove Walrus Is Active

1. Set both `WALRUS_PUBLISHER_URL` and `WALRUS_AGGREGATOR_URL` in `.env.local`.
2. Restart the app with `npm run dev`.
3. Open `/api/walrus/status`. It should return `"provider":"Walrus"` and both configured flags should be `true`.
4. Send a chat message. The memory dashboard should show `Walrus - <blobId>`, not `Local Walrus dev`.
5. Reload the app, reconnect the same wallet, and confirm the session is restored from that blob.

If the dashboard says `Local Walrus dev`, the app is still using the local fallback and the Walrus portion is not demo-ready for judging.

## Production Integration Notes

The local Sui adapter in `lib/sui-memory.ts` mirrors the shape of on-chain memory references so the app is usable immediately. For production:

1. Deploy `contracts/sources/recall_memory.move` to Sui.
2. Create a registry object for each wallet with `create_registry`.
3. Replace or extend `saveBlobReference` and `listBlobReferences` with Sui RPC calls that read/write the registry object.
4. Store only `blobId`, title, session ID, and timestamps on-chain. The chat content stays encrypted on Walrus.

## Important Files

- `app/page.tsx` - ChatGPT-style UI, Sui wallet connection, memory dashboard.
- `app/api/chat/route.ts` - User message to AI response to encrypted memory persistence.
- `lib/openai.ts` - Groq/OpenAI provider adapter and AI context injection from restored memories.
- `lib/walrus.ts` - Walrus publisher/aggregator adapter with local fallback.
- `lib/sui-memory.ts` - Sui blob reference adapter with local fallback.
- `lib/tatum-sui-rpc.ts` - Tatum Sui JSON-RPC gateway adapter.
- `lib/tatum.ts` - Wallet verification through Tatum's Sui RPC.
- `contracts/sources/recall_memory.move` - Sui Move registry contract.
