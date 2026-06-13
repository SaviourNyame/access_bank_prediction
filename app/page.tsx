import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import JoinSection from "./components/JoinSection";
import Footer from "./components/Footer";
import {
  MatchDashboard,
  TodayMatchesPopup,
} from "./components/ClientComponents";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ location?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const locationId = Array.isArray(resolvedSearchParams.location)
    ? resolvedSearchParams.location[0]
    : resolvedSearchParams.location;

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection location={locationId} />
        <MatchDashboard />
        <JoinSection locationId={locationId} />
      </main>
      <Footer />
      <TodayMatchesPopup />
    </>
  );
}
