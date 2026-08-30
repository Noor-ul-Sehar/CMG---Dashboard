import { notFound, redirect } from "next/navigation";
import { getCaseById, getCaseRecordals } from "@/lib/services/case-service";
import { listMasterOptions } from "@/lib/services/master-service";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { CaseForm } from "@/components/cases/case-form";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { ErrorState } from "@/components/ui/states";
import type { CaseWithRefs, RecordalInput } from "@/types";

export const dynamic = "force-dynamic";

export default async function EditCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const user = await getSessionUser();
  if (!user || !can(user, "cases.edit")) {
    redirect("/dashboard");
  }

  let caseData: CaseWithRefs | null;
  let targetBy: { id: number; name: string }[];
  let targetNatures: { id: number; name: string }[];
  let brands: { id: number; name: string }[];
  let recordals: RecordalInput[];
  try {
    [caseData, targetBy, targetNatures, brands, recordals] = await Promise.all([
      getCaseById(id),
      listMasterOptions("target_by"),
      listMasterOptions("target_natures"),
      listMasterOptions("brands"),
      getCaseRecordals(id),
    ]);
  } catch {
    return <ErrorState message="Unable to load the case for editing." />;
  }
  if (!caseData) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Case ${caseData.cmgReference}`}
        description="Update case information. Changes are recorded in the activity timeline."
        actions={
          <LinkButton href={`/cases/${id}`} variant="secondary">
            View Case Profile
          </LinkButton>
        }
      />
      <CaseForm
        mode="edit"
        caseData={caseData}
        targetBy={targetBy}
        targetNatures={targetNatures}
        brands={brands}
        recordals={recordals}
      />
    </div>
  );
}