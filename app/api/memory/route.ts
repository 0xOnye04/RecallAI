import { NextResponse } from "next/server";
import { loadMemorySessions, loadMemorySessionsFromReferences } from "@/lib/memory";
import type { MemoryReference, MemorySession } from "@/lib/types";

function mergeSessions(...groups: MemorySession[][]) {
  const byId = new Map<string, MemorySession>();

  for (const group of groups) {
    for (const session of group) {
      const existing = byId.get(session.id);
      if (!existing || existing.updatedAt < session.updatedAt) {
        byId.set(session.id, session);
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

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

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      walletAddress?: string;
      references?: MemoryReference[];
    };

    if (!body.walletAddress || body.walletAddress.length < 16) {
      return NextResponse.json({ error: "A valid Sui wallet address is required" }, { status: 400 });
    }

    const clientReferences = (body.references ?? [])
      .filter((reference) =>
        reference.walletAddress?.toLowerCase() === body.walletAddress?.toLowerCase()
        && reference.blobId
        && reference.sessionId
      )
      .slice(0, 50);

    const [serverSessions, clientSessions] = await Promise.all([
      loadMemorySessions(body.walletAddress),
      loadMemorySessionsFromReferences(body.walletAddress, clientReferences)
    ]);

    return NextResponse.json({ sessions: mergeSessions(serverSessions, clientSessions) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load memory";
    return NextResponse.json({ error: message, sessions: [] }, { status: 200 });
  }
}
