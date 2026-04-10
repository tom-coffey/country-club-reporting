import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/standings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message, standings: [], players: [], errors: [message] },
      { status: 500 }
    );
  }
}
