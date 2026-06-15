"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MATCHES, type Match, type Round } from "@/lib/matches";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import AuthDialog from "@/app/components/AuthDialog";
import Navbar from "@/app/components/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────
type CustomMatch = {
  firestoreId: string;
  teamA: string;
  teamB: string;
  round: number | null;
  date: string;
  time: string;
  scoreA: string;
  scoreB: string;
  status: "upcoming" | "live" | "halftime" | "finished";
};

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

function customDeadlineMs(date: string, time: string): number {
  const m = date.match(/^(\d{2})\.(\d{2})\.$/);
  if (!m || !time) return Date.now() + 86400000;
  const [hour, minute] = time.split(":").map(Number);
  return Date.UTC(2026, Number(m[2]) - 1, Number(m[1]), hour, minute, 0);
}

async function persistCustomPrediction(
  firestoreId: string,
  teamA: string,
  teamB: string,
  pred: Prediction,
) {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(
    doc(db, "users", user.uid),
    {
      customPicks: {
        [firestoreId]: {
          firestoreId,
          teamA,
          teamB,
          ...pred,
          savedAt: serverTimestamp(),
        },
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
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
    if (left > DAY) {
      const d = Math.floor(left / DAY);
      const h = Math.floor((left % DAY) / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      const daysLeft = Math.ceil(left / DAY);

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
          {String(h).padStart(2, "0")}h {String(m).padStart(2, "0")}m
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
                  type="button"
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
                  type="button"
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
                  type="button"
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
                  type="button"
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

// ─── Match Row ────────────────────────────────────────────────────────────────
function pickSummary(
  saved: Prediction | undefined,
  match: Match,
): string | null {
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
      if (saved.firstHalfFirstGoal === "none") return "FH First Goal: No goal";
      return null;
    case "fullTimeWinner":
      if (saved.fullTimeWinner === "A") return `FT Winner: ${match.teamA.name}`;
      if (saved.fullTimeWinner === "B") return `FT Winner: ${match.teamB.name}`;
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
  return null;
}

function MatchRow({
  match,
  saved,
  scoreA,
  scoreB,
  status,
  onPredict,
}: {
  match: Match;
  saved?: Prediction;
  scoreA?: string;
  scoreB?: string;
  status?: CustomMatch["status"];
  onPredict: () => void;
}) {
  const pick = pickSummary(saved, match);
  const isGhanaMatch =
    match.teamA.name === "Ghana" || match.teamB.name === "Ghana";
  const hasScore =
    (scoreA !== "" && scoreA != null) || (scoreB !== "" && scoreB != null);
  const activeStatus = status ?? "upcoming";

  const formattedDateTime = (() => {
    try {
      const d = new Date(match.deadlineMs);
      return d.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return `${match.date} ${match.time}`;
    }
  })();

  return (
    <div
      className={`rounded-2xl overflow-hidden ${isGhanaMatch ? "cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]" : "cursor-default"}`}
      style={{
        background: "#ffffff",
        border:
          activeStatus === "live"
            ? "1.5px solid #ee7e01"
            : "1.5px solid #e5e7eb",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
      }}
      onClick={isGhanaMatch ? onPredict : undefined}
    >
      {/* Date/time + status row */}
      <div className="px-4 pt-4 pb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-400">
          {formattedDateTime}
        </span>
        {activeStatus !== "upcoming" && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background:
                activeStatus === "live"
                  ? "#ee7e01"
                  : activeStatus === "halftime"
                    ? "#374151"
                    : "#f3f4f6",
              color: activeStatus === "finished" ? "#6b7280" : "#fff",
            }}
          >
            {STATUS_LABEL[activeStatus]}
          </span>
        )}
      </div>

      {/* Teams + scores */}
      <div className="px-4 pb-3 flex flex-col gap-2.5 mt-2">
        {(
          [
            { team: match.teamA, score: scoreA },
            { team: match.teamB, score: scoreB },
          ] as const
        ).map(({ team, score }) => (
          <div
            key={team.name}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="flex items-center justify-center w-9 h-9 rounded-full text-xl leading-none flex-shrink-0"
                style={{ background: "#f3f4f6" }}
              >
                {team.flag}
              </span>
              <span className="font-bold text-gray-900 text-sm sm:text-base truncate">
                {team.name}
              </span>
            </div>
            {hasScore && (
              <span className="font-black text-gray-900 text-lg font-mono flex-shrink-0">
                {score || "0"}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderTop: "1px solid #f0f0f0" }}
      >
        <Countdown ms={match.deadlineMs} mobileDaysOnly />
        {isGhanaMatch ? (
          pick ? (
            <div className="flex items-center gap-1.5">
              <span
                className="text-[11px] font-bold truncate max-w-[140px]"
                style={{ color: "#ee7e01" }}
              >
                {pick}
              </span>
              <span className="text-[9px] text-gray-500">· tap to edit</span>
            </div>
          ) : (
            <span className="text-xs font-bold" style={{ color: "#ee7e01" }}>
              Predict →
            </span>
          )
        ) : (
          <span className="text-xs text-gray-400">Not available</span>
        )}
      </div>
    </div>
  );
}

// ─── Custom Match Row ─────────────────────────────────────────────────────────
const STATUS_LABEL: Record<CustomMatch["status"], string> = {
  upcoming: "Upcoming",
  live: "🔴 Live",
  halftime: "Half Time",
  finished: "Finished",
};

function CustomMatchRow({
  match,
  saved,
  onPredict,
}: {
  match: CustomMatch;
  saved?: Prediction;
  onPredict: () => void;
}) {
  const deadlineMs = customDeadlineMs(match.date, match.time);
  const hasScore = match.scoreA !== "" || match.scoreB !== "";
  const pick = saved
    ? (() => {
        switch (saved.selectedOption) {
          case "firstHalfWinner":
            if (saved.firstHalfWinner === "A")
              return `FH Winner: ${match.teamA}`;
            if (saved.firstHalfWinner === "B")
              return `FH Winner: ${match.teamB}`;
            if (saved.firstHalfWinner === "draw") return "FH Winner: Draw";
            return null;
          case "firstHalfFirstGoal":
            if (saved.firstHalfFirstGoal === "A")
              return `FH First Goal: ${match.teamA}`;
            if (saved.firstHalfFirstGoal === "B")
              return `FH First Goal: ${match.teamB}`;
            if (saved.firstHalfFirstGoal === "none")
              return "FH First Goal: No goal";
            return null;
          case "fullTimeWinner":
            if (saved.fullTimeWinner === "A")
              return `FT Winner: ${match.teamA}`;
            if (saved.fullTimeWinner === "B")
              return `FT Winner: ${match.teamB}`;
            if (saved.fullTimeWinner === "draw") return "FT Winner: Draw";
            return null;
          case "fullTimeFirstGoal":
            if (saved.fullTimeFirstGoal === "A")
              return `FT First Goal: ${match.teamA}`;
            if (saved.fullTimeFirstGoal === "B")
              return `FT First Goal: ${match.teamB}`;
            if (saved.fullTimeFirstGoal === "none")
              return "FT First Goal: No goal";
            return null;
          default:
            return null;
        }
      })()
    : null;

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: "#ffffff",
        border: "1.5px solid #e5e7eb",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
      }}
      onClick={onPredict}
    >
      {/* Status / date row */}
      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">
          {match.date} · {match.time} UTC
          {match.round ? ` · Round ${match.round}` : ""}
        </span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background:
              match.status === "live"
                ? "#ee7e01"
                : match.status === "halftime"
                  ? "#374151"
                  : "#f3f4f6",
            color: match.status === "upcoming" ? "#6b7280" : "#fff",
          }}
        >
          {STATUS_LABEL[match.status]}
        </span>
      </div>

      {/* Teams + score */}
      <div className="px-4 pb-3 flex flex-col gap-2.5 mt-2">
        {[
          { name: match.teamA, score: match.scoreA },
          { name: match.teamB, score: match.scoreB },
        ].map((team) => (
          <div
            key={team.name}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex items-center justify-center w-9 h-9 rounded-full text-sm font-black flex-shrink-0"
                style={{ background: "#f3f4f6", color: "#374151" }}
              >
                {team.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="font-bold text-gray-900 text-sm sm:text-base truncate">
                {team.name}
              </span>
            </div>
            {hasScore && (
              <span className="font-black text-gray-900 text-lg font-mono">
                {team.score || "0"}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderTop: "1px solid #f0f0f0" }}
      >
        <Countdown ms={deadlineMs} mobileDaysOnly />
        {pick ? (
          <div className="flex items-center gap-1.5">
            <span
              className="text-[11px] font-bold truncate max-w-[140px]"
              style={{ color: "#ee7e01" }}
            >
              {pick}
            </span>
            <span className="text-[9px] text-gray-500">· tap to edit</span>
          </div>
        ) : (
          <span className="text-xs font-bold" style={{ color: "#ee7e01" }}>
            Predict →
          </span>
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
  const [authPending, setAuthPending] = useState<Match | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [customMatches, setCustomMatches] = useState<CustomMatch[]>([]);
  const [savedCustom, setSavedCustom] = useState<Record<string, Prediction>>(
    {},
  );
  const [customDialog, setCustomDialog] = useState<CustomMatch | null>(null);
  const [authPendingCustom, setAuthPendingCustom] =
    useState<CustomMatch | null>(null);
  const [adminOverrides, setAdminOverrides] = useState<
    Record<
      number,
      { scoreA: string; scoreB: string; status: CustomMatch["status"] }
    >
  >({});
  const [apiScores, setApiScores] = useState<
    Record<
      number,
      { scoreA: string; scoreB: string; status: CustomMatch["status"] }
    >
  >({});

  // API scores take precedence over admin-set overrides
  const matchOverrides = useMemo(
    () => ({ ...adminOverrides, ...apiScores }),
    [adminOverrides, apiScores],
  );

  // Load admin match data (custom matches + static overrides) from Firestore
  useEffect(() => {
    async function loadAdminMatches() {
      try {
        const snap = await getDocs(collection(db, "adminMatches"));
        const list: CustomMatch[] = [];
        const overrides: Record<
          number,
          { scoreA: string; scoreB: string; status: CustomMatch["status"] }
        > = {};
        snap.docs.forEach((d) => {
          const data = d.data() as Omit<CustomMatch, "firestoreId"> & {
            isCustom?: boolean;
            staticId?: number;
          };
          if (data.isCustom) {
            list.push({ ...data, firestoreId: d.id });
          } else if (data.staticId != null) {
            overrides[data.staticId] = {
              scoreA: data.scoreA ?? "",
              scoreB: data.scoreB ?? "",
              status: data.status ?? "upcoming",
            };
          }
        });
        setCustomMatches(list);
        setAdminOverrides(overrides);
      } catch {
        // silently ignore
      }
    }
    void loadAdminMatches();
  }, []);

  // Poll football API for live scores every 60 seconds
  useEffect(() => {
    type FixtureRow = {
      teamA: string;
      teamB: string;
      scoreA: string;
      scoreB: string;
      status: CustomMatch["status"];
    };

    async function fetchScores() {
      try {
        const res = await fetch("/api/football/fixtures");
        if (!res.ok) return;
        const data = (await res.json()) as { fixtures?: FixtureRow[] };
        if (!data.fixtures) return;

        const scores: Record<
          number,
          { scoreA: string; scoreB: string; status: CustomMatch["status"] }
        > = {};

        for (const fixture of data.fixtures) {
          const match = MATCHES.find(
            (m) =>
              (m.teamA.name === fixture.teamA &&
                m.teamB.name === fixture.teamB) ||
              (m.teamA.name === fixture.teamB &&
                m.teamB.name === fixture.teamA),
          );
          if (!match) continue;

          const flipped = match.teamA.name === fixture.teamB;
          scores[match.id] = {
            scoreA: flipped ? fixture.scoreB : fixture.scoreA,
            scoreB: flipped ? fixture.scoreA : fixture.scoreB,
            status: fixture.status,
          };
        }

        setApiScores(scores);
      } catch {
        // ignore — stale data is fine
      }
    }

    void fetchScores();
    const id = setInterval(() => void fetchScores(), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setSaved({});
        setSavedCustom({});
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (!snap.exists()) {
          setSaved({});
          setSavedCustom({});
          return;
        }
        const data = snap.data() as {
          picks?: unknown;
          customPicks?: Record<string, unknown>;
        };
        setSaved(toSavedPicks(data.picks));

        // Load custom picks
        const cp: Record<string, Prediction> = {};
        if (data.customPicks && typeof data.customPicks === "object") {
          for (const [id, pick] of Object.entries(data.customPicks)) {
            if (!pick || typeof pick !== "object") continue;
            const p = pick as Record<string, unknown>;
            const selectedOption =
              p.selectedOption === "firstHalfWinner" ||
              p.selectedOption === "firstHalfFirstGoal" ||
              p.selectedOption === "fullTimeWinner" ||
              p.selectedOption === "fullTimeFirstGoal"
                ? p.selectedOption
                : null;
            cp[id] = {
              selectedOption,
              firstHalfWinner:
                p.firstHalfWinner === "A" ||
                p.firstHalfWinner === "B" ||
                p.firstHalfWinner === "draw"
                  ? p.firstHalfWinner
                  : null,
              firstHalfFirstGoal:
                p.firstHalfFirstGoal === "A" ||
                p.firstHalfFirstGoal === "B" ||
                p.firstHalfFirstGoal === "none"
                  ? p.firstHalfFirstGoal
                  : null,
              fullTimeWinner:
                p.fullTimeWinner === "A" ||
                p.fullTimeWinner === "B" ||
                p.fullTimeWinner === "draw"
                  ? p.fullTimeWinner
                  : null,
              fullTimeFirstGoal:
                p.fullTimeFirstGoal === "A" ||
                p.fullTimeFirstGoal === "B" ||
                p.fullTimeFirstGoal === "none"
                  ? p.fullTimeFirstGoal
                  : null,
            };
          }
        }
        setSavedCustom(cp);
      } catch (err: unknown) {
        console.error("Failed to load saved predictions", err);
      }
    });

    return () => unsub();
  }, []);

  const filteredMatches =
    activeRound === "all"
      ? MATCHES
      : MATCHES.filter((m) => m.round === activeRound);

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

  const handleCustomSave = useCallback(
    (pred: Prediction) => {
      if (!customDialog) return;
      setSavedCustom((s) => ({ ...s, [customDialog.firestoreId]: pred }));
      void persistCustomPrediction(
        customDialog.firestoreId,
        customDialog.teamA,
        customDialog.teamB,
        pred,
      ).catch((err: unknown) => {
        console.error("Failed to save custom prediction", err);
      });
      setCustomDialog(null);
    },
    [customDialog],
  );

  const tabs: Array<{ key: Round | "all"; label: string; count: number }> = [
    { key: "all", label: "All", count: MATCHES.length },
    ...([1, 2, 3] as Round[]).map((r) => ({
      key: r,
      label: `Round ${r}`,
      count: MATCHES.filter((m) => m.round === r).length,
    })),
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />

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
            {MATCHES.length} matches across 3 rounds. Choose one option per
            match: first-half winner, first-half first goal, full-time winner,
            or full-time first goal.
          </p>
        </div>

        {/* Custom matches */}
        {customMatches.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-black text-gray-900 mb-4">
              Special Matches
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customMatches.map((cm) => (
                <CustomMatchRow
                  key={cm.firestoreId}
                  match={cm}
                  saved={savedCustom[cm.firestoreId]}
                  onPredict={() => {
                    if (!user) setAuthPendingCustom(cm);
                    else setCustomDialog(cm);
                  }}
                />
              ))}
            </div>
          </div>
        )}

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
              {filteredMatches.filter((m) => hasPrediction(saved[m.id])).length}
            </span>
            /{filteredMatches.length} predicted
          </span>
        </div>

        {/* Match grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((match) => {
            const override = matchOverrides[match.id];
            return (
              <MatchRow
                key={match.id}
                match={match}
                saved={saved[match.id]}
                scoreA={override?.scoreA}
                scoreB={override?.scoreB}
                status={override?.status}
                onPredict={() => {
                  if (!user) setAuthPending(match);
                  else setDialog(match);
                }}
              />
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-8">
          All times in UTC · Powered by{" "}
          <span className="font-semibold" style={{ color: "#ee7e01" }}>
            Access Bank
          </span>
        </p>
      </main>

      {/* Auth gate — static matches */}
      {authPending && (
        <AuthDialog
          onClose={() => setAuthPending(null)}
          onSuccess={() => {
            const match = authPending;
            setAuthPending(null);
            setDialog(match);
          }}
        />
      )}

      {/* Auth gate — custom matches */}
      {authPendingCustom && (
        <AuthDialog
          onClose={() => setAuthPendingCustom(null)}
          onSuccess={() => {
            const cm = authPendingCustom;
            setAuthPendingCustom(null);
            setCustomDialog(cm);
          }}
        />
      )}

      {/* Predict dialog — static */}
      {dialog && (
        <PredictDialog
          match={dialog}
          initial={saved[dialog.id] ?? EMPTY_PREDICTION}
          onClose={() => setDialog(null)}
          onSave={handleSave}
        />
      )}

      {/* Predict dialog — custom */}
      {customDialog && (
        <PredictDialog
          match={{
            id: 0,
            round: (customDialog.round as 1 | 2 | 3) ?? 1,
            teamA: { name: customDialog.teamA, flag: "🏴", badgeBg: "#374151" },
            teamB: { name: customDialog.teamB, flag: "🏴", badgeBg: "#374151" },
            date: customDialog.date,
            time: customDialog.time,
            deadlineMs: customDeadlineMs(customDialog.date, customDialog.time),
          }}
          initial={savedCustom[customDialog.firestoreId] ?? EMPTY_PREDICTION}
          onClose={() => setCustomDialog(null)}
          onSave={handleCustomSave}
        />
      )}
    </div>
  );
}
