import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/actions";

export default async function LandingPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
