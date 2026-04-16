import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

const Leaderboard = dynamic(() => import("@/app/components/Leaderboard"), {
  ssr: false,
});

export const metadata: Metadata = {
  title: "Leaderboard · Access Bank World Cup Predictions",
  description: "See the latest leaderboard rankings for the Access Bank World Cup Prediction League.",
};

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-4">
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-3"
            style={{ background: "rgba(238,126,1,0.1)", border: "1px solid rgba(238,126,1,0.25)", color: "#ee7e01" }}
          >
            Live Rankings
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-2">Leaderboard</h1>
          <p className="text-gray-500 text-sm sm:text-base">
            All registered players, ranked by points. Updated after every match result.
          </p>
        </div>
        <Leaderboard fullPage />
      </main>
      <Footer />
    </div>
  );
}
