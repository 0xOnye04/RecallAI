import { NextResponse } from "next/server";
import { loadMemorySessions } from "@/lib/memory";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress || walletAddress.length < 16) {
      return NextResponse.json({ error: "A valid Sui wallet address is required" }, { status: 400 });
    }

    const sessions = await loadMemorySessions(walletAddress);
    return NextResponse.json({ sessions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load memory";
    return NextResponse.json({ error: message, sessions: [] }, { status: 200 });
  }
}
