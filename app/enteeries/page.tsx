"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import Navbar from "@/app/components/Navbar";
import { db } from "@/lib/firebase";
import { MATCHES } from "@/lib/matches";

type PickOption =
  | "firstHalfWinner"
  | "firstHalfFirstGoal"
  | "fullTimeWinner"
  | "fullTimeFirstGoal";

type PickWinner = "A" | "B" | "draw";
type FirstGoalPick = "A" | "B" | "none";

type ResultState = "won" | "lost" | "pending";

type EntryCard = {
  id: string;
  savedAt: Date | null;
  round: number | null;
  teamA: string;
  teamB: string;
  teamAFlag: string;
  teamBFlag: string;
  selectedPick: string;
  resultState: ResultState;
  user: {
    uid: string;
    name: string;
    email: string;
    phone: string;
    locationName: string;
  };
};

type UserDoc = {
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  locationName?: string;
  picks?: Record<string, unknown>;
};

const TEAM_FLAG_MAP = new Map<string, string>(
  MATCHES.flatMap((match) => [
    [match.teamA.name, match.teamA.flag],
    [match.teamB.name, match.teamB.flag],
  ]),
);

function toDate(value: unknown): Date | null {
  if (!value || typeof value !== "object") return null;
  if (
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

function pickWinnerLabel(value: unknown, teamA: string, teamB: string): string {
  if (value === "A") return teamA;
  if (value === "B") return teamB;
  if (value === "draw") return "Draw";
  return "Not set";
}

function firstGoalLabel(value: unknown, teamA: string, teamB: string): string {
  if (value === "A") return teamA;
  if (value === "B") return teamB;
  if (value === "none") return "No goal";
  return "Not set";
}

function inferSelectedPick(pick: Record<string, unknown>, teamA: string, teamB: string): string {
  const selectedOption =
    pick.selectedOption === "firstHalfWinner" ||
    pick.selectedOption === "firstHalfFirstGoal" ||
    pick.selectedOption === "fullTimeWinner" ||
    pick.selectedOption === "fullTimeFirstGoal"
      ? (pick.selectedOption as PickOption)
      : null;

  if (selectedOption === "firstHalfWinner") {
    return `First Half Winner: ${pickWinnerLabel(pick.firstHalfWinner, teamA, teamB)}`;
  }

  if (selectedOption === "firstHalfFirstGoal") {
    return `First Half First Goal: ${firstGoalLabel(pick.firstHalfFirstGoal, teamA, teamB)}`;
  }

  if (selectedOption === "fullTimeWinner") {
    return `Full Time Winner: ${pickWinnerLabel(pick.fullTimeWinner ?? pick.winner, teamA, teamB)}`;
  }

  if (selectedOption === "fullTimeFirstGoal") {
    return `Full Time First Goal: ${firstGoalLabel(pick.fullTimeFirstGoal, teamA, teamB)}`;
  }

  if (
    pick.fullTimeWinner === "A" ||
    pick.fullTimeWinner === "B" ||
    pick.fullTimeWinner === "draw" ||
    pick.winner === "A" ||
    pick.winner === "B" ||
    pick.winner === "draw"
  ) {
    return `Full Time Winner: ${pickWinnerLabel(pick.fullTimeWinner ?? pick.winner, teamA, teamB)}`;
  }

  if (
    pick.fullTimeFirstGoal === "A" ||
    pick.fullTimeFirstGoal === "B" ||
    pick.fullTimeFirstGoal === "none"
  ) {
    return `Full Time First Goal: ${firstGoalLabel(pick.fullTimeFirstGoal, teamA, teamB)}`;
  }

  if (
    pick.firstHalfWinner === "A" ||
    pick.firstHalfWinner === "B" ||
    pick.firstHalfWinner === "draw"
  ) {
    return `First Half Winner: ${pickWinnerLabel(pick.firstHalfWinner, teamA, teamB)}`;
  }

  if (
    pick.firstHalfFirstGoal === "A" ||
    pick.firstHalfFirstGoal === "B" ||
    pick.firstHalfFirstGoal === "none"
  ) {
    return `First Half First Goal: ${firstGoalLabel(pick.firstHalfFirstGoal, teamA, teamB)}`;
  }

  return "No valid pick selected";
}

function inferResultState(pick: Record<string, unknown>): ResultState {
  const resultText =
    typeof pick.resultStatus === "string"
      ? pick.resultStatus.toLowerCase()
      : typeof pick.status === "string"
        ? pick.status.toLowerCase()
        : "";

  if (resultText === "won" || resultText === "win" || resultText === "correct") {
    return "won";
  }
  if (resultText === "lost" || resultText === "lose" || resultText === "incorrect") {
    return "lost";
  }

  const wonLike = [pick.won, pick.isWon, pick.correct, pick.isCorrect];
  if (wonLike.some((value) => value === true)) return "won";
  if (wonLike.some((value) => value === false)) return "lost";

  return "pending";
}

function flagForTeam(teamName: string): string {
  return TEAM_FLAG_MAP.get(teamName) ?? "⚽";
}

function toEntryCards(docSnap: QueryDocumentSnapshot<DocumentData>): EntryCard[] {
  const data = docSnap.data() as UserDoc;
  const name =
    data.name ||
    data.displayName ||
    (data.email ? data.email.split("@")[0] : "Anonymous");

  const picks = data.picks && typeof data.picks === "object"
    ? (data.picks as Record<string, unknown>)
    : {};

  const cards: EntryCard[] = [];

  for (const [matchId, rawPick] of Object.entries(picks)) {
    if (!rawPick || typeof rawPick !== "object") continue;
    const pick = rawPick as Record<string, unknown>;

    const teamA = typeof pick.teamA === "string" ? pick.teamA : "Team A";
    const teamB = typeof pick.teamB === "string" ? pick.teamB : "Team B";

    cards.push({
      id: `${docSnap.id}-${matchId}`,
      savedAt: toDate(pick.savedAt),
      round: typeof pick.round === "number" ? pick.round : null,
      teamA,
      teamB,
      teamAFlag: flagForTeam(teamA),
      teamBFlag: flagForTeam(teamB),
      selectedPick: inferSelectedPick(pick, teamA, teamB),
      resultState: inferResultState(pick),
      user: {
        uid: docSnap.id,
        name,
        email: data.email ?? "No email",
        phone: data.phone ?? "No phone",
        locationName: data.locationName ?? "Unassigned",
      },
    });
  }

  return cards;
}

function statusStyles(state: ResultState): { label: string; className: string } | null {
  if (state === "won") {
    return {
      label: "Prediction Won",
      className:
        "bg-emerald-100 text-emerald-800 border border-emerald-200",
    };
  }

  if (state === "lost") {
    return {
      label: "Prediction Lost",
      className: "bg-red-100 text-red-700 border border-red-200",
    };
  }

  return null;
}

function formatSavedAt(value: Date | null): string {
  if (!value) return "Unknown time";
  return value.toLocaleString();
}

export default function EnteeriesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cards, setCards] = useState<EntryCard[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const snap = await getDocs(collection(db, "users"));
        const rows = snap.docs.flatMap((docSnap) => toEntryCards(docSnap));

        rows.sort((a, b) => {
          const aTime = a.savedAt?.getTime() ?? 0;
          const bTime = b.savedAt?.getTime() ?? 0;
          return bTime - aTime;
        });

        if (!cancelled) {
          setCards(rows);
        }
      } catch (err) {
        console.error("Failed to load entries", err);
        if (!cancelled) {
          setError("Could not load entries. Check Firestore read permissions for users.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const total = cards.length;
    const won = cards.filter((card) => card.resultState === "won").length;
    const pending = cards.filter((card) => card.resultState === "pending").length;
    return { total, won, pending };
  }, [cards]);

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-14">
        <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 mb-6">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at right top, rgba(238,126,1,0.12), transparent 45%), radial-gradient(ellipse at left bottom, rgba(17,24,39,0.05), transparent 50%)",
            }}
          />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
              Live Feed
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2">
              Enteeries
            </h1>
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">
              Every submitted pick appears here with user profile details and selected option. Won predictions are highlighted automatically when result fields are present.
            </p>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5 max-w-xl">
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">
                  Total Picks
                </p>
                <p className="text-2xl font-black text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">
                  Won
                </p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{stats.won}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">
                  Awaiting
                </p>
                <p className="text-2xl font-black text-gray-700 mt-1">{stats.pending}</p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            Loading enteeries...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            No picks submitted yet.
          </div>
        ) : (
          <section className="space-y-3">
            {cards.map((card, index) => {
              const status = statusStyles(card.resultState);
              return (
                <article
                  key={card.id}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-3 sm:px-5 sm:py-4 animate-slide-in-card"
                  style={{
                    boxShadow: "0 8px 20px rgba(17,24,39,0.07)",
                    background:
                      "radial-gradient(circle at 85% 25%, rgba(17,24,39,0.07) 0 14px, transparent 15px), radial-gradient(circle at 78% 34%, rgba(17,24,39,0.06) 0 4px, transparent 5px), radial-gradient(circle at 92% 34%, rgba(17,24,39,0.06) 0 4px, transparent 5px), radial-gradient(circle at 85% 42%, rgba(17,24,39,0.06) 0 4px, transparent 5px), linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(249,250,251,1) 100%)",
                    animationDelay: `${index * 70}ms`,
                  }}
                >
                  <div className="flex flex-col gap-3 sm:gap-2">
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                          style={{ background: card.resultState === "won" ? "#059669" : "#111827" }}
                        >
                          {(card.user.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="font-bold text-gray-900 truncate text-sm sm:text-[15px]">
                          {card.user.name}
                        </div>
                      </div>
                      {status && (
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${status.className}`}
                        >
                          {status.label}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(240px,1.2fr)_minmax(260px,1.6fr)_auto] gap-2 sm:gap-3 items-center text-sm">
                      <div className="text-gray-700 truncate font-medium flex items-center gap-1.5">
                        <span>{card.teamAFlag}</span>
                        <span className="truncate">{card.teamA}</span>
                        <span className="text-gray-400">vs</span>
                        <span>{card.teamBFlag}</span>
                        <span className="truncate">{card.teamB}</span>
                      </div>
                      <div className="text-gray-800 font-semibold truncate">
                        {card.selectedPick}
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {formatSavedAt(card.savedAt)}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
