"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "value" | "onChange" | "type"
> & {
  label?: string;
  error?: string;
  defaultValue?: number;
};

// Alinhado com o Decimal(12, 2) do banco: 10 digitos inteiros + 2 de centavos.
const MAX_INTEGER_DIGITS = 10;

function stripLeadingZeros(digits: string): string {
  return digits.replace(/^0+(?=\d)/, "");
}

function digitsFromDefaultValue(value: number | undefined): string {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return "";
  }

  return String(Math.round(value)).slice(0, MAX_INTEGER_DIGITS);
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function MoneyInput({
  label,
  error,
  className,
  id,
  name,
  defaultValue,
  placeholder = "0",
  ...props
}: MoneyInputProps) {
  const inputId = id ?? name;
  const inputRef = useRef<HTMLInputElement>(null);
  const [digits, setDigits] = useState(() => digitsFromDefaultValue(defaultValue));

  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      const end = input.value.length;
      input.setSelectionRange(end, end);
    }
  }, [digits]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextDigits = stripLeadingZeros(
      event.target.value.replace(/\D/g, ""),
    ).slice(0, MAX_INTEGER_DIGITS);
    setDigits(nextDigits);
  }

  const formattedValue = groupThousands(digits);

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
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          value={formattedValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "min-h-12 min-w-0 flex-1 rounded-lg bg-transparent px-3 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400",
            className,
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          {...props}
        />
        <span className="pr-4 text-base font-medium text-slate-500">,00</span>
      </div>
      {error && inputId ? (
        <span id={`${inputId}-error`} className="mt-2 block text-sm text-red-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}
