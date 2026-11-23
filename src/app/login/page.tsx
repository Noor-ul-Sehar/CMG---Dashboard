import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { LoginFormWithSuspense } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect(user.mustChangePassword ? "/change-password" : "/overview/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.18),transparent_60%)]"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-lg font-bold text-white shadow-lg shadow-indigo-900/40">
            CMG
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-white">
            CMG Case Management
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Authorized personnel only
          </p>
        </div>
        <div className="rounded-xl border border-zinc-700/70 bg-white p-6 shadow-2xl shadow-black/40">
          <LoginFormWithSuspense />
        </div>
        <p className="mt-6 text-center text-xs text-zinc-500">
          Access to this system is restricted to authorized CMG team members.
        </p>
      </div>
    </div>
  );
}