import { readJsonFile, writeJsonFile } from "@/lib/local-store";
import type { MemoryReference } from "@/lib/types";

const REFERENCES_FILE = "sui-memory-references.json";

export async function saveBlobReference(reference: MemoryReference) {
  const references = await readJsonFile<Record<string, MemoryReference[]>>(REFERENCES_FILE, {});
  const wallet = reference.walletAddress.toLowerCase();
  const existing = references[wallet] ?? [];
  const next = existing.filter((item) => item.sessionId !== reference.sessionId);

  references[wallet] = [
    {
      ...reference,
      suiReferenceId: reference.suiReferenceId ?? `local-sui-ref-${reference.sessionId}`
    },
    ...next
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  await writeJsonFile(REFERENCES_FILE, references);
  return references[wallet][0];
}

export async function listBlobReferences(walletAddress: string) {
  const references = await readJsonFile<Record<string, MemoryReference[]>>(REFERENCES_FILE, {});
  return references[walletAddress.toLowerCase()] ?? [];
}
