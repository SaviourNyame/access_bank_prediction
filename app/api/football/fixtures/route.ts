import { NextResponse } from "next/server";
import { footballApiGet } from "@/lib/footballApi";

// Revalidate server-side cache every 60 seconds
export const revalidate = 60;

// ─── API-Football types ───────────────────────────────────────────────────────
type ApiFixture = {
  fixture: {
    id: number;
    date: string;
    status: { long: string; short: string; elapsed: number | null };
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
};

type ApiResponse = {
  response: ApiFixture[];
  errors: Record<string, string> | unknown[];
};

// ─── Team name normalisation ──────────────────────────────────────────────────
// Maps API team names → names used in lib/matches.ts
const API_TO_LOCAL: Record<string, string> = {
  "Korea Republic": "South Korea",
  "Czechia": "Czech Republic",
  "United States": "USA",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Cote d'Ivoire": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  "Congo DR": "D.R. Congo",
  "DR Congo": "D.R. Congo",
  "New Zealand (W)": "New Zealand",
};

function normalizeName(name: string): string {
  return API_TO_LOCAL[name] ?? name;
}

// ─── Status mapping ───────────────────────────────────────────────────────────
function toStatus(
  short: string,
): "upcoming" | "live" | "halftime" | "finished" {
  if (["FT", "AET", "PEN", "AWD", "WO"].includes(short)) return "finished";
  if (short === "HT") return "halftime";
  if (["1H", "2H", "ET", "BT", "P", "LIVE", "INT"].includes(short))
    return "live";
  return "upcoming";
}

// ─── Public fixture type returned to clients ──────────────────────────────────
export type FixtureResult = {
  teamA: string; // home team (normalised)
  teamB: string; // away team (normalised)
  scoreA: string; // home full-time goals or ""
  scoreB: string; // away full-time goals or ""
  htScoreA: string; // home half-time goals or ""
  htScoreB: string; // away half-time goals or ""
  status: "upcoming" | "live" | "halftime" | "finished";
  elapsed: number | null;
};

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const data = await footballApiGet<ApiResponse>("/fixtures", {
      league: 1,      // FIFA World Cup
      season: 2026,
    });

    const errors = data.errors;
    const hasErrors =
      (Array.isArray(errors) && errors.length > 0) ||
      (!Array.isArray(errors) &&
        typeof errors === "object" &&
        errors !== null &&
        Object.keys(errors).length > 0);

    if (hasErrors) {
      return NextResponse.json(
        { error: "API-Football returned errors", details: errors },
        { status: 502 },
      );
    }

    const fixtures: FixtureResult[] = data.response.map((f) => ({
      teamA: normalizeName(f.teams.home.name),
      teamB: normalizeName(f.teams.away.name),
      scoreA: f.goals.home != null ? String(f.goals.home) : "",
      scoreB: f.goals.away != null ? String(f.goals.away) : "",
      htScoreA: f.score?.halftime?.home != null ? String(f.score.halftime.home) : "",
      htScoreB: f.score?.halftime?.away != null ? String(f.score.halftime.away) : "",
      status: toStatus(f.fixture.status.short),
      elapsed: f.fixture.status.elapsed,
    }));

    return NextResponse.json(
      { fixtures },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
