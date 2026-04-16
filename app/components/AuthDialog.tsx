"use client";

import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

type Tab = "signin" | "signup";

export default function AuthDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<Tab>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function friendlyError(code: string): string {
    switch (code) {
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect email or password.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      default:
        return "Something went wrong. Please try again.";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (tab === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
      }
      onSuccess();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(friendlyError(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(17,24,39,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 24px 60px rgba(17,24,39,0.22)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #f3f4f6" }}
        >
          <div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#ee7e01" }}>
              Access Bank Predictions
            </p>
            <p className="text-base font-black text-gray-900 mt-0.5">
              {tab === "signin" ? "Sign in to predict" : "Create your account"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
            style={{ background: "#f3f4f6", fontSize: "1rem" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: "1px solid #f3f4f6" }}>
          {(["signin", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(""); }}
              className="flex-1 py-3 text-sm font-bold transition-colors"
              style={{
                color: tab === t ? "#ee7e01" : "#9ca3af",
                borderBottom: tab === t ? "2px solid #ee7e01" : "2px solid transparent",
                background: "transparent",
              }}
            >
              {t === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {tab === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Full Name / Username
              </label>
              <input
                type="text"
                required
                placeholder="e.g. KofiPredictor99"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all border border-gray-200 focus:border-[#ee7e01] bg-gray-50 focus:bg-white"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all border border-gray-200 focus:border-[#ee7e01] bg-gray-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all border border-gray-200 focus:border-[#ee7e01] bg-gray-50 focus:bg-white"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-orange w-full py-3.5 font-bold text-sm mt-1 disabled:opacity-60"
          >
            {loading
              ? "Please wait…"
              : tab === "signin"
              ? "Sign In & Predict →"
              : "Create Account & Predict →"}
          </button>

          <p className="text-center text-xs text-gray-400">
            {tab === "signin" ? (
              <>
                No account?{" "}
                <button
                  type="button"
                  className="font-semibold underline"
                  style={{ color: "#ee7e01" }}
                  onClick={() => { setTab("signup"); setError(""); }}
                >
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-semibold underline"
                  style={{ color: "#ee7e01" }}
                  onClick={() => { setTab("signin"); setError(""); }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
