import type { ReactNode } from "react";
import { AlertIcon, InboxIcon, SpinnerIcon } from "@/components/icons";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400">
        {icon ?? <InboxIcon className="h-5 w-5" />}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-zinc-900">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-zinc-400">
      <SpinnerIcon className="h-5 w-5" />
      <p className="mt-3 text-sm">{label}...</p>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  retry,
}: {
  title?: string;
  message?: string;
  retry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertIcon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-zinc-900">{title}</h3>
      {message ? (
        <p className="mt-1 max-w-sm text-sm text-zinc-500">{message}</p>
      ) : null}
      {retry ? (
        <button
          type="button"
          onClick={retry}
          className="mt-4 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm shadow-zinc-900/[0.03] hover:border-zinc-400 hover:bg-zinc-50"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}