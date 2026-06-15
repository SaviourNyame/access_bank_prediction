"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

type Phase = "idle" | "playing" | "won" | "finished";

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

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TriviaClient() {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [phase, setPhase]         = useState<Phase>("idle");
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState<Option | null>(null);
  const [totalTime, setTotalTime] = useState(0);
  const [timeLeft, setTimeLeft]   = useState(0);
  const [score, setScore]         = useState(0);
  const [answers, setAnswers]     = useState<(Option | null)[]>([]);

  useEffect(() => {
    async function load() {
      const snap = await getDocs(
        query(collection(db, "triviaQuestions"), orderBy("order", "asc")),
      );
      setQuestions(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TriviaQuestion, "id">) })),
      );
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

  function startGame() {
    setQuestions((all) => {
      const hard  = shuffle(all.filter((q) => q.difficulty === "hard"));
      const other = shuffle(all.filter((q) => q.difficulty !== "hard"));
      // Interleave 1 hard : 1 other → 50% hard, 50% medium/easy
      const queue: TriviaQuestion[] = [];
      let hi = 0, oi = 0;
      while (hi < hard.length || oi < other.length) {
        if (hi < hard.length)  queue.push(hard[hi++]);
        if (oi < other.length) queue.push(other[oi++]);
      }
      return queue;
    });
    setTotalTime(TOTAL_TIME);
    setTimeLeft(TOTAL_TIME);
    setPhase("playing");
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setAnswers([]);
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
        setTimeout(() => setPhase("won"), 1200);
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

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center px-6">
        <div>
          <p className="text-4xl mb-4">🏆</p>
          <p className="text-white font-black text-xl mb-2">No questions yet</p>
          <p className="text-white/50 text-sm">Check back soon!</p>
        </div>
      </div>
    );
  }

  // ── Idle ─────────────────────────────────────────────────────────────────────
  if (phase === "idle") {
    const mins = Math.floor(computedTotal / 60);
    const secs = computedTotal % 60;
    const timeLabel = mins > 0 ? `${mins}:${String(secs).padStart(2,"0")}` : `${secs}s`;
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-6">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="flex justify-center mb-3">
            <Image src="/acesslogowhite.png" alt="Access Bank" width={360} height={120} className="h-32 w-auto object-contain" />
          </div>
          <h1 className="text-white font-black text-4xl leading-none mb-1 text-center">World Cup</h1>
          <h1 className="font-black text-4xl leading-none mb-8 text-center" style={{ color: "#ee7e01" }}>Trivia</h1>

          {/* Stats inline */}
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

          {/* Instructions */}
          <p className="text-white/60 text-lg leading-relaxed mb-8 text-center">
            Answer up to <span className="text-white font-bold">10 correct questions</span> within{" "}
            <span className="text-white font-bold">1:30</span> to win a coupon redeemable here.
          </p>

          <button
            type="button"
            onClick={startGame}
            className="w-full rounded-2xl py-4 text-base font-black uppercase tracking-widest transition-all active:scale-95"
            style={{ background: "#ee7e01", color: "#fff" }}
          >
            Start →
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
          <h1 className="font-black text-4xl leading-none mb-10" style={{ color: "#ee7e01" }}>Won!</h1>

          <div className="flex items-center justify-center gap-6 mb-10">
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

          <p className="text-white/60 text-sm leading-relaxed mb-10">
            Show this screen to redeem your <span className="text-white font-bold">coupon</span> at any Access Bank viewing centre.
          </p>

          <button
            type="button"
            onClick={startGame}
            className="w-full rounded-2xl py-4 text-base font-black uppercase tracking-widest transition-all active:scale-95"
            style={{ background: "#fff", color: "#000" }}
          >
            Play Again →
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
            onClick={startGame}
            className="w-full rounded-2xl py-4 text-base font-black uppercase tracking-widest transition-all active:scale-95"
            style={{ background: "#ee7e01", color: "#fff" }}
          >
            Try Again →
          </button>
        </div>
      </div>
    );
  }

  // ── Playing ──────────────────────────────────────────────────────────────────
  const q = questions[current];

  return (
    <div className="px-5 pt-4 pb-8 flex flex-col" style={{ minHeight: "calc(100vh - 4rem)" }}>

      {/* SCORE — top right */}
      <div className="flex justify-end mb-6">
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
            {current + 1}/{questions.length}
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

          if (revealed) {
            if (isCorrect) { bg = "#dcfce7"; border = "1.5px solid #22c55e"; color = "#15803d"; }
            else if (isSelected) { bg = "#fee2e2"; border = "1.5px solid #ef4444"; color = "#b91c1c"; }
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
              {revealed && isCorrect  && <span className="ml-2">✓</span>}
              {revealed && isSelected && !isCorrect && <span className="ml-2">✗</span>}
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
    </div>
  );
}
