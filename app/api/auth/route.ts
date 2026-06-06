import { NextResponse } from "next/server";
import { getTatumWalletProfile } from "@/lib/tatum";

export async function POST(request: Request) {
  const body = await request.json() as {
    walletAddress?: string;
    signature?: string;
    message?: string;
  };

  if (!body.walletAddress || body.walletAddress.length < 16) {
    return NextResponse.json({ error: "A valid Sui wallet address is required" }, { status: 400 });
  }

  const tatum = await getTatumWalletProfile(body.walletAddress);

  return NextResponse.json({
    walletAddress: body.walletAddress,
    issuedAt: new Date().toISOString(),
    tatumVerified: tatum.tatumVerified,
    recentTransactionCount: tatum.recentTransactionCount
  });
}
