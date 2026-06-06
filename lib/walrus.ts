import { createHash } from "crypto";
import { readJsonFile, writeJsonFile } from "@/lib/local-store";
import { env } from "@/lib/env";

type EncryptedPayload = {
  algorithm: string;
  iv: string;
  tag: string;
  ciphertext: string;
};

const LOCAL_BLOBS_FILE = "walrus-blobs.json";

function makeLocalBlobId(payload: EncryptedPayload) {
  return `local-walrus-${createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 48)}`;
}

export async function storeEncryptedMemory(payload: EncryptedPayload) {
  if (env.walrusPublisherUrl) {
    const response = await fetch(`${env.walrusPublisherUrl.replace(/\/$/, "")}/v1/blobs`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Walrus publisher failed with ${response.status}`);
    }

    const result = await response.json() as {
      newlyCreated?: { blobObject?: { blobId?: string } };
      alreadyCertified?: { blobId?: string };
      blobId?: string;
    };

    const blobId = result.newlyCreated?.blobObject?.blobId ?? result.alreadyCertified?.blobId ?? result.blobId;
    if (!blobId) {
      throw new Error("Walrus publisher did not return a blobId");
    }

    return blobId;
  }

  const blobId = makeLocalBlobId(payload);
  const blobs = await readJsonFile<Record<string, EncryptedPayload>>(LOCAL_BLOBS_FILE, {});
  blobs[blobId] = payload;
  await writeJsonFile(LOCAL_BLOBS_FILE, blobs);
  return blobId;
}

export async function loadEncryptedMemory(blobId: string) {
  if (env.walrusAggregatorUrl && !blobId.startsWith("local-walrus-")) {
    const response = await fetch(`${env.walrusAggregatorUrl.replace(/\/$/, "")}/v1/blobs/${blobId}`);
    if (!response.ok) {
      throw new Error(`Walrus aggregator failed with ${response.status}`);
    }
    return await response.json() as EncryptedPayload;
  }

  const blobs = await readJsonFile<Record<string, EncryptedPayload>>(LOCAL_BLOBS_FILE, {});
  const payload = blobs[blobId];
  if (!payload) {
    throw new Error(`No Walrus blob found for ${blobId}`);
  }
  return payload;
}

export async function getWalrusStatus() {
  return {
    provider: env.walrusPublisherUrl && env.walrusAggregatorUrl ? "Walrus" : "Local Walrus dev",
    publisherConfigured: Boolean(env.walrusPublisherUrl),
    aggregatorConfigured: Boolean(env.walrusAggregatorUrl),
    publisherUrl: env.walrusPublisherUrl ? new URL(env.walrusPublisherUrl).origin : null,
    aggregatorUrl: env.walrusAggregatorUrl ? new URL(env.walrusAggregatorUrl).origin : null
  };
}
