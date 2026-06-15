"use client";

import Link from "next/link";
import Image from "next/image";

export default function HeroSection({ location }: { location?: string }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* ── Responsive background image ── */}
      <div
        className="absolute inset-0 hidden sm:block"
        style={{
          backgroundImage: "url('/background_web.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        className="absolute inset-0 sm:hidden"
        style={{
          backgroundImage: "url('/background_mobile.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* ── Overlays ── */}
      {/* dark vignette */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: "rgba(0,0,0,0.82)" }}
      />
      {/* bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))",
        }}
      />
      {/* orange accent bar at top */}
      <div
        className="absolute top-0 left-0 right-0 h-1 z-20 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, #ee7e01, #ffb347, #ee7e01)",
        }}
      />

      {/* ── Blue.png + coupon.png pinned to bottom (mobile only) ── */}
      <div className="sm:hidden absolute bottom-0 left-0 right-0 z-20 pointer-events-none flex justify-center">
        <Image
          src="/Blue.png"
          alt=""
          width={1920}
          height={400}
          priority
          className="w-full h-auto object-bottom"
          sizes="100vw"
        />
      </div>
      <div className="sm:hidden absolute bottom-0 left-0 right-0 z-[21] pointer-events-none flex flex-col items-center pb-14">
        <Image
          src="/coupon.png"
          alt=""
          width={400}
          height={140}
          priority
          className="w-[24%] h-auto"
          sizes="24vw"
        />
        <p className="text-white font-black text-lg tracking-widest uppercase mt-2 leading-tight text-center">
          Redeem Coupons
        </p>
        <p className="text-white/80 font-semibold text-xs tracking-wider uppercase text-center">
          At any of our viewing centres
        </p>
        {location && (
          <p className="text-white font-bold text-sm tracking-wide text-center mt-1">
            📍 {location}
          </p>
        )}
        <p className="text-white/60 text-[11px] text-center mt-2">
          By joining you agree to our{" "}
          <span className="text-[#ee7e01] font-semibold">
            Terms &amp; Conditions
          </span>
        </p>
      </div>

      {/* ── Content ── */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-16 pb-8 -mt-40">
        {/* Hero title image */}
        <div className="mb-6 flex justify-center md:hidden">
          <Image
            src="/pnr.png"
            alt="Predict Win Repeat"
            width={1200}
            height={360}
            priority
            className="w-[54vw] sm:w-[48vw] lg:w-full max-w-[420px] h-auto drop-shadow-xl"
            sizes="(max-width: 640px) 54vw, (max-width: 1024px) 48vw, 420px"
          />
        </div>
        <div className="hidden md:block h-[250px]" />

        {/* Sub */}
        <p className="text-base sm:text-xl text-white/75 max-w-xl mx-auto mb-10 leading-relaxed">
          Pick winners, call exact scores, and climb to the top of the Access
          Bank leaderboard. The ultimate football prediction challenge.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="#join"
            className="btn-orange rounded-full w-[88%] max-w-[320px] lg:w-auto lg:max-w-none px-8 py-4 text-base font-bold inline-flex items-center justify-center gap-2"
            style={{
              boxShadow: "0 0 28px rgba(238,126,1,0.45)",
              borderRadius: "9999px",
            }}
          >
            Join Free — Start Predicting
          </Link>
          <Link
            href="/matches"
            className="rounded-full w-[88%] max-w-[320px] lg:w-auto lg:max-w-none px-8 py-4 text-base font-bold inline-flex items-center justify-center gap-2 transition-all hover:bg-white/20"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1.5px solid rgba(255,255,255,0.35)",
              color: "white",
              backdropFilter: "blur(6px)",
            }}
          >
            View Matches →
          </Link>
        </div>
      </div>
    </section>
  );
}
