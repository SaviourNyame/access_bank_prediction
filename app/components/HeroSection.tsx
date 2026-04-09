import Link from "next/link";
import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-bg stadium-pattern">
      {/* Decorative orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none animate-glow-pulse"
        style={{
          background:
            "radial-gradient(circle, rgba(238,126,1,0.1) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full pointer-events-none animate-glow-pulse"
        style={{
          background:
            "radial-gradient(circle, rgba(238,126,1,0.07) 0%, transparent 70%)",
          filter: "blur(60px)",
          animationDelay: "1.2s",
        }}
      />

      {/* Floating decorations */}
      <div
        className="absolute right-10 top-1/3 hidden lg:block animate-float opacity-20 pointer-events-none"
        aria-hidden="true"
      >
        <div className="text-9xl">🏆</div>
      </div>
      <div
        className="absolute left-10 bottom-1/3 hidden lg:block animate-float opacity-15 pointer-events-none"
        style={{ animationDelay: "1.5s" }}
        aria-hidden="true"
      >
        <div className="text-7xl">⚽</div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
        {/* World Cup logo */}
        <div className="mb-5 sm:mb-6 animate-fade-in-up">
          <Image
            src="/worldcuplogo.svg.png"
            alt="World Cup 2026 logo"
            width={210}
            height={210}
            className="mx-auto h-auto w-28 sm:w-36 lg:w-44 object-contain"
            priority
          />
        </div>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl lg:text-8xl font-black leading-none tracking-tight mb-6 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="block text-gray-900">Predict.</span>
          <span className="block text-gray-900">Compete.</span>
          <span className="block" style={{ color: "#ee7e01" }}>
            Win.
          </span>
        </h1>

        {/* Sub */}
        <p
          className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-4 animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          The ultimate World Cup prediction challenge. Pick winners, call exact
          scores, and climb to the top of the leaderboard.
        </p>
        <div
          className="flex items-center justify-center gap-2 mb-10 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">
            Powered by
          </span>
          <Image
            src="/logo.png"
            alt="Access Bank"
            width={100}
            height={34}
            className="object-contain"
          />
        </div>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          <Link
            href="#join"
            className="btn-orange px-8 py-4 text-base font-bold orange-glow inline-block"
          >
            Join Predictions — It&apos;s Free
          </Link>
          <Link
            href="#matches"
            className="px-8 py-4 text-base font-bold inline-block transition-all hover:border-[#ee7e01] hover:text-[#ee7e01] text-gray-700"
            style={{ background: "white", border: "1.5px solid #e5e7eb" }}
          >
            View Matches ↓
          </Link>
        </div>

        {/* Stats */}
        <div
          className="mt-16 max-w-2xl mx-auto animate-fade-in-up"
          style={{ animationDelay: "0.5s" }}
        >
          <div className="flex flex-col sm:flex-row items-stretch justify-center divide-y sm:divide-y-0 sm:divide-x divide-gray-200/90">
            {[
              { label: "Active Players", value: "12,400+" },
              { label: "Matches", value: "64" },
              { label: "Max Points", value: "∞" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center py-4 sm:py-2 px-6 sm:px-10"
              >
                <div
                  className="text-3xl sm:text-4xl font-black"
                  style={{ color: "#ee7e01" }}
                >
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, #f7f8fa)",
        }}
      />
    </section>
  );
}
