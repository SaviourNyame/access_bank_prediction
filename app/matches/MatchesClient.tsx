"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { MATCHES, type Match, type Round } from "@/lib/matches";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────
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

function ProfileDropdown({
  user,
  points,
  onSignOut,
  totalSaved,
}: {
  user: User | null;
  points: number;
  onSignOut: () => void;
  totalSaved: number;
}) {
  return (
    <div
      className="absolute right-0 top-[calc(100%+10px)] w-[min(90vw,320px)] rounded-2xl p-4 z-[70]"
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 16px 38px rgba(17,24,39,0.16)",
      }}
    >
      <div className="mb-3">
        <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">
          Profile
        </p>
      </div>

      {user ? (
        <>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-gray-500">Name: </span>
              <span className="font-semibold text-gray-900">
                {user.displayName || "No display name"}
              </span>
            </div>
            <div className="text-sm break-all">
              <span className="text-gray-500">Email: </span>
              <span className="font-semibold text-gray-900">{user.email}</span>
            </div>
            <div className="text-xs break-all text-gray-500">
              User ID: {user.uid}
            </div>
          </div>

          <div
            className="mt-4 mb-3 px-3 py-2 rounded-xl flex items-center justify-between"
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
            }}
          >
            <span className="text-sm font-semibold text-gray-700">
              Total Predictions Saved
            </span>
            <span className="text-base font-black" style={{ color: "#ee7e01" }}>
              {totalSaved}
            </span>
          </div>

          <div
            className="mb-3 px-3 py-2 rounded-xl flex items-center justify-between"
            style={{
              background: "rgba(238,126,1,0.08)",
              border: "1px solid rgba(238,126,1,0.22)",
            }}
          >
            <span className="text-sm font-semibold text-gray-700">
              Total Points
            </span>
            <span className="text-base font-black" style={{ color: "#ee7e01" }}>
              {points}
            </span>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full rounded-xl py-2.5 text-sm font-bold transition-colors"
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
            }}
          >
            Sign Out
          </button>
        </>
      ) : (
        <p className="text-sm text-gray-600">You are not signed in yet.</p>
      )}
    </div>
  );
}

// ─── Countdown ────────────────────────────────────────────────────────────────
function useCountdown(ms: number) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    setLeft(Math.max(0, ms - Date.now()));
    const id = setInterval(() => setLeft(Math.max(0, ms - Date.now())), 1000);
    return () => clearInterval(id);
  }, [ms]);
  return left;
}

function Countdown({
  ms,
  mobileDaysOnly = false,
}: {
  ms: number;
  mobileDaysOnly?: boolean;
}) {
  const left = useCountdown(ms);
  if (left === null)
    return (
      <span className="text-[10px] sm:text-xs font-mono text-gray-400">
        — —
      </span>
    );
  if (left === 0)
    return (
      <span className="text-[10px] sm:text-xs font-mono font-bold text-red-400">
        Closed
      </span>
    );

  const DAY = 86400000;

  if (mobileDaysOnly) {
    const daysLeft = Math.ceil(left / DAY);

    if (left > DAY) {
      const d = Math.floor(left / DAY);
      const h = Math.floor((left % DAY) / 3600000);
      const m = Math.floor((left % 3600000) / 60000);

      return (
        <>
          <span className="sm:hidden text-[10px] font-mono font-semibold text-gray-800">
            {daysLeft}d
          </span>
          <span className="hidden sm:inline text-xs font-mono font-semibold text-gray-800">
            {d}d {String(h).padStart(2, "0")}h {String(m).padStart(2, "0")}m
          </span>
        </>
      );
    }

    const h = Math.floor(left / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    const s = Math.floor((left % 60000) / 1000);

    return (
      <>
        <span className="sm:hidden text-[10px] font-mono font-semibold text-[#ee7e01]">
          {daysLeft}d
        </span>
        <span className="hidden sm:inline text-xs font-mono font-semibold text-[#ee7e01]">
          {String(h).padStart(2, "0")}h {String(m).padStart(2, "0")}m{" "}
          {String(s).padStart(2, "0")}s
        </span>
      </>
    );
  }

  if (left > DAY) {
    const d = Math.floor(left / DAY);
    const h = Math.floor((left % DAY) / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    return (
      <span className="text-[10px] sm:text-xs font-mono font-semibold text-gray-800">
        {d}d {String(h).padStart(2, "0")}h {String(m).padStart(2, "0")}m
      </span>
    );
  }
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <span className="text-[10px] sm:text-xs font-mono font-semibold text-[#ee7e01]">
      {String(h).padStart(2, "0")}h {String(m).padStart(2, "0")}m{" "}
      {String(s).padStart(2, "0")}s
    </span>
  );
}

// ─── Team Badge ───────────────────────────────────────────────────────────────
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

// ─── Predict Dialog ───────────────────────────────────────────────────────────
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
        {/* Header */}
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

        {/* Teams */}
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
          {/* Winner */}
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

          {/* Exact score */}
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

// ─── Match Row ────────────────────────────────────────────────────────────────
function MatchRow({
  match,
  saved,
  onPredict,
}: {
  match: Match;
  saved?: Prediction;
  onPredict: () => void;
}) {
  const isSaved = !!saved?.winner || !!(saved?.scoreA && saved?.scoreB);
  return (
    <div
      className="flex items-center gap-3 sm:gap-5 px-4 sm:px-7 py-4 transition-colors"
      style={{ background: "#fff", borderBottom: "1px solid #f0f0f0" }}
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
          <Countdown ms={match.deadlineMs} mobileDaysOnly />
        </div>
      </div>

      {/* Team A */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-3 flex-1 min-w-0">
        <span className="font-bold text-gray-900 text-right text-xs sm:text-sm truncate">
          {match.teamA.name}
        </span>
        <Badge
          flag={match.teamA.flag}
          bg={match.teamA.badgeBg}
          size={44}
          mobileSize={32}
        />
      </div>

      {/* VS */}
      <div className="flex-shrink-0 w-4 text-center">
        <span className="text-[10px] sm:text-xs font-semibold text-gray-400">
          v
        </span>
      </div>

      {/* Team B */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
        <Badge
          flag={match.teamB.flag}
          bg={match.teamB.badgeBg}
          size={44}
          mobileSize={32}
        />
        <span className="font-bold text-gray-900 text-xs sm:text-sm truncate">
          {match.teamB.name}
        </span>
      </div>

      {/* Action */}
      <div
        className="flex-shrink-0 pl-1.5 sm:pl-3 min-w-[52px] sm:min-w-[60px] text-right"
        style={{ pointerEvents: "auto", zIndex: 10 }}
      >
        {isSaved ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[11px] sm:text-xs font-semibold text-green-600">
              ✓ Saved
            </span>
            <button
              type="button"
              className="px-2 py-1 sm:px-2 sm:py-0.5 text-[11px] sm:text-xs font-bold underline underline-offset-2 transition-opacity hover:opacity-70 active:scale-95 cursor-pointer touch-none"
              style={{
                color: "#ee7e01",
                touchAction: "manipulation",
                pointerEvents: "auto",
              }}
              onClick={onPredict}
            >
              Edit
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="px-2 py-1 sm:px-2 sm:py-0.5 text-xs sm:text-sm font-bold underline underline-offset-2 transition-opacity hover:opacity-70 active:scale-95 cursor-pointer touch-none"
            style={{
              color: "#ee7e01",
              touchAction: "manipulation",
              pointerEvents: "auto",
            }}
            onClick={onPredict}
          >
            Predict
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Round Tab ────────────────────────────────────────────────────────────────
function RoundTab({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2.5 text-xs sm:text-sm font-bold transition-all"
      style={{
        background: active ? "#ee7e01" : "white",
        color: active ? "white" : "#6b7280",
        border: active ? "none" : "1.5px solid #e5e7eb",
        boxShadow: active ? "0 4px 14px rgba(238,126,1,0.35)" : "none",
      }}
    >
      {label}
      <span
        className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full font-bold"
        style={{
          background: active ? "rgba(255,255,255,0.25)" : "rgba(238,126,1,0.1)",
          color: active ? "white" : "#ee7e01",
        }}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MatchesClient() {
  const [activeRound, setActiveRound] = useState<Round | "all">("all");
  const [saved, setSaved] = useState<Saved>({});
  const [dialog, setDialog] = useState<Match | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [points, setPoints] = useState(0);
  const profileWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUser(null);
        setPoints(0);
        setSaved({});
        setProfileOpen(false);
        return;
      }

      setUser(user);

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          setPoints(0);
          setSaved({});
          return;
        }

        const data = snap.data() as { picks?: unknown; points?: unknown };
        setPoints(typeof data.points === "number" ? data.points : 0);
        setSaved(toSavedPicks(data.picks));
      } catch (err: unknown) {
        console.error("Failed to load saved predictions", err);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (!profileWrapRef.current) return;
      if (!profileWrapRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const filteredMatches =
    activeRound === "all"
      ? MATCHES
      : MATCHES.filter((m) => m.round === activeRound);
  const totalSaved = Object.keys(saved).length;

  const handleSave = useCallback(
    (pred: Prediction) => {
      if (!dialog) return;

      setSaved((s) => ({ ...s, [dialog.id]: pred }));
      void persistPrediction(dialog, pred).catch((err: unknown) => {
        console.error("Failed to save prediction to Firestore", err);
      });
      setDialog(null);
    },
    [dialog],
  );

  const tabs: Array<{ key: Round | "all"; label: string; count: number }> = [
    { key: "all", label: "All", count: MATCHES.length },
    ...([1, 2, 3] as Round[]).map((r) => ({
      key: r,
      label: `Round ${r}`,
      count: MATCHES.filter((m) => m.round === r).length,
    })),
  ];

  const profileInitial =
    user?.displayName?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  const profileNode = user ? (
    <span>{profileInitial}</span>
  ) : (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 glass-nav px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Access Bank"
              width={110}
              height={36}
              className="object-contain"
              priority
            />
            <div className="hidden sm:block h-5 w-px bg-gray-200" />
            <span className="hidden sm:block text-xs font-bold text-gray-400 tracking-wide">
              World Cup Predictions
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/leaderboard"
              title="Open leaderboard"
              aria-label="Open leaderboard"
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{
                background: "#fff7ed",
                border: "1px solid rgba(238,126,1,0.25)",
                color: "#ee7e01",
              }}
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M8 21h8" />
                <path d="M12 17v4" />
                <path d="M7 4h10v2a5 5 0 0 1-10 0V4Z" />
                <path d="M7 6H5a2 2 0 0 0 2 2" />
                <path d="M17 6h2a2 2 0 0 1-2 2" />
              </svg>
            </Link>
            <Link
              href="/"
              className="text-sm font-semibold text-gray-500 hover:text-[#ee7e01] transition-colors"
            >
              ← Home
            </Link>
            <div className="relative" ref={profileWrapRef}>
              <button
                type="button"
                title={user ? (user.email ?? "Profile") : "Profile"}
                onClick={() => setProfileOpen((open) => !open)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-colors active:scale-95 cursor-pointer"
                style={{
                  background: user ? "rgba(238,126,1,0.15)" : "#f3f4f6",
                  border: user
                    ? "1px solid rgba(238,126,1,0.35)"
                    : "1px solid #e5e7eb",
                  color: user ? "#ee7e01" : "#6b7280",
                  touchAction: "manipulation",
                }}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-label="Open profile menu"
              >
                {profileNode}
              </button>

              {profileOpen && (
                <ProfileDropdown
                  user={user}
                  points={points}
                  totalSaved={totalSaved}
                  onSignOut={() => {
                    void signOut(auth);
                    setProfileOpen(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header */}
        <div className="mb-10">
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-3"
            style={{
              color: "#ee7e01",
            }}
          >
            Group Stage
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-2">
            World Cup 2026 Matches
          </h1>
          <p className="text-gray-500">
            {MATCHES.length} matches across 3 rounds. Pick a winner{" "}
            <span className="font-semibold text-gray-700">(+3 pts)</span> or
            call the exact score{" "}
            <span className="font-semibold text-gray-700">(+10 pts)</span>.
          </p>
        </div>

        {/* Round tabs */}
        <div className="flex gap-2 sm:gap-3 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <RoundTab
              key={tab.key}
              label={tab.label}
              active={activeRound === tab.key}
              count={tab.count}
              onClick={() => setActiveRound(tab.key)}
            />
          ))}
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-800">
              {filteredMatches.length}
            </span>{" "}
            matches
          </span>
          <span className="text-sm text-gray-500">
            <span className="font-semibold" style={{ color: "#ee7e01" }}>
              {filteredMatches.filter((m) => saved[m.id]).length}
            </span>
            /{filteredMatches.length} predicted
          </span>
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
          {/* Date group headers + rows */}
          {(() => {
            const groups: Record<string, Match[]> = {};
            filteredMatches.forEach((m) => {
              if (!groups[m.date]) groups[m.date] = [];
              groups[m.date].push(m);
            });
            return Object.entries(groups).map(([date, matches]) => (
              <div key={date}>
                {/* Date header */}
                <div
                  className="px-5 sm:px-7 py-2 flex items-center gap-3"
                  style={{
                    background: "#f9fafb",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <span className="text-[10px] sm:text-xs font-bold text-gray-400 tracking-widest uppercase">
                    {date.replace(".", " June 2026 ·").replace(".", "")}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-300">
                    {matches.length} match{matches.length > 1 ? "es" : ""}
                  </span>
                </div>
                {matches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    saved={saved[match.id]}
                    onPredict={() => setDialog(match)}
                  />
                ))}
              </div>
            ));
          })()}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-8">
          All times in UTC · Powered by{" "}
          <span className="font-semibold" style={{ color: "#ee7e01" }}>
            Access Bank
          </span>
        </p>
      </main>

      {/* Dialog */}
      {dialog && (
        <PredictDialog
          match={dialog}
          initial={saved[dialog.id] ?? { winner: null, scoreA: "", scoreB: "" }}
          onClose={() => setDialog(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
