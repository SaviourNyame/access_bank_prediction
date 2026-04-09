"use client";

import { useEffect, useRef, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Player = {
  uid: string;
  username: string;
  points: number;
  predictions: number;
};

// Shown inline on the home page (section variant) or as a full page
export default function Leaderboard({ fullPage = false }: { fullPage?: boolean }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const q = query(collection(db, "users"), orderBy("points", "desc"));
        const snap = await getDocs(q);
        const rows: Player[] = snap.docs.map((d) => {
          const data = d.data() as {
            displayName?: string;
            email?: string;
            points?: number;
            picks?: Record<string, unknown>;
          };
          const username =
            data.displayName ||
            (data.email ? data.email.split("@")[0] : "Anonymous");
          const predictions = data.picks ? Object.keys(data.picks).length : 0;
          return {
            uid: d.id,
            username,
            points: typeof data.points === "number" ? data.points : 0,
            predictions,
          };
        });
        setPlayers(rows);
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setLoading(false);
      }
    }
    void fetchLeaderboard();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const displayed = fullPage ? players : players.slice(0, 8);
  const top3 = displayed.slice(0, 3);
  const maxPoints = players[0]?.points || 1;

  const podiumStyles = [
    { border: "rgba(251,191,36,0.5)", shadow: "0 4px 20px rgba(251,191,36,0.15)", medal: "🥇", order: 2 },
    { border: "rgba(156,163,175,0.5)", shadow: "0 4px 16px rgba(156,163,175,0.12)", medal: "🥈", order: 1 },
    { border: "rgba(205,127,50,0.45)", shadow: "0 4px 16px rgba(205,127,50,0.12)", medal: "🥉", order: 3 },
  ];

  return (
    <section
      id="leaderboard"
      className={`px-4 sm:px-6 lg:px-8 bg-white ${fullPage ? "py-12" : "py-24"}`}
    >
      <div className="max-w-4xl mx-auto" ref={ref}>
        {/* Header — only shown in home page section, not the dedicated page */}
        {!fullPage && (
          <div className="text-center mb-12">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
              style={{ background: "rgba(238,126,1,0.1)", border: "1px solid rgba(238,126,1,0.25)", color: "#ee7e01" }}
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
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <div
              className="w-10 h-10 rounded-full border-4 border-gray-200 animate-spin"
              style={{ borderTopColor: "#ee7e01" }}
            />
            <p className="text-sm text-gray-400">Loading leaderboard…</p>
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🏆</p>
            <p className="text-lg font-bold text-gray-700 mb-2">No scores yet</p>
            <p className="text-sm text-gray-400">
              Be the first to submit predictions and claim the top spot!
            </p>
          </div>
        ) : (
          <>
            {/* Podium top 3 */}
            {top3.length >= 1 && (
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
                {top3.map((player, i) => {
                  const s = podiumStyles[i];
                  return (
                    <div
                      key={player.uid}
                      className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col items-center gap-2 sm:gap-3 text-center"
                      style={{ border: `1.5px solid ${s.border}`, boxShadow: s.shadow, order: s.order }}
                    >
                      <span className="text-2xl sm:text-3xl">{s.medal}</span>
                      <div>
                        <div className="font-bold text-gray-800 text-xs sm:text-sm break-all">
                          {player.username}
                        </div>
                        <div className="text-xl sm:text-2xl font-black mt-1" style={{ color: "#ee7e01" }}>
                          {player.points}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-400">points</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full table */}
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ border: "1.5px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}
            >
              {/* Header row */}
              <div
                className="hidden sm:grid grid-cols-12 px-6 py-3 text-xs font-bold uppercase tracking-widest text-gray-400"
                style={{ background: "#f9fafb", borderBottom: "1.5px solid #e5e7eb" }}
              >
                <span className="col-span-1">Rank</span>
                <span className="col-span-5">Player</span>
                <span className="col-span-3">Progress</span>
                <span className="col-span-2 text-center">Picks</span>
                <span className="col-span-1 text-right">Pts</span>
              </div>

              {displayed.map((player, idx) => {
                const rank = idx + 1;
                const pct = Math.round((player.points / maxPoints) * 100);
                return (
                  <div
                    key={player.uid}
                    className="grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-2 sm:gap-0 px-4 sm:px-6 py-3 sm:py-4 transition-colors hover:bg-orange-50/50"
                    style={{ borderBottom: idx < displayed.length - 1 ? "1px solid #f3f4f6" : "none" }}
                  >
                    {/* Mobile row */}
                    <div className="sm:hidden flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <RankBadge rank={rank} />
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">{player.username}</div>
                          <div className="text-xs text-gray-400">{player.predictions} picks</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-lg leading-none" style={{ color: "#ee7e01" }}>
                          {player.points}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">pts</div>
                      </div>
                    </div>

                    {/* Desktop columns */}
                    <div className="hidden sm:flex sm:col-span-1 items-center">
                      <RankBadge rank={rank} />
                    </div>
                    <div className="hidden sm:block sm:col-span-5">
                      <div className="font-semibold text-gray-800 text-sm">{player.username}</div>
                    </div>
                    <div className="hidden sm:block sm:col-span-3 sm:pr-4">
                      <div className="w-full h-1.5 rounded-full overflow-hidden bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: visible ? `${pct}%` : "0%",
                            background: "linear-gradient(90deg, #ee7e01, #ffaa44)",
                          }}
                        />
                      </div>
                    </div>
                    <div className="hidden sm:block sm:col-span-2 text-center text-sm text-gray-500 font-semibold">
                      {player.predictions}
                    </div>
                    <div className="hidden sm:block sm:col-span-1 text-right font-black text-lg" style={{ color: "#ee7e01" }}>
                      {player.points}
                    </div>
                  </div>
                );
              })}
            </div>

            {!fullPage && players.length > 8 && (
              <div className="text-center mt-6">
                <a
                  href="/leaderboard"
                  className="text-sm font-semibold hover:opacity-75 transition-opacity"
                  style={{ color: "#ee7e01" }}
                >
                  View Full Leaderboard →
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg sm:text-xl font-black" style={{ color: "#f59e0b" }}>#1</span>;
  if (rank === 2) return <span className="text-lg sm:text-xl font-black" style={{ color: "#9ca3af" }}>#2</span>;
  if (rank === 3) return <span className="text-lg sm:text-xl font-black" style={{ color: "#cd7f32" }}>#3</span>;
  return <span className="text-sm sm:text-base font-bold text-gray-400">#{rank}</span>;
}
