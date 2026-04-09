"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { MATCHES as ALL_MATCHES, type Match } from "@/lib/matches";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import AuthDialog from "@/app/components/AuthDialog";

type Prediction = {
  winner: "A" | "B" | "draw" | null;
  scoreA: string;
  scoreB: string;
};
type Saved = Record<number, Prediction>;

function toSavedPicks(rawPicks: unknown): Saved {
  if (!rawPicks || typeof rawPicks !== "object") return {};

  const out: Saved = {};
  for (const [matchId, pick] of Object.entries(
    rawPicks as Record<string, unknown>,
  )) {
    if (!pick || typeof pick !== "object") continue;

    const row = pick as Record<string, unknown>;
    const winner =
      row.winner === "A" || row.winner === "B" || row.winner === "draw"
        ? row.winner
        : null;

    const scoreA = typeof row.scoreA === "string" ? row.scoreA : "";
    const scoreB = typeof row.scoreB === "string" ? row.scoreB : "";
    const idNum = Number(matchId);
    if (!Number.isFinite(idNum)) continue;

    out[idNum] = { winner, scoreA, scoreB };
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
      points: 0,
      picks: {
        [String(match.id)]: {
          matchId: match.id,
          round: match.round,
          teamA: match.teamA.name,
          teamB: match.teamB.name,
          winner: pred.winner,
          scoreA: pred.scoreA,
          scoreB: pred.scoreB,
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
    if (pred.winner || (pred.scoreA !== "" && pred.scoreB !== "")) onSave(pred);
  }

  function updateScore(key: "scoreA" | "scoreB", next: string) {
    const digitsOnly = next.replace(/\D/g, "");
    if (digitsOnly === "") {
      setPred((p) => ({ ...p, [key]: "" }));
      return;
    }

    const capped = Math.min(20, Number(digitsOnly));
    setPred((p) => ({ ...p, [key]: String(capped) }));
  }

  function nudgeScore(key: "scoreA" | "scoreB", delta: number) {
    const current = pred[key] === "" ? 0 : Number(pred[key]);
    const next = Math.max(0, Math.min(20, current + delta));
    setPred((p) => ({ ...p, [key]: String(next) }));
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
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "#ee7e01" }}
              />
              <span className="text-sm font-bold text-gray-800">
                Winner Prediction
              </span>
              <span
                className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#fff2e2", color: "#ee7e01" }}
              >
                +3 pts
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
                    setPred((p) => ({
                      ...p,
                      winner: p.winner === val ? null : val,
                    }))
                  }
                  className="py-2.5 px-2 text-xs font-semibold transition-all"
                  style={{
                    background: pred.winner === val ? "#ee7e01" : "#f9fafb",
                    border: `1px solid ${pred.winner === val ? "#ee7e01" : "#e5e7eb"}`,
                    color: pred.winner === val ? "white" : "#374151",
                    boxShadow:
                      pred.winner === val
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
                Exact Score
              </span>
              <span
                className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#fff2e2", color: "#ee7e01" }}
              >
                +10 pts
              </span>
            </div>
            <div className="flex items-center gap-3">
              {(["scoreA", "scoreB"] as const).map((key, i) => (
                <div key={key} className="contents">
                  {i === 1 && (
                    <span
                      key="sep"
                      className="text-gray-400 font-bold text-2xl flex-shrink-0"
                    >
                      —
                    </span>
                  )}
                  <div className="flex items-center gap-2 w-full">
                    {i === 1 && (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          aria-label={`Increase ${key === "scoreA" ? match.teamA.name : match.teamB.name} score`}
                          onClick={() => nudgeScore(key, 1)}
                          className="h-[22px] w-10 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 text-sm font-black leading-none transition-all hover:bg-gray-100 active:scale-95"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          aria-label={`Decrease ${key === "scoreA" ? match.teamA.name : match.teamB.name} score`}
                          onClick={() => nudgeScore(key, -1)}
                          className="h-[22px] w-10 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 text-sm font-black leading-none transition-all hover:bg-gray-100 active:scale-95"
                        >
                          −
                        </button>
                      </div>
                    )}
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={pred[key]}
                      onChange={(e) => updateScore(key, e.target.value)}
                      className="w-full h-12 rounded-xl text-center font-black text-2xl outline-none transition-all text-gray-900 border border-gray-300 focus:border-[#ee7e01] focus:ring-2 focus:ring-[#ee7e01]/25"
                      style={{ background: "#ffffff" }}
                    />
                    {i !== 1 && (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          aria-label={`Increase ${key === "scoreA" ? match.teamA.name : match.teamB.name} score`}
                          onClick={() => nudgeScore(key, 1)}
                          className="h-[22px] w-10 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 text-sm font-black leading-none transition-all hover:bg-gray-100 active:scale-95"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          aria-label={`Decrease ${key === "scoreA" ? match.teamA.name : match.teamB.name} score`}
                          onClick={() => nudgeScore(key, -1)}
                          className="h-[22px] w-10 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 text-sm font-black leading-none transition-all hover:bg-gray-100 active:scale-95"
                        >
                          −
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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
      if (p.winner || (p.scoreA !== "" && p.scoreB !== "")) {
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
    if (saved.scoreA !== "" && saved.scoreB !== "") return `${saved.scoreA} – ${saved.scoreB}`;
    if (saved.winner === "A") return match.teamA.name;
    if (saved.winner === "B") return match.teamB.name;
    if (saved.winner === "draw") return "Draw";
    return null;
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
            <span className="text-xs sm:text-sm font-bold" style={{ color: "#ee7e01" }}>
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
          initial={saved ?? { winner: null, scoreA: "", scoreB: "" }}
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
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-3"
              style={{
                color: "#ee7e01",
              }}
            >
              Live Predictions
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900">
              Match Dashboard
            </h2>
          </div>
          <div className="flex gap-5 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ee7e01] inline-block" />
              Winner = +3 pts
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ee7e01] inline-block" />
              Exact Score = +10 pts
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
