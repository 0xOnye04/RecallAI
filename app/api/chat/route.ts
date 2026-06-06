import { NextResponse } from "next/server";
import { createChatTurn } from "@/lib/memory";
import type { MemoryReference, MemorySession } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      walletAddress?: string;
      sessionId?: string;
      references?: MemoryReference[];
      currentSession?: MemorySession;
      message?: string;
    };

    if (!body.walletAddress || body.walletAddress.length < 16) {
      return NextResponse.json({ error: "A valid Sui wallet address is required" }, { status: 400 });
    }

    if (!body.message?.trim() || body.message.length > 8000) {
      return NextResponse.json({ error: "Message must be between 1 and 8000 characters" }, { status: 400 });
    }

    const result = await createChatTurn({
      walletAddress: body.walletAddress,
      sessionId: body.sessionId,
      references: body.references,
      currentSession: body.currentSession,
      message: body.message
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
