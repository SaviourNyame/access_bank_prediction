"use client";

import { useEffect, useRef, useState } from "react";

type Player = {
  rank: number;
  username: string;
  points: number;
  maxPoints: number;
};

const PLAYERS: Player[] = [
  { rank: 1, username: "KofiStarBoy", points: 187, maxPoints: 200 },
  { rank: 2, username: "LagosPredictor", points: 174, maxPoints: 200 },
  { rank: 3, username: "AccraCFC", points: 161, maxPoints: 200 },
  { rank: 4, username: "FutbolFanatic", points: 148, maxPoints: 200 },
  { rank: 5, username: "WorldCupKing", points: 139, maxPoints: 200 },
  { rank: 6, username: "GoalSeeker", points: 127, maxPoints: 200 },
  { rank: 7, username: "TacticsGuru", points: 115, maxPoints: 200 },
  { rank: 8, username: "PredictorX9", points: 103, maxPoints: 200 },
];

function RankLabel({ rank }: { rank: number }) {
  if (rank === 1)
    return <span className="text-lg sm:text-xl font-black rank-gold">#1</span>;
  if (rank === 2)
    return (
      <span className="text-lg sm:text-xl font-black rank-silver">#2</span>
    );
  if (rank === 3)
    return (
      <span className="text-lg sm:text-xl font-black rank-bronze">#3</span>
    );
  return (
    <span className="text-sm sm:text-base font-bold text-gray-400">
      #{rank}
    </span>
  );
}

function ProgressBar({
  points,
  maxPoints,
  animate,
}: {
  points: number;
  maxPoints: number;
  animate: boolean;
}) {
  const pct = Math.round((points / maxPoints) * 100);
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden bg-gray-100">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{
          width: animate ? `${pct}%` : "0%",
          background: "linear-gradient(90deg, #ee7e01, #ffaa44)",
        }}
      />
    </div>
  );
}

export default function Leaderboard() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const top3 = PLAYERS.slice(0, 3);

  return (
    <section id="leaderboard" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-4xl mx-auto" ref={ref}>
        {/* Header */}
        <div className="text-center mb-12">
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
            style={{
              background: "rgba(238,126,1,0.1)",
              border: "1px solid rgba(238,126,1,0.25)",
              color: "#ee7e01",
            }}
          >
            Rankings
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-900 mb-3">
            Top Predictors
          </h2>
          <p className="text-sm sm:text-base text-gray-500">
            Updated after every match result.
          </p>
        </div>

        {/* Podium top 3 */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
          {top3.map((player, i) => {
            const style = [
              {
                border: "rgba(251,191,36,0.5)",
                shadow: "0 4px 20px rgba(251,191,36,0.15)",
                medal: "🥇",
                order: 2,
              },
              {
                border: "rgba(156,163,175,0.5)",
                shadow: "0 4px 16px rgba(156,163,175,0.12)",
                medal: "🥈",
                order: 1,
              },
              {
                border: "rgba(205,127,50,0.45)",
                shadow: "0 4px 16px rgba(205,127,50,0.12)",
                medal: "🥉",
                order: 3,
              },
            ][i];
            return (
              <div
                key={player.rank}
                className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col items-center gap-2 sm:gap-3 text-center"
                style={{
                  border: `1.5px solid ${style.border}`,
                  boxShadow: style.shadow,
                  order: style.order,
                }}
              >
                <span className="text-2xl sm:text-3xl">{style.medal}</span>
                <div>
                  <div className="font-bold text-gray-800 text-xs sm:text-sm">
                    {player.username}
                  </div>
                  <div
                    className="text-xl sm:text-2xl font-black mt-1"
                    style={{ color: "#ee7e01" }}
                  >
                    {player.points}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-400">
                    points
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Full table */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{
            border: "1.5px solid #e5e7eb",
            boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
          }}
        >
          {/* Header row */}
          <div
            className="hidden sm:grid grid-cols-12 px-3 sm:px-6 py-2.5 sm:py-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-400"
            style={{
              background: "#f9fafb",
              borderBottom: "1.5px solid #e5e7eb",
            }}
          >
            <span className="col-span-1">Rank</span>
            <span className="col-span-5">Player</span>
            <span className="col-span-4">Progress</span>
            <span className="col-span-2 text-right">Pts</span>
          </div>

          {PLAYERS.map((player, idx) => {
            const pct = Math.round((player.points / player.maxPoints) * 100);

            return (
              <div
                key={player.rank}
                className="grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3 sm:py-4 transition-colors hover:bg-orange-50/50"
                style={{
                  borderBottom:
                    idx < PLAYERS.length - 1 ? "1px solid #f3f4f6" : "none",
                }}
              >
                {/* Mobile row */}
                <div className="sm:hidden flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <RankLabel rank={player.rank} />
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">
                        {player.username}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="font-black text-lg leading-none"
                      style={{ color: "#ee7e01" }}
                    >
                      {player.points}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">pts</div>
                  </div>
                </div>

                {/* Desktop columns */}
                <div className="hidden sm:block sm:col-span-1">
                  <RankLabel rank={player.rank} />
                </div>
                <div className="hidden sm:block sm:col-span-5">
                  <div className="font-semibold text-gray-800 text-xs sm:text-sm">
                    {player.username}
                  </div>
                </div>

                <div className="sm:col-span-4 sm:pr-4">
                  <div className="flex items-center justify-between sm:hidden mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Progress
                    </span>
                    <span className="text-[10px] font-semibold text-gray-500">
                      {pct}%
                    </span>
                  </div>
                  <ProgressBar
                    points={player.points}
                    maxPoints={player.maxPoints}
                    animate={visible}
                  />
                </div>

                <div
                  className="hidden sm:block sm:col-span-2 text-right font-black text-base sm:text-lg"
                  style={{ color: "#ee7e01" }}
                >
                  {player.points}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-6">
          <button className="text-sm font-semibold text-[#ee7e01] hover:text-[#c96800] transition-colors">
            View Full Leaderboard →
          </button>
        </div>
      </div>
    </section>
  );
}
