import type { Metadata } from "next";
import MatchesClient from "./MatchesClient";

export const metadata: Metadata = {
  title: "Matches · Access Bank World Cup Predictions",
  description: "View and predict all World Cup 2026 group stage matches.",
};

export default function MatchesPage() {
  return <MatchesClient />;
}
