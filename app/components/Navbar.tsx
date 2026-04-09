"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

function ProfileDropdown({
  user,
  points,
  onSignOut,
}: {
  user: User | null;
  points: number;
  onSignOut: () => void;
}) {
  return (
    <div
      className="absolute right-0 top-[calc(100%+10px)] w-[min(90vw,320px)] rounded-2xl p-4 z-[70]"
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 16px 38px rgba(17,24,39,0.16)",
      }}
    >
      <div className="mb-3">
        <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">
          Profile
        </p>
      </div>

      {user ? (
        <>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-gray-500">Name: </span>
              <span className="font-semibold text-gray-900">
                {user.displayName || "No display name"}
              </span>
            </div>
            <div className="text-sm break-all">
              <span className="text-gray-500">Email: </span>
              <span className="font-semibold text-gray-900">{user.email}</span>
            </div>
            <div className="text-xs break-all text-gray-500">
              User ID: {user.uid}
            </div>
          </div>

          <div
            className="mt-4 mb-3 px-3 py-2 rounded-xl flex items-center justify-between"
            style={{
              background: "rgba(238,126,1,0.08)",
              border: "1px solid rgba(238,126,1,0.22)",
            }}
          >
            <span className="text-sm font-semibold text-gray-700">
              Total Points
            </span>
            <span className="text-base font-black" style={{ color: "#ee7e01" }}>
              {points}
            </span>
          </div>

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
          <p className="text-sm text-gray-600 mb-3">
            You are not signed in yet.
          </p>
          <div
            className="px-3 py-2 rounded-xl flex items-center justify-between"
            style={{
              background: "rgba(238,126,1,0.08)",
              border: "1px solid rgba(238,126,1,0.22)",
            }}
          >
            <span className="text-sm font-semibold text-gray-700">
              Total Points
            </span>
            <span className="text-base font-black" style={{ color: "#ee7e01" }}>
              {points}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const desktopProfileWrapRef = useRef<HTMLDivElement | null>(null);
  const mobileProfileWrapRef = useRef<HTMLDivElement | null>(null);
  const points = 47;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      const inDesktop = desktopProfileWrapRef.current?.contains(target);
      const inMobile = mobileProfileWrapRef.current?.contains(target);

      if (!inDesktop && !inMobile) {
        setProfileOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const profileInitial =
    user?.displayName?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  const profileNode = user ? (
    <span>{profileInitial}</span>
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
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
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
          </div>

          {/* Desktop nav */}
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
              href="/#join"
              className="text-gray-500 hover:text-[#ee7e01] transition-colors"
            >
              Join Free
            </Link>
          </div>

          {/* Profile */}
          <div className="hidden md:flex items-center gap-3">
            <div className="relative" ref={desktopProfileWrapRef}>
              <button
                type="button"
                title={user ? (user.email ?? "Profile") : "Profile"}
                onClick={() => setProfileOpen((open) => !open)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-colors active:scale-95 cursor-pointer"
                style={{
                  background: user ? "rgba(238,126,1,0.15)" : "#f3f4f6",
                  border: user
                    ? "1px solid rgba(238,126,1,0.35)"
                    : "1px solid #e5e7eb",
                  color: user ? "#ee7e01" : "#6b7280",
                  touchAction: "manipulation",
                }}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-label="Open profile menu"
              >
                {profileNode}
              </button>

              {profileOpen && (
                <ProfileDropdown
                  user={user}
                  points={points}
                  onSignOut={() => {
                    void signOut(auth);
                    setProfileOpen(false);
                  }}
                />
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-gray-700 p-2"
            onClick={() => setMenuOpen(!menuOpen)}
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

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 flex flex-col gap-4 border-t border-gray-100">
            <Link
              href="/matches"
              className="text-gray-600 hover:text-[#ee7e01] transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Matches
            </Link>
            <Link
              href="/leaderboard"
              className="text-gray-600 hover:text-[#ee7e01] transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Leaderboard
            </Link>
            <Link
              href="/#join"
              className="text-gray-600 hover:text-[#ee7e01] transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Join Free
            </Link>
            <div className="flex items-center gap-3 pt-2">
              <div className="relative" ref={mobileProfileWrapRef}>
                <button
                  type="button"
                  title={user ? (user.email ?? "Profile") : "Profile"}
                  onClick={() => setProfileOpen((open) => !open)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black active:scale-95 cursor-pointer"
                  style={{
                    background: user ? "rgba(238,126,1,0.15)" : "#f3f4f6",
                    border: user
                      ? "1px solid rgba(238,126,1,0.35)"
                      : "1px solid #e5e7eb",
                    color: user ? "#ee7e01" : "#6b7280",
                    touchAction: "manipulation",
                  }}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  aria-label="Open profile menu"
                >
                  {profileNode}
                </button>

                {profileOpen && (
                  <ProfileDropdown
                    user={user}
                    points={points}
                    onSignOut={() => {
                      void signOut(auth);
                      setProfileOpen(false);
                      setMenuOpen(false);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
