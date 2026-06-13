"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  setDoc,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type User,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import AuthDialog from "@/app/components/AuthDialog";
import { SIGNUP_LOCATIONS } from "@/app/components/JoinSection";
import { MATCHES as STATIC_MATCHES } from "@/lib/matches";

type MatchStatus = "upcoming" | "live" | "halftime" | "finished";

type AdminMatch = {
  firestoreId: string;
  staticId: number | null;
  teamA: string;
  teamB: string;
  round: number | null;
  date: string;
  time: string;
  scoreA: string;
  scoreB: string;
  status: MatchStatus;
  isCustom: boolean;
};

type PickWinner = "A" | "B" | "draw" | null;

type Entry = {
  matchId: number | null;
  round: number | null;
  teamA: string;
  teamB: string;
  winner: PickWinner;
  scoreA: string;
  scoreB: string;
};

type DashboardUser = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  locationId: string;
  locationName: string;
  points: number;
  couponCode: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  entries: Entry[];
};

type LocationOption = {
  id: string;
  name: string;
};

const LOCATION_OPTIONS: LocationOption[] = [
  { id: "", name: "Unassigned" },
  ...SIGNUP_LOCATIONS,
];

function locationLabel(row: DashboardUser): string {
  return row.locationName !== "—" && row.locationName.trim() !== ""
    ? row.locationName
    : "Unassigned";
}

function toDate(value: unknown): Date | null {
  if (!value || typeof value !== "object") return null;
  if (
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

function toEntries(raw: unknown): Entry[] {
  if (!raw || typeof raw !== "object") return [];

  const rows: Entry[] = [];
  for (const [matchId, value] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    if (!value || typeof value !== "object") continue;

    const pick = value as Record<string, unknown>;
    const parsedMatchId = Number(matchId);
    const winner =
      pick.winner === "A" || pick.winner === "B" || pick.winner === "draw"
        ? pick.winner
        : null;

    rows.push({
      matchId: Number.isFinite(parsedMatchId) ? parsedMatchId : null,
      round: typeof pick.round === "number" ? pick.round : null,
      teamA: typeof pick.teamA === "string" ? pick.teamA : "Team A",
      teamB: typeof pick.teamB === "string" ? pick.teamB : "Team B",
      winner,
      scoreA: typeof pick.scoreA === "string" ? pick.scoreA : "",
      scoreB: typeof pick.scoreB === "string" ? pick.scoreB : "",
    });
  }

  return rows.sort((a, b) => {
    if (a.matchId === null && b.matchId === null) return 0;
    if (a.matchId === null) return 1;
    if (b.matchId === null) return -1;
    return a.matchId - b.matchId;
  });
}

function toDashboardUser(
  docSnap: QueryDocumentSnapshot<DocumentData>,
): DashboardUser {
  const data = docSnap.data() as {
    name?: string;
    displayName?: string;
    email?: string;
    phone?: string;
    locationId?: string;
    locationName?: string;
    points?: number;
    couponCode?: string;
    picks?: Record<string, unknown>;
    createdAt?: unknown;
    updatedAt?: unknown;
  };

  return {
    uid: docSnap.id,
    name:
      data.name ||
      data.displayName ||
      (data.email ? data.email.split("@")[0] : "Anonymous"),
    email: data.email ?? "—",
    phone: data.phone ?? "—",
    locationId: data.locationId ?? "—",
    locationName: data.locationName ?? "—",
    points: typeof data.points === "number" ? data.points : 0,
    couponCode: typeof data.couponCode === "string" ? data.couponCode : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    entries: toEntries(data.picks),
  };
}

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleString();
}

function winnerLabel(winner: PickWinner, entry: Entry): string {
  if (winner === "A") return entry.teamA;
  if (winner === "B") return entry.teamB;
  if (winner === "draw") return "Draw";
  return "Not set";
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [accessError, setAccessError] = useState("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DashboardUser[]>([]);
  const [error, setError] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "location-asc" | "location-desc"
  >("newest");
  const [savingLocationFor, setSavingLocationFor] = useState<string | null>(
    null,
  );
  const [locationMessage, setLocationMessage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "home" | "matches" | "entries" | "users" | "winners"
  >("home");

  const [halfTimeRevealed, setHalfTimeRevealed] = useState(false);
  const [togglingHalfTime, setTogglingHalfTime] = useState(false);

  const [claimTarget, setClaimTarget] = useState<{ uid: string; name: string } | null>(null);
  const [claimCode, setClaimCode] = useState("");
  const [claimSaving, setClaimSaving] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimDone, setClaimDone] = useState(false);

  // Matches tab state
  const [matchOverrides, setMatchOverrides] = useState<Record<number, AdminMatch>>({});
  const [customMatches, setCustomMatches] = useState<AdminMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchSearch, setMatchSearch] = useState("");

  const [editMatch, setEditMatch] = useState<AdminMatch | null>(null);
  const [editScoreA, setEditScoreA] = useState("");
  const [editScoreB, setEditScoreB] = useState("");
  const [editStatus, setEditStatus] = useState<MatchStatus>("upcoming");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [addMatchOpen, setAddMatchOpen] = useState(false);
  const [newTeamA, setNewTeamA] = useState("");
  const [newTeamB, setNewTeamB] = useState("");
  const [newRound, setNewRound] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [addingSaving, setAddingSaving] = useState(false);
  const [addingError, setAddingError] = useState("");

  useEffect(() => {
    function syncTabFromHash() {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.replace("#", "");
      if (
        hash === "home" ||
        hash === "matches" ||
        hash === "entries" ||
        hash === "users" ||
        hash === "winners"
      ) {
        setActiveTab(hash);
      } else {
        setActiveTab("home");
      }
    }

    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);
    return () => window.removeEventListener("hashchange", syncTabFromHash);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isSignInWithEmailLink(auth, window.location.href)) return;

    const email =
      window.localStorage.getItem("emailForSignIn") ??
      window.prompt("Please enter your email to complete sign-in") ??
      "";

    if (!email) return;

    signInWithEmailLink(auth, email, window.location.href)
      .then(() => {
        window.localStorage.removeItem("emailForSignIn");
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    async function loadHalfTime() {
      try {
        const snap = await getDoc(doc(db, "settings", "halfTime"));
        if (snap.exists()) {
          setHalfTimeRevealed(snap.data().revealed === true);
        }
      } catch {
        // silently ignore; defaults to false
      }
    }
    void loadHalfTime();
  }, []);

  async function toggleHalfTime() {
    const next = !halfTimeRevealed;
    setTogglingHalfTime(true);
    try {
      await setDoc(doc(db, "settings", "halfTime"), { revealed: next }, { merge: true });
      setHalfTimeRevealed(next);
    } finally {
      setTogglingHalfTime(false);
    }
  }

  async function saveCoupon(uid: string, code: string) {
    setClaimSaving(true);
    setClaimError("");
    try {
      await setDoc(
        doc(db, "users", uid),
        { couponCode: code, couponClaimedAt: serverTimestamp() },
        { merge: true },
      );
      setRows((prev) =>
        prev.map((r) => (r.uid === uid ? { ...r, couponCode: code } : r)),
      );
      setClaimDone(true);
    } catch {
      setClaimError("Could not save coupon. Try again.");
    } finally {
      setClaimSaving(false);
    }
  }

  async function loadAdminMatches() {
    setMatchesLoading(true);
    try {
      const snap = await getDocs(collection(db, "adminMatches"));
      const overrides: Record<number, AdminMatch> = {};
      const custom: AdminMatch[] = [];

      snap.docs.forEach((d) => {
        const data = d.data() as Omit<AdminMatch, "firestoreId">;
        const m: AdminMatch = { ...data, firestoreId: d.id };
        if (m.isCustom) {
          custom.push(m);
        } else if (m.staticId !== null) {
          overrides[m.staticId] = m;
        }
      });

      setMatchOverrides(overrides);
      setCustomMatches(custom);
    } finally {
      setMatchesLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "matches" && isAdmin) {
      void loadAdminMatches();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin]);

  async function saveMatchEdit() {
    if (!editMatch) return;
    setEditSaving(true);
    setEditError("");
    try {
      const payload: Omit<AdminMatch, "firestoreId"> = {
        staticId: editMatch.staticId,
        teamA: editMatch.teamA,
        teamB: editMatch.teamB,
        round: editMatch.round,
        date: editMatch.date,
        time: editMatch.time,
        scoreA: editScoreA,
        scoreB: editScoreB,
        status: editStatus,
        isCustom: editMatch.isCustom,
      };

      if (editMatch.firestoreId) {
        await setDoc(doc(db, "adminMatches", editMatch.firestoreId), payload, { merge: true });
      } else {
        // first time saving a static match override
        const ref = await addDoc(collection(db, "adminMatches"), payload);
        editMatch.firestoreId = ref.id;
      }

      const updated: AdminMatch = { ...payload, firestoreId: editMatch.firestoreId };
      if (updated.isCustom) {
        setCustomMatches((prev) =>
          prev.map((m) => (m.firestoreId === updated.firestoreId ? updated : m)),
        );
      } else if (updated.staticId !== null) {
        setMatchOverrides((prev) => ({ ...prev, [updated.staticId!]: updated }));
      }
      setEditMatch(null);
    } catch {
      setEditError("Could not save. Try again.");
    } finally {
      setEditSaving(false);
    }
  }

  async function addCustomMatch() {
    if (!newTeamA.trim() || !newTeamB.trim()) return;
    setAddingSaving(true);
    setAddingError("");
    try {
      const payload: Omit<AdminMatch, "firestoreId"> = {
        staticId: null,
        teamA: newTeamA.trim(),
        teamB: newTeamB.trim(),
        round: newRound ? Number(newRound) : null,
        date: newDate.trim(),
        time: newTime.trim(),
        scoreA: "",
        scoreB: "",
        status: "upcoming",
        isCustom: true,
      };
      const ref = await addDoc(collection(db, "adminMatches"), payload);
      setCustomMatches((prev) => [{ ...payload, firestoreId: ref.id }, ...prev]);
      setNewTeamA(""); setNewTeamB(""); setNewRound(""); setNewDate(""); setNewTime("");
      setAddMatchOpen(false);
    } catch {
      setAddingError("Could not add match. Try again.");
    } finally {
      setAddingSaving(false);
    }
  }

  async function deleteCustomMatch(firestoreId: string) {
    await deleteDoc(doc(db, "adminMatches", firestoreId));
    setCustomMatches((prev) => prev.filter((m) => m.firestoreId !== firestoreId));
  }

  useEffect(() => {
    if (!authReady || !user) {
      setIsAdmin(false);
      setCheckingAccess(false);
      setAccessError("");
      return;
    }

    let cancelled = false;

    async function checkAdminAccess() {
      setCheckingAccess(true);
      setAccessError("");

      try {
        const uidSnap = await getDoc(doc(db, "admins", user.uid));
        const emailKey = user.email?.trim().toLowerCase() ?? "";

        let emailAllowed = false;
        if (emailKey) {
          const emailSnap = await getDoc(doc(db, "admins", emailKey));
          emailAllowed = emailSnap.exists();
        }

        if (!cancelled) {
          setIsAdmin(uidSnap.exists() || emailAllowed);
        }
      } catch (err) {
        console.error("Failed to verify admin access", err);
        if (!cancelled) {
          setIsAdmin(false);
          setAccessError("Could not verify admin access from Firestore.");
        }
      } finally {
        if (!cancelled) {
          setCheckingAccess(false);
        }
      }
    }

    void checkAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  useEffect(() => {
    if (!authReady || !user || !isAdmin || checkingAccess) return;

    async function loadUsers() {
      setLoading(true);
      setError("");
      try {
        const snap = await getDocs(collection(db, "users"));
        const users = snap.docs.map((docSnap) => toDashboardUser(docSnap));
        users.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return b.createdAt.getTime() - a.createdAt.getTime();
          }
          if (a.createdAt) return -1;
          if (b.createdAt) return 1;
          return 0;
        });
        setRows(users);
      } catch (err) {
        console.error("Failed to load admin dashboard users", err);
        setError(
          "Could not load users and entries. Check Firestore permissions and try again.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();
  }, [authReady, user, isAdmin, checkingAccess]);

  const totals = useMemo(() => {
    const totalSignups = rows.length;
    const totalEntries = rows.reduce((sum, row) => sum + row.entries.length, 0);
    const activePredictors = rows.filter(
      (row) => row.entries.length > 0,
    ).length;
    return { totalSignups, totalEntries, activePredictors };
  }, [rows]);

  const sortedRows = useMemo(() => {
    const list = [...rows];

    list.sort((a, b) => {
      switch (sortBy) {
        case "oldest": {
          const aTime = a.createdAt?.getTime() ?? 0;
          const bTime = b.createdAt?.getTime() ?? 0;
          return aTime - bTime;
        }
        case "location-asc":
          return locationLabel(a).localeCompare(locationLabel(b));
        case "location-desc":
          return locationLabel(b).localeCompare(locationLabel(a));
        case "newest":
        default: {
          const aTime = a.createdAt?.getTime() ?? 0;
          const bTime = b.createdAt?.getTime() ?? 0;
          return bTime - aTime;
        }
      }
    });

    return list;
  }, [rows, sortBy]);

  const winners = useMemo(() => {
    return [...rows]
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.entries.length - a.entries.length;
      })
      .slice(0, 20);
  }, [rows]);

  const allEntries = useMemo(() => {
    return sortedRows.flatMap((row) =>
      row.entries.map((entry) => ({
        uid: row.uid,
        userName: row.name,
        userEmail: row.email,
        locationName: locationLabel(row),
        entry,
      })),
    );
  }, [sortedRows]);

  async function saveUserLocation(uid: string, locationId: string) {
    setSavingLocationFor(uid);
    setLocationMessage("");

    const selected = LOCATION_OPTIONS.find(
      (location) => location.id === locationId,
    );

    try {
      await setDoc(
        doc(db, "users", uid),
        {
          locationId: selected?.id || null,
          locationName: selected?.name || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setRows((currentRows) =>
        currentRows.map((row) =>
          row.uid === uid
            ? {
                ...row,
                locationId: selected?.id || "—",
                locationName: selected?.name || "—",
              }
            : row,
        ),
      );
      setLocationMessage(
        selected
          ? `Saved ${selected.name} for this user.`
          : "Cleared location for this user.",
      );
    } catch (err) {
      console.error("Failed to save user location", err);
      setLocationMessage("Could not save location. Try again.");
    } finally {
      setSavingLocationFor(null);
    }
  }

  if (!authReady) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl bg-white border border-black p-8 text-center text-gray-500">
            Checking sign-in...
          </div>
        </div>
      </section>
    );
  }

  if (checkingAccess) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl bg-white border border-black p-8 text-center text-gray-500">
            Checking admin access from Firestore...
          </div>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <>
        <section className="px-4 sm:px-6 lg:px-8 pb-14">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-2xl bg-white border border-black p-6 sm:p-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-black mb-2">
                  Admin Login
                </p>
                <h2 className="text-2xl font-black text-black mb-1">
                  Sign in to view signups and entries
                </h2>
                <p className="text-sm text-gray-600">
                  Access is granted from your Firestore admins collection.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="px-5 py-3 text-sm font-bold rounded-xl border border-black bg-black text-white hover:bg-gray-900 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </section>
        {authOpen && (
          <AuthDialog
            onClose={() => setAuthOpen(false)}
            onSuccess={() => setAuthOpen(false)}
          />
        )}
      </>
    );
  }

  if (!isAdmin) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl bg-white border border-black p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-black mb-2">
              Access Denied
            </p>
            <h2 className="text-2xl font-black text-black mb-2">
              This account is not an admin
            </h2>
            <p className="text-sm text-gray-600">
              Signed in as {user.email}. Add a document in Firestore collection{" "}
              <strong>admins</strong> with this user&apos;s UID or lowercase
              email as the document ID.
            </p>
            {accessError && (
              <p className="text-sm text-gray-600 mt-2">{accessError}</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-14">
      <div className="max-w-6xl mx-auto space-y-5">
        {activeTab === "matches" && (() => {
          const STATUS_LABELS: Record<MatchStatus, string> = {
            upcoming: "Upcoming",
            live: "Live",
            halftime: "Half Time",
            finished: "Finished",
          };
          const STATUS_COLORS: Record<MatchStatus, string> = {
            upcoming: "bg-gray-100 text-gray-700",
            live: "bg-black text-white",
            halftime: "bg-gray-800 text-white",
            finished: "bg-white text-black border border-black",
          };

          const q = matchSearch.toLowerCase();
          const filteredStatic = STATIC_MATCHES.filter(
            (m) =>
              m.teamA.name.toLowerCase().includes(q) ||
              m.teamB.name.toLowerCase().includes(q),
          );

          function openEdit(
            staticId: number | null,
            teamA: string,
            teamB: string,
            round: number | null,
            date: string,
            time: string,
            isCustom: boolean,
            firestoreId: string,
          ) {
            const override = staticId !== null ? matchOverrides[staticId] : null;
            const existing = firestoreId
              ? (isCustom
                  ? customMatches.find((m) => m.firestoreId === firestoreId)
                  : override)
              : override;
            setEditMatch({
              firestoreId,
              staticId,
              teamA,
              teamB,
              round,
              date,
              time,
              scoreA: existing?.scoreA ?? "",
              scoreB: existing?.scoreB ?? "",
              status: existing?.status ?? "upcoming",
              isCustom,
            });
            setEditScoreA(existing?.scoreA ?? "");
            setEditScoreB(existing?.scoreB ?? "");
            setEditStatus(existing?.status ?? "upcoming");
            setEditError("");
          }

          return (
            <section id="matches" className="space-y-4">
              {/* Header */}
              <div className="rounded-2xl bg-white border border-black overflow-hidden">
                <div className="px-5 py-4 border-b border-black flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-black">Matches</h2>
                    <p className="text-xs text-gray-500 mt-1">Edit scores &amp; status, or add custom matches.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search team…"
                      value={matchSearch}
                      onChange={(e) => setMatchSearch(e.target.value)}
                      className="rounded-lg border border-black px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-black w-40"
                    />
                    <button
                      type="button"
                      onClick={() => { setAddMatchOpen(true); setAddingError(""); }}
                      className="px-3 py-2 rounded-lg border border-black bg-black text-white text-xs font-bold hover:bg-gray-900 transition-colors whitespace-nowrap"
                    >
                      + Add Match
                    </button>
                  </div>
                </div>

                {/* Add custom match inline form */}
                {addMatchOpen && (
                  <div className="px-5 py-4 border-b border-black bg-gray-50">
                    <p className="text-xs font-bold uppercase tracking-widest text-black mb-3">New Custom Match</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Team A</label>
                        <input type="text" placeholder="e.g. Ghana" value={newTeamA}
                          onChange={(e) => setNewTeamA(e.target.value)}
                          className="w-full rounded-lg border border-black px-3 py-2 text-sm text-black outline-none" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Team B</label>
                        <input type="text" placeholder="e.g. Brazil" value={newTeamB}
                          onChange={(e) => setNewTeamB(e.target.value)}
                          className="w-full rounded-lg border border-black px-3 py-2 text-sm text-black outline-none" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Round</label>
                        <input type="number" placeholder="1" min="1" value={newRound}
                          onChange={(e) => setNewRound(e.target.value)}
                          className="w-full rounded-lg border border-black px-3 py-2 text-sm text-black outline-none" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Date (DD.MM.)</label>
                        <input type="text" placeholder="11.06." value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          className="w-full rounded-lg border border-black px-3 py-2 text-sm text-black outline-none" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Time (HH:MM)</label>
                        <input type="text" placeholder="19:00" value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          className="w-full rounded-lg border border-black px-3 py-2 text-sm text-black outline-none" />
                      </div>
                    </div>
                    {addingError && <p className="text-xs text-red-600 font-semibold mb-2">{addingError}</p>}
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => void addCustomMatch()}
                        disabled={addingSaving || !newTeamA.trim() || !newTeamB.trim()}
                        className="px-4 py-2 rounded-lg bg-black text-white text-xs font-bold disabled:opacity-40">
                        {addingSaving ? "Saving…" : "Add Match"}
                      </button>
                      <button type="button" onClick={() => setAddMatchOpen(false)}
                        className="px-4 py-2 rounded-lg border border-black text-xs font-bold">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom matches */}
                {customMatches.length > 0 && (
                  <>
                    <div className="px-5 py-2 bg-gray-50 border-b border-gray-200">
                      <p className="text-[11px] uppercase tracking-widest font-bold text-gray-500">Custom Matches</p>
                    </div>
                    {customMatches.map((m) => (
                      <div key={m.firestoreId} className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-black text-sm">{m.teamA} vs {m.teamB}</span>
                          <span className="ml-2 text-xs text-gray-500">{m.date} {m.time}</span>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status]}`}>
                          {STATUS_LABELS[m.status]}
                        </span>
                        {(m.scoreA !== "" || m.scoreB !== "") && (
                          <span className="font-mono font-black text-black text-sm">{m.scoreA || "0"}–{m.scoreB || "0"}</span>
                        )}
                        <button type="button"
                          onClick={() => openEdit(null, m.teamA, m.teamB, m.round, m.date, m.time, true, m.firestoreId)}
                          className="px-2.5 py-1 rounded-lg border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors">
                          Edit
                        </button>
                        <button type="button"
                          onClick={() => void deleteCustomMatch(m.firestoreId)}
                          className="px-2.5 py-1 rounded-lg border border-red-600 text-red-600 text-xs font-bold hover:bg-red-600 hover:text-white transition-colors">
                          Delete
                        </button>
                      </div>
                    ))}
                  </>
                )}

                {/* Static matches */}
                <div className="px-5 py-2 bg-gray-50 border-b border-gray-200">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-gray-500">
                    Competition Matches {matchSearch && `— ${filteredStatic.length} result${filteredStatic.length !== 1 ? "s" : ""}`}
                  </p>
                </div>

                {matchesLoading ? (
                  <div className="px-5 py-8 text-sm text-gray-500">Loading…</div>
                ) : filteredStatic.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-gray-500">No matches found.</div>
                ) : (
                  filteredStatic.map((m) => {
                    const override = matchOverrides[m.id];
                    const score = override && (override.scoreA !== "" || override.scoreB !== "")
                      ? `${override.scoreA || "0"}–${override.scoreB || "0"}`
                      : null;
                    const status: MatchStatus = override?.status ?? "upcoming";
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 flex-wrap last:border-0">
                        <span className="text-xs text-gray-400 font-mono w-6 flex-shrink-0">#{m.id}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-black text-sm">{m.teamA.name} vs {m.teamB.name}</span>
                          <span className="ml-2 text-xs text-gray-500">R{m.round} · {m.date} {m.time}</span>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
                          {STATUS_LABELS[status]}
                        </span>
                        {score && (
                          <span className="font-mono font-black text-black text-sm">{score}</span>
                        )}
                        <button type="button"
                          onClick={() => openEdit(m.id, m.teamA.name, m.teamB.name, m.round, m.date, m.time, false, override?.firestoreId ?? "")}
                          className="px-2.5 py-1 rounded-lg border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors">
                          Edit
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Edit Match Modal */}
              {editMatch && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                  style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
                  onClick={(e) => { if (e.target === e.currentTarget) setEditMatch(null); }}>
                  <div className="w-full max-w-xs rounded-2xl bg-white border border-black overflow-hidden">
                    <div className="px-5 py-4 border-b border-black flex items-center justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-widest font-bold text-gray-500">Edit Match</p>
                        <p className="text-sm font-black text-black mt-0.5">{editMatch.teamA} vs {editMatch.teamB}</p>
                      </div>
                      <button onClick={() => setEditMatch(null)}
                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-black text-sm bg-gray-100 rounded-full" aria-label="Close">✕</button>
                    </div>
                    <div className="px-5 py-5 flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Score</label>
                        <div className="flex items-center gap-2">
                          <input type="text" inputMode="numeric" maxLength={3} placeholder="0"
                            value={editScoreA}
                            onChange={(e) => setEditScoreA(e.target.value.replace(/\D/g, "").slice(0, 3))}
                            className="w-16 rounded-lg border border-black px-3 py-2 text-center text-lg font-black text-black outline-none focus:ring-2 focus:ring-black" />
                          <span className="font-black text-xl text-black">–</span>
                          <input type="text" inputMode="numeric" maxLength={3} placeholder="0"
                            value={editScoreB}
                            onChange={(e) => setEditScoreB(e.target.value.replace(/\D/g, "").slice(0, 3))}
                            className="w-16 rounded-lg border border-black px-3 py-2 text-center text-lg font-black text-black outline-none focus:ring-2 focus:ring-black" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Status</label>
                        <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as MatchStatus)}
                          className="w-full rounded-lg border border-black px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-black">
                          <option value="upcoming">Upcoming</option>
                          <option value="live">Live</option>
                          <option value="halftime">Half Time</option>
                          <option value="finished">Finished</option>
                        </select>
                      </div>
                      {editError && <p className="text-xs text-red-600 font-semibold">{editError}</p>}
                      <button type="button" onClick={() => void saveMatchEdit()}
                        disabled={editSaving}
                        className="w-full py-3 rounded-xl border border-black bg-black text-white font-bold text-sm disabled:opacity-40">
                        {editSaving ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          );
        })()}

        {activeTab === "home" && (
          <section id="home" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-2xl bg-white p-5 border border-black">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                Signups
              </p>
              <p className="text-3xl font-black text-black mt-2">
                {totals.totalSignups}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 border border-black">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                Entries
              </p>
              <p className="text-3xl font-black text-black mt-2">
                {totals.totalEntries}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 border border-black">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                Active Predictors
              </p>
              <p className="text-3xl font-black text-black mt-2">
                {totals.activePredictors}
              </p>
            </div>
          </section>
        )}

        {activeTab === "winners" && (
          <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-2xl bg-white p-5 border border-black">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Total Coupons</p>
              <p className="text-3xl font-black text-black mt-2">{winners.length}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 border border-black">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Claimed Coupons</p>
              <p className="text-3xl font-black text-black mt-2">
                {winners.filter((w) => w.couponCode).length}
              </p>
            </div>
          </div>

          <section id="winners" className="rounded-2xl bg-white border border-black overflow-hidden">
            <div className="px-5 py-4 border-b border-black flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-black">Winners</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Top users ranked by points.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggleHalfTime()}
                disabled={togglingHalfTime}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50 ${
                  halfTimeRevealed
                    ? "bg-black text-white border-black hover:bg-gray-900"
                    : "bg-white text-black border-black hover:bg-gray-100"
                }`}
              >
                {togglingHalfTime ? "Saving…" : halfTimeRevealed ? "Lock Winners" : "Reveal Winners"}
              </button>
            </div>

            {!halfTimeRevealed ? (
              <div className="px-5 py-12 flex flex-col items-center gap-3 text-center">
                <div className="text-3xl">🔒</div>
                <p className="text-sm font-bold text-black">Winners hidden — half time not reached</p>
                <p className="text-xs text-gray-500">Click &ldquo;Reveal Winners&rdquo; to make the leaderboard visible.</p>
              </div>
            ) : winners.length === 0 ? (
              <div className="px-5 py-8 text-sm text-gray-500">No winners data yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-black">
                      <th className="py-3 px-5 font-semibold">Rank</th>
                      <th className="py-3 pr-4 font-semibold">User</th>
                      <th className="py-3 pr-4 font-semibold">Location</th>
                      <th className="py-3 pr-4 font-semibold">Points</th>
                      <th className="py-3 pr-5 font-semibold text-right">Coupon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winners.map((winner, index) => (
                      <tr key={winner.uid} className="border-b border-gray-200">
                        <td className="py-3 px-5 text-gray-700 font-mono">#{index + 1}</td>
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-black">{winner.name}</div>
                          <div className="text-xs text-gray-500">{winner.email}</div>
                        </td>
                        <td className="py-3 pr-4 text-gray-700">{locationLabel(winner)}</td>
                        <td className="py-3 pr-4 font-black text-black">{winner.points}</td>
                        <td className="py-3 pr-5 text-right">
                          {winner.couponCode ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="font-mono font-bold text-black tracking-widest">{winner.couponCode}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setClaimTarget({ uid: winner.uid, name: winner.name });
                                  setClaimCode(winner.couponCode ?? "");
                                  setClaimDone(false);
                                  setClaimError("");
                                }}
                                className="text-[11px] underline text-gray-500 hover:text-black"
                              >
                                Edit
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setClaimTarget({ uid: winner.uid, name: winner.name });
                                setClaimCode("");
                                setClaimDone(false);
                                setClaimError("");
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-black bg-white hover:bg-black hover:text-white transition-colors"
                            >
                              Claim Coupon
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Claim Coupon Modal */}
          {claimTarget && (
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
              onClick={(e) => { if (e.target === e.currentTarget) setClaimTarget(null); }}
            >
              <div className="w-full max-w-xs rounded-2xl bg-white border border-black overflow-hidden">
                <div className="px-5 py-4 border-b border-black flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest font-bold text-gray-500">Claim Coupon</p>
                    <p className="text-sm font-black text-black mt-0.5 truncate">{claimTarget.name}</p>
                  </div>
                  <button
                    onClick={() => setClaimTarget(null)}
                    className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-black text-sm bg-gray-100 rounded-full"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="px-5 py-5 flex flex-col gap-4">
                  {claimDone ? (
                    <div className="flex flex-col items-center gap-2 py-4 text-center">
                      <div className="text-2xl">✓</div>
                      <p className="text-sm font-bold text-black">Coupon saved!</p>
                      <p className="font-mono text-lg font-black tracking-widest text-black">{claimCode}</p>
                      <button
                        type="button"
                        onClick={() => setClaimTarget(null)}
                        className="mt-2 px-4 py-2 rounded-lg border border-black bg-black text-white text-sm font-bold"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">
                          4-digit Redeem Code
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          pattern="\d{4}"
                          placeholder="0000"
                          value={claimCode}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setClaimCode(v);
                            setClaimError("");
                          }}
                          className="w-full px-4 py-3 rounded-xl border border-black text-center text-2xl font-mono font-black tracking-[0.5em] text-black outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>

                      {claimError && (
                        <p className="text-xs text-red-600 font-semibold">{claimError}</p>
                      )}

                      <button
                        type="button"
                        disabled={claimCode.length !== 4 || claimSaving}
                        onClick={() => void saveCoupon(claimTarget.uid, claimCode)}
                        className="w-full py-3 rounded-xl border border-black bg-black text-white font-bold text-sm disabled:opacity-40 transition-colors"
                      >
                        {claimSaving ? "Saving…" : "Save Code"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          </>
        )}

        {activeTab === "entries" && (
          <section id="entries" className="rounded-2xl bg-white border border-black overflow-hidden">
          <div className="px-5 py-4 border-b border-black">
            <h2 className="text-lg font-black text-black">Entries</h2>
            <p className="text-xs text-gray-500 mt-1">
              All submitted picks across users.
            </p>
          </div>
          {allEntries.length === 0 ? (
            <div className="px-5 py-8 text-sm text-gray-500">No entries submitted yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-black">
                    <th className="py-2 px-5 font-semibold">User</th>
                    <th className="py-2 pr-4 font-semibold">Location</th>
                    <th className="py-2 pr-4 font-semibold">Match</th>
                    <th className="py-2 pr-4 font-semibold">Round</th>
                    <th className="py-2 pr-4 font-semibold">Winner Pick</th>
                    <th className="py-2 pr-5 font-semibold">Score Pick</th>
                  </tr>
                </thead>
                <tbody>
                  {allEntries.map((row) => (
                    <tr
                      key={`${row.uid}-${row.entry.matchId ?? "na"}-${row.entry.teamA}-${row.entry.teamB}`}
                      className="border-b border-gray-200"
                    >
                      <td className="py-2 px-5">
                        <div className="font-semibold text-black">{row.userName}</div>
                        <div className="text-[11px] text-gray-500">{row.userEmail}</div>
                      </td>
                      <td className="py-2 pr-4 text-gray-700">{row.locationName}</td>
                      <td className="py-2 pr-4 text-gray-700">{row.entry.teamA} vs {row.entry.teamB}</td>
                      <td className="py-2 pr-4 text-gray-700">{row.entry.round ?? "-"}</td>
                      <td className="py-2 pr-4 text-gray-700">{winnerLabel(row.entry.winner, row.entry)}</td>
                      <td className="py-2 pr-5 text-gray-700">
                        {row.entry.scoreA === "" && row.entry.scoreB === ""
                          ? "-"
                          : `${row.entry.scoreA || "0"}-${row.entry.scoreB || "0"}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </section>
        )}

        {activeTab === "users" && (
          <section id="users" className="rounded-2xl bg-white border border-black overflow-hidden">
          <div className="px-5 py-4 border-b border-black flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-black">Users</h2>
              <p className="text-xs text-gray-500 mt-1">
                Sort users by newest, oldest, or location.
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
              Sort by
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | "newest"
                      | "oldest"
                      | "location-asc"
                      | "location-desc",
                  )
                }
                className="rounded-lg border border-black bg-white px-3 py-2 text-sm text-black outline-none focus:border-black"
              >
                <option value="newest">Newest signup</option>
                <option value="oldest">Oldest signup</option>
                <option value="location-asc">Location A-Z</option>
                <option value="location-desc">Location Z-A</option>
              </select>
            </label>
          </div>

          {locationMessage && (
            <div className="px-5 py-3 text-xs text-gray-700 border-b border-gray-200">
              {locationMessage}
            </div>
          )}

          {loading ? (
            <div className="px-5 py-10 text-sm text-gray-500">
              Loading dashboard data...
            </div>
          ) : error ? (
            <div className="px-5 py-10 text-sm text-gray-700">{error}</div>
          ) : sortedRows.length === 0 ? (
            <div className="px-5 py-10 text-sm text-gray-500">
              No users found yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sortedRows.map((row) => (
                <details key={row.uid} className="group">
                  <summary className="list-none cursor-pointer px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-black truncate">
                        {row.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {row.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{row.entries.length} entries</span>
                      <span>{row.points} pts</span>
                      <span>{formatDate(row.createdAt)}</span>
                    </div>
                  </summary>

                  <div className="px-5 pb-5 pt-1 bg-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs">
                      <div>
                        <span className="font-semibold text-gray-700">
                          UID:
                        </span>{" "}
                        <span className="text-gray-600 break-all">
                          {row.uid}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          Phone:
                        </span>{" "}
                        <span className="text-gray-600">{row.phone}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          Location:
                        </span>{" "}
                        <span className="text-gray-600">
                          {row.locationName}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          Location ID:
                        </span>{" "}
                        <span className="text-gray-600 break-all">
                          {row.locationId}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          Created:
                        </span>{" "}
                        <span className="text-gray-600">
                          {formatDate(row.createdAt)}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          Updated:
                        </span>{" "}
                        <span className="text-gray-600">
                          {formatDate(row.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3 rounded-xl border border-black bg-white p-3">
                      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <label className="flex-1 text-xs font-semibold text-gray-600">
                          Assign location to this user
                          <select
                            value={row.locationId === "—" ? "" : row.locationId}
                            onChange={(e) =>
                              void saveUserLocation(row.uid, e.target.value)
                            }
                            className="mt-2 w-full rounded-lg border border-black bg-white px-3 py-2 text-sm text-black outline-none focus:border-black"
                          >
                            {LOCATION_OPTIONS.map((location) => (
                              <option
                                key={location.id || "unassigned"}
                                value={location.id}
                              >
                                {location.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="text-xs text-gray-500 sm:w-56">
                          Current location:{" "}
                          <span className="font-semibold text-gray-700">
                            {locationLabel(row)}
                          </span>
                        </div>
                      </div>
                      {savingLocationFor === row.uid && (
                        <p className="mt-2 text-xs text-gray-700 font-semibold">
                          Saving location...
                        </p>
                      )}
                    </div>

                    {row.entries.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        No entries submitted yet.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-xs">
                          <thead>
                            <tr className="text-left text-gray-500 border-b border-black">
                              <th className="py-2 pr-3 font-semibold">Match</th>
                              <th className="py-2 pr-3 font-semibold">Round</th>
                              <th className="py-2 pr-3 font-semibold">
                                Winner Pick
                              </th>
                              <th className="py-2 pr-3 font-semibold">
                                Score Pick
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.entries.map((entry) => (
                              <tr
                                key={`${row.uid}-${entry.matchId ?? "na"}`}
                                className="border-b border-gray-200"
                              >
                                <td className="py-2 pr-3 text-gray-700">
                                  {entry.teamA} vs {entry.teamB}
                                </td>
                                <td className="py-2 pr-3 text-gray-600">
                                  {entry.round ?? "—"}
                                </td>
                                <td className="py-2 pr-3 text-gray-600">
                                  {winnerLabel(entry.winner, entry)}
                                </td>
                                <td className="py-2 pr-3 text-gray-600">
                                  {entry.scoreA === "" && entry.scoreB === ""
                                    ? "—"
                                    : `${entry.scoreA || "0"}-${entry.scoreB || "0"}`}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
          </section>
        )}

        <div className="rounded-xl p-4 text-xs bg-white border border-black text-gray-600">
          This page is only a UI gate. Enforce admin-only access in Firestore
          Security Rules for real protection.
        </div>
      </div>
    </section>
  );
}
