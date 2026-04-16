"use client";

// Dynamic imports with ssr: false must live inside a Client Component.
// Server Components (pages) import from here instead of directly.
import dynamic from "next/dynamic";

export const MatchDashboard = dynamic(() => import("./MatchDashboard"), {
  ssr: false,
});

export const Leaderboard = dynamic(() => import("./Leaderboard"), {
  ssr: false,
});

export const TodayMatchesPopup = dynamic(() => import("./TodayMatchesPopup"), {
  ssr: false,
});

export const MatchesClient = dynamic(
  () => import("@/app/matches/MatchesClient"),
  { ssr: false },
);
