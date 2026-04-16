import dynamic from "next/dynamic";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import JoinSection from "./components/JoinSection";
import Footer from "./components/Footer";

// Firebase-dependent components must not run during SSR — they use
// browser-only APIs and the Firebase client SDK which crashes the
// Vercel server renderer when imported at the module level.
const MatchDashboard = dynamic(() => import("./components/MatchDashboard"), {
  ssr: false,
});
const Leaderboard = dynamic(() => import("./components/Leaderboard"), {
  ssr: false,
});
const TodayMatchesPopup = dynamic(
  () => import("./components/TodayMatchesPopup"),
  { ssr: false },
);

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <MatchDashboard />
        <Leaderboard />
        <JoinSection />
      </main>
      <Footer />
      <TodayMatchesPopup />
    </>
  );
}
