import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import AppShell from "@/components/layout/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const userId = cookieStore.get("cf_user_id")?.value;

  if (!userId) redirect("/login");

  let profile = null;
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("users")
      .select("id, name, enrollment_number")
      .eq("id", userId)
      .single();
    profile = data;
  } catch {}

  return (
    <AppShell profile={profile}>{children}</AppShell>
  );
}
