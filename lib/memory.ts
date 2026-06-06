import { decryptForWallet, encryptForWallet } from "@/lib/crypto";
import { generateAssistantReply } from "@/lib/openai";
import { listBlobReferences, saveBlobReference } from "@/lib/sui-memory";
import { withTimeout } from "@/lib/timeout";
import { loadEncryptedMemory, storeEncryptedMemory } from "@/lib/walrus";
import type { ChatMessage, MemoryReference, MemorySession } from "@/lib/types";

function now() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function makeTitle(input: string) {
  const trimmed = input.trim().replace(/\s+/g, " ");
  return trimmed.length > 56 ? `${trimmed.slice(0, 53)}...` : trimmed || "Untitled memory";
}

export async function loadMemorySessions(walletAddress: string) {
  const references = await listBlobReferences(walletAddress);
  const settledSessions = await Promise.allSettled(
    references.map(async (reference) => {
      const encrypted = await withTimeout(
        loadEncryptedMemory(reference.blobId),
        1400,
        `Memory blob ${reference.blobId} timed out`
      );
      return decryptForWallet<MemorySession>(walletAddress, encrypted);
    })
  );
  const sessions = settledSessions
    .filter((result): result is PromiseFulfilledResult<MemorySession> => result.status === "fulfilled")
    .map((result) => result.value);

  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createChatTurn(params: {
  walletAddress: string;
  sessionId?: string;
  message: string;
}) {
  const memories = await loadMemorySessions(params.walletAddress);
  const existingSession = params.sessionId
    ? memories.find((session) => session.id === params.sessionId)
    : undefined;

  const currentMessages = existingSession?.messages ?? [];
  const assistantReply = await generateAssistantReply({
    input: params.message,
    currentMessages,
    memories
  });

  const timestamp = now();
  const userMessage: ChatMessage = {
    id: makeId("msg"),
    role: "user",
    content: params.message,
    createdAt: timestamp
  };
  const assistantMessage: ChatMessage = {
    id: makeId("msg"),
    role: "assistant",
    content: assistantReply,
    createdAt: now()
  };

  const session: MemorySession = {
    id: existingSession?.id ?? makeId("session"),
    walletAddress: params.walletAddress,
    title: existingSession?.title ?? makeTitle(params.message),
    messages: [...currentMessages, userMessage, assistantMessage],
    createdAt: existingSession?.createdAt ?? timestamp,
    updatedAt: now()
  };

  const encrypted = encryptForWallet(params.walletAddress, session);
  const blobId = await storeEncryptedMemory(encrypted);
  const reference: MemoryReference = {
    sessionId: session.id,
    walletAddress: params.walletAddress,
    title: session.title,
    blobId,
    messageCount: session.messages.length,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
  const savedReference = await saveBlobReference(reference);

  return {
    session: {
      ...session,
      blobId,
      storageProvider: blobId.startsWith("local-walrus-") ? "local-walrus" : "walrus",
      suiReferenceProvider: savedReference.suiReferenceProvider ?? "local",
      suiReferenceId: savedReference.suiReferenceId
    },
    reference: savedReference
  };
}
