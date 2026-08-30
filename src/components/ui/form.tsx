import type {
  ComponentProps,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const fieldClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm shadow-zinc-900/[0.02] transition-colors placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-zinc-50 disabled:text-zinc-500 disabled:shadow-none aria-invalid:border-red-400 aria-invalid:focus:ring-red-500/20";

export function Input({
  className = "",
  "aria-invalid": ariaInvalid,
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      aria-invalid={ariaInvalid}
      className={`${fieldClass} ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  "aria-invalid": ariaInvalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      aria-invalid={ariaInvalid}
      className={`${fieldClass} ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  children,
  "aria-invalid": ariaInvalid,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      aria-invalid={ariaInvalid}
      className={`${fieldClass} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
  error,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-600">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      <div className={error ? "field-error" : undefined}>{children}</div>
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}