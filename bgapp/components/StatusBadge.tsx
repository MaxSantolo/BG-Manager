"use client";

import { useStatuses } from "./StatusProvider";
import { labelFor, colorFor } from "@/lib/status";

/** A status badge whose label + colour come from the configured status set. */
export default function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const config = useStatuses();
  return (
    <span className={`badge ${colorFor(config, status)} ${className}`}>
      {labelFor(config, status)}
    </span>
  );
}
