"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MATCHES, type Match } from "@/lib/matches";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import AuthDialog from "@/app/components/AuthDialog";

type WinnerPick = "A" | "B" | "draw";
type FirstGoalPick = "A" | "B" | "none";
type PickOption =
  | "firstHalfWinner"
  | "firstHalfFirstGoal"
  | "fullTimeWinner"
  | "fullTimeFirstGoal";

type MatchPick = {
  selectedOption: PickOption | null;
  firstHalfWinner: WinnerPick | null;
  firstHalfFirstGoal: FirstGoalPick | null;
  fullTimeWinner: WinnerPick | null;
  fullTimeFirstGoal: FirstGoalPick | null;
};

type Picks = Record<number, MatchPick>;

const EMPTY_PICK: MatchPick = {
  selectedOption: null,
  firstHalfWinner: null,
  firstHalfFirstGoal: null,
  fullTimeWinner: null,
  fullTimeFirstGoal: null,
};

function hasAnyPick(pick: MatchPick | undefined): boolean {
  if (!pick) return false;
  switch (pick.selectedOption) {
    case "firstHalfWinner":
      return pick.firstHalfWinner !== null;
    case "firstHalfFirstGoal":
      return pick.firstHalfFirstGoal !== null;
    case "fullTimeWinner":
      return pick.fullTimeWinner !== null;
    case "fullTimeFirstGoal":
      return pick.fullTimeFirstGoal !== null;
    default:
      return false;
  }
}

function inferSelectedOption(pick: MatchPick): PickOption | null {
  if (pick.firstHalfWinner !== null) return "firstHalfWinner";
  if (pick.firstHalfFirstGoal !== null) return "firstHalfFirstGoal";
  if (pick.fullTimeWinner !== null) return "fullTimeWinner";
  if (pick.fullTimeFirstGoal !== null) return "fullTimeFirstGoal";
  return null;
}

// Returns today's matches, or the next 3 upcoming if none today
function getTargetMatches(): Match[] {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  const todayMs = todayMatches();
  if (todayMs.length > 0) return todayMs.slice(0, 4);

  // No matches today → show next upcoming
  return MATCHES.filter((m) => m.deadlineMs > now)
    .sort((a, b) => a.deadlineMs - b.deadlineMs)
    .slice(0, 4);
}

function todayMatches(): Match[] {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);
  return MATCHES.filter(
    (m) =>
      m.deadlineMs >= todayStart.getTime() &&
      m.deadlineMs <= todayEnd.getTime(),
  );
}

async function savePicks(user: User, picks: Picks, matches: Match[]) {
  const picksPayload: Record<string, unknown> = {};
  for (const [matchIdStr, pick] of Object.entries(picks)) {
    if (!hasAnyPick(pick)) continue;
    const matchId = Number(matchIdStr);
    const match = matches.find((m) => m.id === matchId);
    if (!match) continue;

    picksPayload[matchIdStr] = {
      matchId,
      round: match.round,
      teamA: match.teamA.name,
      teamB: match.teamB.name,
      // Keep legacy keys for compatibility with existing consumers.
      winner: pick.fullTimeWinner,
      scoreA: "",
      scoreB: "",
      firstHalfWinner: pick.firstHalfWinner,
      firstHalfFirstGoal: pick.firstHalfFirstGoal,
      firstHalfScoreA: "",
      firstHalfScoreB: "",
      fullTimeWinner: pick.fullTimeWinner,
      fullTimeFirstGoal: pick.fullTimeFirstGoal,
      fullTimeScoreA: "",
      fullTimeScoreB: "",
      selectedOption: pick.selectedOption,
      savedAt: serverTimestamp(),
    };
  }
  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      email: user.email ?? null,
      picks: picksPayload,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export default function TodayMatchesPopup() {
  const [open, setOpen] = useState(false);
  const [matches] = useState<Match[]>(() => getTargetMatches());
  const [picks, setPicks] = useState<Picks>({});
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [step, setStep] = useState<"pick" | "success">("pick");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setOpen(true), 1800);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // Load already-saved picks for displayed matches
  useEffect(() => {
    if (!user) return;
    async function load() {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) return;
        const data = snap.data() as {
          picks?: Record<string, Record<string, unknown>>;
        };
        if (!data.picks) return;
        const loaded: Picks = {};
        for (const m of matches) {
          const p = data.picks[String(m.id)];
          if (!p) continue;

          const firstHalfWinner =
            p.firstHalfWinner === "A" ||
            p.firstHalfWinner === "B" ||
            p.firstHalfWinner === "draw"
              ? p.firstHalfWinner
              : null;
          const firstHalfFirstGoal =
            p.firstHalfFirstGoal === "A" ||
            p.firstHalfFirstGoal === "B" ||
            p.firstHalfFirstGoal === "none"
              ? p.firstHalfFirstGoal
              : null;

          const fullTimeWinner =
            p.fullTimeWinner === "A" ||
            p.fullTimeWinner === "B" ||
            p.fullTimeWinner === "draw"
              ? p.fullTimeWinner
              : p.winner === "A" || p.winner === "B" || p.winner === "draw"
                ? p.winner
                : null;

          const fullTimeFirstGoal =
            p.fullTimeFirstGoal === "A" ||
            p.fullTimeFirstGoal === "B" ||
            p.fullTimeFirstGoal === "none"
              ? p.fullTimeFirstGoal
              : null;

          const nextPick: MatchPick = {
            selectedOption: null,
            firstHalfWinner,
            firstHalfFirstGoal,
            fullTimeWinner,
            fullTimeFirstGoal,
          };

          const selectedOption =
            p.selectedOption === "firstHalfWinner" ||
            p.selectedOption === "firstHalfFirstGoal" ||
            p.selectedOption === "fullTimeWinner" ||
            p.selectedOption === "fullTimeFirstGoal"
              ? p.selectedOption
              : inferSelectedOption(nextPick);

          nextPick.selectedOption = selectedOption;

          if (hasAnyPick(nextPick)) loaded[m.id] = nextPick;
        }
        setPicks(loaded);
      } catch {
        // silent
      }
    }
    void load();
  }, [user, matches]);

  function close() {
    setOpen(false);
  }

  async function handleSubmit() {
    const currentUser = user ?? auth.currentUser;
    if (!currentUser) {
      setAuthOpen(true);
      return;
    }
    const chosenCount = Object.values(picks).filter((pick) =>
      hasAnyPick(pick),
    ).length;
    if (chosenCount === 0) return;
    setSaving(true);
    try {
      await savePicks(currentUser, picks, matches);
      setStep("success");
    } catch (err) {
      console.error("Failed to save picks", err);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4"
        style={{
          background: "rgba(10,10,20,0.6)",
          backdropFilter: "blur(6px)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div
          className="relative w-full sm:max-w-md flex flex-col sm:rounded-3xl rounded-t-3xl overflow-hidden"
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 32px 80px rgba(0,0,0,0.25)",
            minHeight: "520px",
            maxHeight: "92dvh",
          }}
        >
          {step === "success" ? (
            <SuccessScreen onClose={close} />
          ) : (
            <PickScreen
              matches={matches}
              picks={picks}
              setPicks={setPicks}
              onSubmit={handleSubmit}
              onClose={close}
              saving={saving}
            />
          )}
        </div>
      </div>

      {authOpen && (
        <AuthDialog
          onClose={() => setAuthOpen(false)}
          onSuccess={() => {
            setAuthOpen(false);
            void handleSubmit();
          }}
        />
      )}
    </>
  );
}

// ─── Pick Screen ─────────────────────────────────────────────────────────────
function PickScreen({
  matches,
  picks,
  setPicks,
  onSubmit,
  onClose,
  saving,
}: {
  matches: Match[];
  picks: Picks;
  setPicks: React.Dispatch<React.SetStateAction<Picks>>;
  onSubmit: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const visibleMatches =
    expandedMatchId === null
      ? matches
      : matches.filter((match) => match.id === expandedMatchId);

  const pickedCount = matches.reduce(
    (sum, match) => (hasAnyPick(picks[match.id]) ? sum + 1 : sum),
    0,
  );

  function setSingleOptionPick(
    matchId: number,
    option: PickOption,
    patch: Partial<MatchPick>,
  ) {
    setPicks((prev) => {
      return {
        ...prev,
        [matchId]: {
          ...EMPTY_PICK,
          selectedOption: option,
          ...patch,
        },
      };
    });
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Header banner — fixed at top */}
      <div
        className="relative flex-shrink-0 px-5 pt-5 pb-4 text-white"
        style={{
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
        }}
      >
        {/* close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-3">
          <Image
            src="/logo.png"
            alt="Access Bank"
            width={90}
            height={30}
            className="object-contain"
          />
          <div className="h-4 w-px bg-white/20" />
          <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">
            Prediction League
          </span>
        </div>

        {/* Subtext */}
        <p className="text-sm text-white/70 mt-2 mb-4 max-w-sm">
          Save your predictions now. We will compare them after each match ends.
        </p>
        {/* Progress */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width:
                  matches.length > 0
                    ? `${(pickedCount / matches.length) * 100}%`
                    : "0%",
                background: "linear-gradient(90deg, #ee7e01, #ffb347)",
              }}
            />
          </div>
          <span className="text-xs text-white/60 font-semibold whitespace-nowrap">
            {pickedCount}/{matches.length} picked
          </span>
        </div>
      </div>

      {/* Match list — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {expandedMatchId !== null && (
          <button
            type="button"
            onClick={() => setExpandedMatchId(null)}
            className="self-start rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            ← Back to matches
          </button>
        )}

        {visibleMatches.map((match) => {
          const pick = picks[match.id] ?? EMPTY_PICK;
          const expanded = expandedMatchId === match.id;
          return (
            <div
              key={match.id}
              className="rounded-2xl overflow-hidden"
              style={{ border: "1.5px solid #f0f0f0", background: "#fafafa" }}
            >
              <button
                type="button"
                onClick={() => setExpandedMatchId(match.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
                style={{
                  borderBottom: expanded ? "1px solid #f0f0f0" : "none",
                  background: "#ffffff",
                }}
              >
                <div>
                  <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                    <span className="text-lg leading-none">
                      {match.teamA.flag}
                    </span>
                    <span>{match.teamA.name}</span>
                    <span className="text-gray-400">vs</span>
                    <span className="text-lg leading-none">
                      {match.teamB.flag}
                    </span>
                    <span>{match.teamB.name}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Round {match.round} •{" "}
                    {match.date.replace(".", " June ·").replace(".", "")}{" "}
                    {match.time} UTC
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-500">
                  {expanded ? "Hide" : "Pick"}
                </span>
              </button>

              {expanded && (
                <div className="px-4 py-3 flex flex-col gap-4">
                  <p className="text-[11px] text-gray-500">
                    You can pick only one option per match. Selecting a new one
                    replaces the previous choice.
                  </p>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">
                      First Half
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ["A", `${match.teamA.flag} ${match.teamA.name}`],
                          ["draw", "Draw"],
                          ["B", `${match.teamB.flag} ${match.teamB.name}`],
                        ] as const
                      ).map(([value, text]) => (
                        <button
                          key={`fh-w-${value}`}
                          type="button"
                          onClick={() =>
                            setSingleOptionPick(match.id, "firstHalfWinner", {
                              firstHalfWinner: value,
                            })
                          }
                          className="rounded-lg px-2 py-2 text-[11px] font-semibold border"
                          style={{
                            borderColor:
                              pick.firstHalfWinner === value
                                ? "#ee7e01"
                                : "#d1d5db",
                            background:
                              pick.firstHalfWinner === value
                                ? "rgba(238,126,1,0.12)"
                                : "#fff",
                            color: "#374151",
                          }}
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-3 mb-1">
                      First goal
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ["A", `${match.teamA.flag} ${match.teamA.name}`],
                          ["none", "No goal"],
                          ["B", `${match.teamB.flag} ${match.teamB.name}`],
                        ] as const
                      ).map(([value, text]) => (
                        <button
                          key={`fh-g-${value}`}
                          type="button"
                          onClick={() =>
                            setSingleOptionPick(
                              match.id,
                              "firstHalfFirstGoal",
                              {
                                firstHalfFirstGoal: value,
                              },
                            )
                          }
                          className="rounded-lg px-2 py-2 text-[11px] font-semibold border"
                          style={{
                            borderColor:
                              pick.firstHalfFirstGoal === value
                                ? "#ee7e01"
                                : "#d1d5db",
                            background:
                              pick.firstHalfFirstGoal === value
                                ? "rgba(238,126,1,0.12)"
                                : "#fff",
                            color: "#374151",
                          }}
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">
                      Full Time
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ["A", `${match.teamA.flag} ${match.teamA.name}`],
                          ["draw", "Draw"],
                          ["B", `${match.teamB.flag} ${match.teamB.name}`],
                        ] as const
                      ).map(([value, text]) => (
                        <button
                          key={`ft-w-${value}`}
                          type="button"
                          onClick={() =>
                            setSingleOptionPick(match.id, "fullTimeWinner", {
                              fullTimeWinner: value,
                            })
                          }
                          className="rounded-lg px-2 py-2 text-[11px] font-semibold border"
                          style={{
                            borderColor:
                              pick.fullTimeWinner === value
                                ? "#ee7e01"
                                : "#d1d5db",
                            background:
                              pick.fullTimeWinner === value
                                ? "rgba(238,126,1,0.12)"
                                : "#fff",
                            color: "#374151",
                          }}
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-3 mb-1">
                      First goal
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ["A", `${match.teamA.flag} ${match.teamA.name}`],
                          ["none", "No goal"],
                          ["B", `${match.teamB.flag} ${match.teamB.name}`],
                        ] as const
                      ).map(([value, text]) => (
                        <button
                          key={`ft-g-${value}`}
                          type="button"
                          onClick={() =>
                            setSingleOptionPick(match.id, "fullTimeFirstGoal", {
                              fullTimeFirstGoal: value,
                            })
                          }
                          className="rounded-lg px-2 py-2 text-[11px] font-semibold border"
                          style={{
                            borderColor:
                              pick.fullTimeFirstGoal === value
                                ? "#ee7e01"
                                : "#d1d5db",
                            background:
                              pick.fullTimeFirstGoal === value
                                ? "rgba(238,126,1,0.12)"
                                : "#fff",
                            color: "#374151",
                          }}
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer CTA — fixed at bottom */}
      <div
        className="flex-shrink-0 px-4 pt-3 pb-5 flex flex-col gap-2"
        style={{ borderTop: "1px solid #f3f4f6", background: "#fff" }}
      >
        <button
          type="button"
          disabled={pickedCount === 0 || saving}
          onClick={onSubmit}
          className="btn-orange w-full py-3.5 font-bold text-sm disabled:opacity-50"
          style={{
            boxShadow:
              pickedCount > 0 ? "0 0 20px rgba(238,126,1,0.35)" : "none",
          }}
        >
          {saving
            ? "Saving…"
            : `Save ${pickedCount > 0 ? pickedCount : ""} Prediction${pickedCount !== 1 ? "s" : ""} →`}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      {/* Dark header */}
      <div
        className="relative px-6 pt-8 pb-6 text-white text-center"
        style={{
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <p
          className="text-xs font-bold tracking-widest uppercase mb-1"
          style={{ color: "#ffb347" }}
        >
          Prediction Saved
        </p>
        <h2 className="text-2xl font-black leading-tight text-white">
          Your selection is saved.
          <br />
          <span style={{ color: "#ee7e01" }}>
            Results will be compared after the match.
          </span>
        </h2>
      </div>

      {/* Confirmation card */}
      <div className="px-5 -mt-5 relative z-10">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "#fff",
            border: "1.5px solid #e5e7eb",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}
        >
          {/* Top strip */}
          <div
            className="h-2 w-full"
            style={{
              background: "linear-gradient(90deg, #ee7e01, #ffb347, #ee7e01)",
            }}
          />

          {/* Card body */}
          <div className="px-5 py-5">
            <div className="flex items-center justify-between mb-4">
              <Image
                src="/logo.png"
                alt="Access Bank"
                width={100}
                height={34}
                className="object-contain"
              />
              <span
                className="text-xs font-black px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(34,197,94,0.1)",
                  color: "#16a34a",
                  border: "1px solid rgba(34,197,94,0.3)",
                }}
              >
                STORED
              </span>
            </div>

            {/* Status */}
            <div
              className="text-center py-4"
              style={{
                borderTop: "1px dashed #e5e7eb",
                borderBottom: "1px dashed #e5e7eb",
              }}
            >
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                Status
              </p>
              <p className="text-2xl font-black" style={{ color: "#ee7e01" }}>
                Awaiting Match Result
              </p>
            </div>

            {/* What happens next */}
            <div
              className="mt-4 rounded-xl px-4 py-3"
              style={{ background: "#f9fafb", border: "1px solid #f0f0f0" }}
            >
              <p className="text-xs font-bold text-gray-700 mb-2">
                What happens next:
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { text: "Your prediction is locked in for this match." },
                  {
                    text: "After full time, your pick is compared with the final result.",
                  },
                  { text: "Correct picks help you climb the leaderboard." },
                ].map(({ text }) => (
                  <div key={text} className="flex items-center gap-2.5">
                    <span className="text-xs text-gray-600 font-medium">
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Validity note */}
            <p className="text-center text-[10px] text-gray-400 mt-3">
              Access Bank World Cup 2026 Prediction League
            </p>
          </div>
        </div>
      </div>

      {/* Close button at bottom */}
      <div className="flex-shrink-0 px-5 pt-3 pb-6">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
