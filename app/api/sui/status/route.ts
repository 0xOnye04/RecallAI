import { NextResponse } from "next/server";
import { getTatumSuiStatus } from "@/lib/tatum-sui-rpc";

export async function GET() {
  try {
    const status = await getTatumSuiStatus();
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tatum Sui RPC status failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
