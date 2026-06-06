import { NextResponse } from "next/server";
import { fromBase64 } from "@mysten/sui/utils";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { getTatumWalletProfile } from "@/lib/tatum";

const MAX_LOGIN_AGE_MS = 5 * 60 * 1000;

function extractIssuedAt(message: string) {
  const line = message.split("\n").find((item) => item.startsWith("Issued At: "));
  if (!line) return null;

  const issuedAt = new Date(line.replace("Issued At: ", ""));
  return Number.isNaN(issuedAt.getTime()) ? null : issuedAt;
}

export async function POST(request: Request) {
  const body = await request.json() as {
    walletAddress?: string;
    signature?: string;
    signedBytes?: string;
    message?: string;
  };

  if (!body.walletAddress || body.walletAddress.length < 16) {
    return NextResponse.json({ error: "A valid Sui wallet address is required" }, { status: 400 });
  }

  if (!body.message?.includes(`Wallet: ${body.walletAddress}`) || !body.signature) {
    return NextResponse.json({ error: "Wallet signature is required to confirm ownership" }, { status: 401 });
  }

  const issuedAt = extractIssuedAt(body.message);
  if (!issuedAt || Date.now() - issuedAt.getTime() > MAX_LOGIN_AGE_MS || issuedAt.getTime() - Date.now() > 30_000) {
    return NextResponse.json({ error: "Wallet login signature expired. Please connect again." }, { status: 401 });
  }

  let walletSignatureVerified = false;
  try {
    const messageBytes = body.signedBytes
      ? fromBase64(body.signedBytes)
      : new TextEncoder().encode(body.message);
    await verifyPersonalMessageSignature(messageBytes, body.signature, {
      address: body.walletAddress
    });
    walletSignatureVerified = true;
  } catch {
    walletSignatureVerified = false;
  }

  const tatum = await getTatumWalletProfile(body.walletAddress);

  return NextResponse.json({
    walletAddress: body.walletAddress,
    issuedAt: new Date().toISOString(),
    walletSignatureVerified,
    tatumVerified: tatum.tatumVerified,
    recentTransactionCount: tatum.recentTransactionCount
  });
}
