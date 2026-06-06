import { NextResponse } from "next/server";
import { getWalrusStatus } from "@/lib/walrus";

export async function GET() {
  try {
    return NextResponse.json(await getWalrusStatus());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Walrus status failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
