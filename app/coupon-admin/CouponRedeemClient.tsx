"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type TriviaCoupon = {
  id: string;
  code: string;
  name: string;
  phone: string;
  wonAt: string;
  redeemed: boolean;
};

const COUPON_EMAIL = "admin@acess.com";
const COUPON_PASS = "@Access123#";

export default function CouponRedeemClient() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [coupons, setCoupons] = useState<TriviaCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [redeemTarget, setRedeemTarget] = useState<TriviaCoupon | null>(null);
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemError, setRedeemError] = useState("");
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<TriviaCoupon | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const [resetPhone, setResetPhone] = useState("");
  const [resetPhoneStatus, setResetPhoneStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [resetPhoneMsg, setResetPhoneMsg] = useState("");

  useEffect(() => {
    if (loggedIn) void loadCoupons();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  async function loadCoupons() {
    setLoading(true);
    try {
      const { query: fsQuery, orderBy } = await import("firebase/firestore");
      const snap = await getDocs(fsQuery(collection(db, "triviaCoupons"), orderBy("wonAt", "desc")));
      setCoupons(
        snap.docs.map((d) => {
          const data = d.data() as Omit<TriviaCoupon, "id">;
          return { id: d.id, ...data };
        }),
      );
    } finally {
      setLoading(false);
    }
  }

  async function redeemCoupon(id: string) {
    setRedeemingId(id);
    try {
      await updateDoc(doc(db, "triviaCoupons", id), {
        redeemed: true,
        redeemedAt: serverTimestamp(),
      });
      setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, redeemed: true } : c)));
    } finally {
      setRedeemingId(null);
    }
  }

  async function resetAttemptsByPhone(phone: string, couponId?: string): Promise<number> {
    const { query: fsQuery, where } = await import("firebase/firestore");
    const entriesSnap = await getDocs(fsQuery(collection(db, "triviaEntries"), where("phone", "==", phone)));
    await Promise.all(entriesSnap.docs.map((d) => deleteDoc(doc(db, "triviaEntries", d.id))));
    if (couponId) {
      await deleteDoc(doc(db, "triviaCoupons", couponId));
      setCoupons((prev) => prev.filter((c) => c.id !== couponId));
    } else {
      const couponSnap = await getDocs(fsQuery(collection(db, "triviaCoupons"), where("phone", "==", phone)));
      await Promise.all(couponSnap.docs.map((d) => deleteDoc(doc(db, "triviaCoupons", d.id))));
      setCoupons((prev) => prev.filter((c) => c.phone !== phone));
    }
    return entriesSnap.size;
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim().toLowerCase() === COUPON_EMAIL && password === COUPON_PASS) {
      setLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("Invalid email or password.");
    }
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white border border-black overflow-hidden shadow-lg">
          <div className="px-6 py-5 border-b border-black bg-black text-white">
            <p className="text-[11px] uppercase tracking-widest font-bold text-white/60 mb-1">Access Bank</p>
            <h1 className="text-xl font-black">Coupon Redemption</h1>
          </div>
          <form onSubmit={handleLogin} className="px-6 py-6 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                autoComplete="username"
                placeholder="admin@acess.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setLoginError(""); }}
                className="w-full rounded-xl border border-black px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
                className="w-full rounded-xl border border-black px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>
            {loginError && (
              <p className="text-xs text-red-600 font-semibold">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-black text-white text-sm font-black hover:bg-gray-900 transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filtered = coupons.filter(
    (c) =>
      search.trim() === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search.trim()),
  );
  const totalCoupons = coupons.length;
  const redeemedCount = coupons.filter((c) => c.redeemed).length;
  const pendingCount = totalCoupons - redeemedCount;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black text-white px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-bold text-white/60">Access Bank</p>
          <h1 className="text-lg font-black">Coupon Redemption</h1>
        </div>
        <button
          type="button"
          onClick={() => { setLoggedIn(false); setEmail(""); setPassword(""); }}
          className="text-xs font-bold text-white/60 hover:text-white border border-white/30 rounded-lg px-3 py-1.5 transition-colors"
        >
          Sign Out
        </button>
      </div>

      <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-5 border border-black">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Total Won</p>
            <p className="text-3xl font-black text-black mt-2">{totalCoupons}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 border border-black">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Redeemed</p>
            <p className="text-3xl font-black text-black mt-2">{redeemedCount}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 border border-black">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Pending</p>
            <p className="text-3xl font-black text-black mt-2">{pendingCount}</p>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-white border border-black overflow-hidden">
          <div className="px-5 py-4 border-b border-black flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-black">Trivia Coupons</h2>
              <p className="text-xs text-gray-500 mt-1">Players who won the trivia game. Tap Redeem when they present their code.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-black px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-black w-full sm:w-52"
              />
              <button
                type="button"
                onClick={() => void loadCoupons()}
                className="px-3 py-2 rounded-lg border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors whitespace-nowrap"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-8 text-sm text-gray-500">Loading coupons…</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-8 text-sm text-gray-500">
              {totalCoupons === 0 ? "No coupons issued yet." : "No coupons match your search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-black">
                    <th className="py-3 px-5 font-semibold">Name</th>
                    <th className="py-3 pr-4 font-semibold">Phone</th>
                    <th className="py-3 pr-4 font-semibold">Won At</th>
                    <th className="py-3 pr-5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-gray-200 last:border-0">
                      <td className="py-3 px-5 font-semibold text-black">{c.name}</td>
                      <td className="py-3 pr-4 text-gray-600">{c.phone}</td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">
                        {c.wonAt ? new Date(c.wonAt).toLocaleString() : "—"}
                      </td>
                      <td className="py-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.redeemed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-black text-white">
                              ✓ Redeemed
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setRedeemTarget(c); setRedeemInput(""); setRedeemError(""); }}
                              className="px-4 py-2 rounded-lg text-xs font-black border border-black bg-black text-white hover:bg-gray-900 transition-colors"
                            >
                              Redeem
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setResetTarget(c)}
                            className="px-3 py-2 rounded-lg text-xs font-bold border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
                          >
                            Reset
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reset by phone panel */}
        <div className="rounded-2xl bg-white border border-black overflow-hidden">
          <div className="px-5 py-4 border-b border-black">
            <h2 className="text-base font-black text-black">Reset Attempts by Phone</h2>
            <p className="text-xs text-gray-500 mt-1">For players who haven&apos;t won but hit the attempt limit.</p>
          </div>
          <div className="px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. 0241234567"
                value={resetPhone}
                onChange={(e) => { setResetPhone(e.target.value); setResetPhoneStatus("idle"); setResetPhoneMsg(""); }}
                className="w-full rounded-xl border border-black px-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <button
              type="button"
              disabled={!resetPhone.trim() || resetPhoneStatus === "loading"}
              onClick={async () => {
                setResetPhoneStatus("loading");
                setResetPhoneMsg("");
                try {
                  const deleted = await resetAttemptsByPhone(resetPhone.trim());
                  setResetPhoneMsg(`Done — removed ${deleted} entr${deleted !== 1 ? "ies" : "y"} for ${resetPhone.trim()}.`);
                  setResetPhoneStatus("done");
                  setResetPhone("");
                } catch {
                  setResetPhoneMsg("Failed to reset. Try again.");
                  setResetPhoneStatus("error");
                }
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-black border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              {resetPhoneStatus === "loading" ? "Resetting…" : "Reset Attempts"}
            </button>
          </div>
          {resetPhoneMsg && (
            <div className={`px-5 pb-4 text-xs font-semibold ${resetPhoneStatus === "done" ? "text-green-600" : "text-red-600"}`}>
              {resetPhoneMsg}
            </div>
          )}
        </div>
      </div>

      {/* Redeem Dialog */}
      {redeemTarget && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setRedeemTarget(null); }}
        >
          <div className="w-full max-w-xs rounded-2xl bg-white border border-black overflow-hidden">
            <div className="px-5 py-4 border-b border-black flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-bold text-gray-500">Redeem Coupon</p>
                <p className="text-sm font-black text-black mt-0.5 truncate">{redeemTarget.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setRedeemTarget(null)}
                className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-black text-sm bg-gray-100 rounded-full"
                aria-label="Close"
              >✕</button>
            </div>
            <div className="px-5 py-5 flex flex-col gap-4">
              <p className="text-xs text-gray-500">Ask the player to show their code, then enter it below to confirm redemption.</p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">4-digit Coupon Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
                  value={redeemInput}
                  autoFocus
                  onChange={(e) => { setRedeemInput(e.target.value.replace(/\D/g, "").slice(0, 4)); setRedeemError(""); }}
                  className="w-full px-4 py-3 rounded-xl border border-black text-center text-3xl font-mono font-black tracking-[0.5em] text-black outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              {redeemError && (
                <p className="text-xs text-red-600 font-semibold text-center">{redeemError}</p>
              )}
              <button
                type="button"
                disabled={redeemInput.length !== 4 || redeemingId === redeemTarget.id}
                onClick={async () => {
                  if (redeemInput !== redeemTarget.code) {
                    setRedeemError("Incorrect code — check the player's screen and try again.");
                    return;
                  }
                  await redeemCoupon(redeemTarget.id);
                  setRedeemTarget(null);
                }}
                className="w-full py-3 rounded-xl border border-black bg-black text-white font-black text-sm disabled:opacity-40 transition-colors"
              >
                {redeemingId === redeemTarget.id ? "Redeeming…" : "Confirm Redemption"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setResetTarget(null); }}
        >
          <div className="w-full max-w-xs rounded-2xl bg-white border border-black overflow-hidden">
            <div className="px-5 py-4 border-b border-black flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-bold text-red-500">Reset Attempts</p>
                <p className="text-sm font-black text-black mt-0.5 truncate">{resetTarget.name}</p>
              </div>
              <button type="button" onClick={() => setResetTarget(null)}
                className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-black text-sm bg-gray-100 rounded-full">✕</button>
            </div>
            <div className="px-5 py-5 flex flex-col gap-4">
              <p className="text-sm text-gray-600">
                This will delete all trivia entries and the coupon for <span className="font-bold text-black">{resetTarget.name}</span> ({resetTarget.phone}), allowing them to play again from scratch.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setResetTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-black text-sm font-bold">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={resettingId === resetTarget.id}
                  onClick={async () => {
                    setResettingId(resetTarget.id);
                    try {
                      await resetAttemptsByPhone(resetTarget.phone, resetTarget.id);
                      setResetTarget(null);
                    } finally {
                      setResettingId(null);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-black disabled:opacity-40"
                >
                  {resettingId === resetTarget.id ? "Resetting…" : "Yes, Reset"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
