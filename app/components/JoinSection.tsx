"use client";

import { useState } from "react";
import Image from "next/image";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { findSignupLocation, SIGNUP_LOCATIONS } from "@/lib/locations";
export type { SignupLocation } from "@/lib/locations";
export { SIGNUP_LOCATIONS };

function mapAuthError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return "An error occurred. Please try again.";
}

export default function JoinSection({
  locationId,
}: {
  locationId?: string;
} = {}) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const selectedLocation = findSignupLocation(locationId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const userId = `${form.username}-${Date.now()}`;
      await setDoc(doc(db, "users", userId), {
        uid: userId,
        username: form.username.trim(),
        name: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        locationId: selectedLocation?.id ?? null,
        locationName: selectedLocation?.name ?? null,
        picks: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccessMessage("Account created successfully!");
      setSubmitted(true);
      setForm({ username: "", email: "", phone: "" });
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
          <div className="mb-6 flex justify-center">
            <Image
              src="/pnr.png"
              alt="Predict Win Repeat"
              width={1200}
              height={360}
              className="w-[40vw] sm:w-[36vw] lg:w-full max-w-[280px] h-auto drop-shadow-xl"
              sizes="(max-width: 640px) 40vw, (max-width: 1024px) 36vw, 280px"
            />
          </div>
          <p className="text-gray-500">
            Sign up or log in using your email and password.
          </p>
          {selectedLocation && (
            <div
              className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
              style={{
                background: "rgba(238,126,1,0.08)",
                border: "1px solid rgba(238,126,1,0.22)",
                color: "#7c2d12",
              }}
            >
              <span>Signup location:</span>
              <span style={{ color: "#ee7e01" }}>{selectedLocation.name}</span>
            </div>
          )}
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
                You&apos;re in!
              </h3>
              <p className="text-gray-500 max-w-xs">
                {successMessage ||
                  "Welcome to the Access Bank World Cup Prediction League."}
              </p>
              <button
                className="btn-orange rounded-lg px-6 py-3 font-semibold mt-2"
                onClick={() => setSubmitted(false)}
              >
                Back to Form
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {selectedLocation && (
                <div
                  className="rounded-xl px-4 py-3 text-sm font-semibold"
                  style={{
                    background: "rgba(238,126,1,0.06)",
                    border: "1px solid rgba(238,126,1,0.15)",
                    color: "#7c2d12",
                  }}
                >
                  You are signing up from{" "}
                  <span style={{ color: "#ee7e01" }}>
                    {selectedLocation.name}
                  </span>
                  .
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KofiPredictor99"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 outline-none transition-all border border-gray-200 focus:border-[#ee7e01] bg-gray-50 focus:bg-white"
                />
              </div>

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
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+233 XX XXX XXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 outline-none transition-all border border-gray-200 focus:border-[#ee7e01] bg-gray-50 focus:bg-white"
                />
              </div>

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
                className="btn-orange rounded-lg w-full py-4 font-bold text-base mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Please wait..." : "Join Now ->"}
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
      </div>
    </section>
  );
}
