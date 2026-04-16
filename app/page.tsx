import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import JoinSection from "./components/JoinSection";
import MatchDashboard from "./components/MatchDashboard";
import Leaderboard from "./components/Leaderboard";
import Footer from "./components/Footer";
import TodayMatchesPopup from "./components/TodayMatchesPopup";

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
