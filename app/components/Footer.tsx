import Image from "next/image";

export default function Footer() {
  return (
    <footer
      className="relative mt-auto py-12 px-4 sm:px-6 lg:px-8 bg-white"
      style={{ borderTop: "1.5px solid #e5e7eb" }}
    >
      {/* Top orange line accent */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, #ee7e01, transparent)",
        }}
      />

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mb-10">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Image
                src="/logo.png"
                alt="Access Bank"
                width={130}
                height={44}
                className="object-contain"
              />
              <div className="text-xs font-bold text-gray-500 tracking-wide uppercase">
                World Cup Predictions
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
              The official World Cup prediction challenge powered by Access
              Bank. Predict, compete, and win with Africa&apos;s most resilient
              bank.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              Quick Links
            </h4>
            {["Matches", "Leaderboard", "Join Free", "How It Works"].map(
              (link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase().replace(/\s+/g, "")}`}
                  className="text-sm text-gray-500 hover:text-[#ee7e01] transition-colors w-fit"
                >
                  {link}
                </a>
              ),
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-xs text-gray-400"
          style={{ borderTop: "1px solid #f0f0f0" }}
        >
          <span>© 2026 Access Bank PLC. All rights reserved.</span>
          <span className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-orange inline-block"
              style={{ background: "#ee7e01" }}
            />
            Powered by{" "}
            <span className="font-semibold" style={{ color: "#ee7e01" }}>
              Access Bank
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}
