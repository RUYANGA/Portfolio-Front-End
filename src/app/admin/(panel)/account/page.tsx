import PasswordForm from "@/components/admin/PasswordForm";
import { currentAdmin } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await currentAdmin();
  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Account</h1>
          <p>
            Signed in as <strong>{user?.username}</strong>
            {user?.email ? ` (${user.email})` : ""}.
          </p>
        </div>
      </header>
      <PasswordForm />
    </>
  );
}
