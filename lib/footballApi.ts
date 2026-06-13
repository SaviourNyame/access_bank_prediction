import "server-only";

type QueryValue = string | number | boolean | undefined;

function getBaseUrl(): string {
  return process.env.API_FOOTBALL_BASE_URL?.trim() || "https://v3.football.api-sports.io";
}

function getApiKey(): string {
  const key = process.env.API_FOOTBALL_KEY?.trim();
  if (!key) {
    throw new Error("Missing API_FOOTBALL_KEY environment variable");
  }
  return key;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${getBaseUrl()}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export async function footballApiGet<T>(
  path: string,
  query?: Record<string, QueryValue>,
): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    method: "GET",
    headers: {
      "x-apisports-key": getApiKey(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API-Football request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

export type FootballHealthResponse = {
  get: string;
  errors: unknown[];
  results: number;
  paging: { current: number; total: number };
  response: unknown[];
};
