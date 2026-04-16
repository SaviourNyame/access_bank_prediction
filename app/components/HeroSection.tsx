"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const SLIDES = [
  { src: "/ACCESS_IMAGE_1.png", alt: "Access Bank World Cup 2026" },
  { src: "/ACCESS_IMAGE_2.png", alt: "Access Bank World Cup 2026" },
  { src: "/ACCESS_IMAGE_3.png", alt: "Access Bank World Cup 2026" },
];

export default function HeroSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  function goTo(i: number) {
    setCurrent(i);
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* ── Background slides ── */}
      {SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className="absolute inset-0"
          style={{
            transition: "opacity 900ms ease-in-out",
            opacity: i === current ? 1 : 0,
            zIndex: i === current ? 1 : 0,
          }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            className="object-cover object-center"
            priority={i === 0}
            sizes="100vw"
          />
        </div>
      ))}

      {/* ── Overlays ── */}
      {/* dark vignette */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: "rgba(0,0,0,0.52)" }}
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

      {/* ── Content ── */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-32">
        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black leading-none tracking-tight mb-6 text-white drop-shadow-xl">
          Predict. <span style={{ color: "#ee7e01" }}>Win.</span>
          <br className="hidden sm:block" />
          <span className="text-4xl sm:text-6xl lg:text-7xl opacity-90">
            Repeat.
          </span>
        </h1>

        {/* Sub */}
        <p className="text-base sm:text-xl text-white/75 max-w-xl mx-auto mb-10 leading-relaxed">
          Pick winners, call exact scores, and climb to the top of the Access
          Bank leaderboard. The ultimate football prediction challenge.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="#join"
            className="btn-orange px-8 py-4 text-base font-bold inline-flex items-center justify-center gap-2"
            style={{ boxShadow: "0 0 28px rgba(238,126,1,0.45)" }}
          >
            Join Free — Start Predicting
          </Link>
          <Link
            href="/matches"
            className="px-8 py-4 text-base font-bold inline-flex items-center justify-center gap-2 transition-all hover:bg-white/20"
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

        {/* Stats */}
        <div className="mt-16 flex flex-col sm:flex-row items-stretch justify-center gap-px">
          {[
            { label: "Active Players", value: "12,400+" },
            { label: "Matches", value: "72" },
            { label: "Points to Win", value: "∞" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="text-center py-4 px-8 sm:px-10 flex-1"
              style={{
                background: "rgba(255,255,255,0.07)",
                backdropFilter: "blur(8px)",
                borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.12)" : "none",
              }}
            >
              <div
                className="text-3xl sm:text-4xl font-black"
                style={{ color: "#ee7e01" }}
              >
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-white/60 mt-1 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Slide dots ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="transition-all duration-300"
            style={{
              width: i === current ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === current ? "#ee7e01" : "rgba(255,255,255,0.4)",
              border: "none",
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </section>
  );
}
