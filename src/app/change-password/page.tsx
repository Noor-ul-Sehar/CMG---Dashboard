import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Change Password</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {user.mustChangePassword
            ? "For security, you must set a new password before continuing."
            : "Update your account password."}
        </p>
      </div>
      <ChangePasswordForm force={Boolean(user.mustChangePassword)} />
    </div>
  );
}