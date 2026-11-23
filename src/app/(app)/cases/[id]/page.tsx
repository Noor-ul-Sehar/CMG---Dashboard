import { notFound } from "next/navigation";
import { getFullCaseProfile } from "@/lib/services/case-service";
import { listMasterOptions } from "@/lib/services/master-service";
import { getSessionUser } from "@/lib/auth/session";
import { profileCapabilities } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorState, EmptyState } from "@/components/ui/states";
import { CaseFormModal } from "@/components/cases/case-form-modal";
import { AddRemarkForm } from "@/components/cases/add-remark-form";
import { AddReviewForm } from "@/components/cases/add-review-form";
import { DocumentsPanel } from "@/components/cases/documents-panel";
import {
  InfoRow,
  TimelineEmpty,
  TimelineItem,
} from "@/components/cases/case-profile-parts";
import type { RecordalInput } from "@/types";

export const dynamic = "force-dynamic";

export default async function CaseProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let profile;
  try {
    profile = await getFullCaseProfile(id);
  } catch {
    return <ErrorState message="Unable to load the case profile from the database." />;
  }
  if (!profile) notFound();

  const user = await getSessionUser();
  const perms = user ? profileCapabilities(user) : null;
  const canEdit = perms?.canEditCase ?? false;
  const canAddRemark = perms?.canAddRemark ?? false;
  const canAddReview = perms?.canAddReview ?? false;
  const canUploadDocument = perms?.canUploadDocument ?? false;
  const canDeleteDocument = perms?.canDeleteDocument ?? false;

  const c = profile.case;

  let targetBy: { id: number; name: string }[] = [];
  let targetNatures: { id: number; name: string }[] = [];
  let brands: { id: number; name: string }[] = [];
  try {
    [targetBy, targetNatures, brands] = await Promise.all([
      listMasterOptions("target_by"),
      listMasterOptions("target_natures"),
      listMasterOptions("brands"),
    ]);
  } catch {}

  const recordals: RecordalInput[] = profile.recordals.map((r) => ({
    recordalDate: r.recordalDate,
    brandCmgCaseRef: r.brandCmgCaseRef,
    brandCaseRef: r.brandCaseRef,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.title ?? c.cmgReference}
        description={`${c.cmgReference}${c.clientReference ? ` · Client ref ${c.clientReference}` : ""}`}
        actions={
          canEdit ? (
            <CaseFormModal
              mode="edit"
              caseData={c}
              recordals={recordals}
              targetBy={targetBy}
              targetNatures={targetNatures}
              brands={brands}
              label="Edit Case"
              variant="secondary"
            />
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge type="case" value={c.status} />
        <StatusBadge type="approval" value={c.reportStatus} />
      </div>

      <Card>
        <CardHeader
          title="Overall Case Details"
          subtitle="Complete case summary — all core case information in one place"
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
            <div className="divide-y divide-zinc-100">
              <InfoRow label="CMG Reference" value={c.cmgReference} />
              <InfoRow label="Client Reference" value={c.clientReference} />
              <InfoRow label="Title" value={c.title} />
              <InfoRow label="Target Name" value={c.targetName} />
              <InfoRow label="Targeted By" value={c.targetBy} />
              <InfoRow label="Target Nature" value={c.targetNature} />
              <InfoRow label="Owner" value={c.targetOwner} />
              <InfoRow label="City" value={c.city} />
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
                  <StatusBadge type="approval" value={c.reportStatus} />
                </dd>
              </div>
              <InfoRow label="Investigation Date" value={formatDate(c.investigationDate)} />
              <InfoRow label="Created" value={formatDateTime(c.createdAt)} />
              <InfoRow label="Last Updated" value={formatDateTime(c.lastUpdated)} />
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Recordals"
              subtitle="Brand registrations or filings with their reference numbers"
            />
            <CardBody>
              {profile.recordals.length === 0 ? (
                <EmptyState
                  title="No recordals yet"
                  description="Add recordals from the Edit Case screen when available."
                />
              ) : (
                <ul className="space-y-3">
                  {profile.recordals.map((r) => (
                    <li
                      key={r.id}
                      className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3 sm:grid-cols-3"
                    >
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                          Recordal Date
                        </dt>
                        <dd className="mt-0.5 text-sm font-medium text-zinc-800">
                          {formatDate(r.recordalDate)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                          Brand CMG Case Ref #
                        </dt>
                        <dd className="mt-0.5 text-sm text-zinc-800">
                          {r.brandCmgCaseRef || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                          Brand Case Ref #
                        </dt>
                        <dd className="mt-0.5 text-sm text-zinc-800">
                          {r.brandCaseRef || "—"}
                        </dd>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Remarks" subtitle="Full case history — remarks are never overwritten" />
            <CardBody className="space-y-6">
              {canAddRemark ? <AddRemarkForm caseId={c.id} /> : null}
              {profile.remarks.length === 0 ? (
                <EmptyState title="No remarks yet" description="Add the first remark to this case." />
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {profile.remarks.map((r) => (
                    <li key={r.id} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-600">
                          {r.type}
                        </span>
                        <span className="text-xs tabular-nums text-zinc-400">
                          {formatDateTime(r.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-zinc-700">
                        {r.comment}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        by {r.userName ?? "System"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Reviews" subtitle="Formal case reviews — each review is kept on record" />
            <CardBody className="space-y-6">
              {canAddReview ? <AddReviewForm caseId={c.id} /> : null}
              {profile.reviews.length === 0 ? (
                <EmptyState title="No reviews yet" description="Record the first review for this case." />
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {profile.reviews.map((r) => (
                    <li key={r.id} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <StatusBadge type="review" value={r.reviewStatus} />
                        <span className="text-xs tabular-nums text-zinc-400">
                          {formatDateTime(r.reviewedAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-zinc-700">
                        {r.reviewComment ?? "No comment provided."}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        by {r.reviewerName ?? "System"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Activity Timeline" subtitle="Complete case history" />
            <CardBody>
              {profile.activity.length === 0 ? (
                <TimelineEmpty />
              ) : (
                <ul>
                  {profile.activity.map((a) => (
                    <TimelineItem
                      key={a.id}
                      action={a.action}
                      userName={a.userName}
                      timestamp={formatDateTime(a.createdAt)}
                      description={a.description}
                    />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Documents" subtitle="Private case documents and evidence" />
            <CardBody>
              <DocumentsPanel
                caseId={c.id}
                documents={profile.documents}
                canUpload={canUploadDocument}
                canDelete={canDeleteDocument}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}