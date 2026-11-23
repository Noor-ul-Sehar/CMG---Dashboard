import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/permissions";
import { listUsers } from "@/lib/services/user-service";
import { listTeams } from "@/lib/services/case-service";
import { UsersManager } from "@/components/users/users-manager";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import type { Team } from "@/types";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user || !canManageUsers(user)) {
    redirect("/overview/dashboard");
  }

  let users;
  let teams: Team[];
  try {
    [users, teams] = await Promise.all([listUsers(), listTeams()]);
  } catch {
    return <ErrorState message="Unable to load users from the database." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage team member accounts, roles, and access."
      />
      <UsersManager users={users} teams={teams} />
    </div>
  );
}