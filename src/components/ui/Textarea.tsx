import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  helperText?: string;
};

export function Textarea({
  label,
  helperText,
  className,
  id,
  name,
  ...props
}: TextareaProps) {
  const fieldId = id ?? name;

  return (
    <label className="block" htmlFor={fieldId}>
      <span className="mb-2 block text-sm font-medium text-slate-800">
        {label}
      </span>
      <textarea
        id={fieldId}
        name={name}
        className={cn(
          "min-h-32 w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-900 focus:ring-2 focus:ring-blue-100",
          className,
        )}
        {...props}
      />
      {helperText ? (
        <span className="mt-2 block text-xs text-slate-500">{helperText}</span>
      ) : null}
    </label>
  );
}
