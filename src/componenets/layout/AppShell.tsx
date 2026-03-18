"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import type { User } from "@/types/case.types";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { clearClientCache } from "@/lib/cache/clientDataCache";

interface AppShellProps {
  children: React.ReactNode;
  profile: User | null;
}

export default function AppShell({ children, profile }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isStoryRoute = /^\/cases\/[^/]+\/story$/.test(pathname);
  const isQuestionsRoute = /^\/cases\/[^/]+\/questions$/.test(pathname);
  const isNoticeRoute = /^\/cases\/[^/]+\/notice$/.test(pathname);
  const isCaseDetailRoute = /^\/cases\/[^/]+$/.test(pathname);
  const isProfileRoute = pathname === "/profile";
  const isSinglePageMode =
    pathname === "/dashboard" ||
    pathname === "/cases/new" ||
    isProfileRoute ||
    isCaseDetailRoute ||
    isStoryRoute ||
    isQuestionsRoute ||
    isNoticeRoute;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.clear();
    sessionStorage.clear();
    clearClientCache();
    toast.success("Signed out");
    router.push("/");
  };

  if (isSinglePageMode) {
    return (
      <div className="h-screen overflow-hidden bg-[radial-gradient(1200px_520px_at_78%_-12%,rgba(176,138,60,0.22),transparent_60%),radial-gradient(800px_420px_at_-8%_22%,rgba(143,29,29,0.18),transparent_62%),#060606]">
        <div className="pointer-events-none fixed right-4 top-4 z-50 md:right-5">
          <button
            type="button"
            onClick={handleLogout}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-black/55 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-100 shadow-sm transition-colors hover:border-amber-200 hover:text-amber-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
        <div className="h-full overflow-auto p-4 md:p-5">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(1200px_520px_at_78%_-12%,rgba(176,138,60,0.22),transparent_60%),radial-gradient(800px_420px_at_-8%_22%,rgba(143,29,29,0.18),transparent_62%),#060606]">
      <Sidebar />
      <div className="relative flex flex-col flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <Topbar profile={profile} />
        <main className="relative z-10 flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
