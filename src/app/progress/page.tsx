import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { ComingSoon } from "@/components/ComingSoon";

export default async function Page() {
  if (!(await isAuthenticated())) redirect("/login");
  return <ComingSoon title="Progress" />;
}
