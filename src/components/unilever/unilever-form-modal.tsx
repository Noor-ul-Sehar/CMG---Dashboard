"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { UnileverCase } from "@/types";
import { UnileverForm } from "./unilever-form";

interface Props {
  mode: "new" | "edit";
  caseData?: UnileverCase | null;
  brands: { id: number; name: string }[];
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  className?: string;
  icon?: ReactNode;
  hideLabel?: boolean;
  title?: string;
  description?: string;
}

export function UnileverFormModal({
  mode,
  caseData,
  brands,
  label,
  variant = "primary",
  size = "md",
  className,
  icon,
  hideLabel = false,
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
        title={title ?? (mode === "edit" ? `Edit Case ${caseData?.cmgReference ?? ""}` : "New Unilever Case")}
        description={description}
        size="2xl"
        scrollable
      >
        <UnileverForm
          mode={mode}
          caseData={caseData}
          brands={brands}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
