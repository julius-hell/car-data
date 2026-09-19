"use client";

import { useFormStatus } from "react-dom";
import { deleteMileageEntry } from "@/app/(protected)/cars/[carId]/actions";
import { Button } from "@/components/ui/button";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending} aria-label={label}>
      {pending ? "…" : "Delete"}
    </Button>
  );
}

export function DeleteEntryButton({ entryId, label }: { entryId: string; label: string }) {
  return (
    <form action={deleteMileageEntry.bind(null, entryId)}>
      <SubmitButton label={label} />
    </form>
  );
}
