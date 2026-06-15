import type { Metadata } from "next";
import Image from "next/image";
import Navbar from "@/app/components/Navbar";
import TriviaClient from "./TriviaClient";

export const metadata: Metadata = {
  title: "Trivia · Access Bank World Cup 2026",
  description: "Test your football knowledge with World Cup trivia questions.",
};

export default function TriviaPage() {
  return (
    <>
      <Navbar />

      <div className="relative min-h-screen">
        {/* ── Backgrounds (same as hero) ── */}
        <div
          className="fixed inset-0 hidden sm:block"
          style={{
            backgroundImage: "url('/background_web.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            zIndex: 0,
          }}
        />
        <div
          className="fixed inset-0 sm:hidden"
          style={{
            backgroundImage: "url('/background_mobile.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            zIndex: 0,
          }}
        />

        {/* Dark vignette */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ background: "rgba(0,0,0,0.82)", zIndex: 1 }}
        />

        {/* Bottom gradient fade */}
        <div
          className="fixed bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))",
            zIndex: 1,
          }}
        />

        {/* Orange accent bar at top (sits just below navbar) */}
        <div
          className="fixed top-0 left-0 right-0 h-1 pointer-events-none"
          style={{
            background: "linear-gradient(90deg, #ee7e01, #ffb347, #ee7e01)",
            zIndex: 49,
          }}
        />

        {/* ── Blue.png pinned to bottom (mobile only) ── */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 pointer-events-none flex justify-center" style={{ zIndex: 2 }}>
          <Image
            src="/Blue.png"
            alt=""
            width={1920}
            height={400}
            priority
            className="w-full object-bottom"
            style={{ maxHeight: "120px", height: "auto" }}
            sizes="100vw"
          />
        </div>

        {/* ── coupon.png + text pinned to bottom (mobile only) ── */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 pointer-events-none flex flex-col items-center pb-4" style={{ zIndex: 3 }}>
          <Image
            src="/coupon.png"
            alt=""
            width={400}
            height={140}
            priority
            className="w-[18%] h-auto"
            sizes="38vw"
          />
          <p className="text-white font-black text-lg tracking-widest uppercase mt-2 leading-tight text-center">
            Redeem Coupons
          </p>
          <p className="text-white/80 font-semibold text-xs tracking-wider uppercase text-center">
            At any of our viewing centres
          </p>
          <p className="text-white/60 text-[11px] text-center mt-2">
            By joining you agree to our{" "}
            <span className="text-[#ee7e01] font-semibold">Terms &amp; Conditions</span>
          </p>
        </div>

        {/* Content */}
        <div className="relative pt-16 sm:pb-0 pb-52" style={{ zIndex: 10 }}>
          <TriviaClient />
        </div>
      </div>
    </>
  );
}
