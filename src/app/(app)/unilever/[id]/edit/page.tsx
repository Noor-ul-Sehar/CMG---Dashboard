import { notFound, redirect } from "next/navigation";
import { getUnileverCaseById, listUnileverBrands } from "@/lib/services/unilever-service";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { UnileverForm } from "@/components/unilever/unilever-form";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { ErrorState } from "@/components/ui/states";
import type { UnileverCase } from "@/types";

export const dynamic = "force-dynamic";

export default async function EditUnileverCasePage({
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

  let caseData: UnileverCase | null;
  let brands: { id: number; name: string }[];
  try {
    [caseData, brands] = await Promise.all([
      getUnileverCaseById(id),
      listUnileverBrands(),
    ]);
  } catch {
    return <ErrorState message="Unable to load the Unilever case for editing." />;
  }
  if (!caseData) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Unilever Case ${caseData.cmgReference}`}
        description="Update Unilever case information."
        actions={
          <LinkButton href={`/unilever/${id}`} variant="secondary">
            View Case Profile
          </LinkButton>
        }
      />
      <UnileverForm mode="edit" caseData={caseData} brands={brands} />
    </div>
  );
}