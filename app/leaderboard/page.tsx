import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Leaderboard from "@/app/components/Leaderboard";
import Footer from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "Leaderboard · Access Bank World Cup Predictions",
  description: "See the latest leaderboard rankings.",
};

export default function LeaderboardPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-16">
        <Leaderboard />
      </main>
      <Footer />
    </>
  );
}
