"use client";

import { User as UserIcon, Bell } from "lucide-react";
import { User } from "@/types/case.types";

interface TopbarProps {
  profile: User | null;
}

export default function Topbar({ profile }: TopbarProps) {
  return (
    <header className="h-16 shrink-0 border-b border-[#3f3219] bg-black/35 backdrop-blur-md flex items-center justify-between px-6">
      <div>
        <p className="m-0 text-sm text-[#d7ccb6]">
          Welcome back,{" "}
          <span className="text-[#f8f5ef] font-semibold">
            {profile?.name ? `Adv. ${profile.name}` : "Advocate"}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-3.5">
        <button className="w-[38px] h-[38px] rounded-[10px] grid place-items-center border border-[#4d3f23] bg-transparent hover:bg-white/10 transition-colors">
          <Bell size={18} color="#d4b06a" />
        </button>
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] border border-[#4d3f23] bg-black/35">
          <div className="w-7 h-7 rounded-full grid place-items-center bg-[#b08a3c]">
            <UserIcon size={16} color="#fff" />
          </div>
          <div>
            <p className="m-0 text-xs leading-none text-[#f8f5ef] font-semibold">
              {profile?.name || "Advocate"}
            </p>
            {profile?.enrollment_number && (
              <p className="mt-1 mb-0 text-[11px] leading-none text-[#b8ac95]">{profile.enrollment_number}</p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
