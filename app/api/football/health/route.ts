import { NextResponse } from "next/server";
import { footballApiGet, type FootballHealthResponse } from "@/lib/footballApi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await footballApiGet<FootballHealthResponse>("/status");

    return NextResponse.json({
      ok: true,
      provider: "API-Football",
      timestamp: new Date().toISOString(),
      results: data.results,
      errors: data.errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        provider: "API-Football",
        error: message,
      },
      { status: 500 },
    );
  }
}
