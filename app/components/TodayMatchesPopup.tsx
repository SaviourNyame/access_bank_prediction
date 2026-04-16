"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MATCHES, type Match } from "@/lib/matches";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import AuthDialog from "@/app/components/AuthDialog";

type Picks = Record<number, "A" | "B" | "draw">;

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
  for (const [matchIdStr, winner] of Object.entries(picks)) {
    const matchId = Number(matchIdStr);
    const match = matches.find((m) => m.id === matchId);
    if (!match) continue;
    picksPayload[matchIdStr] = {
      matchId,
      round: match.round,
      teamA: match.teamA.name,
      teamB: match.teamB.name,
      winner,
      scoreA: "",
      scoreB: "",
      savedAt: serverTimestamp(),
    };
  }
  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      email: user.email ?? null,
      points: 0,
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

  const isToday = todayMatches().length > 0;
  const label = isToday ? "Today's Matches" : "Upcoming Matches";

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
          picks?: Record<string, { winner?: string }>;
        };
        if (!data.picks) return;
        const loaded: Picks = {};
        for (const m of matches) {
          const p = data.picks[String(m.id)];
          if (p?.winner === "A" || p?.winner === "B" || p?.winner === "draw") {
            loaded[m.id] = p.winner;
          }
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
    if (Object.keys(picks).length === 0) return;
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
              label={label}
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
  label,
  matches,
  picks,
  setPicks,
  onSubmit,
  onClose,
  saving,
}: {
  label: string;
  matches: Match[];
  picks: Picks;
  setPicks: React.Dispatch<React.SetStateAction<Picks>>;
  onSubmit: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const pickedCount = Object.keys(picks).length;

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
          Make a prediction to win exclusive Access Bank coupons
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
        {matches.map((match) => {
          const pick = picks[match.id];
          return (
            <div
              key={match.id}
              className="rounded-2xl overflow-hidden"
              style={{ border: "1.5px solid #f0f0f0", background: "#fafafa" }}
            >
              {/* Match meta */}
              <div
                className="px-4 py-2 flex items-center justify-between"
                style={{
                  borderBottom: "1px solid #f0f0f0",
                  background: "#f9fafb",
                }}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Round {match.round}
                </span>
                <span className="text-[10px] text-gray-400">
                  {match.date.replace(".", " June ·").replace(".", "")}{" "}
                  {match.time} UTC
                </span>
              </div>

              {/* Teams + pick buttons */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  {/* Team A */}
                  <button
                    type="button"
                    onClick={() => setPicks((p) => ({ ...p, [match.id]: "A" }))}
                    className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all"
                    style={{
                      background: pick === "A" ? "#ee7e01" : "white",
                      border: `1.5px solid ${pick === "A" ? "#ee7e01" : "#e5e7eb"}`,
                      boxShadow:
                        pick === "A" ? "0 0 12px rgba(238,126,1,0.3)" : "none",
                    }}
                  >
                    <span className="text-2xl leading-none">
                      {match.teamA.flag}
                    </span>
                    <span
                      className="text-[10px] font-bold text-center leading-tight"
                      style={{ color: pick === "A" ? "white" : "#374151" }}
                    >
                      {match.teamA.name}
                    </span>
                  </button>

                  {/* Draw */}
                  <button
                    type="button"
                    onClick={() =>
                      setPicks((p) => ({ ...p, [match.id]: "draw" }))
                    }
                    className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all"
                    style={{
                      background: pick === "draw" ? "#374151" : "white",
                      border: `1.5px solid ${pick === "draw" ? "#374151" : "#e5e7eb"}`,
                      minWidth: 52,
                    }}
                  >
                    <span
                      className="text-xs font-black leading-none"
                      style={{ color: pick === "draw" ? "white" : "#9ca3af" }}
                    >
                      X
                    </span>
                    <span
                      className="text-[9px] font-bold"
                      style={{ color: pick === "draw" ? "white" : "#9ca3af" }}
                    >
                      Draw
                    </span>
                  </button>

                  {/* Team B */}
                  <button
                    type="button"
                    onClick={() => setPicks((p) => ({ ...p, [match.id]: "B" }))}
                    className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all"
                    style={{
                      background: pick === "B" ? "#ee7e01" : "white",
                      border: `1.5px solid ${pick === "B" ? "#ee7e01" : "#e5e7eb"}`,
                      boxShadow:
                        pick === "B" ? "0 0 12px rgba(238,126,1,0.3)" : "none",
                    }}
                  >
                    <span className="text-2xl leading-none">
                      {match.teamB.flag}
                    </span>
                    <span
                      className="text-[10px] font-bold text-center leading-tight"
                      style={{ color: pick === "B" ? "white" : "#374151" }}
                    >
                      {match.teamB.name}
                    </span>
                  </button>
                </div>
              </div>
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
            : `Submit ${pickedCount > 0 ? pickedCount : ""} Pick${pickedCount !== 1 ? "s" : ""} & Claim Coupon →`}
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

// ─── Coupon Code ─────────────────────────────────────────────────────────────
function CouponCode() {
  const [copied, setCopied] = useState(false);
  const code = "ABWC26-GHS100";

  function copy() {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-4">
      <p className="text-xs font-bold text-gray-700 mb-2">Your Coupon Code:</p>
      <button
        type="button"
        onClick={copy}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all active:scale-95"
        style={{
          background: copied ? "rgba(34,197,94,0.08)" : "rgba(238,126,1,0.06)",
          border: `1.5px dashed ${copied ? "#16a34a" : "#ee7e01"}`,
        }}
      >
        <span
          className="font-black tracking-widest text-sm"
          style={{
            color: copied ? "#16a34a" : "#ee7e01",
            letterSpacing: "0.15em",
          }}
        >
          {code}
        </span>
        <span
          className="text-xs font-bold flex-shrink-0 ml-3"
          style={{ color: copied ? "#16a34a" : "#9ca3af" }}
        >
          {copied ? "✓ Copied!" : "Tap to copy"}
        </span>
      </button>
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
          Congratulations!
        </p>
        <h2 className="text-2xl font-black leading-tight text-white">
          You have won a
          <br />
          <span style={{ color: "#ee7e01" }}>GH₵ 100 Coupon!</span>
        </h2>
      </div>

      {/* Coupon card */}
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
                ✓ CLAIMED
              </span>
            </div>

            {/* Amount */}
            <div
              className="text-center py-4"
              style={{
                borderTop: "1px dashed #e5e7eb",
                borderBottom: "1px dashed #e5e7eb",
              }}
            >
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                Coupon Value
              </p>
              <p className="text-5xl font-black" style={{ color: "#ee7e01" }}>
                GH₵100
              </p>
            </div>

            {/* How to claim */}
            <div
              className="mt-4 rounded-xl px-4 py-3"
              style={{ background: "#f9fafb", border: "1px solid #f0f0f0" }}
            >
              <p className="text-xs font-bold text-gray-700 mb-2">
                How to claim your reward:
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { icon: "", text: "Spend on anything at the bar" },
                  { icon: "", text: "Pay with your Access Bank Card" },
                  { icon: "", text: "Or via Mobile Money" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5">
                    <span className="text-base flex-shrink-0">{icon}</span>
                    <span className="text-xs text-gray-600 font-medium">
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon code */}
            <CouponCode />

            {/* Validity note */}
            <p className="text-center text-[10px] text-gray-400 mt-3">
              Valid for 30 days · Access Bank World Cup 2026 Prediction League
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
