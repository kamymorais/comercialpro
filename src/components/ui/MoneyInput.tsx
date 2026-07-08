"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type MoneyInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function MoneyInput({
  label,
  error,
  className,
  id,
  name,
  inputMode = "decimal",
  placeholder = "0,00",
  ...props
}: MoneyInputProps) {
  const inputId = id ?? name;

  return (
    <label className="block w-full" htmlFor={inputId}>
      {label ? (
        <span className="mb-2 block text-sm font-medium text-slate-800">
          {label}
        </span>
      ) : null}
      <div
        className={cn(
          "flex min-h-12 items-center rounded-lg border bg-white shadow-sm transition focus-within:ring-2",
          error
            ? "border-red-300 focus-within:border-red-600 focus-within:ring-red-100"
            : "border-slate-200 focus-within:border-blue-900 focus-within:ring-blue-100",
        )}
      >
        <span className="pl-4 text-base font-medium text-slate-500">R$</span>
        <input
          id={inputId}
          name={name}
          inputMode={inputMode}
          placeholder={placeholder}
          className={cn(
            "min-h-12 w-full rounded-lg bg-transparent px-3 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400",
            className,
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          {...props}
        />
      </div>
      {error && inputId ? (
        <span id={`${inputId}-error`} className="mt-2 block text-sm text-red-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}
