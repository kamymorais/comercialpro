import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { HOME_PATH } from "@/lib/constants";

export default async function Home() {
  const user = await requireCurrentUser();

  if (!user.role) {
    redirect("/login");
  }

  redirect(HOME_PATH);
}
