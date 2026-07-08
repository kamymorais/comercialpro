import { redirect } from "next/navigation";
import { getDashboardPathByRole, requireCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await requireCurrentUser();

  if (!user.role) {
    redirect("/login");
  }

  redirect(getDashboardPathByRole(user.role));
}
