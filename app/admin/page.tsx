import type { Metadata } from "next";
import Link from "next/link";
import AdminDashboard from "@/app/components/AdminDashboard";
import AdminSidebar from "@/app/admin/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin Dashboard · Access Bank World Cup Predictions",
  description: "Admin view of all signups and submitted prediction entries.",
};

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl border border-black bg-white overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-[80vh]">
            <AdminSidebar />

            <div className="border-t lg:border-t-0 lg:border-l border-black bg-white">
              <header className="px-5 sm:px-8 py-5 border-b border-black bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] font-bold text-gray-500 mb-1">
                      Admin Console
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-black text-black leading-tight">
                      Signups and Entries Dashboard
                    </h1>
                    <p className="text-gray-600 text-sm mt-1">
                      Monitor users, entries, and winners from one workspace.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-black px-3 py-2 text-xs font-semibold text-black">
                      Firestore Users
                    </span>
                    <Link
                      href="/"
                      className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-bold border border-black bg-black text-white hover:bg-gray-900 transition-colors"
                    >
                      Back to Site
                    </Link>
                  </div>
                </div>
              </header>

              <div className="p-1 sm:p-2">
                <AdminDashboard />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
