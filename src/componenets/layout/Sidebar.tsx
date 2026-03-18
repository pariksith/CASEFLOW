"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scale,
  LayoutDashboard,
  FolderOpen,
  PlusCircle,
  LogOut,
} from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { clearClientCache } from "@/lib/cache/clientDataCache";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/cases", icon: FolderOpen, label: "All Cases" },
  { href: "/cases/new", icon: PlusCircle, label: "New Case" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.clear();
    sessionStorage.clear();
    clearClientCache();
    toast.success("Signed out");
    router.push("/");
  };

  return (
    <aside className="w-64 h-full flex flex-col bg-gradient-to-b from-black via-zinc-950 to-black border-r border-[#3e3219] shadow-2xl">
      <div className="p-6 border-b border-[#3e3219]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg grid place-items-center bg-[#b08a3c] shadow-md shadow-[#b08a3c]/30">
            <Scale size={20} color="#fff" />
          </div>
          <div>
            <h1 className="m-0 text-white font-bold text-2xl leading-none">CaseFlow</h1>
            <p className="mt-1 text-[#d8c49c] text-[11px] tracking-[0.08em] uppercase">Advocate Suite</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all",
                isActive
                  ? "bg-[#b08a3c] text-black shadow-md shadow-[#b08a3c]/30"
                  : "text-[#dfdfdf] hover:text-white hover:bg-white/10"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#3e3219]">
        <button
          onClick={handleLogout}
          className="w-full border border-[#68502a] bg-transparent text-[#e7d8b6] rounded-lg px-3 py-2.5 flex items-center gap-3 text-sm font-semibold transition-all hover:bg-[#b08a3c] hover:text-black hover:border-[#b08a3c]"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
