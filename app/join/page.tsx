import type { Metadata } from "next";
import Link from "next/link";
import { SIGNUP_LOCATIONS } from "@/app/components/JoinSection";

export const metadata: Metadata = {
  title: "Location Signup Links · Access Bank World Cup Predictions",
  description:
    "Choose a signup location and open its dedicated registration link.",
};

export default function JoinLinksPage() {
  return (
    <div className="min-h-screen bg-[#f8fbff]">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="rounded-3xl border border-sky-100 bg-white shadow-[0_18px_50px_rgba(14,53,92,0.1)] overflow-hidden">
          <div className="px-6 sm:px-8 py-8 bg-gradient-to-r from-sky-950 via-sky-900 to-slate-900 text-white">
            <p className="text-xs uppercase tracking-[0.24em] font-bold text-amber-300 mb-2">
              Signup Locations
            </p>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight">
              Generate location-specific signup links
            </h1>
            <p className="text-sky-100/85 mt-3 max-w-2xl text-sm sm:text-base">
              Share one link for each venue. When someone signs up from a link,
              their location is saved to their user record in Firestore.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6 sm:p-8">
            {SIGNUP_LOCATIONS.map((location) => (
              <Link
                key={location.id}
                href={`/join/${location.id}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:border-[#ee7e01] hover:shadow-md transition-all"
              >
                <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">
                  {location.id}
                </p>
                <h2 className="text-xl font-black text-slate-900">
                  {location.name}
                </h2>
                <p className="text-sm text-slate-500 mt-2 break-all">
                  /join/{location.id}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
