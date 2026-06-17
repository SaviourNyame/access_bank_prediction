"use client";

import { useEffect, useState } from "react";

type SidebarItem = {
  id: string;
  label: string;
};

const ITEMS: SidebarItem[] = [
  { id: "home", label: "Home" },
  { id: "matches", label: "Matches" },
  { id: "entries", label: "Entries" },
  { id: "users", label: "Users" },
  { id: "winners", label: "Winners" },
  { id: "trivia", label: "Trivia" },
  { id: "coupons", label: "Coupons" },
];

export default function AdminSidebar() {
  const [active, setActive] = useState<string>("home");

  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.replace("#", "");
      const valid = ITEMS.some((item) => item.id === hash);
      setActive(valid ? hash : "home");
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    return () => {
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, []);

  return (
    <aside className="bg-black text-white p-4 sm:p-5 lg:p-6">
      <div className="mb-6 pb-4 border-b border-white/20">
        <p className="text-xs uppercase tracking-[0.24em] font-bold text-white/60 mb-2">
          Access Bank
        </p>
        <h2 className="text-lg font-black leading-tight">
          Admin Dashboard
        </h2>
      </div>

      <p className="text-[11px] uppercase tracking-widest text-white/60 font-bold mb-3">
        Navigation
      </p>

      <nav className="flex flex-col gap-2 mb-6">
        {ITEMS.map((item) => {
          const selected = active === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setActive(item.id)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                selected
                  ? "border-white bg-white text-black"
                  : "border-white/25 text-white hover:bg-white/10"
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="rounded-lg border border-white/20 bg-white/5 px-3 py-3 text-xs text-white/70">
        Use the menu to jump between sections. The active section is highlighted.
      </div>
    </aside>
  );
}
