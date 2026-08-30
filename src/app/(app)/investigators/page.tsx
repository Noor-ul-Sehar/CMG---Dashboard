import {
  listInvestigatorsWithCounts,
  listTeamsWithCounts,
} from "@/lib/services/org-service";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { InvestigatorsManager } from "@/components/teams/investigators-manager";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";

export const dynamic = "force-dynamic";

export default async function InvestigatorsPage() {
  let investigators;
  let teams;
  try {
    [investigators, teams] = await Promise.all([
      listInvestigatorsWithCounts(),
      listTeamsWithCounts(),
    ]);
  } catch {
    return <ErrorState message="Unable to load investigators from the database." />;
  }

  const user = await getSessionUser();
  const canManage = user ? can(user, "investigators.manage") : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investigators"
        description="Investigators are organizational reference data and are not assigned to Market Cases."
      />
      <InvestigatorsManager
        investigators={investigators}
        teams={teams}
        canManage={canManage}
      />
    </div>
  );
}