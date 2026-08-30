import { redirect } from "next/navigation";
import { listMasterOptions } from "@/lib/services/master-service";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { CaseForm } from "@/components/cases/case-form";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";

export const dynamic = "force-dynamic";

export default async function NewCasePage() {
  const user = await getSessionUser();
  if (!user || !can(user, "cases.create")) {
    redirect("/dashboard");
  }

  let targetBy: { id: number; name: string }[];
  let targetNatures: { id: number; name: string }[];
  let brands: { id: number; name: string }[];
  try {
    [targetBy, targetNatures, brands] = await Promise.all([
      listMasterOptions("target_by"),
      listMasterOptions("target_natures"),
      listMasterOptions("brands"),
    ]);
  } catch {
    return <ErrorState message="Unable to load reference data from the database." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Case"
        description="Create a new case in the central database."
      />
      <CaseForm mode="new" targetBy={targetBy} targetNatures={targetNatures} brands={brands} />
    </div>
  );
}