"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { CaseWithRefs, RecordalInput } from "@/types";
import { CaseForm } from "./case-form";

interface Props {
  mode: "new" | "edit";
  caseData?: CaseWithRefs | null;
  recordals?: RecordalInput[];
  targetBy: { id: number; name: string }[];
  targetNatures: { id?: number; name: string }[];
  brands: { id?: number; name: string }[];
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  icon?: ReactNode;
  hideLabel?: boolean;
  className?: string;
  title?: string;
  description?: string;
}

export function CaseFormModal({
  mode,
  caseData,
  recordals,
  targetBy,
  targetNatures,
  brands,
  label,
  variant = "primary",
  size = "md",
  icon,
  hideLabel = false,
  className,
  title,
  description,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        aria-label={hideLabel ? label : undefined}
      >
        {icon}
        {hideLabel ? <span className="sr-only">{label}</span> : label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title ?? (mode === "edit" ? `Edit Case ${caseData?.cmgReference ?? ""}` : "New Market Case")}
        description={description}
        size="2xl"
        scrollable
      >
        <CaseForm
          mode={mode}
          caseData={caseData}
          targetBy={targetBy}
          targetNatures={targetNatures}
          brands={brands}
          recordals={recordals}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
