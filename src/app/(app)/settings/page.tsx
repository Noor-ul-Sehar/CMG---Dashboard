import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getUserById } from "@/lib/services/user-service";
import { USER_ROLES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/states";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  let account;
  try {
    account = await getUserById(user.id);
  } catch {
    return (
      <ErrorState message="Unable to load account information from the database." />
    );
  }

  const roleLabel =
    USER_ROLES.find((r) => r.value === user.role)?.label ?? user.role;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your account details and system information."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="My Account" subtitle="Your current profile and access" />
          <CardBody className="divide-y divide-zinc-100 text-sm">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Name
              </dt>
              <dd className="font-medium text-zinc-900">{user.name}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Email
              </dt>
              <dd className="text-zinc-700">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Role
              </dt>
              <dd>
                <Badge className="bg-zinc-100 text-zinc-700 ring-zinc-500/20">
                  {roleLabel}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Team
              </dt>
              <dd className="text-zinc-700">{account?.teamName ?? "Unassigned"}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Last Login
              </dt>
              <dd className="tabular-nums text-zinc-700">
                {account?.last_login_at ? formatDateTime(account.last_login_at) : "—"}
              </dd>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Security" subtitle="Keep your account secure" />
            <CardBody className="space-y-3">
              <Link
                href="/change-password"
                className="block rounded-md border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-900 focus-visible:outline-offset-2"
              >
                Change Password
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="About" subtitle="System information" />
            <CardBody className="divide-y divide-zinc-100 text-sm">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Application
                </dt>
                <dd className="text-zinc-700">CMG Case Management</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Version
                </dt>
                <dd className="tabular-nums text-zinc-700">v1.0.0</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Data Source
                </dt>
                <dd className="text-zinc-700">Central PostgreSQL database</dd>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}