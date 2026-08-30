import { notFound } from "next/navigation";
import { getUnileverCaseById } from "@/lib/services/unilever-service";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { InfoRow } from "@/components/cases/case-profile-parts";
import { UnileverDeleteButton } from "@/components/unilever/unilever-delete-button";

export const dynamic = "force-dynamic";

export default async function UnileverCaseProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const c = await getUnileverCaseById(id);
  if (!c) notFound();

  const user = await getSessionUser();
  const canEdit = user ? can(user, "cases.edit") : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.targetName ?? c.cmgReference}
        description={`${c.cmgReference}${c.clientReference ? ` · Client ref ${c.clientReference}` : ""}`}
        actions={
          canEdit ? (
            <div className="flex items-center gap-3">
              <UnileverDeleteButton caseId={c.id} />
              <LinkButton href={`/unilever/${id}/edit`} variant="secondary">
                Edit Case
              </LinkButton>
            </div>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge type="case" value={c.status} />
        <StatusBadge type="approval" value={c.approvalStatus} />
      </div>

      <Card>
        <CardHeader
          title="Overall Case Details"
          subtitle="Complete case summary — all core Unilever case information in one place"
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
            <div className="divide-y divide-zinc-100">
              <InfoRow label="CMG Reference" value={c.cmgReference} />
              <InfoRow label="Client Reference" value={c.clientReference} />
              <InfoRow label="Target Name" value={c.targetName} />
              <InfoRow label="Targeted By" value={c.targetBy} />
              <InfoRow label="Target Nature" value={c.targetNature} />
            </div>
            <div className="divide-y divide-zinc-100">
              <InfoRow
                label="Brands"
                value={
                  (c.brands?.length ?? 0) > 0 ? (
                    <span className="flex flex-wrap gap-1.5">
                      {c.brands.map((b) => (
                        <span
                          key={b}
                          className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
                        >
                          {b}
                        </span>
                      ))}
                    </span>
                  ) : (
                    c.brand
                  )
                }
              />
              <div className="py-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Case Status
                </dt>
                <dd className="mt-1">
                  <StatusBadge type="case" value={c.status} />
                </dd>
              </div>
              <div className="py-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Approval Status
                </dt>
                <dd className="mt-1">
                  <StatusBadge type="approval" value={c.approvalStatus} />
                </dd>
              </div>
              <InfoRow label="Investigation Date" value={formatDate(c.investigationDate)} />
            </div>
          </div>
          <div className="mt-4 border-t border-zinc-100 pt-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Notes
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
              {c.notes || "No notes recorded."}
            </dd>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Case Information" subtitle="System metadata for this Unilever case" />
        <CardBody>
          <div className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
            <InfoRow label="Created" value={formatDateTime(c.createdAt)} />
            <InfoRow label="Last Updated" value={formatDateTime(c.updatedAt)} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}