import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { currentAdmin, djangoAdmin } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

/** Every panel page: the session is checked against the API, not just the cookie. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await currentAdmin();
  if (!user) redirect("/admin/login");

  let unread = 0;
  let owner = "";
  try {
    const res = await djangoAdmin("overview/");
    if (res.ok) {
      const data = await res.json();
      unread = data.counts.unread_messages;
      owner = data.profile.name;
    }
  } catch {
    /* the badge is optional */
  }

  return (
    <AdminShell user={user} owner={owner} unread={unread}>
      {children}
    </AdminShell>
  );
}
