"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Case } from "@/types/case.types";
import CaseCard from "@/components/cases/CaseCard";
import { FullPageSpinner } from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { PlusCircle, Search, FolderOpen } from "lucide-react";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";

const STAGE_FILTERS = [
  { key: "all", label: "All" },
  { key: "drafting", label: "Drafting" },
  { key: "notice_generated", label: "Notice Generated" },
  { key: "waiting_period", label: "Waiting" },
  { key: "complaint_eligible", label: "Complaint Eligible" },
  { key: "limitation_warning", label: "Urgent" },
  { key: "complaint_filed", label: "Filed" },
  { key: "closed", label: "Closed" },
];

export default function CasesListPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  useEffect(() => {
    const advocateId = localStorage.getItem("cf_user_id");
    if (!advocateId) return;

    const cacheKey = `cases:summary:${advocateId}`;
    const cachedCases = getClientCache<Case[]>(cacheKey);
    if (cachedCases) {
      setCases(cachedCases);
      setLoading(false);
    }

    fetch(`/api/cases?advocate_id=${advocateId}&view=summary`)
      .then((r) => r.json())
      .then((data) => {
        const nextCases = data.cases || [];
        setCases(nextCases);
        setClientCache(cacheKey, nextCases, 45_000);
        nextCases.slice(0, 10).forEach((c: Case) => {
          router.prefetch(`/cases/${c.id}`);
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const filtered = cases.filter((c) => {
    const client = c.case_parties?.find((p) => p.role === "client");
    const opp = c.case_parties?.find((p) => p.role === "opposite_party");
    const matchesSearch =
      !search ||
      client?.name.toLowerCase().includes(search.toLowerCase()) ||
      opp?.name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.includes(search.toLowerCase());
    const matchesStage =
      stageFilter === "all" || c.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  if (loading) return <FullPageSpinner label="Loading cases..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Cases</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {cases.length} total cases
          </p>
        </div>
        <Button
          onClick={() => router.push("/cases/new")}
          icon={<PlusCircle className="w-4 h-4" />}
        >
          New Case
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by client or party name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startAdornment={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {STAGE_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStageFilter(key)}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                stageFilter === key
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cases */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <FolderOpen className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No cases found</p>
          <p className="text-gray-400 text-sm mt-1">
            {search || stageFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first case to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <CaseCard key={c.id} caseData={c} />
          ))}
        </div>
      )}
    </div>
  );
}
