import { redirect } from "next/navigation";
import { Suspense } from "react";
import LoginForm from "@/components/admin/LoginForm";
import { getPortfolio } from "@/lib/api";
import { currentAdmin } from "@/lib/admin/session";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentAdmin()) redirect("/admin");
  const { profile } = await getPortfolio();
  const initials = profile.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <main id="main" className="adm-login">
      <div className="adm-login-card">
        <div className="adm-login-head">
          <span className="brand-mark" aria-hidden="true">
            {initials}
          </span>
          <h1>Portfolio admin</h1>
          <p>Sign in to edit your portfolio.</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <a href="/" className="adm-login-back">
          ← Back to the site
        </a>
      </div>
    </main>
  );
}
