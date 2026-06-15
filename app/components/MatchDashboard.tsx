"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { MATCHES as ALL_MATCHES, type Match } from "@/lib/matches";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import AuthDialog from "@/app/components/AuthDialog";

type Prediction = {
  selectedOption:
    | "firstHalfWinner"
    | "firstHalfFirstGoal"
    | "fullTimeWinner"
    | "fullTimeFirstGoal"
    | null;
  firstHalfWinner: "A" | "B" | "draw" | null;
  firstHalfFirstGoal: "A" | "B" | "none" | null;
  fullTimeWinner: "A" | "B" | "draw" | null;
  fullTimeFirstGoal: "A" | "B" | "none" | null;
};
type Saved = Record<number, Prediction>;

function hasPrediction(p: Prediction | null | undefined): boolean {
  if (!p) return false;
  switch (p.selectedOption) {
    case "firstHalfWinner":
      return p.firstHalfWinner !== null;
    case "firstHalfFirstGoal":
      return p.firstHalfFirstGoal !== null;
    case "fullTimeWinner":
      return p.fullTimeWinner !== null;
    case "fullTimeFirstGoal":
      return p.fullTimeFirstGoal !== null;
    default:
      return false;
  }
}

function inferSelectedOption(p: Prediction): Prediction["selectedOption"] {
  if (p.firstHalfWinner !== null) return "firstHalfWinner";
  if (p.firstHalfFirstGoal !== null) return "firstHalfFirstGoal";
  if (p.fullTimeWinner !== null) return "fullTimeWinner";
  if (p.fullTimeFirstGoal !== null) return "fullTimeFirstGoal";
  return null;
}

const EMPTY_PREDICTION: Prediction = {
  selectedOption: null,
  firstHalfWinner: null,
  firstHalfFirstGoal: null,
  fullTimeWinner: null,
  fullTimeFirstGoal: null,
};

function toSavedPicks(rawPicks: unknown): Saved {
  if (!rawPicks || typeof rawPicks !== "object") return {};

  const out: Saved = {};
  for (const [matchId, pick] of Object.entries(
    rawPicks as Record<string, unknown>,
  )) {
    if (!pick || typeof pick !== "object") continue;

    const row = pick as Record<string, unknown>;
    const firstHalfWinner =
      row.firstHalfWinner === "A" ||
      row.firstHalfWinner === "B" ||
      row.firstHalfWinner === "draw"
        ? row.firstHalfWinner
        : null;
    const firstHalfFirstGoal =
      row.firstHalfFirstGoal === "A" ||
      row.firstHalfFirstGoal === "B" ||
      row.firstHalfFirstGoal === "none"
        ? row.firstHalfFirstGoal
        : null;
    const fullTimeWinner =
      row.fullTimeWinner === "A" ||
      row.fullTimeWinner === "B" ||
      row.fullTimeWinner === "draw"
        ? row.fullTimeWinner
        : row.winner === "A" || row.winner === "B" || row.winner === "draw"
          ? row.winner
          : null;
    const fullTimeFirstGoal =
      row.fullTimeFirstGoal === "A" ||
      row.fullTimeFirstGoal === "B" ||
      row.fullTimeFirstGoal === "none"
        ? row.fullTimeFirstGoal
        : null;

    const selectedOption =
      row.selectedOption === "firstHalfWinner" ||
      row.selectedOption === "firstHalfFirstGoal" ||
      row.selectedOption === "fullTimeWinner" ||
      row.selectedOption === "fullTimeFirstGoal"
        ? row.selectedOption
        : null;

    const idNum = Number(matchId);
    if (!Number.isFinite(idNum)) continue;

    const next: Prediction = {
      selectedOption,
      firstHalfWinner,
      firstHalfFirstGoal,
      fullTimeWinner,
      fullTimeFirstGoal,
    };
    next.selectedOption = next.selectedOption ?? inferSelectedOption(next);

    if (hasPrediction(next)) {
      out[idNum] = next;
    }
  }

  return out;
}

async function persistPrediction(match: Match, pred: Prediction) {
  const user = auth.currentUser;
  if (!user) return;

  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      email: user.email ?? null,
      picks: {
        [String(match.id)]: {
          matchId: match.id,
          round: match.round,
          teamA: match.teamA.name,
          teamB: match.teamB.name,
          winner: pred.fullTimeWinner,
          scoreA: "",
          scoreB: "",
          firstHalfWinner: pred.firstHalfWinner,
          firstHalfFirstGoal: pred.firstHalfFirstGoal,
          firstHalfScoreA: "",
          firstHalfScoreB: "",
          fullTimeWinner: pred.fullTimeWinner,
          fullTimeFirstGoal: pred.fullTimeFirstGoal,
          fullTimeScoreA: "",
          fullTimeScoreB: "",
          selectedOption: pred.selectedOption,
          savedAt: serverTimestamp(),
        },
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// Show first 6 upcoming matches on the home page
const MATCHES = ALL_MATCHES.slice(0, 6);

function useCountdown(deadlineMs: number) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    setLeft(Math.max(0, deadlineMs - Date.now()));
    const id = setInterval(
      () => setLeft(Math.max(0, deadlineMs - Date.now())),
      1000,
    );
    return () => clearInterval(id);
  }, [deadlineMs]);
  return left;
}

function Countdown({ deadlineMs }: { deadlineMs: number }) {
  const left = useCountdown(deadlineMs);
  if (left === null)
    return <span className="text-xs font-mono text-gray-400">— —</span>;
  if (left === 0)
    return (
      <span className="text-xs font-mono font-bold text-red-400">Closed</span>
    );

  const DAY = 86400000;

  if (left > DAY) {
    const d = Math.floor(left / DAY);
    const h = Math.floor((left % DAY) / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    return (
      <span className="text-xs font-mono font-semibold text-gray-800">
        {d}d {String(h).padStart(2, "0")}h {String(m).padStart(2, "0")}m
      </span>
    );
  }
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <span className="text-xs font-mono font-semibold text-[#ee7e01]">
      {String(h).padStart(2, "0")}h {String(m).padStart(2, "0")}m{" "}
      {String(s).padStart(2, "0")}s
    </span>
  );
}

function Badge({
  flag,
  size = 44,
  mobileSize,
}: {
  flag: string;
  bg?: string;
  size?: number;
  mobileSize?: number;
}) {
  const mobile = mobileSize ?? size;
  return (
    <span
      className="flex-shrink-0 leading-none"
      style={{ fontSize: `clamp(${mobile * 0.6}px, 4.6vw, ${size * 0.6}px)` }}
    >
      {flag}
    </span>
  );
}

function TeamBadge({ flag }: { flag: string; bg?: string }) {
  return (
    <span className="flex-shrink-0 text-2xl sm:text-[26px] leading-none">
      {flag}
    </span>
  );
}

/* ─── Predict Dialog ─── */
function PredictDialog({
  match,
  initial,
  onClose,
  onSave,
}: {
  match: Match;
  initial: Prediction;
  onClose: () => void;
  onSave: (p: Prediction) => void;
}) {
  const [pred, setPred] = useState<Prediction>(initial);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function submit() {
    if (hasPrediction(pred)) onSave(pred);
  }

  function setSingleOptionPrediction(
    option: Prediction["selectedOption"],
    patch: Partial<Prediction>,
  ) {
    setPred({
      ...EMPTY_PREDICTION,
      selectedOption: option,
      ...patch,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(17,24,39,0.35)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 20px 50px rgba(17,24,39,0.2)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #f3f4f6" }}
        >
          <div className="flex flex-col">
            <span
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: "#ee7e01" }}
            >
              Round {match.round}
            </span>
            <span className="text-xs text-gray-600">
              {match.date} · {match.time} UTC
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
            style={{ background: "#f3f4f6", fontSize: "1rem" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex flex-col items-center gap-2">
            <Badge flag={match.teamA.flag} bg={match.teamA.badgeBg} size={56} />
            <span className="text-gray-900 font-black text-base text-center">
              {match.teamA.name}
            </span>
          </div>
          <span className="text-3xl font-black opacity-80 text-gray-300">
            v
          </span>
          <div className="flex flex-col items-center gap-2">
            <Badge flag={match.teamB.flag} bg={match.teamB.badgeBg} size={56} />
            <span className="text-gray-900 font-black text-base text-center">
              {match.teamB.name}
            </span>
          </div>
        </div>

        <div className="px-6 pb-7 flex flex-col gap-5">
          <p className="text-xs text-gray-500">
            You can choose only one option for this match. Choosing another one
            replaces the previous selection.
          </p>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "#ee7e01" }}
              />
              <span className="text-sm font-bold text-gray-800">
                First Half Winner
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: "A", label: match.teamA.name } as const,
                { val: "draw", label: "Draw" } as const,
                { val: "B", label: match.teamB.name } as const,
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() =>
                    setSingleOptionPrediction("firstHalfWinner", {
                      firstHalfWinner: val,
                    })
                  }
                  className="py-2.5 px-2 text-xs font-semibold transition-all"
                  style={{
                    background:
                      pred.selectedOption === "firstHalfWinner" &&
                      pred.firstHalfWinner === val
                        ? "#ee7e01"
                        : "#f9fafb",
                    border: `1px solid ${pred.selectedOption === "firstHalfWinner" && pred.firstHalfWinner === val ? "#ee7e01" : "#e5e7eb"}`,
                    color:
                      pred.selectedOption === "firstHalfWinner" &&
                      pred.firstHalfWinner === val
                        ? "white"
                        : "#374151",
                    boxShadow:
                      pred.selectedOption === "firstHalfWinner" &&
                      pred.firstHalfWinner === val
                        ? "0 0 14px rgba(238,126,1,0.25)"
                        : "none",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "#ee7e01" }}
              />
              <span className="text-sm font-bold text-gray-800">
                First Half First Goal
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: "A", label: match.teamA.name } as const,
                { val: "none", label: "No goal" } as const,
                { val: "B", label: match.teamB.name } as const,
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() =>
                    setSingleOptionPrediction("firstHalfFirstGoal", {
                      firstHalfFirstGoal: val,
                    })
                  }
                  className="py-2.5 px-2 text-xs font-semibold transition-all"
                  style={{
                    background:
                      pred.selectedOption === "firstHalfFirstGoal" &&
                      pred.firstHalfFirstGoal === val
                        ? "#ee7e01"
                        : "#f9fafb",
                    border: `1px solid ${pred.selectedOption === "firstHalfFirstGoal" && pred.firstHalfFirstGoal === val ? "#ee7e01" : "#e5e7eb"}`,
                    color:
                      pred.selectedOption === "firstHalfFirstGoal" &&
                      pred.firstHalfFirstGoal === val
                        ? "white"
                        : "#374151",
                    boxShadow:
                      pred.selectedOption === "firstHalfFirstGoal" &&
                      pred.firstHalfFirstGoal === val
                        ? "0 0 14px rgba(238,126,1,0.25)"
                        : "none",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "#ee7e01" }}
              />
              <span className="text-sm font-bold text-gray-800">
                Full Time Winner
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: "A", label: match.teamA.name } as const,
                { val: "draw", label: "Draw" } as const,
                { val: "B", label: match.teamB.name } as const,
              ].map(({ val, label }) => (
                <button
                  key={`ft-${val}`}
                  onClick={() =>
                    setSingleOptionPrediction("fullTimeWinner", {
                      fullTimeWinner: val,
                    })
                  }
                  className="py-2.5 px-2 text-xs font-semibold transition-all"
                  style={{
                    background:
                      pred.selectedOption === "fullTimeWinner" &&
                      pred.fullTimeWinner === val
                        ? "#ee7e01"
                        : "#f9fafb",
                    border: `1px solid ${pred.selectedOption === "fullTimeWinner" && pred.fullTimeWinner === val ? "#ee7e01" : "#e5e7eb"}`,
                    color:
                      pred.selectedOption === "fullTimeWinner" &&
                      pred.fullTimeWinner === val
                        ? "white"
                        : "#374151",
                    boxShadow:
                      pred.selectedOption === "fullTimeWinner" &&
                      pred.fullTimeWinner === val
                        ? "0 0 14px rgba(238,126,1,0.25)"
                        : "none",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "#ee7e01" }}
              />
              <span className="text-sm font-bold text-gray-800">
                Full Time First Goal
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: "A", label: match.teamA.name } as const,
                { val: "none", label: "No goal" } as const,
                { val: "B", label: match.teamB.name } as const,
              ].map(({ val, label }) => (
                <button
                  key={`ftg-${val}`}
                  onClick={() =>
                    setSingleOptionPrediction("fullTimeFirstGoal", {
                      fullTimeFirstGoal: val,
                    })
                  }
                  className="py-2.5 px-2 text-xs font-semibold transition-all"
                  style={{
                    background:
                      pred.selectedOption === "fullTimeFirstGoal" &&
                      pred.fullTimeFirstGoal === val
                        ? "#ee7e01"
                        : "#f9fafb",
                    border: `1px solid ${pred.selectedOption === "fullTimeFirstGoal" && pred.fullTimeFirstGoal === val ? "#ee7e01" : "#e5e7eb"}`,
                    color:
                      pred.selectedOption === "fullTimeFirstGoal" &&
                      pred.fullTimeFirstGoal === val
                        ? "white"
                        : "#374151",
                    boxShadow:
                      pred.selectedOption === "fullTimeFirstGoal" &&
                      pred.fullTimeFirstGoal === val
                        ? "0 0 14px rgba(238,126,1,0.25)"
                        : "none",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn-orange w-full py-3.5 font-bold text-base"
            onClick={submit}
          >
            Submit Prediction →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Match Row ─── */
function MatchRow({
  match,
  user,
  initialSaved,
}: {
  match: Match;
  user: User | null;
  initialSaved?: Prediction;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [saved, setSaved] = useState<Prediction | null>(initialSaved ?? null);

  useEffect(() => {
    setSaved(initialSaved ?? null);
  }, [initialSaved]);

  const handleSave = useCallback(
    (p: Prediction) => {
      if (hasPrediction(p)) {
        setSaved(p);
        void persistPrediction(match, p).catch((err: unknown) => {
          console.error("Failed to save prediction to Firestore", err);
        });
        setDialogOpen(false);
      }
    },
    [match],
  );

  function openPredict() {
    if (!user) {
      setAuthOpen(true);
    } else {
      setDialogOpen(true);
    }
  }

  function pickLabel(): string | null {
    if (!saved) return null;
    switch (saved.selectedOption) {
      case "firstHalfWinner":
        if (saved.firstHalfWinner === "A")
          return `FH Winner: ${match.teamA.name}`;
        if (saved.firstHalfWinner === "B")
          return `FH Winner: ${match.teamB.name}`;
        if (saved.firstHalfWinner === "draw") return "FH Winner: Draw";
        return null;
      case "firstHalfFirstGoal":
        if (saved.firstHalfFirstGoal === "A")
          return `FH First Goal: ${match.teamA.name}`;
        if (saved.firstHalfFirstGoal === "B")
          return `FH First Goal: ${match.teamB.name}`;
        if (saved.firstHalfFirstGoal === "none")
          return "FH First Goal: No goal";
        return null;
      case "fullTimeWinner":
        if (saved.fullTimeWinner === "A")
          return `FT Winner: ${match.teamA.name}`;
        if (saved.fullTimeWinner === "B")
          return `FT Winner: ${match.teamB.name}`;
        if (saved.fullTimeWinner === "draw") return "FT Winner: Draw";
        return null;
      case "fullTimeFirstGoal":
        if (saved.fullTimeFirstGoal === "A")
          return `FT First Goal: ${match.teamA.name}`;
        if (saved.fullTimeFirstGoal === "B")
          return `FT First Goal: ${match.teamB.name}`;
        if (saved.fullTimeFirstGoal === "none") return "FT First Goal: No goal";
        return null;
      default:
        return null;
    }
  }

  const pick = pickLabel();

  return (
    <>
      {/* Row */}
      <div
        className="flex items-center gap-3 sm:gap-5 px-4 sm:px-7 py-4 transition-colors cursor-pointer"
        style={{ background: "#fff", borderBottom: "1px solid #f0f0f0" }}
        onClick={openPredict}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#fff9f3")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
      >
        {/* Time left */}
        <div className="flex items-start gap-1 w-20 sm:w-32 flex-shrink-0">
          <svg
            className="w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 flex-shrink-0"
            style={{ color: "#ee7e01" }}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[9px] sm:text-xs text-gray-400 leading-none">
              Time left
            </span>
            <Countdown deadlineMs={match.deadlineMs} />
          </div>
        </div>

        {/* Team A */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-3 flex-1 min-w-0">
          <span className="font-bold text-gray-900 text-right text-xs sm:text-sm truncate">
            {match.teamA.name}
          </span>
          <TeamBadge flag={match.teamA.flag} bg={match.teamA.badgeBg} />
        </div>

        {/* VS */}
        <div className="flex-shrink-0 w-4 text-center">
          <span className="text-[10px] sm:text-xs font-semibold text-gray-400">
            v
          </span>
        </div>

        {/* Team B */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
          <TeamBadge flag={match.teamB.flag} bg={match.teamB.badgeBg} />
          <span className="font-bold text-gray-900 text-xs sm:text-sm truncate">
            {match.teamB.name}
          </span>
        </div>

        {/* Action */}
        <div className="flex-shrink-0 pl-1.5 sm:pl-3 min-w-[52px] sm:min-w-[70px] text-right">
          {pick ? (
            <div className="flex flex-col items-end gap-0.5">
              <span
                className="text-[10px] sm:text-xs font-black truncate max-w-[64px] sm:max-w-[80px]"
                style={{ color: "#ee7e01" }}
              >
                {pick}
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium">
                tap to edit
              </span>
            </div>
          ) : (
            <span
              className="text-xs sm:text-sm font-bold"
              style={{ color: "#ee7e01" }}
            >
              Predict
            </span>
          )}
        </div>
      </div>

      {/* Auth gate */}
      {authOpen && (
        <AuthDialog
          onClose={() => setAuthOpen(false)}
          onSuccess={() => {
            setAuthOpen(false);
            setDialogOpen(true);
          }}
        />
      )}

      {/* Predict dialog */}
      {dialogOpen && (
        <PredictDialog
          match={match}
          initial={saved ?? EMPTY_PREDICTION}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}

/* ─── Section ─── */
export default function MatchDashboard() {
  const [savedByMatch, setSavedByMatch] = useState<Saved>({});
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setSavedByMatch({});
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (!snap.exists()) {
          setSavedByMatch({});
          return;
        }

        const data = snap.data() as { picks?: unknown };
        setSavedByMatch(toSavedPicks(data.picks));
      } catch (err: unknown) {
        console.error("Failed to load saved predictions", err);
      }
    });

    return () => unsub();
  }, []);

  return (
    <section id="matches" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900">
              Todays Matches
            </h2>
          </div>
          <div className="flex gap-5 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ee7e01] inline-block" />
              First-half / Full-time Winner
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ee7e01] inline-block" />
              First-half / Full-time First Goal
            </span>
          </div>
        </div>

        {/* Match list */}
        <div
          className="overflow-hidden"
          style={{
            borderRadius: 20,
            border: "1.5px solid #e5e7eb",
            boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
          }}
        >
          {MATCHES.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              user={user}
              initialSaved={savedByMatch[match.id]}
            />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/matches"
            className="btn-orange px-7 py-3 text-sm sm:text-base font-bold inline-flex items-center gap-2"
          >
            View All Matches
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
