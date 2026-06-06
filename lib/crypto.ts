import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";

function keyForWallet(walletAddress: string) {
  return createHash("sha256")
    .update(`${env.memorySecret}:${walletAddress.toLowerCase()}`)
    .digest();
}

export function encryptForWallet(walletAddress: string, value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, keyForWallet(walletAddress), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final()
  ]);

  return {
    algorithm: ALGORITHM,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64")
  };
}

export function decryptForWallet<T>(walletAddress: string, encrypted: {
  iv: string;
  tag: string;
  ciphertext: string;
}) {
  const decipher = createDecipheriv(
    ALGORITHM,
    keyForWallet(walletAddress),
    Buffer.from(encrypted.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final()
  ]);

  return JSON.parse(decrypted.toString("utf8")) as T;
}
