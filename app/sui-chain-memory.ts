"use client";

import { Transaction } from "@mysten/sui/transactions";
import type { MemorySession } from "@/lib/types";

const SUI_MEMORY_PACKAGE_ID = process.env.NEXT_PUBLIC_SUI_MEMORY_PACKAGE_ID ?? "";
const SUI_MEMORY_MODULE = process.env.NEXT_PUBLIC_SUI_MEMORY_MODULE ?? "recall_memory";
const SUI_MEMORY_REGISTRY_ID = process.env.NEXT_PUBLIC_SUI_MEMORY_REGISTRY_ID ?? "";

const encoder = new TextEncoder();

function toBytes(value: string) {
  return Array.from(encoder.encode(value));
}

export function isSuiMemoryConfigured() {
  return Boolean(SUI_MEMORY_PACKAGE_ID && SUI_MEMORY_REGISTRY_ID);
}

export async function storeMemoryReferenceOnSui(params: {
  suiKit: {
    signAndExecuteTransaction: (args: { transaction: Transaction }) => Promise<{
      Transaction?: { digest: string };
      FailedTransaction?: { status?: { error?: { message?: string } | string | null } };
    }>;
  };
  session: MemorySession;
}) {
  if (!isSuiMemoryConfigured()) {
    throw new Error("Sui memory registry is not configured");
  }

  if (!params.session.blobId) {
    throw new Error("Cannot store memory reference without a Walrus blobId");
  }

  const tx = new Transaction();
  tx.moveCall({
    target: `${SUI_MEMORY_PACKAGE_ID}::${SUI_MEMORY_MODULE}::upsert_memory`,
    arguments: [
      tx.object(SUI_MEMORY_REGISTRY_ID),
      tx.pure.vector("u8", toBytes(params.session.id)),
      tx.pure.vector("u8", toBytes(params.session.title)),
      tx.pure.vector("u8", toBytes(params.session.blobId)),
      tx.pure.u64(new Date(params.session.updatedAt).getTime())
    ]
  });

  const result = await params.suiKit.signAndExecuteTransaction({ transaction: tx });

  if (result.FailedTransaction) {
    const error = result.FailedTransaction.status?.error;
    const message = typeof error === "string" ? error : error?.message;
    throw new Error(message ?? "Sui memory transaction failed");
  }

  const digest = result.Transaction?.digest;
  if (!digest) {
    throw new Error("Sui memory transaction did not return a digest");
  }

  return digest;
}
