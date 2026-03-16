import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function RootPage() {
  const cookieStore = cookies();
  const userId = cookieStore.get("cf_user_id")?.value;

  if (userId) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
