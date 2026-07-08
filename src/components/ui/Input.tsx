"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className, id, name, ...props }: InputProps) {
  const inputId = id ?? name;

  return (
    <label className="block w-full" htmlFor={inputId}>
      {label ? (
        <span className="mb-2 block text-sm font-medium text-slate-800">
          {label}
        </span>
      ) : null}
      <input
        id={inputId}
        name={name}
        className={cn(
          "min-h-12 w-full rounded-lg border bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition",
          "placeholder:text-slate-400 focus:border-blue-900 focus:ring-2 focus:ring-blue-100",
          error
            ? "border-red-300 focus:border-red-600 focus:ring-red-100"
            : "border-slate-200",
          className,
        )}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error && inputId ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && inputId ? (
        <span id={`${inputId}-error`} className="mt-2 block text-sm text-red-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}
