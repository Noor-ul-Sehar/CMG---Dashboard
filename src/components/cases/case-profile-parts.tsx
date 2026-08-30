import type { ReactNode } from "react";
import {
  AlertIcon,
  ClockIcon,
  FolderCheckIcon,
  FolderOpenIcon,
  ShieldIcon,
  TrashIcon,
  UserIcon,
  FileTextIcon,
  InboxIcon,
} from "@/components/icons";

const ACTION_META: Record<string, { label: string; icon: typeof ClockIcon }> = {
  case_created: { label: "Case created", icon: FolderOpenIcon },
  case_updated: { label: "Case updated", icon: FileTextIcon },
  status_changed: { label: "Status changed", icon: FolderOpenIcon },
  team_changed: { label: "Team changed", icon: UserIcon },
  investigator_changed: { label: "Investigator changed", icon: UserIcon },
  remark_added: { label: "Remark added", icon: FileTextIcon },
  review_added: { label: "Review added", icon: ShieldIcon },
  document_uploaded: { label: "Document uploaded", icon: InboxIcon },
  document_deleted: { label: "Document deleted", icon: TrashIcon },
  case_closed: { label: "Case closed", icon: FolderCheckIcon },
  case_imported: { label: "Case imported", icon: InboxIcon },
};

export function TimelineItem({
  action,
  userName,
  timestamp,
  description,
}: {
  action: string;
  userName: string | null;
  timestamp: string;
  description?: string | null;
}) {
  const meta = ACTION_META[action] ?? { label: action, icon: ClockIcon };
  const Icon = meta.icon;
  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500">
          <Icon className="h-4 w-4" />
        </span>
        <span className="mt-1 w-px flex-1 bg-zinc-200" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-medium text-zinc-900">{meta.label}</p>
          <span className="text-xs tabular-nums text-zinc-400">{timestamp}</span>
        </div>
        {description ? (
          <p className="mt-0.5 text-sm text-zinc-600">{description}</p>
        ) : null}
        <p className="mt-0.5 text-xs text-zinc-400">
          by {userName ?? "System"}
        </p>
      </div>
    </li>
  );
}

export function TimelineEmpty() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
        <ClockIcon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm text-zinc-500">
        No activity recorded yet.
      </p>
    </div>
  );
}

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-zinc-800">{value ?? "—"}</dd>
    </div>
  );
}

export function ProfileAlert({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-amber-700">{message}</p>
      </div>
    </div>
  );
}