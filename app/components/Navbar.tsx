"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type PickEntry = {
  matchId: number;
  teamA: string;
  teamB: string;
  fullTimeWinner: string;
  firstHalfWinner?: string;
};

type MatchStatus = "upcoming" | "live" | "halftime" | "finished";

const STATUS_LABEL: Record<MatchStatus, string> = {
  upcoming: "Upcoming",
  live: "Live",
  halftime: "Half Time",
  finished: "Finished",
};

const STATUS_STYLE: Record<MatchStatus, string> = {
  upcoming: "bg-gray-100 text-gray-500",
  live: "bg-green-100 text-green-700",
  halftime: "bg-orange-100 text-orange-700",
  finished: "bg-blue-100 text-blue-700",
};

// ─── Profile Sheet / Dropdown ────────────────────────────────────────────────
function ProfilePanel({
  user,
  picks,
  matchStatuses,
  onSignOut,
  onClose,
  mobile,
}: {
  user: User | null;
  picks: PickEntry[];
  matchStatuses: Record<number, MatchStatus>;
  onSignOut: () => void;
  onClose: () => void;
  mobile: boolean;
}) {
  const content = (
    <div className={mobile ? "px-5 pt-5 pb-8" : "p-4"}>
      {/* Handle bar (mobile only) */}
      {mobile && (
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
      )}

      <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-4">
        Profile
      </p>

      {user ? (
        <>
          {/* Avatar + name */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0"
              style={{
                background: "rgba(238,126,1,0.12)",
                color: "#ee7e01",
                border: "1.5px solid rgba(238,126,1,0.3)",
              }}
            >
              {user.displayName?.charAt(0).toUpperCase() ||
                user.email?.charAt(0).toUpperCase() ||
                "U"}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">
                {user.displayName || "No display name"}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* Picks list */}
          {picks.length > 0 && (
            <div className="mb-4">
              <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
                My Picks ({picks.length})
              </p>
              <div
                className="rounded-xl border border-gray-100 overflow-hidden"
                style={{ maxHeight: mobile ? 280 : 220, overflowY: "auto" }}
              >
                {picks.map((pick, i) => {
                  const status = matchStatuses[pick.matchId] ?? "upcoming";
                  return (
                    <div
                      key={pick.matchId}
                      className={`px-3 py-2.5 ${i > 0 ? "border-t border-gray-100" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700 truncate">
                          {pick.teamA} vs {pick.teamB}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLE[status]}`}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Pick:{" "}
                        <span className="font-bold text-gray-800">
                          {pick.fullTimeWinner}
                        </span>
                        {pick.firstHalfWinner && (
                          <span className="ml-2 text-gray-400">
                            HT: {pick.firstHalfWinner}
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {picks.length === 0 && (
            <p className="text-xs text-gray-400 mb-4">No picks made yet.</p>
          )}

          <button
            type="button"
            onClick={onSignOut}
            className="w-full rounded-xl py-2.5 text-sm font-bold transition-colors"
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
            }}
          >
            Sign Out
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-4">
            You are not signed in yet.
          </p>
        </>
      )}
    </div>
  );

  if (mobile) {
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col justify-end"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="w-full rounded-t-3xl"
          style={{
            background: "#fff",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute right-0 top-[calc(100%+10px)] w-72 rounded-2xl z-[70]"
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 16px 38px rgba(17,24,39,0.16)",
      }}
    >
      {content}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [picks, setPicks] = useState<PickEntry[]>([]);
  const [matchStatuses, setMatchStatuses] = useState<Record<number, MatchStatus>>({});
  const profileWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) { setPicks([]); return; }

      // Load user picks
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        const raw = (snap.data().picks ?? {}) as Record<string, Record<string, unknown>>;
        const entries: PickEntry[] = Object.values(raw).map((p) => ({
          matchId: p.matchId as number,
          teamA: p.teamA as string,
          teamB: p.teamB as string,
          fullTimeWinner: (p.fullTimeWinner ?? p.winner ?? "") as string,
          firstHalfWinner: p.firstHalfWinner as string | undefined,
        }));
        setPicks(entries);
      }

      // Load admin match statuses
      const adminSnap = await getDocs(collection(db, "adminMatches"));
      const statuses: Record<number, MatchStatus> = {};
      adminSnap.forEach((d) => {
        const data = d.data() as { isCustom?: boolean; staticId?: number; status?: MatchStatus };
        if (!data.isCustom && data.staticId != null && data.status) {
          statuses[data.staticId] = data.status;
        }
      });
      setMatchStatuses(statuses);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (isMobile) return; // mobile uses overlay tap-to-close
      if (
        profileWrapRef.current &&
        !profileWrapRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [isMobile]);

  const profileInitial =
    user?.displayName?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  const profileNode = user ? (
    <span className="text-sm font-black">{profileInitial}</span>
  ) : (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Access Bank"
                width={120}
                height={40}
                className="object-contain"
                priority
              />
              <div
                className="hidden sm:block h-6 w-px"
                style={{ background: "#e5e7eb" }}
              />
              <span className="hidden sm:block text-xs font-bold text-gray-500 tracking-wide">
                World Cup Predictions
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link
                href="/matches"
                className="text-gray-500 hover:text-[#ee7e01] transition-colors"
              >
                Matches
              </Link>
              <Link
                href="/leaderboard"
                className="text-gray-500 hover:text-[#ee7e01] transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/enteeries"
                className="text-gray-500 hover:text-[#ee7e01] transition-colors"
              >
                Enteeries
              </Link>
              <Link
                href="/admin"
                className="text-gray-500 hover:text-[#ee7e01] transition-colors"
              >
                Admin
              </Link>
              <Link
                href="/#join"
                className="text-gray-500 hover:text-[#ee7e01] transition-colors"
              >
                Join Free
              </Link>
            </div>

            {/* Right side — profile button (always visible) + hamburger */}
            <div className="flex items-center gap-2">
              {/* Profile avatar button */}
              <div className="relative" ref={profileWrapRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((o) => !o)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  style={{
                    background: user ? "rgba(238,126,1,0.15)" : "#f3f4f6",
                    border: user
                      ? "1.5px solid rgba(238,126,1,0.4)"
                      : "1.5px solid #e5e7eb",
                    color: user ? "#ee7e01" : "#6b7280",
                  }}
                  aria-label="Open profile menu"
                  aria-expanded={profileOpen}
                >
                  {profileNode}
                </button>

                {/* Desktop dropdown */}
                {profileOpen && !isMobile && (
                  <ProfilePanel
                    user={user}
                    picks={picks}
                    matchStatuses={matchStatuses}
                    mobile={false}
                    onClose={() => setProfileOpen(false)}
                    onSignOut={() => {
                      void signOut(auth);
                      setProfileOpen(false);
                    }}
                  />
                )}
              </div>

              {/* Hamburger (mobile only) */}
              <button
                className="md:hidden text-gray-700 p-2"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                <div className="w-5 flex flex-col gap-1">
                  <span
                    className={`block h-0.5 bg-gray-700 transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`}
                  />
                  <span
                    className={`block h-0.5 bg-gray-700 transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`}
                  />
                  <span
                    className={`block h-0.5 bg-gray-700 transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`}
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Mobile nav links */}
          {menuOpen && (
            <div className="md:hidden py-4 flex flex-col gap-4 border-t border-gray-100">
              <Link
                href="/matches"
                className="text-gray-600 hover:text-[#ee7e01] transition-colors font-medium"
                onClick={() => setMenuOpen(false)}
              >
                Matches
              </Link>
              <Link
                href="/leaderboard"
                className="text-gray-600 hover:text-[#ee7e01] transition-colors font-medium"
                onClick={() => setMenuOpen(false)}
              >
                Leaderboard
              </Link>
              <Link
                href="/enteeries"
                className="text-gray-600 hover:text-[#ee7e01] transition-colors font-medium"
                onClick={() => setMenuOpen(false)}
              >
                Enteeries
              </Link>
              <Link
                href="/admin"
                className="text-gray-600 hover:text-[#ee7e01] transition-colors font-medium"
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
              <Link
                href="/#join"
                className="text-gray-600 hover:text-[#ee7e01] transition-colors font-medium"
                onClick={() => setMenuOpen(false)}
              >
                Join Free
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile profile bottom sheet */}
      {profileOpen && isMobile && (
        <ProfilePanel
          user={user}
          picks={picks}
          matchStatuses={matchStatuses}
          mobile={true}
          onClose={() => setProfileOpen(false)}
          onSignOut={() => {
            void signOut(auth);
            setProfileOpen(false);
          }}
        />
      )}
    </>
  );
}
