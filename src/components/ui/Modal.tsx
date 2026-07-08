"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type ModalProps = {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-6 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          {title ? (
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="min-h-10 px-3 py-2"
            onClick={onClose}
          >
            Fechar
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
