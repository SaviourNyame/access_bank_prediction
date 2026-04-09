"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

function mapAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: string }).code)
      : "";

  switch (code) {
    case "auth/operation-not-allowed":
      return "Email/Password auth is not enabled in Firebase. In Firebase Console, go to Authentication > Sign-in method and enable Email/Password.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/missing-password":
      return "Please enter your password.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/email-already-in-use":
      return "That email is already registered. Try logging in instead.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again shortly.";
    default: {
      if (err instanceof Error) {
        return err.message.replace("Firebase: ", "");
      }
      return "Authentication failed. Try again.";
    }
  }
}

export default function JoinSection() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(
          auth,
          form.email.trim(),
          form.password,
        );

        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          name: form.name.trim() || null,
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          points: 0,
          picks: {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (form.name.trim()) {
          await updateProfile(cred.user, { displayName: form.name.trim() });
        }

        setSuccessMessage(
          "Account created successfully. You are now signed in.",
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          form.email.trim(),
          form.password,
        );
        setSuccessMessage("Welcome back. You are now logged in.");
      }

      setSubmitted(true);
      setForm((prev) => ({ ...prev, password: "" }));
    } catch (err: unknown) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      id="join"
      className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      {/* Subtle accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(238,126,1,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
            style={{
              background: "rgba(238,126,1,0.1)",
              border: "1px solid rgba(238,126,1,0.25)",
              color: "#ee7e01",
            }}
          >
            Free Entry
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-3">
            Join the Competition
          </h2>
          <p className="text-gray-500">
            Sign up or log in using your email and password.
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-3xl p-8 relative overflow-hidden"
          style={{
            border: "1.5px solid #e5e7eb",
            boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
          }}
        >
          {/* Corner accent */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-[0.07] pointer-events-none"
            style={{ background: "#ee7e01" }}
          />

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl p-1 bg-gray-100">
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
                setSuccessMessage("");
              }}
              className={`py-2.5 text-sm font-bold rounded-lg transition-colors ${
                mode === "signup"
                  ? "bg-white text-[#ee7e01]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setSuccessMessage("");
              }}
              className={`py-2.5 text-sm font-bold rounded-lg transition-colors ${
                mode === "login"
                  ? "bg-white text-[#ee7e01]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Login
            </button>
          </div>

          {submitted ? (
            <div className="text-center py-8 flex flex-col items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl animate-pulse-orange"
                style={{
                  background: "rgba(238,126,1,0.12)",
                  border: "2px solid #ee7e01",
                }}
              >
                ✓
              </div>
              <h3 className="text-2xl font-black text-gray-900">
                {mode === "signup" ? "You&apos;re in!" : "Welcome back!"}
              </h3>
              <p className="text-gray-500 max-w-xs">
                {successMessage ||
                  "Welcome to the Access Bank World Cup Prediction League."}
              </p>
              <button
                className="btn-orange px-6 py-3 font-semibold mt-2"
                onClick={() => setSubmitted(false)}
              >
                Back to Form
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name / Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KofiPredictor99"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 outline-none transition-all border border-gray-200 focus:border-[#ee7e01] bg-gray-50 focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 outline-none transition-all border border-gray-200 focus:border-[#ee7e01] bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 outline-none transition-all border border-gray-200 focus:border-[#ee7e01] bg-gray-50 focus:bg-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use at least 6 characters.
                </p>
              </div>

              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number{" "}
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+233 XX XXX XXXX"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 outline-none transition-all border border-gray-200 focus:border-[#ee7e01] bg-gray-50 focus:bg-white"
                  />
                </div>
              )}

              {error && (
                <div
                  className="px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: "#fef2f2",
                    color: "#b91c1c",
                    border: "1px solid #fecaca",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Free badge */}
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-gray-600"
                style={{
                  background: "rgba(238,126,1,0.06)",
                  border: "1px solid rgba(238,126,1,0.15)",
                }}
              >
                <span>🎁</span>
                <span>
                  <strong style={{ color: "#ee7e01" }}>Free to join</strong> -
                  no payment required. Open to all Access Bank customers and
                  fans.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-orange w-full py-4 font-bold text-base mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Please wait..."
                  : mode === "signup"
                    ? "Create Account ->"
                    : "Login ->"}
              </button>

              <p className="text-center text-xs text-gray-400">
                By joining you agree to our{" "}
                <a href="#" className="text-[#ee7e01] hover:underline">
                  Terms & Conditions
                </a>
              </p>
            </form>
          )}
        </div>

        {/* Points breakdown */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {[
            { icon: "🟠", label: "Winner Prediction", points: "+3 pts" },
            { icon: "🎯", label: "Exact Score", points: "+10 pts" },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-2xl p-4 flex items-center gap-3"
              style={{
                border: "1.5px solid #e5e7eb",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <span className="text-xl">{item.icon}</span>
              <div>
                <div className="text-sm font-semibold text-gray-800">
                  {item.label}
                </div>
                <div className="text-xs font-bold" style={{ color: "#ee7e01" }}>
                  {item.points}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
