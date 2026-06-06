# Recall AI

Recall AI is a decentralized AI chatbot with permanent, wallet-owned memory.

The user connects a Sui wallet, chats with the assistant, and every session is encrypted, stored on Walrus, referenced by blob ID, and restored on the next login. Restored memories are injected into the AI context so the assistant can remember previous conversations.

## Demo Flow

1. Connect a Sui wallet.
2. The app verifies wallet/network status through Tatum Sui RPC.
3. Send a message to Recall AI.
4. Groq generates the assistant response using restored memory context.
5. The full session is encrypted with AES-256-GCM.
6. The encrypted payload is stored on Walrus.
7. Recall AI saves the Walrus `blobId` as the memory reference.
8. On reload/reconnect, the app restores previous memory from Walrus and uses it in future replies.

## Stack

- Next.js App Router
- Node.js route handlers
- Sui wallet login with Mysten dApp Kit
- Groq AI chat completions, with optional OpenAI fallback
- Tatum Sui JSON-RPC gateway
- Walrus encrypted blob storage
- Sui Move contract scaffold for memory references

## Current Demo Configuration

The recommended hackathon demo setup uses Sui Testnet and Walrus Testnet because public Walrus Testnet publisher and aggregator endpoints are available.

```env
AI_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant

MEMORY_ENCRYPTION_SECRET=

TATUM_API_KEY=
SUI_NETWORK=testnet
TATUM_SUI_NETWORK=testnet

WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
```

Do not commit `.env.local`. It is ignored by Git.

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful status routes:

```text
http://localhost:3000/api/sui/status
http://localhost:3000/api/walrus/status
```

## How To Prove Walrus Is Active

Open `/api/walrus/status`. It should return:

```json
{
  "provider": "Walrus",
  "publisherConfigured": true,
  "aggregatorConfigured": true
}
```

Then send a new chat message. In the memory dashboard, the new session should show:

```text
Walrus - <blobId>
```

The blob ID must not start with:

```text
local-walrus-
```

You can confirm the blob exists by opening:

```text
https://aggregator.walrus-testnet.walrus.space/v1/blobs/YOUR_BLOB_ID
```

It should return encrypted JSON containing `algorithm`, `iv`, `tag`, and `ciphertext`.

## Judging Criteria Alignment

### Walrus And Tatum Integration

- `lib/walrus.ts` stores encrypted chat sessions on Walrus when `WALRUS_PUBLISHER_URL` and `WALRUS_AGGREGATOR_URL` are configured.
- `app/api/walrus/status/route.ts` proves whether the app is using real Walrus or local dev fallback.
- `lib/tatum-sui-rpc.ts` calls Tatum's Sui RPC gateway with `x-api-key`.
- `app/api/sui/status/route.ts` displays live Tatum Sui RPC checkpoint status.

### Technical Quality

- API keys stay server-side.
- Chat memory is encrypted before storage.
- Memory is scoped to the connected wallet address.
- Slow Tatum/Walrus calls have bounded timeouts so reloads stay responsive.
- API responses are parsed defensively to avoid runtime crashes.

### Creativity

Recall AI turns a normal chatbot into a wallet-owned memory agent. The wallet is the identity, Walrus is the permanent memory layer, and the restored memory is injected into Groq/OpenAI context on every chat turn.

### Presentation

Recommended 2-3 minute demo:

1. Show Sui wallet connect.
2. Show Tatum RPC status in the top bar.
3. Show `/api/walrus/status` returning `provider: Walrus`.
4. Ask Recall AI to remember a personal fact.
5. Show the memory dashboard with a real Walrus blob ID.
6. Reload the app and reconnect the same wallet.
7. Ask a follow-up that proves the memory was restored.

## Vercel Deployment

Connect the GitHub repo to Vercel and use the default Next.js settings:

- Framework Preset: `Next.js`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: default

Add these Vercel environment variables:

```env
AI_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant

MEMORY_ENCRYPTION_SECRET=

TATUM_API_KEY=
SUI_NETWORK=testnet
TATUM_SUI_NETWORK=testnet

WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
```

After adding or changing environment variables, redeploy the project.

## Mainnet Notes

Sui Mainnet can be used by setting:

```env
SUI_NETWORK=mainnet
TATUM_SUI_NETWORK=mainnet
```

Walrus Mainnet can use a public aggregator, but publishing on Mainnet requires a funded publisher because storage costs SUI/WAL. For hackathon demos, Walrus Testnet is the practical public option.

## Important Files

- `app/recall-client.tsx` - Chat UI, wallet connect, memory dashboard, infra status.
- `app/api/chat/route.ts` - AI chat turn, encryption, Walrus persistence.
- `app/api/sui/status/route.ts` - Tatum Sui RPC status endpoint.
- `app/api/walrus/status/route.ts` - Walrus status endpoint.
- `lib/openai.ts` - Groq/OpenAI provider adapter and memory context injection.
- `lib/walrus.ts` - Walrus publisher/aggregator adapter with local fallback.
- `lib/memory.ts` - Memory restore/save workflow.
- `lib/tatum-sui-rpc.ts` - Tatum Sui JSON-RPC adapter.
- `contracts/sources/recall_memory.move` - Sui Move registry scaffold.

## Repository

GitHub:

```text
https://github.com/0xOnye04/RecallAI
```
