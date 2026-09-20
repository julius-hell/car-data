"use client";

import { useFormStatus } from "react-dom";
import { deleteMileageEntry } from "@/app/(protected)/cars/[carId]/actions";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-label={label}
      className="text-muted-foreground hover:text-destructive"
    >
      <Trash2Icon className="size-4" />
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
