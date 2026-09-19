"use client";

import { useFormStatus } from "react-dom";
import { setDefaultCar } from "@/app/(protected)/cars/actions";
import { Button } from "@/components/ui/button";

function SubmitButton({ carName }: { carName: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      aria-label={`Set ${carName} as default`}
    >
      {pending ? "Saving…" : "Set default"}
    </Button>
  );
}

export function SetDefaultCarButton({ carId, carName }: { carId: string; carName: string }) {
  return (
    <form action={setDefaultCar.bind(null, carId)}>
      <SubmitButton carName={carName} />
    </form>
  );
}
