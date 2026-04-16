import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import JoinSection from "./components/JoinSection";
import Footer from "./components/Footer";
import { MatchDashboard, Leaderboard, TodayMatchesPopup } from "./components/ClientComponents";

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
