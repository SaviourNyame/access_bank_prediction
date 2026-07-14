"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { addDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import confetti from "canvas-confetti";

type Option = "A" | "B" | "C" | "D";

export type TriviaQuestion = {
  id: string;
  question: string;
  options: Record<Option, string>;
  correct: Option;
  timer: number;
  order: number;
  difficulty?: "easy" | "medium" | "hard";
};

type Phase = "register" | "idle" | "playing" | "won" | "finished" | "blocked";

const TOTAL_TIME = 90; // 1:30

const OPTS: Option[] = ["A", "B", "C", "D"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function genCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TriviaClient() {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [phase, setPhase]         = useState<Phase>("register");
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState<Option | null>(null);
  const [totalTime, setTotalTime] = useState(0);
  const [timeLeft, setTimeLeft]   = useState(0);
  const [score, setScore]         = useState(0);
  const [answers, setAnswers]     = useState<(Option | null)[]>([]);
  const [playerName, setPlayerName]   = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const [regError, setRegError]       = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [couponCode, setCouponCode]   = useState<string | null>(null);
  const [blockReason, setBlockReason]     = useState("");
  const [forfeitConfirm, setForfeitConfirm] = useState(false);

  const poolRef    = useRef<TriviaQuestion[]>([]); // full unmodified question pool
  const seenIdsRef = useRef<Set<string>>(new Set()); // IDs shown across all attempts this session

  useEffect(() => {
    // Restore saved player and check for a previous win
    try {
      const saved    = localStorage.getItem("triviaPlayer");
      const wonCode  = localStorage.getItem("triviaWon");

      if (saved) {
        const { name, phone } = JSON.parse(saved) as { name?: string; phone?: string };
        if (name && phone) {
          setPlayerName(name);
          setPlayerPhone(phone);
          if (wonCode) {
            // They already won — show the won screen with their code, no replay
            setCouponCode(wonCode);
            setPhase("won");
          } else {
            setPhase("idle");
          }
        }
      }
    } catch { /* ignore bad storage data */ }

    async function load() {
      const snap = await getDocs(
        query(collection(db, "triviaQuestions"), orderBy("order", "asc")),
      );
      const loaded = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TriviaQuestion, "id">) }));
      poolRef.current = loaded;
      setQuestions(loaded);
      setLoading(false);
    }
    void load();
  }, []);

  const computedTotal = TOTAL_TIME;

  // Hide navbar while playing
  useEffect(() => {
    const nav = document.querySelector("nav");
    if (!nav) return;
    (nav as HTMLElement).style.display = phase === "playing" ? "none" : "";
    return () => { (nav as HTMLElement).style.display = ""; };
  }, [phase]);

  // Global countdown
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      const filled = [...answers];
      while (filled.length < questions.length) filled.push(null);
      setAnswers(filled);
      setPhase("finished");
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  });

  // Confetti burst on win — must be here (before early returns) to satisfy Rules of Hooks
  useEffect(() => {
    if (phase !== "won") return;
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ["#ee7e01", "#ffb347", "#fff", "#ffd700"] });
    const id1 = setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { x: 0.1, y: 0.6 }, colors: ["#ee7e01", "#fff"] }), 400);
    const id2 = setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { x: 0.9, y: 0.6 }, colors: ["#ee7e01", "#ffd700"] }), 700);
    return () => { clearTimeout(id1); clearTimeout(id2); };
  }, [phase]);

  function startGame() {
    const pool = poolRef.current;

    // Filter out questions already seen this session; reset if pool nearly exhausted
    let unseen = pool.filter((q) => !seenIdsRef.current.has(q.id));
    if (unseen.length < 10) {
      seenIdsRef.current.clear();
      unseen = [...pool];
    }

    // Split by difficulty — easy/medium shown 2× more than hard
    const lighter = shuffle(unseen.filter((q) => q.difficulty !== "hard"));
    const hard    = shuffle(unseen.filter((q) => q.difficulty === "hard"));

    const queue: TriviaQuestion[] = [];
    let li = 0, hi = 0;
    while (li < lighter.length || hi < hard.length) {
      if (li < lighter.length) queue.push(lighter[li++]);
      if (li < lighter.length) queue.push(lighter[li++]);
      if (hi < hard.length)    queue.push(hard[hi++]);
    }

    // Mark every question in this game as seen so they won't repeat next attempt
    queue.forEach((q) => seenIdsRef.current.add(q.id));

    setQuestions(queue);
    setTotalTime(TOTAL_TIME);
    setTimeLeft(TOTAL_TIME);
    setPhase("playing");
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setAnswers([]);
  }

  async function attemptPlay() {
    setRegError("");
    setSubmitting(true);
    const isFirstTime = phase === "register";
    try { localStorage.setItem("triviaPlayer", JSON.stringify({ name: playerName, phone: playerPhone })); } catch { /* ignore */ }
    try {
      const res = await fetch("/api/trivia-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName, phone: playerPhone, isFirstTime }),
      });
      const data = await res.json() as { allowed?: boolean; reason?: string };
      if (data.allowed) {
        startGame();
      } else if (data.reason === "phone_taken") {
        setRegError("This phone number is already registered. Please use a different number.");
      } else if (data.reason === "already_won") {
        setBlockReason("You've already won a coupon! Visit the redemption desk to claim your prize.");
        setPhase("blocked");
      } else {
        setBlockReason("You've used all your attempts. Visit an Access Bank viewing centre to find out if you won.");
        setPhase("blocked");
      }
    } catch {
      setRegError("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleAnswer(opt: Option) {
    if (selected !== null) return;
    const correct = opt === questions[current].correct;
    setSelected(opt);
    setAnswers((prev) => [...prev, opt]);
    if (correct) {
      const newScore = score + 1;
      setScore(newScore);
      if (newScore >= 10) {
        const code = genCode();
        setCouponCode(code);
        try { localStorage.setItem("triviaWon", code); } catch { /* ignore */ }
        setTimeout(() => {
          setPhase("won");
          void addDoc(collection(db, "triviaCoupons"), {
            code,
            name: playerName,
            phone: playerPhone,
            wonAt: new Date().toISOString(),
            redeemed: false,
          });
        }, 1200);
        return;
      }
    }
    setTimeout(() => advance(), 1200);
  }

  function skipQuestion() {
    if (selected !== null) return;
    setAnswers((prev) => [...prev, null]);
    advance();
  }

  function forfeit() {
    const filled = [...answers];
    while (filled.length < questions.length) filled.push(null);
    setAnswers(filled);
    setForfeitConfirm(false);
    setPhase("finished");
  }

  function changeProfile() {
    try { localStorage.removeItem("triviaPlayer"); localStorage.removeItem("triviaWon"); } catch { /* ignore */ }
    setPlayerName("");
    setPlayerPhone("");
    setCouponCode(null);
    setRegError("");
    setPhase("register");
  }

  function advance() {
    setCurrent((prev) => {
      const next = prev + 1;
      if (next >= questions.length) {
        setPhase("finished");
        return prev;
      }
      return next;
    });
    setSelected(null);
  }

  const timerPct   = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const CIRCUM     = 2 * Math.PI * 28; // r=28

  // ── Register ─────────────────────────────────────────────────────────────────
  if (phase === "register") {
    const canSubmit = playerName.trim().length >= 2 && playerPhone.trim().length >= 7 && !submitting && !loading && questions.length > 0;
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-6">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-3">
            <Image src="/acesslogowhite.png" alt="Access Bank" width={360} height={120} className="h-32 w-auto object-contain" />
          </div>
          <h1 className="text-white font-black text-4xl leading-none mb-1 text-center">World Cup</h1>
          <h1 className="font-black text-4xl leading-none mb-8 text-center" style={{ color: "#ee7e01" }}>Trivia</h1>

          <div className="flex flex-col gap-3 mb-4">
            <input
              type="text"
              placeholder="Your full name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full rounded-xl px-4 py-4 text-base font-semibold outline-none"
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.2)" }}
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={playerPhone}
              onChange={(e) => setPlayerPhone(e.target.value)}
              className="w-full rounded-xl px-4 py-4 text-base font-semibold outline-none"
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.2)" }}
            />
          </div>

          {regError && (
            <p className="text-red-400 text-sm text-center mb-4">{regError}</p>
          )}

          <p className="text-white/40 text-xs text-center mb-6">
            Answer <span className="text-white font-bold">10 correct</span> within <span className="text-white font-bold">1:30</span> to win a coupon. Max 2 attempts per device.
          </p>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void attemptPlay()}
            className="w-full rounded-2xl py-4 text-base font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "#ee7e01", color: "#fff" }}
          >
            {loading ? "Loading…" : submitting ? "Checking…" : "Start →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Blocked ───────────────────────────────────────────────────────────────────
  if (phase === "blocked") {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-white/40 text-xs uppercase tracking-[0.25em] mb-2">Access Denied</p>
          <h1 className="text-white font-black text-4xl leading-none mb-1">No More</h1>
          <h1 className="font-black text-4xl leading-none mb-10" style={{ color: "#ee7e01" }}>Attempts</h1>
          <p className="text-white/60 text-sm leading-relaxed mb-8">
            {blockReason || "Visit an Access Bank viewing centre to find out if you won."}
          </p>
          <button
            type="button"
            onClick={changeProfile}
            className="w-full rounded-2xl py-4 text-base font-black uppercase tracking-widest transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)", color: "#fff" }}
          >
            Use Different Profile
          </button>
        </div>
      </div>
    );
  }

  // ── Idle (returning player) ───────────────────────────────────────────────────
  if (phase === "idle") {
    const mins = Math.floor(computedTotal / 60);
    const secs = computedTotal % 60;
    const timeLabel = mins > 0 ? `${mins}:${String(secs).padStart(2,"0")}` : `${secs}s`;
    const firstName = playerName.split(" ")[0];
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-6">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-3">
            <Image src="/acesslogowhite.png" alt="Access Bank" width={360} height={120} className="h-32 w-auto object-contain" />
          </div>
          <p className="text-white/40 text-xs uppercase tracking-[0.25em] mb-1 text-center">Welcome back</p>
          <h1 className="text-white font-black text-4xl leading-none mb-1 text-center">{firstName}</h1>
          <h1 className="font-black text-4xl leading-none mb-8 text-center" style={{ color: "#ee7e01" }}>World Cup Trivia</h1>

          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="text-center">
              <p className="text-white font-black text-3xl leading-none">{questions.length}</p>
              <p className="text-white/40 text-[11px] uppercase tracking-widest mt-1">Questions</p>
            </div>
            <div className="w-px h-8 bg-white/15" />
            <div className="text-center">
              <p className="font-black text-3xl leading-none" style={{ color: "#ee7e01" }}>{timeLabel}</p>
              <p className="text-white/40 text-[11px] uppercase tracking-widest mt-1">Time limit</p>
            </div>
          </div>

          <p className="text-white/60 text-lg leading-relaxed mb-8 text-center">
            Answer up to <span className="text-white font-bold">10 correct questions</span> within{" "}
            <span className="text-white font-bold">1:30</span> to win a coupon redeemable here.
          </p>

          {regError && (
            <p className="text-red-400 text-sm text-center mb-4">{regError}</p>
          )}

          <button
            type="button"
            disabled={submitting || loading || questions.length === 0}
            onClick={() => void attemptPlay()}
            className="w-full rounded-2xl py-4 text-base font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "#ee7e01", color: "#fff" }}
          >
            {loading ? "Loading…" : submitting ? "Checking…" : "Start →"}
          </button>

          <button
            type="button"
            onClick={changeProfile}
            className="w-full mt-3 py-3 text-xs font-semibold uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors"
          >
            Not you? Change profile
          </button>
        </div>
      </div>
    );
  }

  // ── Won ───────────────────────────────────────────────────────────────────────
  if (phase === "won") {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-white/40 text-xs uppercase tracking-[0.25em] mb-2">Congratulations</p>
          <h1 className="text-white font-black text-4xl leading-none mb-1">You</h1>
          <h1 className="font-black text-4xl leading-none mb-8" style={{ color: "#ee7e01" }}>Won!</h1>

          {/* Coupon code */}
          <div
            className="rounded-2xl px-6 py-5 mb-8"
            style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.18)" }}
          >
            <p className="text-white/40 text-[11px] uppercase tracking-[0.3em] mb-2">Your Coupon Code</p>
            <p
              className="font-black text-6xl tracking-[0.4em] leading-none"
              style={{ color: "#ee7e01", fontVariantNumeric: "tabular-nums" }}
            >
              {couponCode ?? "????"}
            </p>
            <p className="text-white/40 text-xs mt-3">Show this code at the redemption desk</p>
          </div>

          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="text-center">
              <p className="text-white font-black text-5xl leading-none">10</p>
              <p className="text-white/40 text-[11px] uppercase tracking-widest mt-2">Correct</p>
            </div>
            <div className="w-px h-10 bg-white/15" />
            <div className="text-center">
              <p className="font-black text-5xl leading-none" style={{ color: "#ee7e01" }}>{fmt(TOTAL_TIME - timeLeft)}</p>
              <p className="text-white/40 text-[11px] uppercase tracking-widest mt-2">Time taken</p>
            </div>
          </div>

          <p className="text-white/40 text-xs text-center mb-6">
            Each player can only win once. Visit the redemption desk to claim your prize.
          </p>

          <button
            type="button"
            onClick={changeProfile}
            className="w-full rounded-2xl py-4 text-base font-black uppercase tracking-widest transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)", color: "#fff" }}
          >
            Start Again
          </button>
        </div>
      </div>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────────────────
  if (phase === "finished") {
    const answered = answers.filter(Boolean).length;

    return (
      <div className="flex items-center justify-center min-h-[70vh] px-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-white/40 text-xs uppercase tracking-[0.25em] mb-2">Time&apos;s Up</p>
          <h1 className="text-white font-black text-4xl leading-none mb-1">Better</h1>
          <h1 className="font-black text-4xl leading-none mb-10" style={{ color: "#ee7e01" }}>Luck Next Time!</h1>

          <div className="flex items-center justify-center gap-6 mb-10">
            <div className="text-center">
              <p className="text-white font-black text-5xl leading-none">{score}</p>
              <p className="text-white/40 text-[11px] uppercase tracking-widest mt-2">Correct</p>
            </div>
            <div className="w-px h-10 bg-white/15" />
            <div className="text-center">
              <p className="font-black text-5xl leading-none" style={{ color: "#ee7e01" }}>{answered}</p>
              <p className="text-white/40 text-[11px] uppercase tracking-widest mt-2">Answered</p>
            </div>
            <div className="w-px h-10 bg-white/15" />
            <div className="text-center">
              <p className="text-white font-black text-5xl leading-none">{questions.length - answered}</p>
              <p className="text-white/40 text-[11px] uppercase tracking-widest mt-2">Skipped</p>
            </div>
          </div>

          <p className="text-white/60 text-sm leading-relaxed mb-10">
            You needed <span className="text-white font-bold">10 correct</span> to win a coupon. Give it another shot!
          </p>

          <button
            type="button"
            disabled={submitting}
            onClick={() => void attemptPlay()}
            className="w-full rounded-2xl py-4 text-base font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "#ee7e01", color: "#fff" }}
          >
            {submitting ? "Checking…" : "Try Again →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Playing ──────────────────────────────────────────────────────────────────
  const q = questions[current];

  return (
    <div className="px-5 pt-4 pb-8 flex flex-col" style={{ minHeight: "calc(100vh - 4rem)" }}>

      {/* Top row: Forfeit left, Score right */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => setForfeitConfirm(true)}
          className="text-white/40 text-xs font-black uppercase tracking-[0.2em] hover:text-white/70 transition-colors active:scale-95"
        >
          ✕ Forfeit
        </button>
        <span className="text-white text-xs font-black uppercase tracking-[0.2em]">
          Score &nbsp;<span style={{ color: "#ee7e01" }}>{score}</span>
        </span>
      </div>

      {/* Timer: circle centered above progress bar */}
      <div className="mb-8">
        {/* Circle + counter row */}
        <div className="relative flex justify-center mb-3">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke={timeLeft <= 30 ? "#ef4444" : timeLeft <= 60 ? "#f59e0b" : "#ffffff"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={CIRCUM}
                strokeDashoffset={CIRCUM * (1 - timerPct / 100)}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xs font-black tabular-nums ${timeLeft <= 30 ? "text-red-400" : "text-white"}`}>
                {fmt(timeLeft)}
              </span>
            </div>
          </div>
          <span className="absolute right-0 bottom-0 text-white font-black text-sm tabular-nums">
            {score}/10
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
          <div
            className="h-0.5 rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${timerPct}%`,
              background: timeLeft <= 30 ? "#ef4444" : timeLeft <= 60 ? "#f59e0b" : "#ffffff",
            }}
          />
        </div>
      </div>

      {/* Question box */}
      <div
        className="rounded-2xl mb-6 px-6 py-10 text-center"
      >
        <p className="text-white font-black text-xl leading-snug">{q.question}</p>
      </div>

      {/* Option buttons + Skip */}
      <div className="grid grid-cols-2 gap-3">
        {OPTS.filter((opt) => q.options[opt]).map((opt) => {
          const isSelected = selected === opt;
          const isCorrect  = opt === q.correct;
          const revealed   = selected !== null;

          let bg      = "linear-gradient(135deg, #ffe066 0%, #c87e00 100%)";
          let border  = "1.5px solid #c87e00";
          let color   = "#3b2000";

          const answeredCorrectly = selected === q.correct;
          if (revealed) {
            if (isSelected && answeredCorrectly) { bg = "#dcfce7"; border = "1.5px solid #22c55e"; color = "#15803d"; }
            else if (isSelected && !answeredCorrectly) { bg = "#fee2e2"; border = "1.5px solid #ef4444"; color = "#b91c1c"; }
            else { bg = "linear-gradient(135deg, rgba(255,224,102,0.3) 0%, rgba(200,126,0,0.3) 100%)"; color = "rgba(59,32,0,0.4)"; border = "1.5px solid rgba(200,126,0,0.2)"; }
          }

          return (
            <button
              key={opt}
              type="button"
              disabled={revealed}
              onClick={() => handleAnswer(opt)}
              className="w-full rounded-2xl py-4 text-center font-bold text-sm transition-all active:scale-[0.98] disabled:cursor-default"
              style={{ background: bg, color }}
            >
              <span className="font-black mr-2">{opt}.</span>{q.options[opt]}
              {revealed && isSelected && answeredCorrectly  && <span className="ml-2">✓</span>}
              {revealed && isSelected && !answeredCorrectly && <span className="ml-2">✗</span>}
            </button>
          );
        })}

        {/* SKIP — spans both columns */}
        {selected === null && (
          <button
            type="button"
            onClick={skipQuestion}
            className="col-span-2 w-full rounded-2xl py-4 text-center text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", color: "#fff" }}
          >
            Skip →
          </button>
        )}
      </div>

      {/* Forfeit confirmation */}
      {forfeitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
        >
          <div className="w-full max-w-xs rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.18)" }}>
            <div className="px-6 pt-6 pb-2 text-center">
              <p className="text-white font-black text-xl mb-2">Forfeit the game?</p>
              <p className="text-white/50 text-sm leading-relaxed">
                Your current score of <span className="text-white font-bold">{score}</span> will be lost and this will count as an attempt.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6 pt-4">
              <button
                type="button"
                onClick={() => setForfeitConfirm(false)}
                className="flex-1 rounded-xl py-3 text-sm font-black uppercase tracking-widest transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)", color: "#fff" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={forfeit}
                className="flex-1 rounded-xl py-3 text-sm font-black uppercase tracking-widest transition-all active:scale-95"
                style={{ background: "#ef4444", color: "#fff" }}
              >
                Forfeit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
