import { listTeamsWithCounts } from "@/lib/services/org-service";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { TeamsManager } from "@/components/teams/teams-manager";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  let teams;
  try {
    teams = await listTeamsWithCounts();
  } catch {
    return <ErrorState message="Unable to load teams from the database." />;
  }

  const user = await getSessionUser();
  const canManage = user ? can(user, "teams.manage") : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Organizational reference data. Teams are not assigned to Market Cases."
      />
      <TeamsManager teams={teams} canManage={canManage} />
    </div>
  );
}