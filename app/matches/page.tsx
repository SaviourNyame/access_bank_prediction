import type { Metadata } from "next";
import dynamic from "next/dynamic";

const MatchesClient = dynamic(() => import("./MatchesClient"), { ssr: false });

export const metadata: Metadata = {
  title: "Matches · Access Bank World Cup Predictions",
  description: "View and predict all World Cup 2026 group stage matches.",
};

export default function MatchesPage() {
  return <MatchesClient />;
}
