"use client";

import { X } from "lucide-react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Date field with an explicit clear button, for OPTIONAL dates.
 * iOS Safari's native date picker has no way to empty a field once a date is
 * set, so a date entered by mistake could never be removed. Required dates
 * (e.g. a play's date) should keep using a plain input.
 */
export default function DateInput({ value, onChange, className = "", disabled, ...rest }: Props) {
  return (
    <div className="relative">
      <input
        {...rest}
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${className} ${value ? "pr-10" : ""}`}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Cancella data"
          title="Cancella data"
          className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-md"
          style={{ color: "var(--text-muted)" }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
